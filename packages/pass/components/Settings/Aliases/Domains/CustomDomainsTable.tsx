import { type FC } from 'react';

import { c } from 'ttag';

import { Badge, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@proton/components';
import { DropdownMenuButton } from '@proton/pass/components/Layout/Dropdown/DropdownMenuButton';
import { QuickActionsDropdown } from '@proton/pass/components/Layout/Dropdown/QuickActionsDropdown';
import { TableRowLoading } from '@proton/pass/components/Layout/Table/TableRowLoading';
import type { CustomDomainOutput } from '@proton/pass/types';

import { useAliasDomains } from './DomainsProvider';

const getDomainStatusLabel = ({ OwnershipVerified, MxVerified }: CustomDomainOutput) => {
    if (!OwnershipVerified) return c('Title').t`Unverified`;
    if (!MxVerified) return c('Info').t`Unconfigured`;
    return null;
};

export const CustomDomainsTable: FC = () => {
    const { customDomains, setAction, defaultAliasDomain, loading } = useAliasDomains();

    if (!loading && customDomains.length === 0) return null;

    return (
        <>
            <Table responsive="cards" hasActions borderWeak>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell className="w-1/2">{c('Title').t`Domain`}</TableHeaderCell>
                        <TableHeaderCell>{c('Title').t`Aliases`}</TableHeaderCell>
                        <TableHeaderCell>{c('Title').t`Status`}</TableHeaderCell>
                        <TableHeaderCell>{c('Title').t`Actions`}</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRowLoading rows={1} cells={4} />
                    ) : (
                        customDomains.map((domain) => {
                            return (
                                <TableRow key={domain.ID}>
                                    <TableCell label={c('Title').t`Domain`}>{domain.Domain}</TableCell>
                                    <TableCell label={c('Title').t`Aliases`}>{domain.AliasCount}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-start lg:justify-center">
                                            {(() => {
                                                if (domain.Domain === defaultAliasDomain) {
                                                    return <Badge type="primary">{c('Title').t`Default`}</Badge>;
                                                }

                                                const statusLabel = getDomainStatusLabel(domain);
                                                return statusLabel && <Badge type="light">{statusLabel}</Badge>;
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                            <QuickActionsDropdown
                                                icon="three-dots-horizontal"
                                                color="weak"
                                                shape="solid"
                                                size="small"
                                                className="button-xs ui-purple"
                                                pill={false}
                                                originalPlacement="bottom-end"
                                            >
                                                <DropdownMenuButton
                                                    label={c('Action').t`Check settings`}
                                                    onClick={() => setAction({ type: 'info', domainID: domain.ID })}
                                                />
                                                <DropdownMenuButton
                                                    label={c('Action').t`Check DNS`}
                                                    onClick={() => setAction({ type: 'dns', domainID: domain.ID })}
                                                />
                                                <DropdownMenuButton
                                                    label={c('Action').t`Delete`}
                                                    onClick={() => setAction({ type: 'delete', domainID: domain.ID })}
                                                />
                                            </QuickActionsDropdown>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </>
    );
};
