import { c } from 'ttag';

import { useGetAddressKeys } from '@proton/account/addressKeys/hooks';
import { getKTUserContext } from '@proton/account/kt/actions';
import { useGetUser } from '@proton/account/user/hooks';
import { useGetUserKeys } from '@proton/account/userKeys/hooks';
import DropdownActions from '@proton/components/components/dropdown/DropdownActions';
import useKTVerifier from '@proton/components/containers/keyTransparency/useKTVerifier';
import useApi from '@proton/components/hooks/useApi';
import useEventManager from '@proton/components/hooks/useEventManager';
import useNotifications from '@proton/components/hooks/useNotifications';
import useLoading from '@proton/hooks/useLoading';
import { useDispatch } from '@proton/redux-shared-store';
import { deleteForwarding, rejectForwarding } from '@proton/shared/lib/api/forwardings';
import { replaceAddressTokens } from '@proton/shared/lib/api/keys';
import type { Address, IncomingAddressForwarding } from '@proton/shared/lib/interfaces';
import { ForwardingState } from '@proton/shared/lib/interfaces';
import { getHasMigratedAddressKeys, getReplacedAddressKeyTokens, splitKeys } from '@proton/shared/lib/keys';
import isTruthy from '@proton/utils/isTruthy';

import { acceptIncomingForwarding } from './helpers';

interface Props {
    forward: IncomingAddressForwarding;
    addresses: Address[];
}

const IncomingForwardActions = ({ forward, addresses }: Props) => {
    const api = useApi();
    const [loading, withLoading] = useLoading();
    const { call } = useEventManager();
    const { createNotification } = useNotifications();
    const getUserKeys = useGetUserKeys();
    const getUser = useGetUser();
    const dispatch = useDispatch();
    const createKtVerifier = useKTVerifier();
    const address = addresses.find(({ ID }) => ID === forward.ForwardeeAddressID);
    const getAddressKeys = useGetAddressKeys();
    const isPending = forward.State === ForwardingState.Pending;
    const isActive = forward.State === ForwardingState.Active;
    const isRejected = forward.State === ForwardingState.Rejected;
    const hasForwardingKeys = !!forward.ForwardingKeys?.length;

    const handleAccept = async () => {
        if (!address) {
            throw new Error('No address');
        }

        const userKeys = await getUserKeys();

        if (getHasMigratedAddressKeys(addresses) && userKeys.length > 1) {
            // The token is validated with the primary user key, and this is to ensure that the address tokens are encrypted to the primary user key.
            // NOTE: Reencrypting address token happens automatically when generating a new user key, but there are users who generated user keys before that functionality existed.
            const primaryUserKey = userKeys[0].privateKey;
            const splitUserKeys = splitKeys(userKeys);
            const replacedResult = await getReplacedAddressKeyTokens({
                addresses,
                privateKeys: splitUserKeys.privateKeys,
                privateKey: primaryUserKey,
            });
            if (replacedResult.AddressKeyTokens.length) {
                await api(replaceAddressTokens(replacedResult));
                await call();
            }
        }

        const addressKeys = await getAddressKeys(address.ID);

        const { keyTransparencyCommit, keyTransparencyVerify } = await createKtVerifier();
        await acceptIncomingForwarding({
            api,
            user: await getUser(),
            userKeys,
            addressKeys,
            address,
            forward,
            keyTransparencyVerify,
            keyTransparencyCommit,
            ktUserContext: await dispatch(getKTUserContext()),
        });
        await call();
        createNotification({ text: c('email_forwarding_2023: Success').t`Forwarding accepted` });
    };

    const handleDecline = async () => {
        await api(rejectForwarding(forward.ID));
        await call();
        createNotification({ text: c('email_forwarding_2023: Success').t`Forwarding declined` });
    };

    const handleDelete = async () => {
        await api(deleteForwarding(forward.ID));
        await call();
        createNotification({ text: c('email_forwarding_2023: Success').t`Forwarding deleted` });
    };

    const list = [
        isPending &&
            address &&
            hasForwardingKeys && {
                text: c('email_forwarding_2023: Action').t`Accept`,
                onClick: () => {
                    void withLoading(handleAccept());
                },
            },
        isPending && {
            text: c('email_forwarding_2023: Action').t`Decline`,
            onClick: async () => {
                void withLoading(handleDecline());
            },
        },
        (isActive || isRejected) && {
            text: c('email_forwarding_2023: Action').t`Delete`,
            onClick: async () => {
                void withLoading(handleDelete());
            },
        },
    ].filter(isTruthy);

    return <DropdownActions list={list} size="small" loading={loading} />;
};

export default IncomingForwardActions;
