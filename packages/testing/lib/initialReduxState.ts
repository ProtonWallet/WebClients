import type { OrganizationState, PaymentStatusState } from '@proton/account';
import { type SubscriptionState } from '@proton/account';
import { type PaymentMethodStatusExtended } from '@proton/payments';
import type { OrganizationWithSettings, Subscription } from '@proton/shared/lib/interfaces';

export const getSubscriptionState = (value: Subscription = {} as any): SubscriptionState['subscription'] => {
    return {
        meta: {
            type: 1,
            fetchedAt: Date.now(),
            fetchedEphemeral: true,
        },
        value,
        error: undefined,
    };
};

export const getOrganizationState = (
    value: OrganizationWithSettings = {} as any
): OrganizationState['organization'] => {
    return {
        meta: {
            type: 1,
            fetchedAt: Date.now(),
            fetchedEphemeral: true,
        },
        value,
        error: undefined,
    };
};

export const getPaymentStatusState = (
    value: PaymentMethodStatusExtended = {} as any
): PaymentStatusState['paymentStatus'] => {
    return {
        meta: {
            fetchedAt: Date.now(),
            fetchedEphemeral: true,
        },
        value,
        error: undefined,
    };
};
