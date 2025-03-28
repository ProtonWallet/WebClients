import type { MutableRefObject } from 'react';
import { useState } from 'react';

import { c, msgid } from 'ttag';

import { syncDomain } from '@proton/account/domains/actions';
import { useCustomDomains } from '@proton/account/domains/hooks';
import { useDomainsAddresses } from '@proton/account/domainsAddresses/hooks';
import { useOrganization } from '@proton/account/organization/hooks';
import { useUser } from '@proton/account/user/hooks';
import { Button } from '@proton/atoms';
import DropdownActions from '@proton/components/components/dropdown/DropdownActions';
import Loader from '@proton/components/components/loader/Loader';
import useModalState from '@proton/components/components/modalTwo/useModalState';
import Table from '@proton/components/components/table/Table';
import TableBody from '@proton/components/components/table/TableBody';
import TableHeader from '@proton/components/components/table/TableHeader';
import TableRow from '@proton/components/components/table/TableRow';
import SettingsParagraph from '@proton/components/containers/account/SettingsParagraph';
import SettingsSectionWide from '@proton/components/containers/account/SettingsSectionWide';
import UpgradeBanner from '@proton/components/containers/account/UpgradeBanner';
import { useLoading } from '@proton/hooks';
import { PLANS, PLAN_NAMES } from '@proton/payments';
import { useDispatch } from '@proton/redux-shared-store';
import {
    APP_UPSELL_REF_PATH,
    BRAND_NAME,
    MAIL_UPSELL_PATHS,
    ORGANIZATION_STATE,
    UPSELL_COMPONENT,
} from '@proton/shared/lib/constants';
import { getUpsellRef } from '@proton/shared/lib/helpers/upsell';
import { getDomainsSupportURL } from '@proton/shared/lib/helpers/url';
import type { Domain, DomainAddress } from '@proton/shared/lib/interfaces';
import { hasPaidMail } from '@proton/shared/lib/user/helpers';
import isTruthy from '@proton/utils/isTruthy';

import useOrganizationModals from '../organization/useOrganizationModals';
import CatchAllModal from './CatchAllModal';
import DeleteDomainModal from './DeleteDomainModal';
import DomainModal from './DomainModal';
import DomainName from './DomainName';
import DomainStatus from './DomainStatus';

const DomainsSectionText = () => {
    return (
        <SettingsParagraph className="text-cut" learnMoreUrl={getDomainsSupportURL()}>
            {c('Message')
                .t`Connect your custom domain to ${BRAND_NAME} to set up custom email addresses (e.g., you@yourcompany.com). Our wizard will guide you through the process.`}
        </SettingsParagraph>
    );
};

