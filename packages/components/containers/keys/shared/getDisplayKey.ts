import type { AlgorithmInfo } from '@proton/crypto';
import { KEY_FLAG } from '@proton/shared/lib/constants';
import { hasBit } from '@proton/shared/lib/helpers/bitset';
import type { Address, Key, SignedKeyListItem, UserModel } from '@proton/shared/lib/interfaces';
import type { SimpleMap } from '@proton/shared/lib/interfaces/utils';
import { getDefaultKeyFlags, getFormattedAlgorithmNames } from '@proton/shared/lib/keys';

import getPermissions from './getPermissions';
import type { KeyDisplay, KeyStatus } from './interface';
import { KeyType } from './interface';

interface Arguments {
    User: UserModel;
    Address?: Address;
    fingerprint: string;
    isDecrypted: boolean;
    isLoading: boolean;
    Key: Key;
    algorithmInfos: AlgorithmInfo[];
    signedKeyListMap: SimpleMap<SignedKeyListItem | undefined>;
    isWeak: boolean;
    isE2EEForwardingKey: boolean;
}

export const getDisplayKey = ({
    User,
    Address,
    algorithmInfos,
    fingerprint,
    isDecrypted,
    isLoading,
    signedKeyListMap,
    Key,
    isWeak,
    isE2EEForwardingKey,
}: Arguments): KeyDisplay => {
    const { isPrivate, isSelf } = User;
    const signedKeyListItem = signedKeyListMap[Key.ID];

    const { ID, Flags, Primary, AddressForwardingID, GroupMemberID } = Key;

    const flags = signedKeyListItem?.Flags ?? Flags ?? getDefaultKeyFlags(Address);
    const primary = signedKeyListItem?.Primary ?? Primary;

    const isAddressKey = !!Address;
    const isAddressDisabled = Address?.Status === 0;

    const isPrimary = primary === 1;

    // Flags undefined for user keys
    const canEncrypt = flags === undefined ? true : hasBit(flags, KEY_FLAG.FLAG_NOT_OBSOLETE);
    const canSign = flags === undefined ? true : hasBit(flags, KEY_FLAG.FLAG_NOT_COMPROMISED);

    const canEncryptAndSign = canEncrypt && canSign;
    const isObsolete = isDecrypted && !isAddressDisabled && !canEncrypt;
    const isCompromised = !canEncrypt && !canSign;
    const isForwarding = isE2EEForwardingKey;

    const status: KeyStatus = {
        isAddressDisabled,
        isPrimary,
        isDecrypted,
        isLoading,
        isCompromised,
        isObsolete,
        isWeak,
        isForwarding,
    };

    const hasUserPermission = isPrivate;
    const canModify = isAddressKey && hasUserPermission && !isPrimary;
    const canDeleteForwarding = (isPrivate || !isSelf) && (AddressForwardingID === null || GroupMemberID === null);

    return {
        ID,
        fingerprint,
        algorithmInfos,
        type: isAddressKey ? KeyType.Address : KeyType.User,
        flags,
        primary,
        algorithm: getFormattedAlgorithmNames(algorithmInfos),
        status,
        permissions: getPermissions({
            ...status,
            canModify,
            canEncryptAndSign,
            isAddressKey,
            hasUserPermission,
            canDeleteForwarding,
        }),
    };
};
