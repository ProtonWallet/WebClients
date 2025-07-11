import { type ReactNode } from 'react';

import { anniversary11Config } from './anniverary11';
import {
    type CouponConfig,
    type CouponConfigProps,
    type CyclePriceCompareFirstParam,
    type CyclePriceCompareReturnType,
    type CycleTitleFirstParam,
    type CycleTitleReturnType,
    isCouponConfigRequiredProps,
} from './interface';
import { monthlyNudgeConfig } from './monthlyNudge';
import { tldrNewsletterConfig } from './tldrNewsletter';

const couponConfig: CouponConfig[] = [monthlyNudgeConfig, anniversary11Config, tldrNewsletterConfig];

export type CouponConfigRendered = Omit<CouponConfig, 'amountDueMessage' | 'cyclePriceCompare' | 'cycleTitle'> & {
    renderAmountDueMessage?: () => ReactNode;
    renderCyclePriceCompare?: (params: CyclePriceCompareFirstParam) => CyclePriceCompareReturnType;
    renderCycleTitle?: (params: CycleTitleFirstParam) => CycleTitleReturnType;
};

/**
 * Defines overrides for the UI of subscription view. If a certain coupon is present it might change the view.
 * See details of {@link CouponConfig}.
 */
export const useCouponConfig = (config: CouponConfigProps): CouponConfigRendered | undefined => {
    if (!isCouponConfigRequiredProps(config)) {
        return;
    }

    const checkResultCoupon = config.checkResult.Coupon?.Code;

    if (!checkResultCoupon) {
        return;
    }

    const matchingConfig = couponConfig.find((config) => config.coupons.includes(checkResultCoupon));
    if (!matchingConfig) {
        return;
    }

    const { cyclePriceCompare, cycleTitle, amountDueMessage } = matchingConfig;

    return {
        ...matchingConfig,

        renderAmountDueMessage: amountDueMessage ? () => amountDueMessage(config) : undefined,

        renderCyclePriceCompare: cyclePriceCompare ? (params) => cyclePriceCompare(params, config) : undefined,

        renderCycleTitle: cycleTitle ? (params) => cycleTitle(params, config) : undefined,
    };
};
