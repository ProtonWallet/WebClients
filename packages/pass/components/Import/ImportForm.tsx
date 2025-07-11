import type { FC } from 'react';
import { useSelector } from 'react-redux';

import { c } from 'ttag';

import { Href, InlineLinkButton } from '@proton/atoms';
import { AttachedFile, Bordered, Dropzone, FileInput, Icon } from '@proton/components';
import { ImportIcon } from '@proton/pass/components/Import/ImportIcon';
import { Card } from '@proton/pass/components/Layout/Card/Card';
import { UpgradeButton } from '@proton/pass/components/Upsell/UpgradeButton';
import { UpsellRef } from '@proton/pass/constants';
import type { ImportFormContext } from '@proton/pass/hooks/import/useImportForm';
import { useFeatureFlag } from '@proton/pass/hooks/useFeatureFlag';
import { ImportProvider, ImportProviderValues, PROVIDER_INFO_MAP } from '@proton/pass/lib/import/types';
import { selectPassPlan } from '@proton/pass/store/selectors';
import type { MaybeNull } from '@proton/pass/types';
import { PassFeature } from '@proton/pass/types/api/features';
import { UserPassPlan } from '@proton/pass/types/api/plan';
import { PASS_APP_NAME } from '@proton/shared/lib/constants';
import { isIos } from '@proton/shared/lib/helpers/browser';
import clsx from '@proton/utils/clsx';

import { ImportProviderItem } from './ImportProviderItem';

import './ImportForm.scss';

const providerHasUnsupportedItemTypes = (provider: ImportProvider) =>
    ![
        ImportProvider.APPLEPASSWORDS,
        ImportProvider.BRAVE,
        ImportProvider.FIREFOX,
        ImportProvider.CHROME,
        ImportProvider.EDGE,
        ImportProvider.SAFARI,
        ImportProvider.CSV,
        ImportProvider.PROTONPASS,
    ].includes(provider);

const providerHasFileAttachments = (provider: ImportProvider) =>
    [ImportProvider.ONEPASSWORD, ImportProvider.ENPASS, ImportProvider.BITWARDEN].includes(provider);

