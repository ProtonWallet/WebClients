import { c } from 'ttag';

import { Button } from '@proton/atoms';
import Info from '@proton/components/components/link/Info';
import useModalState from '@proton/components/components/modalTwo/useModalState';
import type { PromptProps } from '@proton/components/components/prompt/Prompt';
import Prompt from '@proton/components/components/prompt/Prompt';
import Toggle from '@proton/components/components/toggle/Toggle';
import SettingsLayout from '@proton/components/containers/account/SettingsLayout';
import SettingsLayoutLeft from '@proton/components/containers/account/SettingsLayoutLeft';
import SettingsLayoutRight from '@proton/components/containers/account/SettingsLayoutRight';
import SettingsParagraph from '@proton/components/containers/account/SettingsParagraph';
import SettingsSection from '@proton/components/containers/account/SettingsSection';
import useApi from '@proton/components/hooks/useApi';
import useNotifications from '@proton/components/hooks/useNotifications';
import { useLoading } from '@proton/hooks';
import { mailSettingsActions } from '@proton/mail/store/mailSettings';
import { useMailSettings } from '@proton/mail/store/mailSettings/hooks';
import { useDispatch } from '@proton/redux-shared-store';
import { updateAttachPublicKey, updatePGPScheme, updateSign } from '@proton/shared/lib/api/mailSettings';
import { BRAND_NAME } from '@proton/shared/lib/constants';
import { getKnowledgeBaseUrl } from '@proton/shared/lib/helpers/url';
import type { MailSettings } from '@proton/shared/lib/interfaces';
import { ATTACH_PUBLIC_KEY, DEFAULT_MAILSETTINGS, SIGN } from '@proton/shared/lib/mail/mailSettings';

import { PGPSchemeSelect } from './PGPSchemeSelect';

interface AutomaticallySignModalProps extends Omit<PromptProps, 'title' | 'buttons' | 'children'> {
    onConfirm: (value: boolean) => void;
}

const AutomaticallySignModal = ({ onConfirm, ...rest }: AutomaticallySignModalProps) => {
    return (
        <Prompt
            title={c('Title').t`Automatically sign outgoing messages?`}
            buttons={[
                <Button
                    color="norm"
                    onClick={() => {
                        onConfirm(true);
                        rest.onClose?.();
                    }}
                    data-testid="automatically-sign-modal:confirm"
                >{c('Action').t`Yes`}</Button>,
                <Button
                    onClick={() => {
                        onConfirm(false);
                        rest.onClose?.();
                    }}
                >{c('Action').t`No`}</Button>,
            ]}
            {...rest}
        >
            {c('Info')
                .t`PGP clients are more likely to automatically detect your PGP keys if outgoing messages are signed.`}
        </Prompt>
    );
};

