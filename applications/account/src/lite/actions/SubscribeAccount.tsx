import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { c } from 'ttag';

import { useOrganization } from '@proton/account/organization/hooks';
import { usePlans } from '@proton/account/plans/hooks';
import { useSubscription } from '@proton/account/subscription/hooks';
import { useUser } from '@proton/account/user/hooks';
import { Button, Tooltip } from '@proton/atoms';
import {
    CalendarLogo,
    DriveLogo,
    Icon,
    Logo,
    MailLogo,
    PassLogo,
    ProtonLogo,
    SUBSCRIPTION_STEPS,
    VpnLogo,
} from '@proton/components';
import PaymentSwitcher from '@proton/components/containers/payments/PaymentSwitcher';
import { InAppText } from '@proton/components/containers/payments/subscription/InAppPurchaseModal';
import SubscriptionContainer from '@proton/components/containers/payments/subscription/SubscriptionContainer';
import { usePaymentsApi } from '@proton/components/payments/react-extensions/usePaymentsApi';
import {
    COUPON_CODES,
    CURRENCIES,
    type Currency,
    FREE_PLAN,
    PLANS,
    PLAN_TYPES,
    type PaymentMethodStatusExtended,
    fixPlanName,
    getAvailableSubscriptionActions,
    getHas2024OfferCoupon,
    getPlan,
    getUpgradedPlan,
    getValidCycle,
} from '@proton/payments';
import { getApiError, getApiErrorMessage } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import type { ProductParam } from '@proton/shared/lib/apps/product';
import {
    APPS,
    BRAND_NAME,
    CALENDAR_APP_NAME,
    DRIVE_APP_NAME,
    HTTP_STATUS_CODE,
    MAIL_APP_NAME,
    PASS_APP_NAME,
    VPN_APP_NAME,
} from '@proton/shared/lib/constants';
import { replaceUrl } from '@proton/shared/lib/helpers/browser';
import type { UserModel } from '@proton/shared/lib/interfaces';
import { canPay } from '@proton/shared/lib/user/helpers';
import clsx from '@proton/utils/clsx';

import broadcast, { MessageType } from '../broadcast';
import LiteBox from '../components/LiteBox';
import PromotionAlreadyApplied from '../components/PromotionAlreadyApplied';
import PromotionExpired from '../components/PromotionExpired';
import SubscribeAccountDone from '../components/SubscribeAccountDone';
import { SubscribeType } from '../types/SubscribeType';

import './SubscribeAccount.scss';

interface Props {
    redirect?: string | undefined;
    fullscreen?: boolean;
    searchParams: URLSearchParams;
    app: ProductParam;
    loader: ReactNode;
    layout: (children: ReactNode, props: any) => ReactNode;
    onSubscribed?: () => void;
    childOverride?: ReactNode;
}

const plusPlans = [
    PLANS.VPN,
    PLANS.VPN2024,
    PLANS.MAIL,
    PLANS.DRIVE,
    PLANS.PASS,
    PLANS.VPN_PASS_BUNDLE,
    PLANS.WALLET,
    PLANS.LUMO,
];

export const SubscribeAccountHeader = ({
    title,
    user,
    onClose,
}: {
    title: ReactNode;
    user: UserModel;
    onClose?: () => void;
}) => {
    const { Email, DisplayName, Name } = user;
    const nameToDisplay = Email || DisplayName || Name;
    return (
        <div className="flex flex-nowrap shrink-0 items-start justify-space-between" data-testid="lite:account-header">
            <div>
                {title && (
                    <>
                        <h1 className="text-bold text-4xl">{title}</h1>
                        <div className="color-weak text-break" data-testid="lite:account-info">
                            {nameToDisplay}
                        </div>
                    </>
                )}
            </div>
            {onClose && (
                <Tooltip title={c('Action').t`Close`}>
                    <Button className="shrink-0" icon shape="ghost" onClick={onClose}>
                        <Icon className="modal-close-icon" name="cross-big" alt={c('Action').t`Close`} />
                    </Button>
                </Tooltip>
            )}
        </div>
    );
};

