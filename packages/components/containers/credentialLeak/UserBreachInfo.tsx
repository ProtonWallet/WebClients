import { c } from 'ttag';

import Info from '@proton/components/components/link/Info';

interface UserBreachInfoProps {
    inModal?: boolean;
    exposedData: {
        code: string;
        name: string;
        values?: string[];
    }[];
}
const UserBreachInfo = ({ inModal = false, exposedData }: UserBreachInfoProps) => {
    const personalExposedData = exposedData.filter(({ values }) => values && values.length !== 0);
    const breachDetailsDisclaimer = (
        <Info
            className="ml-2"
            title={c('Info')
                .t`Our alerts prioritize safety. If you don’t recognize any of the breached information, you can safely ignore this report.`}
        />
    );
    return (
        <>
            {inModal ? (
                <div className="flex flex-nowrap">
                    <h2 className="text-semibold text-rg mb-2">{c('Title').t`Details`}</h2>
                    {breachDetailsDisclaimer}
                </div>
            ) : (
                <div className="flex flex-nowrap">
                    <h3 className="text-semibold text-rg mb-2">{c('Title').t`Details`}</h3>
                    {breachDetailsDisclaimer}
                </div>
            )}
            <div className="mb-4">
                {personalExposedData.map(({ name, values }) => {
                    const valuesStr = values ? values.join(', ') : '';
                    return (
                        <div className="flex flex-nowrap flex-column sm:flex-row w-full text-sm mb-2">
                            <span className="sm:w-1/3 color-weak">{name}</span>
                            <span className="sm:flex-1 pl-2 sm:pl-O text-ellipsis" title={valuesStr}>
                                {valuesStr}
                            </span>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default UserBreachInfo;
