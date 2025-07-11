import { useState } from 'react';

import { c } from 'ttag';

import Select from '@proton/components/components/select/Select';
import useApi from '@proton/components/hooks/useApi';
import useNotifications from '@proton/components/hooks/useNotifications';
import { useLoading } from '@proton/hooks';
import { mailSettingsActions } from '@proton/mail/store/mailSettings';
import { useDispatch } from '@proton/redux-shared-store';
import { updateDelaySend } from '@proton/shared/lib/api/mailSettings';
import type { MailSettings } from '@proton/shared/lib/interfaces';
import { DELAY_IN_SECONDS } from '@proton/shared/lib/mail/mailSettings';

interface Props {
    id: string;
    delaySendSeconds: number;
}

const DelaySendSecondsSelect = ({ id, delaySendSeconds }: Props) => {
    const { createNotification } = useNotifications();
    const [loading, withLoading] = useLoading();
    const dispatch = useDispatch();
    const api = useApi();
    const [delay, setDelay] = useState(delaySendSeconds);
    const options = [
        { text: c('Option delay send seconds').t`0 seconds`, value: DELAY_IN_SECONDS.NONE },
        { text: c('Option delay send seconds').t`5 seconds`, value: DELAY_IN_SECONDS.SMALL },
        { text: c('Option delay send seconds').t`10 seconds`, value: DELAY_IN_SECONDS.MEDIUM },
        { text: c('Option delay send seconds').t`20 seconds`, value: DELAY_IN_SECONDS.LARGE },
    ];

    const handleChange = async (delay: number) => {
        const { MailSettings } = await api<{ MailSettings: MailSettings }>(updateDelaySend(delay));
        dispatch(mailSettingsActions.updateMailSettings(MailSettings));
        setDelay(delay);
        createNotification({ text: c('Success').t`Preference saved` });
    };

    return (
        <Select
            id={id}
            value={delay}
            options={options}
            onChange={({ target }) => withLoading(handleChange(+target.value))}
            loading={loading}
        />
    );
};

export default DelaySendSecondsSelect;