const DomainsSectionInternal = ({ onceRef }: { onceRef: MutableRefObject<boolean> }) => {
    const [customDomains, loadingCustomDomains] = useCustomDomains();
    const dispatch = useDispatch();
    const [domainsAddressesMap, loadingDomainsAddressesMap] = useDomainsAddresses(customDomains);
    const [organization, loadingOrganization] = useOrganization();
    const [loadingRefresh, withLoadingRefresh] = useLoading();
    const organizationModals = useOrganizationModals(onceRef);

    const [tmpDomainProps, setTmpDomainProps] = useState<{ domain: Domain; domainAddresses: DomainAddress[] } | null>(
        null
    );
    const [newDomainModalProps, setNewDomainModalOpen, renderNewDomain] = useModalState();
    const [editDomainModalProps, setEditDomainModalOpen, renderEditDomain] = useModalState();
    const [deleteDomainModalProps, setDeleteDomainModalOpen, renderDeleteDomain] = useModalState();
    const [catchAllDomainModalProps, setCatchAllDomainModalOpen, renderCatchAllDomain] = useModalState();

    const allModelsArePresent = customDomains && domainsAddressesMap && organization;

    const loading = !allModelsArePresent && (loadingCustomDomains || loadingDomainsAddressesMap || loadingOrganization);

    const UsedDomains = organization?.UsedDomains || 0;
    const MaxDomains = organization?.MaxDomains || 0;
    const hasReachedDomainsLimit = UsedDomains === MaxDomains;
    const isOrgActive = organization?.State === ORGANIZATION_STATE.ACTIVE;

    const handleRefresh = async () => {
        // Fetch all domains individually to trigger a DNS refresh CP-8499
        await Promise.all(
            (customDomains || []).map((domain) => {
                return dispatch(syncDomain(domain));
            })
        );
    };

    const reviewText = c('Action').t`Review`;
    const setCatchAllText = c('Action').t`Set catch-all`;
    const deleteText = c('Action').t`Delete`;

    return (
        <SettingsSectionWide>
            {organizationModals.modals}
            {renderNewDomain && <DomainModal {...newDomainModalProps} />}
            {renderEditDomain && tmpDomainProps && (
                <DomainModal
                    domain={tmpDomainProps.domain}
                    domainAddresses={tmpDomainProps.domainAddresses}
                    {...editDomainModalProps}
                />
            )}
            {renderDeleteDomain && tmpDomainProps && (
                <DeleteDomainModal domain={tmpDomainProps.domain} {...deleteDomainModalProps} />
            )}
            {renderCatchAllDomain && tmpDomainProps && (
                <CatchAllModal
                    domain={tmpDomainProps.domain}
                    domainAddresses={tmpDomainProps.domainAddresses}
                    {...catchAllDomainModalProps}
                />
            )}

            {loading ? (
                <Loader />
            ) : (
                <>
                    {organizationModals.info}
                    <DomainsSectionText />

                    <div className="mb-4">
                        <Button
                            color="norm"
                            onClick={() => setNewDomainModalOpen(true)}
                            className="mr-4 mb-2"
                            disabled={hasReachedDomainsLimit || !isOrgActive}
                        >
                            {c('Action').t`Add domain`}
                        </Button>
                        <Button
                            className="mb-2"
                            loading={loadingRefresh || loadingDomainsAddressesMap}
                            onClick={() => withLoadingRefresh(handleRefresh())}
                            disabled={!isOrgActive}
                        >{c('Action').t`Refresh status`}</Button>
                    </div>
                    {!!customDomains?.length && domainsAddressesMap && (
                        <Table hasActions responsive="cards">
                            <TableHeader
                                cells={[
                                    c('Header for addresses table').t`Domain`,
                                    c('Header for addresses table').t`Status`,
                                    c('Header for addresses table').t`Actions`,
                                ]}
                            />
                            <TableBody loading={loading} colSpan={4}>
                                {customDomains.map((domain) => {
                                    const domainAddresses = domainsAddressesMap[domain.ID] || [];
                                    return (
                                        <TableRow
                                            key={domain.ID}
                                            data-testid="domain-row"
                                            labels={[
                                                c('Header for addresses table').t`Domain`,
                                                c('Header for addresses table').t`Status`,
                                                '',
                                            ]}
                                            cells={[
                                                <DomainName domain={domain} />,
                                                <DomainStatus domain={domain} domainAddresses={domainAddresses} />,
                                                <DropdownActions
                                                    size="small"
                                                    list={[
                                                        isOrgActive &&
                                                            ({
                                                                text: reviewText,
                                                                'aria-label': `${reviewText} ${domain.DomainName}`,
                                                                onClick: () => {
                                                                    setTmpDomainProps({ domain, domainAddresses });
                                                                    setEditDomainModalOpen(true);
                                                                },
                                                            } as const),
                                                        isOrgActive &&
                                                            Array.isArray(domainAddresses) &&
                                                            domainAddresses.length &&
                                                            ({
                                                                text: setCatchAllText,
                                                                'aria-label': `${setCatchAllText} (${domain.DomainName})`,
                                                                onClick: () => {
                                                                    setTmpDomainProps({ domain, domainAddresses });
                                                                    setCatchAllDomainModalOpen(true);
                                                                },
                                                            } as const),
                                                        {
                                                            text: deleteText,
                                                            'aria-label': `${deleteText} ${domain.DomainName}`,
                                                            actionType: 'delete',
                                                            onClick: () => {
                                                                setTmpDomainProps({ domain, domainAddresses });
                                                                setDeleteDomainModalOpen(true);
                                                            },
                                                        } as const,
                                                    ].filter(isTruthy)}
                                                />,
                                            ]}
                                        />
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                    {isOrgActive && (
                        <div className="mb-4 color-weak">
                            {UsedDomains} / {MaxDomains}{' '}
                            {c('Info').ngettext(msgid`domain used`, `domains used`, MaxDomains)}
                        </div>
                    )}
                </>
            )}
        </SettingsSectionWide>
    );
};

const DomainsSectionUpgrade = () => {
    const plus = PLAN_NAMES[PLANS.MAIL];
    const bundle = PLAN_NAMES[PLANS.BUNDLE];

    const upsellRef = getUpsellRef({
        app: APP_UPSELL_REF_PATH.MAIL_UPSELL_REF_PATH,
        component: UPSELL_COMPONENT.BANNER,
        feature: MAIL_UPSELL_PATHS.DOMAIN_NAMES,
        isSettings: true,
    });

    return (
        <SettingsSectionWide>
            <DomainsSectionText />
            <UpgradeBanner upsellPath={upsellRef}>
                {c('new_plans: upgrade').t`Included with ${plus}, ${bundle}, and ${BRAND_NAME} for Business.`}
            </UpgradeBanner>
        </SettingsSectionWide>
    );
};

const DomainsSection = ({ onceRef }: { onceRef: MutableRefObject<boolean> }) => {
    const [customDomains] = useCustomDomains();
    const [user] = useUser();
    const hasPermission = user.isAdmin && user.isSelf && hasPaidMail(user);

    return hasPermission || (!hasPermission && customDomains?.length) ? (
        <DomainsSectionInternal onceRef={onceRef} />
    ) : (
        <DomainsSectionUpgrade />
    );
};

export default DomainsSection;
