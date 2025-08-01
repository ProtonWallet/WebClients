import { format } from 'date-fns';

import { MAX_CHARS_API } from '@proton/account';
import { startEasySwitchSignupImportTask } from '@proton/activation/src/api';
import { EASY_SWITCH_SOURCES, OAUTH_PROVIDER } from '@proton/activation/src/interface';
import type { VerificationModel } from '@proton/components';
import { getInitialStorage, getStorageRange } from '@proton/components';
import type { AppIntent } from '@proton/components/containers/login/interface';
import { createPreAuthKTVerifier } from '@proton/key-transparency';
import type { Subscription } from '@proton/payments';
import { type PaymentsVersion, getIsPassB2BPlan, getIsVpnB2BPlan, subscribe } from '@proton/payments';
import type { generatePDFKit } from '@proton/recovery-kit';
import { getAllAddresses, updateAddress } from '@proton/shared/lib/api/addresses';
import { auth } from '@proton/shared/lib/api/auth';
import { getApiError } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import { updatePrivateKeyRoute } from '@proton/shared/lib/api/keys';
import { getAllMembers, updateQuota, updateVPN } from '@proton/shared/lib/api/members';
import { createPasswordlessOrganizationKeys, updateOrganizationName } from '@proton/shared/lib/api/organization';
import { updateEmail, updateLocale, updatePhone } from '@proton/shared/lib/api/settings';
import { reactivateMnemonicPhrase } from '@proton/shared/lib/api/settingsMnemonic';
import {
    queryCheckEmailAvailability,
    queryCheckUsernameAvailability,
    unlockPasswordChanges,
} from '@proton/shared/lib/api/user';
import type { ProductParam } from '@proton/shared/lib/apps/product';
import { SessionSource } from '@proton/shared/lib/authentication/SessionInterface';
import { getUser } from '@proton/shared/lib/authentication/getUser';
import type { AuthResponse } from '@proton/shared/lib/authentication/interface';
import { persistSession } from '@proton/shared/lib/authentication/persistedSessionHelper';
import { APPS, CLIENT_TYPES, KEYGEN_CONFIGS, KEYGEN_TYPES, VPN_CONNECTIONS } from '@proton/shared/lib/constants';
import { API_CUSTOM_ERROR_CODES, HTTP_ERROR_CODES } from '@proton/shared/lib/errors';
import { withVerificationHeaders } from '@proton/shared/lib/fetch/headers';
import { isElectronMail } from '@proton/shared/lib/helpers/desktop';
import { hasPlanIDs } from '@proton/shared/lib/helpers/planIDs';
import { localeCode } from '@proton/shared/lib/i18n';
import type { Api, HumanVerificationMethodType, KeyTransparencyActivation, User } from '@proton/shared/lib/interfaces';
import { SubscriptionMode } from '@proton/shared/lib/interfaces';
import {
    generateKeySaltAndPassphrase,
    generatePasswordlessOrganizationKey,
    getDecryptedUserKeysHelper,
    handleSetupKeys,
} from '@proton/shared/lib/keys';
import { getUpdateKeysPayload } from '@proton/shared/lib/keys/changePassword';
import { generateMnemonicPayload, generateMnemonicWithSalt } from '@proton/shared/lib/mnemonic';
import { getOrganization } from '@proton/shared/lib/organization/api';
import { srpAuth, srpVerify } from '@proton/shared/lib/srp';
import { hasPaidVpn } from '@proton/shared/lib/user/helpers';
import clamp from '@proton/utils/clamp';
import noop from '@proton/utils/noop';

import type {
    MnemonicData,
    SignupActionDoneResponse,
    SignupActionResponse,
    SignupCacheResult,
    SubscriptionData,
} from '../interfaces';
import { HumanVerificationTrigger, SignupSteps, SignupType } from '../interfaces';
import { handleCreateUser } from './handleCreateUser';
import { hvHandler } from './helpers';

export const handleDone = ({
    cache,
    appIntent = cache.appIntent,
}: {
    cache: SignupCacheResult;
    appIntent?: AppIntent;
}): SignupActionDoneResponse => {
    const {
        setupData,
        accountData: { password },
    } = cache;
    if (!setupData?.authResponse) {
        throw new Error('Missing auth response');
    }
    const { session } = setupData;

    // Users that creates an account after a logout don't have appIntent, forcing it here
    if (isElectronMail) {
        appIntent = {
            app: APPS.PROTONMAIL,
        };
    }

    return {
        cache,
        session: {
            data: session,
            loginPassword: password,
            flow: 'signup',
            appIntent: appIntent,
        },
        to: SignupSteps.Done,
    };
};

