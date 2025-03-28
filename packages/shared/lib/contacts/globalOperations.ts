import { CryptoProxy, VERIFICATION_STATUS } from '@proton/crypto';

import { getContact, updateContact } from '../api/contacts';
import { CONTACT_CARD_TYPE } from '../constants';
import type { Api, DecryptedKey, Key } from '../interfaces';
import type { Contact } from '../interfaces/contacts';
import { splitKeys } from '../keys/keys';
import { getKeyUsedForContact } from './keyVerifications';
import { resignCards } from './resign';

/**
 * Process all contacts and update each of them without the content encrypted with the given key
 */
export const dropDataEncryptedWithAKey = async (
    contacts: Contact[],
    referenceKey: Key,
    userKeys: DecryptedKey[],
    api: Api,
    progressionCallback: (progress: number, updated: number) => void,
    exitRef: { current: boolean }
) => {
    let updated = 0;
    const { privateKeys } = splitKeys(userKeys);

    for (let i = 0; i < contacts.length && !exitRef.current; i++) {
        const contactID = contacts[i].ID;
        const { Contact } = await api<{ Contact: Contact }>(getContact(contactID));
        const match = await getKeyUsedForContact(Contact, [referenceKey], true);
        if (match) {
            updated++;
            const Cards = await Promise.all(
                Contact.Cards.filter(
                    (card) =>
                        card.Type !== CONTACT_CARD_TYPE.ENCRYPTED &&
                        card.Type !== CONTACT_CARD_TYPE.ENCRYPTED_AND_SIGNED
                ).map(async (card) => {
                    let { Signature } = card;
                    if (card.Type === CONTACT_CARD_TYPE.SIGNED) {
                        const signature = await CryptoProxy.signMessage({
                            textData: card.Data,
                            stripTrailingSpaces: true,
                            signingKeys: [privateKeys[0]],
                            detached: true,
                        });
                        Signature = signature;
                    }
                    return { ...card, Signature };
                })
            );
            await api<{ Contact: Contact }>(updateContact(contactID, { Cards }));
            // console.log('dropDataEncryptedWithAKey', updateContact(contactID, { Cards }));
        }
        progressionCallback(i + 1, updated);
    }
};

/**
 * Process all contacts and resign each of them with the given key
 */
export const resignAllContacts = async (
    contacts: Contact[],
    userKeys: DecryptedKey[],
    api: Api,
    progressionCallback: (progress: number, updated: number) => void,
    exitRef: { current: boolean }
) => {
    let updated = 0;
    const { publicKeys, privateKeys } = splitKeys(userKeys);

    for (let i = 0; i < contacts.length && !exitRef.current; i++) {
        const contactID = contacts[i].ID;
        const { Contact } = await api<{ Contact: Contact }>(getContact(contactID));

        // Should only be one signed card
        const signedCard = Contact.Cards.find((card) => card.Type === CONTACT_CARD_TYPE.SIGNED);

        if (!signedCard || !signedCard.Signature) {
            progressionCallback(i + 1, updated);
            continue;
        }

        const { verificationStatus } = await CryptoProxy.verifyMessage({
            textData: signedCard.Data,
            stripTrailingSpaces: true,
            verificationKeys: publicKeys,
            armoredSignature: signedCard.Signature,
        });

        if (verificationStatus !== VERIFICATION_STATUS.SIGNED_AND_VALID) {
            updated++;
            const Cards = await resignCards({
                contactCards: Contact.Cards,
                privateKeys: [privateKeys[0]],
            });
            await api<{ Contact: Contact }>(updateContact(contactID, { Cards }));
            // console.log('resignAllContacts', updateContact(contactID, { Cards }));
        }
        progressionCallback(i + 1, updated);
    }
};
