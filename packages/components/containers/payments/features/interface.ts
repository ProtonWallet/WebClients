import type { ReactNode } from 'react';

import type { IconName } from '@proton/components/components/icon/Icon';
import type { PLANS } from '@proton/payments';
import type { Audience } from '@proton/shared/lib/interfaces';

export interface PlanCardFeatureDefinition {
    text: string | string[] | ReactNode;
    subtext?: string;
    included: boolean;
    hideInDowngrade?: boolean;
    status?: 'available' | 'coming-soon';
    tooltip?: string;
    highlight?: boolean;
    icon?: IconName;
    iconUrl?: string;
    highResIcon?: string;
}

export interface PlanCardFeature {
    name: string;
    /* If targeting a specific audience */
    target?: Audience;
    plans: {
        [PLANS.FREE]: PlanCardFeatureDefinition | null;
        [PLANS.BUNDLE]: PlanCardFeatureDefinition | null;
        [PLANS.MAIL]: PlanCardFeatureDefinition | null;
        [PLANS.VPN]: PlanCardFeatureDefinition | null;
        [PLANS.DRIVE]: PlanCardFeatureDefinition | null;
        [PLANS.DRIVE_1TB]: PlanCardFeatureDefinition | null;
        [PLANS.DRIVE_BUSINESS]: PlanCardFeatureDefinition | null;
        [PLANS.PASS]: PlanCardFeatureDefinition | null;
        [PLANS.PASS_LIFETIME]: PlanCardFeatureDefinition | null;
        [PLANS.FAMILY]: PlanCardFeatureDefinition | null;
        [PLANS.DUO]: PlanCardFeatureDefinition | null;
        [PLANS.MAIL_PRO]: PlanCardFeatureDefinition | null;
        [PLANS.MAIL_BUSINESS]: PlanCardFeatureDefinition | null;
        [PLANS.BUNDLE_PRO]: PlanCardFeatureDefinition | null;
        [PLANS.BUNDLE_PRO_2024]: PlanCardFeatureDefinition | null;
        [PLANS.PASS_PRO]: PlanCardFeatureDefinition | null;
        [PLANS.PASS_FAMILY]: PlanCardFeatureDefinition | null;
        [PLANS.PASS_BUSINESS]: PlanCardFeatureDefinition | null;
        [PLANS.VPN_PRO]: PlanCardFeatureDefinition | null;
        [PLANS.VPN_BUSINESS]: PlanCardFeatureDefinition | null;
        [PLANS.WALLET]: PlanCardFeatureDefinition | null;
        [PLANS.LUMO]: PlanCardFeatureDefinition | null;
        [PLANS.VISIONARY]: PlanCardFeatureDefinition | null;
    };
}

export enum PlanCardFeatureType {
    highlight,
    mail,
    calendar,
    drive,
    vpn,
    team,
    support,
}

export interface ShortPlan {
    label: string;
    description: string;
    title: string;
    plan:
        | PLANS.FREE
        | PLANS.BUNDLE
        | PLANS.MAIL
        | PLANS.DRIVE
        | PLANS.DRIVE_1TB
        | PLANS.DRIVE_BUSINESS
        | PLANS.PASS
        | PLANS.PASS_LIFETIME
        | PLANS.PASS_PRO
        | PLANS.PASS_FAMILY
        | PLANS.PASS_BUSINESS
        | PLANS.BUNDLE_PRO
        | PLANS.BUNDLE_PRO_2024
        | PLANS.MAIL_PRO
        | PLANS.MAIL_BUSINESS
        | PLANS.VPN
        | PLANS.VISIONARY
        | PLANS.FAMILY
        | PLANS.DUO
        | PLANS.VPN_PRO
        | PLANS.VPN_BUSINESS
        | PLANS.WALLET
        | PLANS.LUMO;
    cta: string;
    features: PlanCardFeatureDefinition[];
}

/**
 * Can be used for UI-only plans. For example, the enterprise-talk-to-us plan doesn't exist on the backend,
 * but we still want to display it in the UI.
 */
export type ShortPlanLike = {
    plan: string;
    cta?: string;
    isPlanLike: true;
} & Pick<ShortPlan, 'label' | 'description' | 'title' | 'features'>;

export function isShortPlanLike(plan: any): plan is ShortPlanLike {
    return !!plan && plan.isPlanLike;
}