export const handleSaveRecovery = async ({
    cache,
    recoveryEmail,
    recoveryPhone,
}: {
    cache: SignupCacheResult;
    recoveryEmail?: string;
    recoveryPhone?: string;
}): Promise<void> => {
    const {
        setupData,
        accountData: { password, signupType },
    } = cache;

    const { api } = setupData!;

    await Promise.all([
        !!recoveryPhone && srpAuth({ api, credentials: { password }, config: updatePhone({ Phone: recoveryPhone }) }),
        // Always send an update to the recovery email address when signing up with an external email address because the API sets it by default, so the client
        // needs to reset it to an empty string if the user chooses to not save a recovery email address.
        (!!recoveryEmail || signupType === SignupType.External) &&
            srpAuth({
                api,
                credentials: { password },
                config: updateEmail({ Email: recoveryEmail || '' }),
            }).catch((e) => {
                const { code } = getApiError(e);
                // Ignore the error the API throws when updating the recovery email address to the external email address until it's fixed.
                if (code === API_CUSTOM_ERROR_CODES.USER_UPDATE_EMAIL_SELF && signupType === SignupType.External) {
                    return;
                }
                throw e;
            }),
    ]);
};

export const handleDisplayName = async ({
    cache,
    displayName,
}: {
    cache: SignupCacheResult;
    displayName: string;
}): Promise<SignupCacheResult> => {
    const { setupData } = cache;

    const {
        api,
        addresses: [firstAddress],
    } = setupData!;

    await api(updateAddress(firstAddress.ID, { DisplayName: displayName, Signature: firstAddress.Signature }));
    // Re-fetch the user to get the updated display name
    const user = await getUser(api);

    return {
        ...cache,
        setupData: {
            ...setupData!,
            user,
        },
    };
};

export const handleSetPassword = async ({
    cache,
    api,
    newPassword,
}: {
    cache: SignupCacheResult;
    api: Api;
    newPassword: string;
}): Promise<SignupActionResponse> => {
    const { persistent, setupData, accountData } = cache;
    const user = setupData?.user;
    if (!setupData || !user) {
        throw new Error('Missing user');
    }

    const userKeys = await getDecryptedUserKeysHelper(user, setupData.session.keyPassword);
    const { passphrase: keyPassword, salt: keySalt } = await generateKeySaltAndPassphrase(newPassword);
    const updateKeysPayload = await getUpdateKeysPayload({
        addressesKeys: [],
        userKeys,
        organizationKey: undefined,
        keyPassword,
        keySalt,
        forceMigratedAddressKeys: true,
    });

    await srpAuth({
        api,
        credentials: {
            password: accountData.password,
        },
        config: unlockPasswordChanges(),
    });
    await srpVerify({
        api,
        credentials: {
            password: newPassword,
        },
        config: updatePrivateKeyRoute(updateKeysPayload),
    });

    const sessionResult = await persistSession({
        api,
        clearKeyPassword: newPassword,
        keyPassword,
        User: user,
        UID: setupData?.authResponse.UID,
        LocalID: setupData?.authResponse.LocalID,
        persistent,
        trusted: false,
        source: SessionSource.Proton,
    });

    const updatedUser = await getUser(api);

    return {
        cache: {
            ...cache,
            accountData: {
                ...accountData,
                password: newPassword,
            },
            setupData: {
                ...setupData,
                session: { ...sessionResult, User: updatedUser },
                user: updatedUser,
            },
        },
        to: SignupSteps.Congratulations,
    };
};

