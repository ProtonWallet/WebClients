import { buildSubscription, buildUser } from '@proton/testing/builders';
import { getSubscriptionMock } from '@proton/testing/data';

import { ADDON_NAMES, CYCLE, FREE_SUBSCRIPTION, PLANS, PLAN_NAMES, PLAN_TYPES } from '../constants';
import { type PlanIDs } from '../interface';
import { type Plan } from '../plan/interface';
import { SubscriptionPlatform } from './constants';
import { FREE_PLAN } from './freePlans';
import {
    canModify,
    getAvailableSubscriptionActions,
    getPlanIDs,
    getSubscriptionPlanTitle,
    isCheckForbidden,
    isManagedExternally,
    isSubscriptionUnchanged,
} from './helpers';

describe('getSubscriptionPlanTitle', () => {
    it('should return plan title and name for a paid user with subscription', () => {
        const subscription = buildSubscription({
            Plans: [
                {
                    Name: PLANS.MAIL,
                    Title: PLAN_NAMES[PLANS.MAIL],
                    Type: PLAN_TYPES.PLAN,
                } as Plan,
            ],
        });

        const result = getSubscriptionPlanTitle(
            buildUser({
                isPaid: true,
                isFree: false,
                hasPassLifetime: false,
            }),
            subscription
        );

        expect(result).toEqual({
            planTitle: PLAN_NAMES[PLANS.MAIL],
            planName: PLANS.MAIL,
        });
    });

    it('should return Pass Lifetime plan for user with lifetime pass', () => {
        const userWithLifetimePass = buildUser({
            hasPassLifetime: true,
            isPaid: false,
        });

        const result = getSubscriptionPlanTitle(userWithLifetimePass, FREE_SUBSCRIPTION);

        expect(result).toEqual({
            planTitle: PLAN_NAMES[PLANS.PASS_LIFETIME],
            planName: PLANS.PASS_LIFETIME,
        });
    });

    it('should return free plan for free user', () => {
        const freeUser = buildUser({
            isPaid: false,
            isFree: true,
        });

        const result = getSubscriptionPlanTitle(freeUser, FREE_SUBSCRIPTION);

        expect(result).toEqual({
            planTitle: FREE_PLAN.Title,
            planName: FREE_PLAN.Name,
        });
    });

    it('should return "Lifetime" title for subscription with lifetime coupon', () => {
        const subscription = buildSubscription({
            Plans: [
                {
                    Name: PLANS.MAIL,
                    Title: PLAN_NAMES[PLANS.MAIL],
                    Type: PLAN_TYPES.PLAN,
                } as Plan,
            ],
            CouponCode: 'LIFETIME',
        });

        const result = getSubscriptionPlanTitle(
            buildUser({
                isPaid: true,
                isFree: false,
                hasPassLifetime: false,
            }),
            subscription
        );

        expect(result).toEqual({
            planTitle: 'Lifetime',
            planName: PLANS.MAIL,
        });
    });

    it('should handle undefined subscription for paid user', () => {
        const result = getSubscriptionPlanTitle(
            buildUser({
                isPaid: true,
                isFree: false,
                hasPassLifetime: false,
            }),
            undefined
        );

        expect(result).toEqual({
            planTitle: FREE_PLAN.Title,
            planName: FREE_PLAN.Name,
        });
    });
});

describe('isSubscriptionUnchanged', () => {
    it('returns true when subscription and planIds are deeply equal', () => {
        const subscription = getSubscriptionMock();
        const planIds: PlanIDs = getPlanIDs(subscription); // Assuming getPlanIDs is a function that extracts plan IDs from a subscription

        const result = isSubscriptionUnchanged(subscription, planIds);
        expect(result).toBe(true);
    });

    it('returns false when subscription and planIds are not deeply equal', () => {
        const subscription = getSubscriptionMock();
        const planIds: PlanIDs = {
            mail2022: 1,
        };

        const result = isSubscriptionUnchanged(subscription, planIds);
        expect(result).toBe(false);
    });

    it('returns true when both subscription and planIds are empty', () => {
        const result = isSubscriptionUnchanged(null, {});
        expect(result).toBe(true);
    });

    it('returns false when subscription is null and planIds is not null', () => {
        const planIds: PlanIDs = {
            bundle2022: 1,
        };

        const result = isSubscriptionUnchanged(null, planIds);
        expect(result).toBe(false);
    });

    it('returns false when subscription is not null and planIds is null', () => {
        const subscription = getSubscriptionMock();

        const result = isSubscriptionUnchanged(subscription, null as any);
        expect(result).toBe(false);
    });

    it('should return true when cycle is the same as in the subscription', () => {
        const subscription = getSubscriptionMock();
        subscription.Cycle = CYCLE.MONTHLY;

        const planIds: PlanIDs = getPlanIDs(subscription);

        const result = isSubscriptionUnchanged(subscription, planIds, CYCLE.MONTHLY);
        expect(result).toBe(true);
    });

    it('should return false when cycle is different from the subscription', () => {
        const subscription = getSubscriptionMock();
        subscription.Cycle = CYCLE.MONTHLY;

        const planIds: PlanIDs = getPlanIDs(subscription);

        const result = isSubscriptionUnchanged(subscription, planIds, CYCLE.YEARLY);
        expect(result).toBe(false);
    });

    it('should return false if there is no upcoming subscription', () => {
        const subscription = getSubscriptionMock();
        subscription.Cycle = CYCLE.MONTHLY;

        const planIds: PlanIDs = getPlanIDs(subscription);

        const currentSubscriptionUnchanged = isSubscriptionUnchanged(subscription, planIds, CYCLE.MONTHLY);
        expect(currentSubscriptionUnchanged).toBe(true);

        const upcomingSubscriptionUnchangedYearly = isSubscriptionUnchanged(subscription, planIds, CYCLE.YEARLY);
        expect(upcomingSubscriptionUnchangedYearly).toBe(false);

        const upcomingSubscriptionUnchangedTwoYears = isSubscriptionUnchanged(subscription, planIds, CYCLE.TWO_YEARS);
        expect(upcomingSubscriptionUnchangedTwoYears).toBe(false);
    });
});