export const ImportForm: FC<Pick<ImportFormContext, 'form' | 'dropzone' | 'busy'>> = ({ form, dropzone, busy }) => {
    const customItemsEnabled = useFeatureFlag(PassFeature.PassCustomTypeV1);
    const free = useSelector(selectPassPlan) === UserPassPlan.FREE;

    const onSelectProvider = (provider: MaybeNull<ImportProvider>) => () => {
        if (provider) dropzone.setSupportedFileTypes(PROVIDER_INFO_MAP[provider].fileExtension.split(', '));
        void form.setValues({ provider, file: null });
    };

    return (
        <>
            <div className="mb-2">
                <strong>{c('Label').t`Select your password manager`}</strong>
                {form.values.provider && (
                    <InlineLinkButton onClick={onSelectProvider(null)} className="ml-2">
                        {c('Action').t`Change`}
                    </InlineLinkButton>
                )}
            </div>

            {!form.values.provider && (
                <>
                    <div className="pass-import-providers--grid gap-3 mb-4">
                        {ImportProviderValues.map((provider) => (
                            <ImportProviderItem
                                onClick={onSelectProvider(provider)}
                                key={provider}
                                value={provider}
                                title={PROVIDER_INFO_MAP[provider].title}
                                fileExtension={PROVIDER_INFO_MAP[provider].fileExtension}
                            />
                        ))}
                    </div>
                    <Href href="https://protonmail.uservoice.com/forums/953584-proton-pass">{c('Action')
                        .t`Your password manager is not here? Request it.`}</Href>
                </>
            )}

            {form.values.provider && (
                <>
                    <div className="flex justify-space-between items-center mt-3 mb-4">
                        <div className="flex items-center">
                            <div className="mr-2">
                                <ImportIcon provider={form.values.provider} />
                            </div>
                            <div className="flex flex-column ml-3">
                                <span>{PROVIDER_INFO_MAP[form.values.provider].title}</span>
                                <span className="color-weak">
                                    {PROVIDER_INFO_MAP[form.values.provider].fileExtension}
                                </span>
                            </div>
                        </div>
                        {PROVIDER_INFO_MAP[form.values.provider].tutorialUrl && (
                            <Href
                                href={PROVIDER_INFO_MAP[form.values.provider].tutorialUrl}
                                className="flex items-center"
                            >
                                {c('Action').t`How do I export my data from ${
                                    PROVIDER_INFO_MAP[form.values.provider].title
                                }?`}
                                <Icon className="ml-2" name="arrow-out-square" />
                            </Href>
                        )}
                    </div>

                    {form.values.provider === ImportProvider.CSV && (
                        <Card className="mb-4 text-sm" type="primary">
                            {c('Info').t`Follow those steps to import your data with a generic CSV:`}
                            <ol className="mt-2 mb-0">
                                <li>
                                    <Href
                                        href="https://pass.proton.me/assets/protonpass-import.csv"
                                        download="protonpass-import.csv"
                                    >
                                        {BUILD_TARGET === 'safari'
                                            ? c('Action').t`Right click and download this CSV`
                                            : c('Action').t`Download this CSV template`}
                                    </Href>
                                </li>
                                <li>{c('Info').t`Fill in the CSV with your data`}</li>
                                <li>{c('Info').t`Import the CSV file below.`}</li>
                                <li>
                                    {c('Info')
                                        .t`After successfully importing your data, you may delete the CSV file containing your passwords for security.`}
                                </li>
                            </ol>
                        </Card>
                    )}

                    <Dropzone
                        onDrop={dropzone.onDrop}
                        disabled={busy}
                        border={false}
                        size={form.values.file ? 'small' : 'medium'}
                    >
                        <Bordered
                            className={clsx([
                                'flex flex-columns justify-center items-center relative p-4 mb-4 rounded border-weak min-h-custom pass-import-upload',
                                form.values.file ? 'pass-import-upload--has-file' : 'border-dashed',
                                form.errors.file && 'border-danger',
                            ])}
                        >
                            {form.values.file ? (
                                <AttachedFile
                                    file={form.values.file}
                                    className={clsx('border-none', busy && 'pointer-events-none')}
                                    iconName="file-lines"
                                    clear={c('Action').t`Delete`}
                                    onClear={() => form.setFieldValue('file', null)}
                                />
                            ) : (
                                <FileInput
                                    // disable the "accept" attribute on:
                                    // - iOS because the "accept" attribute does not support the file extension
                                    // - 1Password because it may export a folder ending with .1pif, itself containing the 1pif file we want
                                    // so we disable the accept attribute to allow selecting the file and not just the folder (tested on macOS)
                                    {...(isIos() || form.values.provider === ImportProvider.ONEPASSWORD
                                        ? {}
                                        : {
                                              accept: PROVIDER_INFO_MAP[form.values.provider].fileExtension
                                                  .replace(/(\w+)/g, '.$1')
                                                  .replace(/\s/g, ''),
                                          })}
                                    onChange={dropzone.onAttach}
                                    disabled={busy}
                                    shape="solid"
                                    color="weak"
                                >
                                    {c('Action').t`Choose a file or drag it here`}
                                </FileInput>
                            )}
                        </Bordered>
                    </Dropzone>

                    {!customItemsEnabled && providerHasUnsupportedItemTypes(form.values.provider) && (
                        <Card className="mb-4 text-sm" type="primary">
                            {c('Info').t`${PASS_APP_NAME} will only import logins, notes, credit cards and identities.`}
                        </Card>
                    )}

                    {providerHasFileAttachments(form.values.provider) && free && (
                        <Card className="mb-4 text-sm" type="primary">
                            {c('Pass_file_attachments')
                                .t`If your data contains file attachments, they will not be imported.`}
                            {BUILD_TARGET !== 'safari' && (
                                <>
                                    {' '}
                                    <UpgradeButton
                                        inline
                                        label={c('Pass_file_attachments').t`Upgrade to support file attachments`}
                                        upsellRef={UpsellRef.FILE_ATTACHMENTS}
                                    />
                                </>
                            )}
                        </Card>
                    )}
                </>
            )}
        </>
    );
};