const SubscribeAccount = ({ app, redirect, searchParams, loader, layout, childOverride, onSubscribed }: Props) => {
    const onceCloseRef = useRef(false);
    const topRef = useRef<HTMLDivElement>(null);
    const [user] = useUser();

    const [type, setType] = useState<SubscribeType | undefined>(undefined);

    const [subscription, loadingSubscription] = useSubscription();
    const [plansResult, loadingPlans] = usePlans();
    const plans = plansResult?.plans || [];
    const freePlan = plansResult?.freePlan || FREE_PLAN;
    const [organization, loadingOrganization] = useOrganization();
    const [error, setError] = useState({ title: '', message: '', error: '' });
    const [paymentsStatus, setStatus] = useState<PaymentMethodStatusExtended>();
    const { paymentsApi } = usePaymentsApi();

    const canEdit = canPay(user);

    useEffect(() => {
        async function run() {
            const status = await paymentsApi.statusExtendedAutomatic();
            setStatus(status);
        }

        void run();
    }, []);

    if (
        !organization ||
        !subscription ||
        loadingSubscription ||
        loadingPlans ||
        loadingOrganization ||
        !paymentsStatus
    ) {
        return loader;
    }

    // Error in usage (this action is not meant to be shown if it cannot be triggered, so untranslated.
    if (!canEdit) {
        return layout(
            <LiteBox>Please contact the administrator of the organization to manage the subscription</LiteBox>,
            {
                className: 'flex justify-center items-center',
            }
        );
    }

    const maybeStart = searchParams.get('start');
    const maybeType = searchParams.get('type');

    const cycleParam = parseInt(searchParams.get('cycle') as any, 10);
    const parsedCycle = cycleParam ? getValidCycle(cycleParam) : undefined;

    const minimumCycleParam = parseInt(searchParams.get('minimumCycle') as any, 10);
    const parsedMinimumCycle = cycleParam ? getValidCycle(minimumCycleParam) : undefined;

    const coupon = searchParams.get('coupon') || undefined;

    const currencyParam = searchParams.get('currency')?.toUpperCase();
    let parsedCurrency =
        currencyParam && CURRENCIES.includes(currencyParam as any) ? (currencyParam as Currency) : undefined;

    if (getHas2024OfferCoupon(coupon) && parsedCurrency === 'BRL') {
        parsedCurrency = 'USD';
    }

    const maybePlanName = fixPlanName(searchParams.get('plan'), 'LiteApp') || '';
    const plan =
        maybeType === 'upgrade'
            ? getUpgradedPlan(subscription, app)
            : (plans.find(
                  ({ Name, Type }) =>
                      Name === maybePlanName && (Type === PLAN_TYPES.PLAN || Type === PLAN_TYPES.PRODUCT)
              )?.Name as PLANS | undefined);

    const { bgClassName, logo } = (() => {
        if ([PLANS.VPN, PLANS.VPN2024].includes(plan as any)) {
            return {
                bgClassName: 'subscribe-account--vpn-bg',
                logo: <Logo className="subscribe-account-logo" appName={APPS.PROTONVPN_SETTINGS} />,
            };
        }

        if ([PLANS.DRIVE, PLANS.DRIVE_PRO].includes(plan as any)) {
            return {
                bgClassName: 'subscribe-account--drive-bg',
                logo: <Logo className="subscribe-account-logo" appName={APPS.PROTONDRIVE} />,
            };
        }

        if ([PLANS.PASS, PLANS.PASS_PRO, PLANS.PASS_BUSINESS].includes(plan as any)) {
            return {
                bgClassName: 'subscribe-account--pass-bg',
                logo: <Logo className="subscribe-account-logo" appName={APPS.PROTONPASS} />,
            };
        }

        if ([PLANS.MAIL, PLANS.MAIL_PRO].includes(plan as any)) {
            return {
                bgClassName: 'subscribe-account--mail-bg',
                logo: <Logo className="subscribe-account-logo" appName={APPS.PROTONMAIL} />,
            };
        }

        return {
            bgClassName: 'subscribe-account--mail-bg',
            logo: (
                <>
                    <ProtonLogo color="brand" className="block sm:hidden" />
                    <ProtonLogo color="invert" className="hidden sm:block" />
                </>
            ),
        };
    })();

    const step = (() => {
        if (maybeStart === 'compare') {
            return SUBSCRIPTION_STEPS.PLAN_SELECTION;
        }
        if (maybeStart === 'checkout') {
            return SUBSCRIPTION_STEPS.CHECKOUT;
        }
        if (maybeType === 'upgrade' && plan) {
            return SUBSCRIPTION_STEPS.PLAN_SELECTION;
        }
        return user.isFree ? SUBSCRIPTION_STEPS.PLAN_SELECTION : SUBSCRIPTION_STEPS.CHECKOUT;
    })();

    const disableCycleSelectorParam = searchParams.get('disableCycleSelector');
    const disablePlanSelectionParam =
        searchParams.get('disablePlanSelection') || searchParams.get('disablePlanSelector');
    const disableCycleSelectorValue = disableCycleSelectorParam === 'true' || disableCycleSelectorParam === '1';
    const disablePlanSelectionValue = disablePlanSelectionParam === 'true' || disablePlanSelectionParam === '1';
    const hideClose = Boolean(searchParams.get('hideClose'));

    const handleNotify = (type: SubscribeType) => {
        if (onceCloseRef.current) {
            return;
        }
        setType(type);
        onceCloseRef.current = true;
        if (redirect) {
            replaceUrl(redirect);
            return;
        }
        broadcast({ type: MessageType.CLOSE });
    };

    const handleClose = () => {
        handleNotify(SubscribeType.Closed);
    };

    const handleSuccess = () => {
        handleNotify(SubscribeType.Subscribed);
        onSubscribed?.();
    };

    const bf2023IsExpired = coupon?.toLocaleUpperCase() === COUPON_CODES.BLACK_FRIDAY_2023;
    if (bf2023IsExpired) {
        return <PromotionExpired />;
    }

    const activeSubscription = subscription?.UpcomingSubscription ?? subscription;
    const activeSubscriptionPlan = getPlan(activeSubscription);
    const activeSubscriptionSameCoupon = !!coupon && activeSubscription?.CouponCode === coupon;
    const takingSameOffer =
        !!activeSubscription &&
        !!activeSubscriptionPlan &&
        activeSubscriptionPlan.Name === plan &&
        activeSubscription.Cycle === parsedCycle &&
        activeSubscriptionSameCoupon;

    const isOfferPlusPlan = !!maybePlanName && plusPlans.some((planName) => planName === plan);
    const isOfferBundlePlan = !!maybePlanName && plan === PLANS.BUNDLE;

    const isBundleDowngrade =
        activeSubscriptionPlan?.Name === PLANS.BUNDLE && isOfferPlusPlan && activeSubscriptionSameCoupon;

    const isFamilyDowngrade =
        activeSubscriptionPlan?.Name === PLANS.FAMILY &&
        (isOfferPlusPlan || isOfferBundlePlan) &&
        activeSubscriptionSameCoupon;

    const isVisionaryDowngrade =
        activeSubscriptionPlan?.Name === PLANS.VISIONARY && !!maybePlanName && plan !== PLANS.VISIONARY;

    if (takingSameOffer || isBundleDowngrade || isFamilyDowngrade || isVisionaryDowngrade) {
        return <PromotionAlreadyApplied />;
    }

    const subscriptionActions = getAvailableSubscriptionActions(subscription);
    if (!subscriptionActions.canModify) {
        return (
            <div className="h-full flex flex-column justify-center items-center bg-norm text-center">
                <div className="max-w-custom p-11" style={{ '--max-w-custom': '33.3rem' }}>
                    <InAppText subscription={subscription} />
                </div>
            </div>
        );
    }

    if (error.title && error.message) {
        return (
            <div className="h-full flex flex-column justify-center items-center bg-norm text-center">
                <h1 className="text-bold text-2xl mb-2">{error.title}</h1>
                <div>{error.message}</div>
                {error.error && <div className="mt-2 color-weak text-sm">{error.error}</div>}
            </div>
        );
    }

    return (
        <div className={clsx(bgClassName, 'h-full overflow-auto')} data-testid="lite:subscribe-account">
            <div className="min-h-custom flex flex-column flex-nowrap" style={{ '--min-h-custom': '100vh' }}>
                <div className="flex-auto">
                    <div
                        className={clsx('mb-0 sm:mb-4 pb-0 p-4 sm:pb-6 sm:p-6 m-auto max-w-custom')}
                        style={{ '--max-w-custom': '74rem' }}
                        ref={topRef}
                    >
                        {logo}
                    </div>
                    <div className="flex justify-center">
                        {childOverride ? (
                            <LiteBox>{childOverride}</LiteBox>
                        ) : type === SubscribeType.Subscribed || type === SubscribeType.Closed ? (
                            <LiteBox>
                                <SubscribeAccountDone type={type} />
                            </LiteBox>
                        ) : (
                            <SubscriptionContainer
                                topRef={topRef}
                                app={app}
                                subscription={subscription}
                                plans={plans}
                                freePlan={freePlan}
                                organization={organization}
                                step={step}
                                cycle={parsedCycle}
                                minimumCycle={parsedMinimumCycle}
                                currency={parsedCurrency}
                                plan={plan}
                                coupon={coupon}
                                disablePlanSelection={disablePlanSelectionValue}
                                disableCycleSelector={disableCycleSelectorValue}
                                disableThanksStep
                                onSubscribed={handleSuccess}
                                onUnsubscribed={handleSuccess}
                                onCancel={handleClose}
                                paymentsStatus={paymentsStatus}
                                onCheck={(data) => {
                                    // If the initial check completes, it's handled by the container itself
                                    if (data.model.initialCheckComplete) {
                                        return;
                                    }

                                    const offerUnavailableError = {
                                        title: c('bf2023: Title').t`Offer unavailable`,
                                        message: c('bf2023: info')
                                            .t`Sorry, this offer is not available with your current plan.`,
                                        error: '',
                                    };

                                    if (data.type === 'success') {
                                        if (
                                            // Ignore visionary since it doesn't require a BF coupon
                                            !data.model.planIDs[PLANS.VISIONARY] &&
                                            // Tried to apply the BF coupon, but the API responded without it.
                                            getHas2024OfferCoupon(coupon?.toUpperCase()) &&
                                            !getHas2024OfferCoupon(data.result.Coupon?.Code)
                                        ) {
                                            setError(offerUnavailableError);
                                        }
                                        return;
                                    }

                                    if (data.type === 'error') {
                                        const message = getApiErrorMessage(data.error);

                                        let defaultError = {
                                            title: c('bf2023: Title').t`Offer unavailable`,
                                            message: message || 'Unknown error',
                                            error: '',
                                        };

                                        const { status } = getApiError(data.error);
                                        // Getting a 400 means the user's current subscription is not compatible with the new plan, so we assume it's an offer
                                        if (status === HTTP_STATUS_CODE.BAD_REQUEST) {
                                            defaultError = {
                                                ...offerUnavailableError,
                                                error: defaultError.message,
                                            };
                                        }

                                        setError(defaultError);
                                    }
                                }}
                                metrics={{
                                    source: 'lite-subscribe',
                                }}
                                render={({ onSubmit, title, content, footer, step }) => {
                                    return (
                                        <LiteBox maxWidth={step === SUBSCRIPTION_STEPS.PLAN_SELECTION ? 72 : undefined}>
                                            <SubscribeAccountHeader
                                                user={user}
                                                title={title}
                                                onClose={hideClose ? undefined : handleClose}
                                            />
                                            <form onSubmit={onSubmit}>
                                                <div>{content}</div>
                                                {footer && <div className="mt-8">{footer}</div>}
                                            </form>
                                        </LiteBox>
                                    );
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="my-8 hidden sm:block">
                    <div className="px-4 pt-4 sm:pt-12 pb-4 m-auto max-w-custom" style={{ '--max-w-custom': '52rem' }}>
                        <footer className="text-sm">
                            <div className="mb-1">
                                <div className="flex gap-1">
                                    {[
                                        {
                                            title: MAIL_APP_NAME,
                                            logo: <MailLogo variant="glyph-only" size={5} />,
                                        },
                                        {
                                            title: CALENDAR_APP_NAME,
                                            logo: <CalendarLogo variant="glyph-only" size={5} />,
                                        },
                                        {
                                            title: DRIVE_APP_NAME,
                                            logo: <DriveLogo variant="glyph-only" size={5} />,
                                        },
                                        {
                                            title: VPN_APP_NAME,
                                            logo: <VpnLogo variant="glyph-only" size={5} />,
                                        },
                                        {
                                            title: PASS_APP_NAME,
                                            logo: <PassLogo variant="glyph-only" size={5} />,
                                        },
                                    ].map(({ title, logo }) => {
                                        return (
                                            <div key={title} className="" title={title}>
                                                {logo}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mb-6 color-invert opacity-70">
                                {
                                    // translator: full sentence 'Proton. Privacy by default.'
                                    c('Footer').t`${BRAND_NAME}. Privacy by default.`
                                }
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubscribeAccountWithProviders = (props: Props) => {
    return (
        <PaymentSwitcher>
            <SubscribeAccount {...props} />
        </PaymentSwitcher>
    );
};

export default SubscribeAccountWithProviders;