export const handleSetupOrg = async ({
    api,
    user,
    password,
    keyPassword,
    orgName,
}: {
    api: Api;
    user: User;
    password: string;
    keyPassword: string;
    orgName: string;
}) => {
    const members = await getAllMembers(api);
    const selfMember = members.find(({ Self }) => !!Self);
    const selfMemberID = selfMember?.ID;
    const [userKey] = await getDecryptedUserKeysHelper(user, keyPassword);

    if (!selfMemberID) {
        throw new Error('Missing member id');
    }
    if (!userKey) {
        throw new Error('Missing user key');
    }

    // NOTE: By default the admin gets allocated all of the VPN connections. Here we artificially set the admin to the default value
    // So that other users can get connections allocated.
    if (hasPaidVpn(user)) {
        await api(updateVPN(selfMemberID, VPN_CONNECTIONS)).catch(noop);
    }
    const organization = await getOrganization({ api }).catch(noop);
    if (organization && !getIsPassB2BPlan(organization.PlanName) && !getIsVpnB2BPlan(organization.PlanName)) {
        const storageRange = getStorageRange(selfMember, organization);
        const initialStorage = getInitialStorage(organization, storageRange);
        const storageValue = clamp(initialStorage, storageRange.min, storageRange.max);
        await api(updateQuota(selfMemberID, storageValue)).catch(noop);
    }
    // Slice the org name (to ensure the request passes validation), specifically for VPN B2B signup where it's passed as a query param and not validated.
    await api(updateOrganizationName(orgName.slice(0, MAX_CHARS_API.ORG_NAME)));

    const { encryptedToken, signature, privateKeyArmored } = await generatePasswordlessOrganizationKey({
        userKey: userKey.privateKey,
        keyGenConfig: KEYGEN_CONFIGS[KEYGEN_TYPES.CURVE25519],
    });

    await srpAuth({
        api,
        credentials: { password },
        config: createPasswordlessOrganizationKeys({
            Token: encryptedToken,
            Signature: signature,
            PrivateKey: privateKeyArmored,
            Members: [],
            AdminInvitations: [],
            AdminActivations: [],
            GroupAddressKeyTokens: [],
        }),
    });
};

export const handleSetupRecoveryPhrase = async ({
    cache,
}: {
    cache: SignupCacheResult;
    api: Api;
}): Promise<SignupActionResponse> => {
    return {
        cache,
        to: SignupSteps.Congratulations,
    };
};

export const getSubscriptionMetricsData = (
    subscriptionData: SubscriptionData
): {
    type: 'free' | 'cc' | 'pp' | 'btc';
} => {
    if (!hasPlanIDs(subscriptionData.planIDs)) {
        return {
            type: 'free',
        };
    }
    return {
        type: subscriptionData.type || 'cc',
    };
};

export const handleSubscribeUser = async (
    api: Api,
    subscriptionData: SubscriptionData,
    productParam: ProductParam,
    reportPaymentSuccess: () => void,
    reportPaymentFailure: () => void
) => {
    if (!hasPlanIDs(subscriptionData.planIDs)) {
        return;
    }

    try {
        let paymentsVersion: PaymentsVersion;
        if (subscriptionData.payment?.paymentsVersion) {
            paymentsVersion = subscriptionData.payment.paymentsVersion;
        } else {
            paymentsVersion = 'v4';
        }

        const isTrial = subscriptionData.checkResult.SubscriptionMode === SubscriptionMode.Trial;

        const { Subscription } = await api<{ Subscription: Subscription }>(
            subscribe(
                {
                    Plans: subscriptionData.planIDs,
                    Currency: subscriptionData.currency,
                    Cycle: subscriptionData.cycle,
                    BillingAddress: subscriptionData.billingAddress,
                    ...{
                        Payment: subscriptionData.payment,
                        Amount: subscriptionData.checkResult.AmountDue,
                        ...(subscriptionData.checkResult.Coupon?.Code
                            ? { Codes: [subscriptionData.checkResult.Coupon.Code] }
                            : undefined),
                        ...(isTrial ? { StartTrial: true } : {}),
                    },
                },
                productParam,
                paymentsVersion
            )
        );

        reportPaymentSuccess();

        return Subscription;
    } catch (error: any) {
        reportPaymentFailure();
        throw error;
    }
};

interface SetupMnemonic {
    enabled: boolean;
    generate?: typeof generatePDFKit;
}