describe('isCheckForbidden', () => {
    it('returns false when subscription is null or undefined', () => {
        expect(isCheckForbidden(null, {}, CYCLE.MONTHLY)).toBe(false);
        expect(isCheckForbidden(undefined, {}, CYCLE.MONTHLY)).toBe(false);
    });

    it('returns true when selected plan is same as current with no upcoming subscription', () => {
        const subscription = getSubscriptionMock();
        const planIds = getPlanIDs(subscription);

        // No upcoming subscription scenario
        expect(isCheckForbidden(subscription, planIds, subscription.Cycle)).toBe(true);
    });

    it('returns false for free subscription', () => {
        const freeSubscription = FREE_SUBSCRIPTION;
        const planIds = {};

        expect(isCheckForbidden(freeSubscription, planIds, CYCLE.MONTHLY)).toBe(false);
    });

    it('handles variable cycle offer correctly (automatic unpaid scheduled subscription)', () => {
        const UpcomingSubscription = buildSubscription({ Cycle: CYCLE.YEARLY, InvoiceID: '' });

        const subscription = buildSubscription({ Cycle: CYCLE.TWO_YEARS, UpcomingSubscription });

        const currentPlanIds = getPlanIDs(subscription);
        const upcomingPlanIds = getPlanIDs(UpcomingSubscription);

        expect(isCheckForbidden(subscription, currentPlanIds, CYCLE.TWO_YEARS)).toBe(true);
        expect(isCheckForbidden(subscription, upcomingPlanIds, CYCLE.YEARLY)).toBe(true);
    });

    it('handles scheduled unpaid modification correctly (addon downgrade/downcycling)', () => {
        const Cycle = CYCLE.MONTHLY;

        const UpcomingSubscription = buildSubscription(
            {
                InvoiceID: '',
                Cycle,
            },
            {
                [PLANS.MAIL_PRO]: 1,
                [ADDON_NAMES.MEMBER_MAIL_PRO]: 2,
                [ADDON_NAMES.MEMBER_SCRIBE_MAIL_PRO]: 2,
            }
        );

        const subscription = buildSubscription(
            { Cycle, UpcomingSubscription },
            {
                [PLANS.MAIL_PRO]: 1,
                [ADDON_NAMES.MEMBER_MAIL_PRO]: 2,
                [ADDON_NAMES.MEMBER_SCRIBE_MAIL_PRO]: 3,
            }
        );

        const currentPlanIds = getPlanIDs(subscription);
        const upcomingPlanIds = getPlanIDs(UpcomingSubscription);

        expect(isCheckForbidden(subscription, currentPlanIds, Cycle)).toBe(false);

        expect(isCheckForbidden(subscription, upcomingPlanIds, Cycle)).toBe(true);
    });

    it('handles prepaid upcoming subscription correctly', () => {
        const UpcomingSubscription = buildSubscription({ Cycle: CYCLE.YEARLY });
        const subscription = buildSubscription({ Cycle: CYCLE.MONTHLY, UpcomingSubscription });

        const currentPlanIds = getPlanIDs(subscription);
        const upcomingPlanIds = getPlanIDs(UpcomingSubscription);

        expect(isCheckForbidden(subscription, currentPlanIds, CYCLE.MONTHLY)).toBe(true);
        expect(isCheckForbidden(subscription, upcomingPlanIds, CYCLE.YEARLY)).toBe(true);
    });

    it('returns false when selected plan is different from both current and upcoming', () => {
        const UpcomingSubscription = buildSubscription({ Cycle: CYCLE.YEARLY });
        const subscription = buildSubscription({ Cycle: CYCLE.MONTHLY, UpcomingSubscription });

        const differentPlanIds = { [PLANS.DRIVE]: 1 };

        expect(isCheckForbidden(subscription, differentPlanIds, CYCLE.MONTHLY)).toBe(false);
        expect(isCheckForbidden(subscription, differentPlanIds, CYCLE.YEARLY)).toBe(false);
    });

    it('should return true when user has externally managed Lumo subscription and selects the same plan', () => {
        const subscribtion = buildSubscription(
            {
                External: SubscriptionPlatform.iOS,
            },
            { [PLANS.LUMO]: 1 }
        );

        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.MONTHLY)).toBe(true);
        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.YEARLY)).toBe(true);
        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.TWO_YEARS)).toBe(true);
    });

    it('should return false when user has externally managed Lumo subscription and selects a different plan', () => {
        const subscription = buildSubscription(
            {
                External: SubscriptionPlatform.iOS,
            },
            { [PLANS.LUMO]: 1 }
        );

        expect(isCheckForbidden(subscription, { [PLANS.MAIL]: 1 }, CYCLE.MONTHLY)).toBe(false);
        expect(isCheckForbidden(subscription, { [PLANS.MAIL]: 1 }, CYCLE.YEARLY)).toBe(false);
        expect(isCheckForbidden(subscription, { [PLANS.MAIL]: 1 }, CYCLE.TWO_YEARS)).toBe(false);
    });

    it('should work with lumo the usual way if it is managed internally', () => {
        const subscribtion = buildSubscription(
            {
                Cycle: CYCLE.MONTHLY,
                External: SubscriptionPlatform.Default,
            },
            { [PLANS.LUMO]: 1 }
        );

        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.MONTHLY)).toBe(true);
        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.YEARLY)).toBe(false);
        expect(isCheckForbidden(subscribtion, { [PLANS.LUMO]: 1 }, CYCLE.TWO_YEARS)).toBe(false);
    });
});

