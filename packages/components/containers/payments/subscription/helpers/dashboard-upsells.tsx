import { type ReactNode, useEffect } from 'react';

import { c } from 'ttag';

import type { ButtonLikeProps } from '@proton/atoms';
import { type TelemetryPaymentFlow } from '@proton/components/payments/client-extensions/usePaymentsTelemetry';
import useLoading from '@proton/hooks/useLoading';
import {
    CYCLE,
    type Currency,
    type Cycle,
    type FreePlanDefault,
    type FullPlansMap,
    PLANS,
    type Plan,
    type Subscription,
    getIsB2BAudienceFromPlan,
    getPricePerCycle,
} from '@proton/payments';
import {
    getHasConsumerVpnPlan,
    hasBundle,
    hasDeprecatedVPN,
    hasDrive,
    hasDrive1TB,
    hasDriveBusiness,
    hasDuo,
    hasMail,
    hasMailBusiness,
    hasMailPro,
    hasPass,
    hasPassFamily,
    hasVPN2024,
    hasVPNPassBundle,
    hasVpnBusiness,
    hasVpnPro,
    hasWallet,
    isTrial,
} from '@proton/payments';
import { type PreloadedPaymentsContextType, getPlanToCheck, usePaymentsPreloaded } from '@proton/payments/ui';
import { MAX_CALENDARS_PAID } from '@proton/shared/lib/calendar/constants';
import type { APP_NAMES } from '@proton/shared/lib/constants';
import {
    APPS,
    BRAND_NAME,
    DASHBOARD_UPSELL_PATHS,
    DUO_MAX_USERS,
    FAMILY_MAX_USERS,
    FREE_VPN_CONNECTIONS,
    UPSELL_COMPONENT,
} from '@proton/shared/lib/constants';
import humanSize from '@proton/shared/lib/helpers/humanSize';
import { getUpsellRefFromApp } from '@proton/shared/lib/helpers/upsell';
import type { UserModel, VPNServersCountData } from '@proton/shared/lib/interfaces';
import isTruthy from '@proton/utils/isTruthy';
import noop from '@proton/utils/noop';

import { getPhoneSupport } from '../../features/b2b';
import { getNCalendarsFeature, getNCalendarsPerUserFeature } from '../../features/calendar';
import {
    getCollaborate,
    getStorageBoostFeatureB2B,
    getStorageFeature,
    getStorageFeatureB2B,
    getVersionHistory,
} from '../../features/drive';
import { getCustomBranding, getSentinel, getSupport, getUsersFeature } from '../../features/highlights';
import type { PlanCardFeatureDefinition } from '../../features/interface';
import {
    getB2BNDomainsFeature,
    getNAddressesFeature,
    getNAddressesFeatureB2B,
    getNDomainsFeature,
    getProtonScribe,
} from '../../features/mail';
import {
    FREE_PASS_ALIASES,
    PASS_PLUS_VAULTS,
    get2FAAuthenticator,
    getAdvancedAliasFeatures,
    getDarkWebMonitoring,
    getDevices,
    getHideMyEmailAliases,
    getLinkSharing,
    getLoginsAndNotes,
    getPassAdminPanel,
    getPassUsers,
    getPasswordManager,
    getProtonPassFeature,
    getVaultSharing,
    getVaultSharingB2B,
    getVaults,
} from '../../features/pass';
import { getShortPlan, getVPNEnterprisePlan } from '../../features/plan';
import {
    getB2BHighSpeedVPNConnectionsFeature,
    getDedicatedAccountManagerVPNFeature,
    getDedicatedServersVPNFeature,
    getHighSpeedVPNConnectionsFeature,
    getVPNConnections,
    getVPNConnectionsFeature,
} from '../../features/vpn';
import type { OpenSubscriptionModalCallback } from '../SubscriptionModalProvider';
import { SUBSCRIPTION_STEPS } from '../constants';
import VpnEnterpriseAction from './VpnEnterpriseAction';
import { getAllowedCycles } from './getAllowedCycles';

export const defaultUpsellCycleB2C = CYCLE.YEARLY;
const defaultUpsellCycleB2B = CYCLE.YEARLY;

export interface UpsellFeature extends Omit<PlanCardFeatureDefinition, 'status' | 'highlight' | 'included'> {
    status?: PlanCardFeatureDefinition['status'];
    included?: PlanCardFeatureDefinition['included'];
}

type MaybeUpsellFeature = UpsellFeature | undefined;