export const handleSetupMnemonic = async ({
    user,
    keyPassword,
    api,
    emailAddress,
    setupMnemonic,
}: {
    api: Api;
    setupMnemonic?: SetupMnemonic;
    emailAddress: string;
    user: User;
    keyPassword: string;
}): Promise<MnemonicData | undefined> => {
    if (!setupMnemonic?.enabled || !setupMnemonic.generate || !user.Keys.length) {
        return;
    }

    const { randomBytes, salt, mnemonic } = await generateMnemonicWithSalt();

    const userKeys = await getDecryptedUserKeysHelper(user, keyPassword);

    const payload = await generateMnemonicPayload({ randomBytes, salt, userKeys, api, username: user.Name });

    try {
        await api({ ...reactivateMnemonicPhrase(payload), ignoreHandler: [HTTP_ERROR_CODES.UNLOCK] });
    } catch (e) {
        // TODO: Improve this error handling. Just ignore any failures for now so that it doesn't get stuck
        return;
    }

    const pdf = await setupMnemonic.generate({
        // Not translated because the PDF isn't translated
        date: `Created on ${format(new Date(), 'PPP')}`,
        emailAddress,
        recoveryPhrase: mnemonic,
    });

    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });

    return {
        mnemonic,
        blob,
    };
};

const setupKeys = async ({
    api,
    ktActivation,
    password,
    productParam,
}: {
    password: string;
    api: Api;
    ktActivation: KeyTransparencyActivation;
    productParam: ProductParam;
}) => {
    // NOTE: For VPN signup, the API doesn't automatically create an address, so this will simply return an empty
    // array, and keys won't be setup.
    const addresses = await getAllAddresses(api);

    const { preAuthKTVerify, preAuthKTCommit } = createPreAuthKTVerifier(ktActivation);

    let keySetupData = {
        keyPassword: '',
        clearKeyPassword: '',
    };
    if (addresses.length) {
        const keyPassword = await handleSetupKeys({
            api,
            addresses,
            password,
            preAuthKTVerify,
            product: productParam,
        });
        keySetupData = {
            keyPassword,
            clearKeyPassword: password,
        };
    }

    const user = await getUser(api);
    await preAuthKTCommit(user.ID, api);
    return { keySetupData, user, addresses };
};

export const handleSetupUser = async ({
    cache,
    api,
    ignoreVPN,
    setupMnemonic,
    reportPaymentSuccess,
    reportPaymentFailure,
}: {
    cache: SignupCacheResult;
    api: Api;
    ignoreVPN?: boolean;
    setupMnemonic?: SetupMnemonic;
    reportPaymentSuccess: () => void;
    reportPaymentFailure: () => void;
}): Promise<SignupActionResponse> => {
    const {
        accountData: { username, email, domain, password, signupType },
        referralData,
        subscriptionData,
        persistent,
        clientType,
        ktActivation,
        productParam,
    } = cache;

    const userEmail = (() => {
        if (signupType === SignupType.Proton) {
            return `${username}@${domain}`;
        }
        if (signupType === SignupType.External || signupType === SignupType.BringYourOwnEmail) {
            return email;
        }
        throw new Error('Unknown type');
    })();

    const authResponse = await srpAuth({
        api,
        credentials: {
            username: userEmail,
            password,
        },
        config: auth({ Username: userEmail }, persistent),
    }).then((response): Promise<AuthResponse> => response.json());

    // Perform the subscription first to prevent "locked user" while setting up keys.
    // Before, we needed to subscribe as a referral
    // The backend now takes care of this for us,
    // so we don't need to subscribe anymore on the frontend
    let subscription: Subscription | undefined;
    if (!referralData) {
        subscription = await handleSubscribeUser(
            api,
            subscriptionData,
            productParam,
            reportPaymentSuccess,
            reportPaymentFailure
        );
    }

    api(updateLocale(localeCode)).catch(noop);

    const { keySetupData, user, addresses } = await setupKeys({ api, ktActivation, password, productParam });

    const trusted = false;
    const sessionResult = await persistSession({
        ...authResponse,
        clearKeyPassword: keySetupData.clearKeyPassword,
        keyPassword: keySetupData.keyPassword,
        User: user,
        api,
        persistent,
        trusted,
        source: SessionSource.Proton,
    });

    const mnemonicData = await handleSetupMnemonic({
        emailAddress: userEmail,
        user,
        keyPassword: keySetupData.keyPassword,
        api,
        setupMnemonic,
    });

    const newCache: SignupCacheResult = {
        ...cache,
        trusted,
        subscription,
        setupData: {
            user,
            session: sessionResult,
            addresses,
            authResponse,
            mnemonicData,
            api,
        },
    };

    // Ignore the rest of the steps for VPN because we don't create an address and ask for recovery email at the start
    if (clientType === CLIENT_TYPES.VPN && !ignoreVPN) {
        return handleDone({ cache: newCache, appIntent: cache.appIntent });
    }

    // Start the easy switch import for pure BYOE accounts
    if (
        newCache.accountData?.signupType === SignupType.BringYourOwnEmail &&
        newCache.setupData?.addresses &&
        newCache.setupData?.addresses.length > 0
    ) {
        const addressID = newCache.setupData.addresses[0].ID;
        await api(
            startEasySwitchSignupImportTask({
                Source: EASY_SWITCH_SOURCES.ACCOUNT_WEB_SIGNUP,
                AddressId: addressID,
                Provider: OAUTH_PROVIDER.GOOGLE,
            })
        );
    }

    return {
        cache: newCache,
        to: SignupSteps.Congratulations,
    };
};

