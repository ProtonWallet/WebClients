import { run as jscodeshift } from 'jscodeshift/src/Runner';
import path from 'node:path';

const files = [
    'components/components/drawer/views/SecurityCenter/PassAliases/modals/PassAliasesUpsellModal.tsx',
    'components/containers/payments/subscription/cycle-selector/SubscriptionCycleSelector.tsx',
    'components/components/drawer/views/SecurityCenter/ProtonSentinel/modal/ProtonSentinelUpsellModal.tsx',
    'components/components/topnavbar/TopNavbarOffer.tsx',
    'components/components/topnavbar/TopNavbarPostSignupPromo/PostSignupOneDollar/components/usePostSignupOneDollarPromotionPrice.tsx',
    'components/components/topnavbar/TopNavbarPostSignupPromo/PostSignupOneDollar/DrivePostSignupOneDollar/DrivePostSignupOneDollar.tsx',
    'components/components/topnavbar/TopNavbarPostSignupPromo/PostSignupOneDollar/MailPostSignupOneDollar/MailPostSignupOneDollar.tsx',
    'components/components/upsell/getUpsellSubscriptionModalConfig.ts',
    'components/components/upsell/modal/AccountLockedUpsellModal.tsx',
    'components/components/upsell/modal/UpsellModal.tsx',
    'components/components/upsell/modal/types/ComposerAssistantUpsellModal.helpers.ts',
    'components/components/upsell/modal/types/PmMeUpsellModal.tsx',
    'components/components/upsell/useUpsellConfig.ts',
    'components/containers/desktop/openExternalLink.ts',
    'components/containers/offers/components/passFamilyPlan/Layout.tsx',
    'components/containers/offers/helpers/dealPrices.ts',
    'components/containers/offers/helpers/offerCopies.tsx',
    'components/containers/offers/interface.ts',
    'components/containers/offers/operations/goUnlimited2022/configuration.ts',
    'components/containers/offers/operations/mailTrial2023/configuration.ts',
    'components/containers/offers/operations/mailTrial2024/configuration.ts',
    'components/containers/offers/operations/passFamilyPlan2024Yearly/configuration.ts',
    'components/containers/payments/CycleSelector.tsx',
    'components/containers/payments/helper.ts',
    'components/containers/payments/PlansSection.tsx',
    'components/containers/payments/RenewalNotice.tsx',
    'components/containers/payments/subscription/AutomaticSubscriptionModal.tsx',
    'components/containers/payments/subscription/cycle-selector/CycleItemView.tsx',
    'components/containers/payments/subscription/cycle-selector/SubscriptionCheckoutCycleItem.tsx',
    'components/containers/payments/subscription/helpers/dashboard-upsells.tsx',
    'components/containers/payments/subscription/helpers/getAllowedCycles.ts',
    'components/containers/payments/subscription/helpers/getInitialCycle.ts',
    'components/containers/payments/subscription/helpers/getUpsellAmountAndSavings.ts',
    'components/containers/payments/subscription/helpers/payment.ts',
    'components/containers/payments/subscription/modal-components/helpers/BilledCycleText.tsx',
    'components/containers/payments/subscription/panels/subscription-panel/SubscriptionPanel.tsx',
    'components/containers/payments/subscription/panels/UpsellPanel.tsx',
    'components/containers/payments/subscription/PlanSelection.tsx',
    'components/containers/payments/subscription/subscriptionEligbility.ts',
    'components/containers/referral/rewards/RewardsProgress.tsx',
    'components/containers/topBanners/TrialTopBanner.tsx',
    'components/hooks/assistant/assistantUpsellConfig.ts',
    'core/checkout-modifiers.test.ts',
    'core/subscription/selected-plan.test.ts',
    'core/subscription/selected-plan.ts',
    'shared/lib/helpers/checkout.ts',
    'shared/lib/helpers/planIDs.ts',
    'shared/lib/helpers/renew.ts',
    'shared/lib/helpers/subscription.ts',
    'shared/lib/helpers/upsell.ts',
    'shared/lib/subscription/freePlans.ts',
    'testing/builders/subscription.ts',
    'testing/data/payments/data-plans.ts',
    'testing/data/payments/data-subscription.ts',
    'core/checkout-modifiers.test.ts',
    'core/subscription/selected-plan.test.ts',
    'core/subscription/selected-plan.ts',
    'shared/lib/helpers/checkout.ts',
    'shared/lib/helpers/planIDs.ts',
    'shared/lib/helpers/subscription.ts',
    'shared/lib/subscription/freePlans.ts',
];

