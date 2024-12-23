import type { ThemeColor } from '@proton/colors';
import type { APP_NAMES } from '@proton/shared/lib/constants';
import type {
    Address,
    Group,
    GroupMembershipReturn,
    OrganizationWithSettings,
    Subscription,
    UserModel,
} from '@proton/shared/lib/interfaces';

import { getAccountAppRoutes } from '../containers/account/routes';
import { getCalendarAppRoutes } from '../containers/calendar/routes';
import { getDocsAppRoutes } from '../containers/docs/routes';
import { getDriveAppRoutes } from '../containers/drive/routes';
import { getMailAppRoutes } from '../containers/mail/routes';
import { getOrganizationAppRoutes } from '../containers/organization/routes';
import { getPassAppRoutes } from '../containers/pass/routes';
import { getVpnAppRoutes } from '../containers/vpn/routes';
import { getWalletAppRoutes } from '../containers/wallet/routes';

interface Arguments {
    app: APP_NAMES;
    user: UserModel;
    addresses: Address[] | undefined;
    subscription: Subscription | undefined;
    organization: OrganizationWithSettings | undefined;
    isReferralProgramEnabled: boolean;
    isDataRecoveryAvailable: boolean;
    isSessionRecoveryAvailable: boolean;
    recoveryNotification?: ThemeColor;
    isBreachesAccountDashboardEnabled: boolean;
    isUserGroupsFeatureEnabled: boolean;
    showThemeSelection: boolean;
    assistantKillSwitch: boolean;
    canDisplayB2BLogsPass: boolean;
    canDisplayB2BLogsVPN: boolean;
    memberships: GroupMembershipReturn[] | undefined;
    groups: Group[] | undefined;
    isUserGroupsMembershipFeatureEnabled: boolean;
    canB2BHidePhotos: boolean;
    isB2BDrive: boolean;
    isB2BAuthLogsEnabled: boolean;
    isGlobalSSOEnabled: boolean;
    isScribeEnabled: boolean;
    isZoomIntegrationEnabled: boolean;
}

export const getRoutes = ({
    app,
    user,
    organization,
    addresses,
    subscription,
    isDataRecoveryAvailable,
    isSessionRecoveryAvailable,
    isReferralProgramEnabled,
    recoveryNotification,
    isBreachesAccountDashboardEnabled,
    isUserGroupsFeatureEnabled,
    showThemeSelection,
    assistantKillSwitch,
    canDisplayB2BLogsPass,
    canDisplayB2BLogsVPN,
    memberships,
    groups,
    isUserGroupsMembershipFeatureEnabled,
    canB2BHidePhotos,
    isB2BDrive,
    isB2BAuthLogsEnabled,
    isGlobalSSOEnabled,
    isScribeEnabled,
    isZoomIntegrationEnabled,
}: Arguments) => {
    return {
        account: getAccountAppRoutes({
            app,
            user,
            subscription,
            addresses,
            isDataRecoveryAvailable,
            isSessionRecoveryAvailable,
            isReferralProgramEnabled,
            recoveryNotification,
            organization,
            isBreachesAccountDashboardEnabled,
            showThemeSelection,
            assistantKillSwitch,
            isUserGroupsMembershipFeatureEnabled,
            memberships,
            isZoomIntegrationEnabled,
        }),
        mail: getMailAppRoutes({
            app,
            user,
            addresses,
            organization,
        }),
        calendar: getCalendarAppRoutes({ app, user, organization, isZoomIntegrationEnabled }),
        drive: getDriveAppRoutes({ app, isB2BDrive, canB2BHidePhotos }),
        docs: getDocsAppRoutes({ app }),
        pass: getPassAppRoutes({ app, user, organization, subscription, canDisplayB2BLogsPass }),
        organization: getOrganizationAppRoutes({
            app,
            user,
            organization,
            subscription,
            canDisplayB2BLogsVPN,
            isUserGroupsFeatureEnabled,
            isB2BAuthLogsEnabled,
            isGlobalSSOEnabled,
            groups,
            isScribeEnabled,
            isZoomIntegrationEnabled,
        }),
        vpn: getVpnAppRoutes({ app }),
        wallet: getWalletAppRoutes(),
    };
};

export type Routes = ReturnType<typeof getRoutes>;