describe('isManagedExternally', () => {
    it('returns false when subscription is null', () => {
        expect(isManagedExternally(null)).toBe(false);
    });

    it('returns false when subscription is undefined', () => {
        expect(isManagedExternally(undefined)).toBe(false);
    });

    it('returns false for free subscription', () => {
        const freeSubscription = FREE_SUBSCRIPTION;
        expect(isManagedExternally(freeSubscription)).toBe(false);
    });

    it('returns true when subscription is managed by Android', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Android,
        });
        expect(isManagedExternally(subscription)).toBe(true);
    });

    it('returns true when subscription is managed by iOS', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.iOS,
        });
        expect(isManagedExternally(subscription)).toBe(true);
    });

    it('returns false when subscription is not externally managed', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Default,
        });
        expect(isManagedExternally(subscription)).toBe(false);
    });
});

describe('canModify', () => {
    it('returns true when subscription is null', () => {
        expect(canModify(null as any)).toBe(true);
    });

    it('returns true when subscription is undefined', () => {
        expect(canModify(undefined as any)).toBe(true);
    });

    it('returns true for free subscription', () => {
        expect(canModify(FREE_SUBSCRIPTION as any)).toBe(true);
    });

    it('returns false for externally managed subscription without Lumo', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Android,
        });
        expect(canModify(subscription)).toBe(false);
    });

    it('returns true for non-externally managed subscription', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Default,
        });
        expect(canModify(subscription)).toBe(true);
    });

    it('returns true for externally managed subscription with Lumo', () => {
        const subscription = buildSubscription(
            {
                External: SubscriptionPlatform.Android,
            },
            {
                [PLANS.LUMO]: 1,
            }
        );

        expect(canModify(subscription)).toBe(true);
    });
});

describe('getAvailableActions', () => {
    it('returns all actions available for non-externally managed subscription', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Default,
        });

        const result = getAvailableSubscriptionActions(subscription);

        expect(result).toEqual({
            canModify: true,
            cantModifyReason: undefined,
            canCancel: true,
            cantCancelReason: undefined,
        });
    });

    it('returns no actions available for externally managed subscription without Lumo', () => {
        const subscription = buildSubscription({
            External: SubscriptionPlatform.Android,
        });

        const result = getAvailableSubscriptionActions(subscription);

        expect(result).toEqual({
            canModify: false,
            cantModifyReason: 'subscription_managed_externally',
            canCancel: false,
            cantCancelReason: 'subscription_managed_externally',
        });
    });

    it('returns only modify action available for externally managed subscription with Lumo', () => {
        const subscription = buildSubscription(
            {
                External: SubscriptionPlatform.Android,
            },
            {
                [PLANS.LUMO]: 1,
            }
        );

        const result = getAvailableSubscriptionActions(subscription);

        expect(result).toEqual({
            canModify: true,
            cantModifyReason: undefined,
            canCancel: false,
            cantCancelReason: 'subscription_managed_externally',
        });
    });
});