const accountFiles = [
    'src/app/signup/PaymentStep.test.tsx',
    'src/app/signup/PaymentStep.tsx',
    'src/app/signup/signupActions/signupActions.spec.ts',
    'src/app/signup/SignupContainer.tsx',
    'src/app/signup/UpsellStep.tsx',
    'src/app/single-signup-v2/constants.ts',
    'src/app/single-signup-v2/drive/configuration.tsx',
    'src/app/single-signup-v2/helper.ts',
    'src/app/single-signup-v2/interface.ts',
    'src/app/single-signup-v2/lumo/configuration.tsx',
    'src/app/single-signup-v2/mail/configuration.tsx',
    'src/app/single-signup-v2/measure.ts',
    'src/app/single-signup-v2/modals/Trial2024UpsellModal.tsx',
    'src/app/single-signup-v2/pass/configuration.tsx',
    'src/app/single-signup-v2/PlanCardSelector.test.tsx',
    'src/app/single-signup-v2/PlanCardSelector.tsx',
    'src/app/single-signup-v2/RightPlanSummary.tsx',
    'src/app/single-signup-v2/signupParameters.ts',
    'src/app/single-signup-v2/SingleSignupContainerV2.tsx',
    'src/app/single-signup-v2/Step1.tsx',
    'src/app/single-signup-v2/wallet/configuration.tsx',
    'src/app/single-signup/CycleSelector.tsx',
    'src/app/single-signup/helper.tsx',
    'src/app/single-signup/interface.ts',
    'src/app/single-signup/measure.ts',
    'src/app/single-signup/SingleSignupContainer.tsx',
    'src/app/single-signup/state.ts',
    'src/app/single-signup/Step1.tsx',
    'src/app/single-signup/VPNPassUpsellButton.tsx',
];

const sharedTestFiles = [
    'test/helpers/checkout.spec.ts',
    'test/helpers/plan.spec.ts',
    'test/helpers/planIDs.spec.ts',
    'test/helpers/subscription.spec.ts',
];

const componentFiles = [
    'components/upsell/modal/types/ComposerAssistantB2CUpsellModal.tsx',
    'containers/offers/components/duoPlan/Layout.tsx',
    'containers/offers/components/shared/deal/DealsWithCycleSelector.tsx',
    'containers/offers/helpers/dealPrices.test.ts',
    'containers/payments/CycleSelector.test.tsx',
    'containers/payments/helper.test.ts',
    'containers/payments/planCustomizer/ProtonPlanCustomizer.test.tsx',
    'containers/payments/RenewalNotice.test.tsx',
    'containers/payments/subscription/cycle-selector/SubscriptionCycleSelector.test.tsx',
    'containers/payments/subscription/helpers/dashboard-upsells.test.ts',
    'containers/payments/subscription/helpers/getAllowedCycles.test.ts',
    'containers/payments/subscription/helpers/getInitialCycle.test.ts',
    'containers/payments/subscription/helpers/payment.test.ts',
    'containers/payments/subscription/modal-components/SubscriptionCheckout.spec.tsx',
    'containers/payments/subscription/panels/subscription-panel/SubscriptionPanel.test.tsx',
    'containers/payments/subscription/PlanSelection.test.tsx',
    'containers/payments/subscription/VPNPassPromotionButton.tsx',
    'containers/payments/subscription/YourPlanSection.test.tsx',
    'hooks/assistant/assistantUpsellConfig.test.ts',
];

// Remove duplicates using Set
const uniqueFiles = [...new Set(files)];
const allFiles = [
    ...uniqueFiles.map((file) => ({ path: file, prefix: '../../../' })),
    ...accountFiles.map((file) => ({ path: file, prefix: '../../../../applications/account' })),
    ...sharedTestFiles.map((file) => ({ path: file, prefix: '../../../shared' })),
    ...componentFiles.map((file) => ({ path: file, prefix: '../../../components' })),
];

export async function transform() {
    const transformPath = path.resolve(__dirname, 'cycle-transform.js');
    const paths = allFiles.map(({ path: filePath, prefix }) => path.resolve(__dirname, prefix, filePath));

    const options = { dry: false, print: false, verbose: 0, parser: 'tsx' };

    await jscodeshift(transformPath, paths, options);
}
