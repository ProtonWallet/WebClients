import { api } from '@proton/pass/lib/api/api';
import type { OrganizationState } from '@proton/pass/store/reducers/organization';
import type {
    MaybeNull,
    MemberMonitorReportList,
    OrganizationGetResponse,
    OrganizationUpdatePasswordPolicyRequest,
} from '@proton/pass/types';
import type { OrganizationSettings } from '@proton/pass/types/data/organization';
import { logger } from '@proton/pass/utils/logger';
import { getOrganization as coreGetOrganization } from '@proton/shared/lib/api/organization';
import type { Organization } from '@proton/shared/lib/interfaces';

import type { OrganizationReportDTO } from './types';

export const getUserOrganization = async (): Promise<MaybeNull<Organization>> => {
    try {
        logger.info(`[User] Syncing organization info`);
        return (await api<{ Organization: Organization }>(coreGetOrganization())).Organization;
    } catch {
        return null;
    }
};

export const getOrganizationSettings = async (): Promise<OrganizationGetResponse> =>
    (await api({ url: 'pass/v1/organization', method: 'get' })).Organization!;

export const setOrganizationSettings = async (
    settings: Partial<OrganizationSettings>
): Promise<OrganizationGetResponse> =>
    (
        await api({
            url: 'pass/v1/organization/settings',
            method: 'put',
            data: settings,
        })
    ).Organization!;

export const getOrganization = async (): Promise<MaybeNull<OrganizationState>> => {
    const organization = await getUserOrganization();
    if (!organization) return null;

    const { Settings, CanUpdate }: OrganizationGetResponse = await getOrganizationSettings();

    return {
        settings: Settings!,
        canUpdate: CanUpdate,
        organization,
    };
};

export const setPasswordGeneratorPolicySettings = async (
    settings: OrganizationUpdatePasswordPolicyRequest
): Promise<OrganizationGetResponse> =>
    (
        await api({
            url: 'pass/v1/organization/settings/password_policy',
            method: 'put',
            data: settings,
        })
    ).Organization!;

export const getOrganizationReports = async ({
    page,
    pageSize,
}: OrganizationReportDTO): Promise<MemberMonitorReportList> =>
    (
        await api({
            url: 'pass/v1/organization/report',
            method: 'get',
            params: { Page: page, PageSize: pageSize },
        })
    ).Report!;