export const handlePayment = ({
    api,
    cache,
    subscriptionData,
}: {
    api: Api;
    cache: SignupCacheResult;
    subscriptionData: SubscriptionData;
}): Promise<SignupActionResponse> => {
    return handleCreateUser({
        cache: {
            ...cache,
            subscriptionData,
        },
        api,
    });
};

export const handleSelectPlan = async ({
    api,
    cache,
    subscriptionData,
}: {
    api: Api;
    cache: SignupCacheResult;
    subscriptionData: SubscriptionData;
}): Promise<SignupActionResponse> => {
    if (subscriptionData.checkResult.Amount > 0 && hasPlanIDs(subscriptionData.planIDs)) {
        return {
            cache: {
                ...cache,
                subscriptionData,
            },
            to: SignupSteps.Payment,
        };
    }

    return handleCreateUser({
        cache: {
            ...cache,
            subscriptionData,
        },
        api,
    });
};

export const usernameAvailabilityError = 'UsernameAvailabilityError';

export const handleCreateAccount = async ({
    cache,
    api,
}: {
    cache: SignupCacheResult;
    api: Api;
}): Promise<SignupActionResponse> => {
    const {
        accountData: { username, email, domain, signupType },
        humanVerificationResult,
    } = cache;

    try {
        if (signupType === SignupType.Proton) {
            await api(queryCheckUsernameAvailability(`${username}@${domain}`, true));
        }
    } catch (error: any) {
        error.type = usernameAvailabilityError;
        throw error;
    }

    if (signupType === SignupType.External) {
        try {
            await api(
                withVerificationHeaders(
                    humanVerificationResult?.token,
                    humanVerificationResult?.tokenType,
                    queryCheckEmailAvailability(email)
                )
            );
        } catch (error) {
            const humanVerificationData = hvHandler(error, HumanVerificationTrigger.ExternalCheck);
            return {
                cache: {
                    ...cache,
                    humanVerificationData,
                },
                to: SignupSteps.HumanVerification,
            };
        }
    }

    if (cache.referralData?.referrer) {
        return handleCreateUser({
            cache,
            api,
        });
    }

    if (cache.subscriptionData.checkResult.Amount > 0 && hasPlanIDs(cache.subscriptionData.planIDs)) {
        return {
            cache,
            to: SignupSteps.Payment,
        };
    }

    if (!cache.subscriptionData.skipUpsell) {
        return {
            cache,
            to: SignupSteps.Upsell,
        };
    }

    return handleCreateUser({
        cache,
        api,
    });
};

export const handleHumanVerification = async ({
    api,
    cache,
    token,
    tokenType,
    verificationModel,
}: {
    api: Api;
    cache: SignupCacheResult;
    token: string;
    tokenType: HumanVerificationMethodType;
    verificationModel?: VerificationModel;
}): Promise<SignupActionResponse> => {
    const humanVerificationResult = {
        token,
        tokenType,
        verificationModel,
    };

    if (cache.humanVerificationData?.trigger === HumanVerificationTrigger.ExternalCheck) {
        return handleCreateAccount({
            cache: {
                ...cache,
                humanVerificationResult,
            },
            api,
        });
    }

    if (cache.humanVerificationData?.trigger === HumanVerificationTrigger.UserCreation) {
        return handleCreateUser({
            cache: {
                ...cache,
                humanVerificationResult,
            },
            api,
        });
    }

    throw new Error('Human verification triggered from unknown step');
};
