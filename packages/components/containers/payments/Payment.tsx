import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { c } from 'ttag';

import Alert from '@proton/components/components/alert/Alert';
import Loader from '@proton/components/components/loader/Loader';
import Price from '@proton/components/components/price/Price';
import useConfig from '@proton/components/hooks/useConfig';
import { type DirectDebitProps, SepaDirectDebit } from '@proton/components/payments/chargebee/SepaDirectDebit';
import type { ThemeCode, ViewPaymentMethod } from '@proton/components/payments/client-extensions';
import { BilledUserInlineMessage } from '@proton/components/payments/client-extensions/billed-user';
import type { BitcoinHook } from '@proton/components/payments/react-extensions/useBitcoin';
import type { ChargebeeCardProcessorHook } from '@proton/components/payments/react-extensions/useChargebeeCard';
import type { ChargebeePaypalProcessorHook } from '@proton/components/payments/react-extensions/useChargebeePaypal';
import { type ChargebeeDirectDebitProcessorHook } from '@proton/components/payments/react-extensions/useSepaDirectDebit';
import {
    BILLING_ADDRESS_VALID,
    type BillingAddressStatus,
    type Currency,
    MIN_CREDIT_AMOUNT,
    PAYMENT_METHOD_TYPES,
    type PaymentMethodFlows,
    type PaymentMethodStatusExtended,
    type PaymentMethodType,
    type SavedPaymentMethod,
    type SavedPaymentMethodExternal,
    type SavedPaymentMethodInternal,
    canUseChargebee,
} from '@proton/payments';
import { APPS } from '@proton/shared/lib/constants';
import type { ChargebeeEnabled, User } from '@proton/shared/lib/interfaces';
import { isBilledUser } from '@proton/shared/lib/interfaces';
import clsx from '@proton/utils/clsx';

import type { CbIframeHandles } from '../../payments/chargebee/ChargebeeIframe';
import {
    type ChargebeeCardWrapperProps,
    ChargebeeCreditCardWrapper,
    type ChargebeePaypalWrapperProps,
    ChargebeeSavedCardWrapper,
} from '../../payments/chargebee/ChargebeeWrapper';
import Alert3DS from './Alert3ds';
import { ApplePayView } from './ApplePayView';
import Cash from './Cash';
import DefaultPaymentMethodMessage from './DefaultPaymentMethodMessage';
import PayPalView from './PayPalView';
import Bitcoin from './bitcoin/Bitcoin';
import BitcoinInfoMessage from './bitcoin/BitcoinInfoMessage';
import PaymentMethodDetails from './methods/PaymentMethodDetails';
import PaymentMethodSelector from './methods/PaymentMethodSelector';

export interface Props {
    children?: ReactNode;
    type: PaymentMethodFlows;
    amount?: number;
    currency?: Currency;
    method?: PaymentMethodType;
    onMethod: (value: PaymentMethodType | undefined) => void;
    paypal: any;
    paypalCredit: any;
    noMaxWidth?: boolean;
    paymentStatus: PaymentMethodStatusExtended | undefined;
    disabled?: boolean;
    paypalPrefetchToken?: boolean;
    isAuthenticated?: boolean;
    hideFirstLabel?: boolean;
    triggersDisabled?: boolean;
    hideSavedMethodsDetails?: boolean;
    defaultMethod?: PAYMENT_METHOD_TYPES;
    iframeHandles: CbIframeHandles;
    chargebeeCard: ChargebeeCardProcessorHook;
    chargebeePaypal: ChargebeePaypalProcessorHook;
    hasSomeVpnPlan: boolean;
    user: User | undefined;
    isTrial?: boolean;
}

export interface NoApiProps extends Props {
    lastUsedMethod?: ViewPaymentMethod;
    allMethods: ViewPaymentMethod[];
    isAuthenticated: boolean;
    loading: boolean;
    savedMethodInternal?: SavedPaymentMethodInternal;
    savedMethodExternal?: SavedPaymentMethodExternal;
    currency: Currency;
    amount: number;
    onPaypalCreditClick?: () => void;
    paymentComponentLoaded: () => void;
    themeCode?: ThemeCode;
    bitcoinInhouse: BitcoinHook;
    bitcoinChargebee: BitcoinHook;
    directDebit: ChargebeeDirectDebitProcessorHook;
    isChargebeeEnabled: () => ChargebeeEnabled;
    billingAddressStatus?: BillingAddressStatus;
    onChargebeeInitialized?: () => void;
    showCardIcons?: boolean;
    savedPaymentMethods: SavedPaymentMethod[];
    isCurrencyOverriden: boolean;
}