export const ExternalPGPSettingsSection = () => {
    const [{ Sign, AttachPublicKey, PGPScheme } = DEFAULT_MAILSETTINGS] = useMailSettings();
    const { createNotification } = useNotifications();
    const api = useApi();
    const dispatch = useDispatch();
    const [loadingSign, withLoadingSign] = useLoading();
    const [loadingAttach, withLoadingAttach] = useLoading();
    const [loadingScheme, withLoadingScheme] = useLoading();

    const [automaticallySignModalProps, setAutomaticallySignModalOpen, renderAutomaticallySign] = useModalState();

    const handleChangeSign = async (value: number) => {
        const { MailSettings } = await api<{ MailSettings: MailSettings }>(updateSign(value));
        dispatch(mailSettingsActions.updateMailSettings(MailSettings));
        createNotification({ text: c('Info').t`Encryption setting updated` });
    };

    const handleAttachPublicKey = async (value: number) => {
        const { MailSettings } = await api<{ MailSettings: MailSettings }>(updateAttachPublicKey(value));
        dispatch(mailSettingsActions.updateMailSettings(MailSettings));
        createNotification({ text: c('Info').t`Encryption setting updated` });
    };

    const handleChangeScheme = async (value: number) => {
        const { MailSettings } = await api<{ MailSettings: MailSettings }>(updatePGPScheme(value));
        dispatch(mailSettingsActions.updateMailSettings(MailSettings));
        createNotification({ text: c('Info').t`Encryption setting updated` });
    };

    const handleAutomaticallySign = async (shouldSign: boolean) => {
        if (shouldSign) {
            await api<{ MailSettings: MailSettings }>(updateSign(SIGN.ENABLED));
        }
        const { MailSettings: MailSettings } = await api<{ MailSettings: MailSettings }>(
            updateAttachPublicKey(ATTACH_PUBLIC_KEY.ENABLED)
        );
        dispatch(mailSettingsActions.updateMailSettings(MailSettings));
        createNotification({ text: c('Info').t`Encryption setting updated` });
    };

    return (
        <SettingsSection>
            {renderAutomaticallySign && (
                <AutomaticallySignModal
                    onConfirm={(shouldSign) => {
                        const promise = handleAutomaticallySign(shouldSign);
                        if (shouldSign) {
                            withLoadingSign(promise);
                        }
                        withLoadingAttach(promise);
                    }}
                    {...automaticallySignModalProps}
                />
            )}
            <SettingsParagraph learnMoreUrl={getKnowledgeBaseUrl('/how-to-use-pgp')}>
                {c('Info').t`Only change these settings if you are using PGP with non-${BRAND_NAME} recipients.`}
            </SettingsParagraph>

            <SettingsLayout>
                <SettingsLayoutLeft>
                    <label htmlFor="signToggle" className="text-semibold">
                        <span className="mr-2">{c('Label').t`Sign external messages`}</span>
                        <Info
                            url={getKnowledgeBaseUrl('/what-is-a-digital-signature')}
                            title={c('Tooltip sign external messages')
                                .t`Automatically sign all your outgoing messages so users can verify the authenticity of your messages. This is done in combination with the default PGP settings which can be configured below.`}
                        />
                    </label>
                </SettingsLayoutLeft>
                <SettingsLayoutRight isToggleContainer>
                    <Toggle
                        id="signToggle"
                        checked={!!Sign}
                        onChange={(e) => {
                            withLoadingSign(handleChangeSign(+e.target.checked));
                        }}
                        loading={loadingSign}
                    />
                </SettingsLayoutRight>
            </SettingsLayout>
            <SettingsLayout>
                <SettingsLayoutLeft>
                    <label htmlFor="attachPublicKeyToggle" className="text-semibold">
                        <span className="mr-2">{c('Label').t`Attach public key`}</span>
                        <Info
                            url={getKnowledgeBaseUrl('/how-to-use-pgp')}
                            title={c('Tooltip automatically attach public key')
                                .t`This automatically adds your public key to each message you send. Recipients can use this to verify the authenticity of your messages and send encrypted messages to you.`}
                        />
                    </label>
                </SettingsLayoutLeft>
                <SettingsLayoutRight isToggleContainer>
                    <Toggle
                        id="attachPublicKeyToggle"
                        checked={!!AttachPublicKey}
                        onChange={(e) => {
                            const newValue = +e.target.checked;
                            if (newValue && !Sign) {
                                setAutomaticallySignModalOpen(true);
                            } else {
                                withLoadingAttach(handleAttachPublicKey(newValue));
                            }
                        }}
                        loading={loadingAttach}
                    />
                </SettingsLayoutRight>
            </SettingsLayout>
            <SettingsLayout>
                <SettingsLayoutLeft>
                    <label htmlFor="PGPSchemeSelect" className="text-semibold">
                        <span className="mr-2">{c('Label').t`Default PGP scheme`}</span>
                        <Info
                            url={getKnowledgeBaseUrl('/pgp-mime-pgp-inline')}
                            title={c('Tooltip default pgp scheme')
                                .t`Select the default PGP settings used to sign or encrypt messages with non-${BRAND_NAME} PGP users. Note that Inline PGP forces plain text messages.`}
                        />
                    </label>
                </SettingsLayoutLeft>
                <SettingsLayoutRight>
                    <PGPSchemeSelect
                        id="PGPSchemeSelect"
                        pgpScheme={PGPScheme}
                        onChange={(e) => {
                            withLoadingScheme(handleChangeScheme(+e.target.value));
                        }}
                        disabled={loadingScheme}
                    />
                </SettingsLayoutRight>
            </SettingsLayout>
        </SettingsSection>
    );
};