export type ButtonShape = ButtonLikeProps<'button'>['shape'];
export type ButtonColor = ButtonLikeProps<'button'>['color'];

/**
 * CTA stands for Call To Action. That's meant to be used with buttons that will start the upgrading flow.
 * For example, "Buy plan XYZ for $X/month"
 */
export interface UpsellCta {
    label: string | string[];
    action: () => void;
    fullWidth?: boolean;
    shape?: ButtonShape;
    color?: ButtonColor;
}

export function isUpsellCta(item: any): item is UpsellCta {
    return item && typeof item === 'object' && 'label' in item && 'action' in item;
}

interface Price {
    value: number;
    currency: Currency;
}

export interface Upsell {
    plan?: PLANS;
    /**
     * Unique key for React rednering.
     */
    planKey: string;
    title: string;
    description: string;
    isRecommended?: boolean;
    highlightPrice?: boolean;
    features: UpsellFeature[];
    /**
     * If there is a fully custom plan, like VPN Enterprise, then there is no need for price.
     * It can be used together with ignoreDefaultCta
     */
    price?: Price;
    onUpgrade: (cycle?: Cycle) => void;
    defaultCtaOverrides?: Partial<UpsellCta>;
    otherCtas: (UpsellCta | ReactNode)[];
    upsellRefLink?: string;
    isTrialEnding?: boolean;
    /**
     * The default CTA won't be rendered at all if this is true.
     */
    ignoreDefaultCta?: boolean;
    customCycle?: CYCLE;
    cycle?: CYCLE;
    initializeOfferPrice?: (paymentsContext: PreloadedPaymentsContextType) => Promise<unknown>;
}

export type MaybeUpsell = Upsell | null;

type GetUpsellArgs = {
    freePlan: FreePlanDefault;
    plan: PLANS;
    plansMap: { [key in PLANS]: Plan };
    app: APP_NAMES;
    upsellPath: DASHBOARD_UPSELL_PATHS;
    serversCount: VPNServersCountData;
    customCycle?: CYCLE;
    telemetryFlow: TelemetryPaymentFlow;
} & Partial<Upsell>;

export type GetPlanUpsellArgs = Omit<GetUpsellArgs, 'plan' | 'upsellPath' | 'otherCtas'> & {
    hasPaidMail?: boolean;
    hasVPN: boolean;
    hasUsers?: boolean;
    hasDriveBusinessPlan?: boolean;
    openSubscriptionModal: OpenSubscriptionModalCallback;
};

const exploreAllPlansCTA = (openSubscriptionModal: OpenSubscriptionModalCallback): UpsellCta | ReactNode => {
    return {
        label: c('new_plans: Action').t`Explore all ${BRAND_NAME} plans`,
        color: 'norm',
        shape: 'ghost',
        action: () =>
            openSubscriptionModal({
                step: SUBSCRIPTION_STEPS.PLAN_SELECTION,
                metrics: {
                    source: 'upsells',
                },
            }),
    };
};

export const getUpsell = ({
    plan,
    plansMap,
    serversCount,
    upsellPath,
    freePlan,
    app,
    customCycle,
    ...upsellFields
}: GetUpsellArgs) => {
    const fullPlan = plansMap[plan];
    const shortPlan = getShortPlan(plan, plansMap, { vpnServers: serversCount, freePlan });

    if (!shortPlan || !fullPlan) {
        return null;
    }

    const upsellRefLink = getUpsellRefFromApp({
        app: APPS.PROTONACCOUNT,
        fromApp: app,
        feature: upsellPath,
        component: UPSELL_COMPONENT.BUTTON,
    });

    const currency = fullPlan.Currency;

    const allowedCycles = getAllowedCycles({
        currency,
        plansMap,
        planIDs: { [plan]: 1 },
        subscription: undefined,
    });

    const defaultCycleForSelectedAudience = getIsB2BAudienceFromPlan(plan)
        ? defaultUpsellCycleB2B
        : defaultUpsellCycleB2C;

    const preferredCycle = customCycle ?? defaultCycleForSelectedAudience;

    const cycle = allowedCycles.includes(preferredCycle) ? preferredCycle : allowedCycles[0];

    const initializeOfferPrice = async (paymentsContext: PreloadedPaymentsContextType) => {
        const planToCheck = getPlanToCheck({ planIDs: { [plan]: 1 }, cycle, currency });
        if (!planToCheck.coupon) {
            return;
        }

        return paymentsContext.checkMultiplePlans([planToCheck]);
    };

    return {
        app,
        plan,
        planKey: plan,
        title: upsellFields.isTrialEnding ? c('new_plans: Title').t`${shortPlan.title} Trial` : shortPlan.title,
        description: shortPlan.description,
        upsellRefLink,
        price: { value: (getPricePerCycle(fullPlan, cycle) || 0) / cycle, currency },
        features: (upsellFields.features ?? shortPlan.features).filter((item) => isTruthy(item)),
        otherCtas: [],
        currency,
        customCycle,
        cycle,
        ...upsellFields,
        onUpgrade: () => upsellFields.onUpgrade?.(cycle),
        initializeOfferPrice,
    };
};

