import JSZip from 'jszip';

import { CryptoProxy } from '@proton/crypto';
import { decodeBase64 } from '@proton/crypto/lib/utils';
import { releaseCryptoProxy, setupCryptoProxyForTesting } from '@proton/pass/lib/crypto/utils/testing';
import { ContentFormatVersion, ItemState } from '@proton/pass/types';
import { getEpoch } from '@proton/pass/utils/time/epoch';
import { PASS_APP_NAME } from '@proton/shared/lib/constants';

import { createPassExportZip, encryptPassExport } from './export';
import type { ExportData } from './types';

const EXPORT_TEST_VAULT_ID = 'vault-share-id';

const EXPORT_TEST_PAYLOAD: ExportData = {
    version: '5.0.0.99',
    encrypted: true,
    vaults: {
        [EXPORT_TEST_VAULT_ID]: {
            name: 'Default vault',
            description: 'This is my super secret test vault',
            display: {},
            items: [
                {
                    itemId: `itemId-${Math.random()}`,
                    shareId: `shareId-${Math.random()}`,
                    state: ItemState.Active,
                    data: {
                        type: 'note',
                        metadata: {
                            name: 'Note',
                            note: 'This is a test note',
                            itemUuid: 'r4nd0mUUID',
                        },
                        content: {},
                        platformSpecific: {},
                        extraFields: [],
                    },
                    contentFormatVersion: ContentFormatVersion.Item,
                    pinned: false,
                    aliasEmail: null,
                    createTime: getEpoch(),
                    modifyTime: getEpoch() + 100,
                    shareCount: 0,
                },
            ],
        },
    },
};
const EXPORT_TEST_PASSPHRASE = 'p4ssphr4se';

describe('Pass export', () => {
    beforeAll(async () => setupCryptoProxyForTesting());
    afterAll(async () => releaseCryptoProxy());

    test('createExportZip should build unencrypted zip', async () => {
        const zip = await createPassExportZip(EXPORT_TEST_PAYLOAD);
        const unzip = await JSZip.loadAsync(zip);

        expect(unzip.file('export.json')).not.toBe(undefined);

        const rawData = await unzip.file(`${PASS_APP_NAME}/data.json`)?.async('string');
        const data = JSON.parse(rawData!);

        expect(data.version).toEqual(EXPORT_TEST_PAYLOAD.version);
        expect(data.vaults).toEqual(EXPORT_TEST_PAYLOAD.vaults);
    });

    test('encryptZip should encrypt zip file to binary format', async () => {
        const uint8Zip = crypto.getRandomValues(new Uint8Array(32));
        const base64Encrypted = await encryptPassExport(uint8Zip, EXPORT_TEST_PASSPHRASE);

        const decrypted = await CryptoProxy.decryptMessage({
            armoredMessage: decodeBase64(base64Encrypted),
            passwords: [EXPORT_TEST_PASSPHRASE],
            format: 'binary',
        });

        expect(decrypted.data.toString()).toEqual(uint8Zip.toString());
    });
});