export const PaymentsNoApi = ({
    children,
    type,
    amount,
    currency,
    paypal,
    paypalCredit,
    method,
    onMethod,
    noMaxWidth = false,
    disabled,
    paypalPrefetchToken,
    lastUsedMethod,
    allMethods,
    isAuthenticated,
    loading,
    savedMethodInternal,
    savedMethodExternal,
    onPaypalCreditClick,
    hideFirstLabel,
    triggersDisabled,
    hideSavedMethodsDetails,
    defaultMethod,
    iframeHandles,
    chargebeeCard,
    chargebeePaypal,
    hasSomeVpnPlan,
    paymentComponentLoaded,
    themeCode,
    bitcoinInhouse,
    bitcoinChargebee,
    isChargebeeEnabled,
    user,
    directDebit,
    billingAddressStatus = BILLING_ADDRESS_VALID,
    paymentStatus,
    onChargebeeInitialized,
    showCardIcons,
    savedPaymentMethods,
    isTrial,
    isCurrencyOverriden,
}: NoApiProps) => {
    const { APP_NAME } = useConfig();

    const isBitcoinMethod =
        method === PAYMENT_METHOD_TYPES.BITCOIN || method === PAYMENT_METHOD_TYPES.CHARGEBEE_BITCOIN;
    const showBitcoinMethod = isBitcoinMethod && !isBilledUser(user);
    const showBitcoinPlaceholder = isBitcoinMethod && isBilledUser(user);

    useEffect(() => {
        paymentComponentLoaded();
    }, []);

    useEffect(() => {
        if (loading) {
            return onMethod(undefined);
        }
        if (defaultMethod) {
            onMethod(defaultMethod);
            return;
        }

        const selectedMethod = allMethods.find((otherMethod) => otherMethod.value === method);
        const result = allMethods[0];
        if (!selectedMethod && result) {
            onMethod(result.value);
        }
    }, [loading, allMethods.length]);

    if (type === 'credit' && amount < MIN_CREDIT_AMOUNT) {
        const price = (
            <Price key="price" currency={currency}>
                {MIN_CREDIT_AMOUNT}
            </Price>
        );
        return (
            <Alert className="mb-4" type="error">{c('Error')
                .jt`The minimum amount of credit that can be added is ${price}`}</Alert>
        );
    }

    if (amount <= 0 && !isTrial) {
        const price = (
            <Price key="price" currency={currency}>
                {0}
            </Price>
        );
        return <Alert className="mb-4" type="error">{c('Error').jt`The minimum payment we accept is ${price}`}</Alert>;
    }

    if (loading) {
        return <Loader />;
    }

    const isSignupPass = type === 'signup-pass' || type === 'signup-pass-upgrade';
    const isSignupVpn = type === 'signup-vpn';
    const isSignupWallet = type === 'signup-wallet';
    const isSingleSignup = isSignupPass || isSignupVpn || isSignupWallet;
    const showAlert3ds = !(
        type === 'signup' ||
        isSignupPass ||
        isSignupVpn ||
        isSignupWallet ||
        type === 'signup-v2' ||
        type === 'signup-v2-upgrade'
    );

    const sharedCbProps: Pick<
        ChargebeeCardWrapperProps & ChargebeePaypalWrapperProps & DirectDebitProps,
        'iframeHandles' | 'chargebeePaypal' | 'chargebeeCard' | 'directDebit' | 'onInitialized'
    > = {
        iframeHandles,
        chargebeeCard,
        chargebeePaypal,
        directDebit,
        onInitialized: onChargebeeInitialized,
    };

    const savedMethod = savedMethodInternal ?? savedMethodExternal;

    const showPaypalView =
        (method === PAYMENT_METHOD_TYPES.PAYPAL || method === PAYMENT_METHOD_TYPES.CHARGEBEE_PAYPAL) && !isSingleSignup;
    const showPaypalCredit =
        method === PAYMENT_METHOD_TYPES.PAYPAL &&
        !isSingleSignup &&
        APP_NAME !== APPS.PROTONVPN_SETTINGS &&
        !hasSomeVpnPlan;

    const renderSavedChargebeeIframe =
        savedMethod?.Type === PAYMENT_METHOD_TYPES.CHARGEBEE_CARD ||
        // CARD must use the Chargebee iframe if we are in migration mode. The migration mode can be detected
        // by having a saved v4 payment method and the chargebeeEnabled flag being set to CHARGEBEE_ALLOWED.
        (savedMethod?.Type === PAYMENT_METHOD_TYPES.CARD && canUseChargebee(isChargebeeEnabled()));

    const defaultPaymentMethodMessage = type === 'subscription' && (
        <DefaultPaymentMethodMessage
            className="mt-4"
            savedPaymentMethods={savedPaymentMethods}
            selectedPaymentMethod={method}
        />
    );

    return (
        <>
            <div
                className={clsx('payment-container center', noMaxWidth === false && 'max-w-full md:max-w-custom')}
                style={noMaxWidth === false ? { '--md-max-w-custom': '37em' } : undefined}
            >
                <div>
                    {!isSingleSignup && !hideFirstLabel && (
                        <h2 className="text-rg text-bold mb-1" data-testid="payment-label">
                            {c('Label').t`Payment method`}
                        </h2>
                    )}
                    <PaymentMethodSelector
                        options={allMethods}
                        method={method}
                        onChange={(value) => onMethod(value)}
                        lastUsedMethod={lastUsedMethod}
                        narrow={isSingleSignup}
                        showCardIcons={showCardIcons}
                    />
                </div>
                <div className="mt-4">
                    {method === PAYMENT_METHOD_TYPES.CHARGEBEE_CARD && (
                        <>
                            <ChargebeeCreditCardWrapper
                                {...sharedCbProps}
                                themeCode={themeCode}
                                initialCountryCode={paymentStatus?.CountryCode}
                            />
                            {showAlert3ds && <Alert3DS />}
                        </>
                    )}
                    {method === PAYMENT_METHOD_TYPES.CASH && <Cash />}
                    {method === PAYMENT_METHOD_TYPES.APPLE_PAY && <ApplePayView />}
                    {method === PAYMENT_METHOD_TYPES.CHARGEBEE_SEPA_DIRECT_DEBIT && (
                        <SepaDirectDebit {...sharedCbProps} isCurrencyOverriden={isCurrencyOverriden} />
                    )}
                    {(() => {
                        if (!showBitcoinMethod) {
                            return null;
                        }

                        if (!isAuthenticated) {
                            return (
                                <p>{c('Info')
                                    .t`In the next step, you’ll be able to submit a deposit using a Bitcoin address.`}</p>
                            );
                        }

                        if (method === PAYMENT_METHOD_TYPES.BITCOIN) {
                            return (
                                <>
                                    <BitcoinInfoMessage />
                                    <Bitcoin {...bitcoinInhouse} />
                                </>
                            );
                        }

                        if (method === PAYMENT_METHOD_TYPES.CHARGEBEE_BITCOIN) {
                            if (billingAddressStatus.valid) {
                                return (
                                    <>
                                        <BitcoinInfoMessage />
                                        <Bitcoin {...bitcoinChargebee} />
                                    </>
                                );
                            }

                            const text =
                                billingAddressStatus.reason === 'missingCountry'
                                    ? c('Payments').t`Please select your billing country first.`
                                    : // translator: "state" as in "United States of America"
                                      c('Payments').t`Please select your billing state first.`;

                            return (
                                <>
                                    <Loader />
                                    <p className="text-center">{text}</p>
                                </>
                            );
                        }

                        return null;
                    })()}
                    {showBitcoinPlaceholder && <BilledUserInlineMessage />}
                    {showPaypalView && (
                        <PayPalView
                            method={method}
                            paypal={paypal}
                            paypalCredit={paypalCredit}
                            amount={amount}
                            currency={currency}
                            type={type}
                            disabled={disabled}
                            prefetchToken={paypalPrefetchToken}
                            onClick={onPaypalCreditClick}
                            triggersDisabled={triggersDisabled}
                            showPaypalCredit={showPaypalCredit}
                        />
                    )}
                    {savedMethod && (
                        <>
                            {!hideSavedMethodsDetails && (
                                <PaymentMethodDetails type={savedMethod.Type} details={savedMethod.Details} />
                            )}
                            {(savedMethod.Type === PAYMENT_METHOD_TYPES.CARD ||
                                savedMethod.Type === PAYMENT_METHOD_TYPES.CHARGEBEE_CARD) &&
                                showAlert3ds && <Alert3DS />}
                            {renderSavedChargebeeIframe && <ChargebeeSavedCardWrapper {...sharedCbProps} />}
                        </>
                    )}
                    {children}
                    {defaultPaymentMethodMessage}
                </div>
            </div>
        </>
    );
};