const getMailPlusUpsell = ({
    plansMap,
    openSubscriptionModal,
    isTrialEnding,
    freePlan,
    app,
    ...rest
}: GetPlanUpsellArgs): MaybeUpsell => {
    const mailPlusPlan = plansMap[PLANS.MAIL];
    if (!mailPlusPlan) {
        return null;
    }

    const features: MaybeUpsellFeature[] = [
        getStorageFeature(mailPlusPlan?.MaxSpace ?? 15, { freePlan }),
        getNAddressesFeature({ n: 10 }),
        getNDomainsFeature({ n: 1 }),
        getNCalendarsFeature(MAX_CALENDARS_PAID),
        getVPNConnectionsFeature(FREE_VPN_CONNECTIONS),
        getProtonPassFeature(FREE_PASS_ALIASES),
    ];

    return getUpsell({
        plan: PLANS.MAIL,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.MAILPLUS,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        freePlan,
        otherCtas: isTrialEnding ? [exploreAllPlansCTA(openSubscriptionModal)] : [],
        isTrialEnding,
        onUpgrade: () =>
            openSubscriptionModal({
                plan: PLANS.MAIL,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getDriveUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    return getUpsell({
        plan: PLANS.DRIVE,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.DRIVE,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.DRIVE,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getDrive1TBUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    return getUpsell({
        plan: PLANS.DRIVE_1TB,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.DRIVE,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.DRIVE_1TB,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getVPNUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    const plan = PLANS.VPN2024;

    return getUpsell({
        plan,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.VPN,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        customCycle: CYCLE.TWO_YEARS,
        ...rest,
    });
};

const getLumoUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    return getUpsell({
        plan: PLANS.LUMO,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.LUMO,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.LUMO,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getPassUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    return getUpsell({
        plan: PLANS.PASS,
        plansMap,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.PASS,
        onUpgrade: (cycle) =>
            openSubscriptionModal({
                cycle: cycle ?? defaultUpsellCycleB2C,
                plan: PLANS.PASS,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getPassFamilyUpsell = ({ plansMap, openSubscriptionModal, app, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    const features: MaybeUpsellFeature[] = [
        getPassUsers(FAMILY_MAX_USERS),
        getPassAdminPanel(),
        getLoginsAndNotes('paid'),
        getDevices(),
        getHideMyEmailAliases('unlimited'),
        getAdvancedAliasFeatures(true),
        getVaults(PASS_PLUS_VAULTS),
        getVaultSharing(10),
        getLinkSharing(),
        get2FAAuthenticator(true),
        getDarkWebMonitoring(),
        getSentinel(true),
        getSupport('priority'),
    ];

    return getUpsell({
        plan: PLANS.PASS_FAMILY,
        plansMap,
        upsellPath: DASHBOARD_UPSELL_PATHS.PASS,
        app,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        onUpgrade: (cycle) =>
            openSubscriptionModal({
                cycle: cycle ?? defaultUpsellCycleB2C,
                plan: PLANS.PASS_FAMILY,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

/**
 * Upsell for Bundle (a.k.a Unlimited)
 */
const getBundleUpsell = ({
    plansMap,
    openSubscriptionModal,
    app,
    freePlan,
    isTrialEnding,
    hasUsers,
    ...rest
}: GetPlanUpsellArgs): MaybeUpsell => {
    const bundlePlan = plansMap[PLANS.BUNDLE];
    if (!bundlePlan) {
        return null;
    }

    const features: MaybeUpsellFeature[] = [
        getStorageFeature(bundlePlan?.MaxSpace ?? 500, { freePlan }),
        hasUsers ? getUsersFeature(1) : undefined,
        getNAddressesFeature({ n: 15 }),
        getNDomainsFeature({ n: bundlePlan?.MaxDomains ?? 3 }),
        getNCalendarsFeature(MAX_CALENDARS_PAID),
        getVersionHistory('10y'),
        getHighSpeedVPNConnectionsFeature(),
        getProtonPassFeature(),
        getSentinel(true),
    ];

    return getUpsell({
        plan: PLANS.BUNDLE,
        plansMap,
        freePlan,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.UNLIMITED,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.BUNDLE,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        otherCtas: isTrialEnding ? [exploreAllPlansCTA(openSubscriptionModal)] : [],
        isTrialEnding,
        ...rest,
    });
};

const getDuoUpsell = ({
    plansMap,
    freePlan,
    openSubscriptionModal,
    app,
    serversCount,
    ...rest
}: GetPlanUpsellArgs): MaybeUpsell => {
    const duoPlan = plansMap[PLANS.DUO];
    if (!duoPlan) {
        return null;
    }

    const features: MaybeUpsellFeature[] = [
        getStorageFeature(duoPlan.MaxSpace, { duo: true, freePlan }),
        getUsersFeature(DUO_MAX_USERS),
        getNAddressesFeature({ n: duoPlan.MaxAddresses, duo: true }),
        getNDomainsFeature({ n: duoPlan.MaxDomains }),
        getNCalendarsFeature(MAX_CALENDARS_PAID),
        getHighSpeedVPNConnectionsFeature(),
        getProtonPassFeature(),
        getSentinel(true),
        getProtonScribe(true),
    ];

    return getUpsell({
        plan: PLANS.DUO,
        plansMap,
        freePlan,
        serversCount,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.DUO,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.DUO,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getFamilyUpsell = ({
    plansMap,
    freePlan,
    openSubscriptionModal,
    app,
    serversCount,
    ...rest
}: GetPlanUpsellArgs): MaybeUpsell => {
    const familyPlan = plansMap[PLANS.FAMILY];
    if (!familyPlan) {
        return null;
    }

    const features: MaybeUpsellFeature[] = [
        getStorageFeature(familyPlan.MaxSpace, { family: true, freePlan }),
        getUsersFeature(FAMILY_MAX_USERS),
        getNAddressesFeature({ n: familyPlan.MaxAddresses, family: true }),
        getNDomainsFeature({ n: familyPlan.MaxDomains }),
        getNCalendarsFeature(MAX_CALENDARS_PAID),
        getHighSpeedVPNConnectionsFeature(),
        getProtonPassFeature(),
        getSentinel(true),
        getProtonScribe(true),
    ];

    return getUpsell({
        plan: PLANS.FAMILY,
        plansMap,
        freePlan,
        serversCount,
        app,
        upsellPath: DASHBOARD_UPSELL_PATHS.FAMILY,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2C,
                plan: PLANS.FAMILY,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
                telemetryFlow: rest.telemetryFlow,
            }),
        ...rest,
    });
};

const getMailBusinessUpsell = ({ plansMap, openSubscriptionModal, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    const mailBusinessPlan = plansMap[PLANS.MAIL_BUSINESS];
    if (!mailBusinessPlan) {
        return null;
    }

    const mailBusinessStorage = humanSize({ bytes: mailBusinessPlan?.MaxSpace ?? 50, fraction: 0 });

    const features: UpsellFeature[] = [
        getStorageBoostFeatureB2B(mailBusinessStorage),
        getNAddressesFeatureB2B({ n: mailBusinessPlan?.MaxAddresses ?? 15 }),
        getB2BNDomainsFeature(mailBusinessPlan?.MaxDomains ?? 10),
        getVPNConnections(1),
        getCustomBranding(true),
        getSentinel(true),
    ];

    return getUpsell({
        plan: PLANS.MAIL_BUSINESS,
        plansMap,
        features,
        upsellPath: DASHBOARD_UPSELL_PATHS.MAILEPRO,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: defaultUpsellCycleB2B,
                plan: PLANS.MAIL_BUSINESS,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
            }),
        ...rest,
    });
};

const getBundleProUpsell = ({
    plansMap,
    openSubscriptionModal,
    hasDriveBusinessPlan = false,
    ...rest
}: GetPlanUpsellArgs): MaybeUpsell => {
    const plan = PLANS.BUNDLE_PRO_2024;
    const bundleProPlan = plansMap[plan];
    if (!bundleProPlan) {
        return null;
    }

    const storageBytes = bundleProPlan?.MaxSpace ?? 1099511627776;
    const businessStorage = humanSize({ bytes: storageBytes, fraction: 0, unitOptions: { max: 'TB' } });

    const features: MaybeUpsellFeature[] = [
        hasDriveBusinessPlan ? getStorageFeatureB2B(storageBytes, {}) : getStorageBoostFeatureB2B(businessStorage),
        getB2BNDomainsFeature(bundleProPlan?.MaxDomains ?? 15),
        getNCalendarsPerUserFeature(MAX_CALENDARS_PAID),
        getCollaborate(),
        getVersionHistory('10y'),
        getPasswordManager(),
        getVaultSharingB2B('unlimited'),
        getB2BHighSpeedVPNConnectionsFeature(),
        getSentinel(true),
        getPhoneSupport(),
    ];

    return getUpsell({
        plan,
        plansMap,
        features: features.filter((item): item is UpsellFeature => isTruthy(item)),
        upsellPath: DASHBOARD_UPSELL_PATHS.BUSINESS,
        onUpgrade: () =>
            openSubscriptionModal({
                plan,
                cycle: defaultUpsellCycleB2B,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
            }),
        ...rest,
    });
};

const getVpnBusinessUpsell = ({ plansMap, openSubscriptionModal, ...rest }: GetPlanUpsellArgs): MaybeUpsell => {
    const features: UpsellFeature[] = [getDedicatedServersVPNFeature()];

    const customCycle = CYCLE.TWO_YEARS;

    return getUpsell({
        plan: PLANS.VPN_BUSINESS,
        plansMap,
        features,
        customCycle,
        upsellPath: DASHBOARD_UPSELL_PATHS.BUSINESS,
        onUpgrade: () =>
            openSubscriptionModal({
                cycle: customCycle,
                plan: PLANS.VPN_BUSINESS,
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                metrics: {
                    source: 'upsells',
                },
            }),
        defaultCtaOverrides: {
            shape: 'solid',
            color: 'norm',
        },
        ...rest,
    });
};

const getVpnEnterpriseUpsell = (serversCount: VPNServersCountData): Upsell => {
    const vpnEnteriprisePlan = getVPNEnterprisePlan(serversCount);

    return {
        planKey: 'VPN_ENTERPRISE',
        title: vpnEnteriprisePlan.title,
        description: vpnEnteriprisePlan.description,
        features: [getDedicatedServersVPNFeature(serversCount), getDedicatedAccountManagerVPNFeature()],
        ignoreDefaultCta: true,
        otherCtas: [<VpnEnterpriseAction shape="outline" size="large" />],
        // because we have a custom CTA (<VpnEnterpriseAction />), the onUpgrade callback will never be used
        onUpgrade: noop,
    };
};

const hasOnePlusSubscription = (subscription: Subscription) => {
    return (
        hasMail(subscription) ||
        hasDrive(subscription) ||
        hasPass(subscription) ||
        hasWallet(subscription) ||
        hasDeprecatedVPN(subscription) ||
        hasVPNPassBundle(subscription) ||
        hasVPN2024(subscription)
    );
};

type ResolveUpsellsToDisplayProps = {
    app: APP_NAMES;
    subscription?: Subscription;
    plansMap: FullPlansMap;
    freePlan: FreePlanDefault;
    serversCount: VPNServersCountData;
    canPay?: boolean;
    isFree?: boolean;
    hasPaidMail?: boolean;
    openSubscriptionModal: OpenSubscriptionModalCallback;
    canAccessDuoPlan?: boolean;
    user: UserModel;
    telemetryFlow: TelemetryPaymentFlow;
};

export const resolveUpsellsToDisplay = ({
    app,
    subscription,
    plansMap,
    serversCount,
    freePlan,
    canPay,
    isFree,
    canAccessDuoPlan,
    user,
    telemetryFlow,
    ...rest
}: ResolveUpsellsToDisplayProps) => {
    const resolve = () => {
        if (!canPay || !subscription) {
            return [];
        }

        const upsellsPayload = {
            app,
            plansMap,
            hasVPN: getHasConsumerVpnPlan(subscription),
            serversCount,
            freePlan,
            telemetryFlow,
            ...rest,
        };

        const hasMailFree = isFree && app === APPS.PROTONMAIL;
        const hasDriveFree = isFree && app === APPS.PROTONDRIVE;
        const hasPassFree = isFree && app === APPS.PROTONPASS && !user.hasPassLifetime;
        const hasVPNFree = isFree && app === APPS.PROTONVPN_SETTINGS;
        const hasLumoFree = isFree && app === APPS.PROTONLUMO;

        switch (true) {
            case Boolean(isTrial(subscription) && hasMail(subscription) && subscription.PeriodEnd):
                return [
                    getMailPlusUpsell({ ...upsellsPayload, isTrialEnding: true }),
                    getBundleUpsell({ ...upsellsPayload, isRecommended: true }),
                ];
            case Boolean(isTrial(subscription) && hasBundle(subscription) && subscription.PeriodEnd):
                return [getBundleUpsell({ ...upsellsPayload, isTrialEnding: true })];
            case Boolean(hasMailFree):
                return [
                    getMailPlusUpsell({ ...upsellsPayload }),
                    getBundleUpsell({ ...upsellsPayload, isRecommended: true }),
                ];
            case Boolean(hasDriveFree):
                return [getDriveUpsell(upsellsPayload), getDrive1TBUpsell({ ...upsellsPayload, isRecommended: true })];
            case Boolean(hasPassFree):
                return [getPassUpsell(upsellsPayload), getPassFamilyUpsell(upsellsPayload)];
            case Boolean(hasVPNFree):
                return [getVPNUpsell(upsellsPayload)];
            case Boolean(hasLumoFree):
                return [getLumoUpsell({ ...upsellsPayload, isRecommended: true })];
            case Boolean(hasPass(subscription)):
                return [
                    getPassFamilyUpsell({ ...upsellsPayload, isRecommended: true }),
                    getBundleUpsell({ ...upsellsPayload }),
                ];
            case hasDrive(subscription):
                return [
                    getDrive1TBUpsell({ ...upsellsPayload, isRecommended: true }),
                    canAccessDuoPlan ? getDuoUpsell(upsellsPayload) : getFamilyUpsell(upsellsPayload),
                ];
            case hasDrive1TB(subscription):
                return [
                    canAccessDuoPlan ? getDuoUpsell(upsellsPayload) : getFamilyUpsell(upsellsPayload),
                    getFamilyUpsell(upsellsPayload),
                ];
            case Boolean(isFree || hasOnePlusSubscription(subscription)):
                return [
                    getBundleUpsell({
                        ...upsellsPayload,
                        hasUsers: canAccessDuoPlan,
                        isRecommended: true,
                    }),
                    canAccessDuoPlan ? getDuoUpsell(upsellsPayload) : getFamilyUpsell(upsellsPayload),
                ];
            case hasBundle(subscription):
                return [
                    canAccessDuoPlan &&
                        getDuoUpsell({
                            ...upsellsPayload,
                            isRecommended: true,
                        }),
                    getFamilyUpsell(upsellsPayload),
                ].filter(isTruthy);
            case Boolean(hasDuo(subscription) || hasPassFamily(subscription)):
                return [
                    getFamilyUpsell({
                        ...upsellsPayload,
                        isRecommended: true,
                    }),
                ];
            case hasMailPro(subscription):
                return [getMailBusinessUpsell(upsellsPayload)];
            case hasMailBusiness(subscription) || hasDriveBusiness(subscription):
                return [
                    getBundleProUpsell({
                        ...upsellsPayload,
                        hasDriveBusinessPlan: hasDriveBusiness(subscription),
                    }),
                ];
            case hasVpnPro(subscription):
                return [getVpnBusinessUpsell(upsellsPayload), getVpnEnterpriseUpsell(serversCount)];
            case hasVpnBusiness(subscription):
                return [getVpnEnterpriseUpsell(serversCount), getBundleProUpsell({ ...upsellsPayload })].filter(
                    isTruthy
                );
            default:
                return [];
        }
    };

    return resolve().filter((maybeUpsell): maybeUpsell is Upsell => isTruthy(maybeUpsell));
};

export const useUpsellsToDisplay = (
    props: ResolveUpsellsToDisplayProps
): {
    upsells: Upsell[];
    loading: boolean;
} => {
    const payments = usePaymentsPreloaded();
    const [loading, withLoading] = useLoading(true);

    const upsells = resolveUpsellsToDisplay(props);
    const key = upsells.map((upsell) => upsell.planKey).join('-');
    useEffect(() => {
        if (!payments.hasEssentialData) {
            return;
        }

        const promises = upsells.map((upsell) => upsell?.initializeOfferPrice?.(payments)).filter(isTruthy);
        withLoading(Promise.all(promises)).catch(noop);
    }, [key, payments.hasEssentialData]);

    return {
        upsells,
        loading: loading,
    };
};
