import type { SessionKey } from '@proton/crypto';

import type { AuthVersion } from '../../authentication/interface';
import type { SHARE_MEMBER_STATE } from '../../drive/constants';
import type { SHARE_MEMBER_PERMISSIONS, SHARE_URL_PERMISSIONS } from '../../drive/permissions';
import type { DriveFileBlock, ScanResultItem, Thumbnail } from './file';
import type { LinkType } from './link';

type WithSRPPayload<T extends any> = T & {
    SRPModulusID: string;
    SRPVerifier: string;
    UrlPasswordSalt: string;
};

/**
 * drive/shares/{enc_shareID}/urls request payload
 */
export type CreateSharedURL = WithSRPPayload<{
    CreatorEmail: string;
    ExpirationDuration: number | null;
    Flags: number; // Unused in first iteration
    MaxAccesses: number;
    Password: string;
    Permissions: number; // Only read (4) in first iteration
    SharePassphraseKeyPacket: string;
    SharePasswordSalt: string;
}>;

/**
 * drive/shares/{enc_shareID}/urls response payload
 */
export type ShareURL = WithSRPPayload<{
    CreateTime: number;
    CreatorEmail: string;
    ExpirationTime: number | null;
    Flags: number;
    LastAccessTime: number;
    MaxAccesses: number;
    NumAccesses: number;
    Password: string;
    Permissions: SHARE_URL_PERMISSIONS;
    ShareID: string;
    SharePassphraseKeyPacket: string;
    SharePasswordSalt: string;
    ShareURLID: string;
    Token: string;
    PublicUrl: string;
}>;

export type UpdateSharedURL = WithSRPPayload<{
    ExpirationDuration: number | null;
    ExpirationTime: number | null;
    Flags: number; // Unused in first iteration
    MaxAccesses: number;
    Password: string;
    Permissions: SHARE_URL_PERMISSIONS; // Only read (4) in first iteration
    SharePassphraseKeyPacket: string;
    SharePasswordSalt: string;
}>;

/**
 * drive/urls/{token} response payload
 */
export interface SharedURLInfoPayload {
    ContentKeyPacket: string;
    LinkID: string;
    LinkType: LinkType;
    MIMEType: string;
    Name: string;
    NodeKey: string;
    NodeHashKey: string | null;
    NodePassphrase: string;
    NodePassphraseSignature: string;
    Permissions: SHARE_URL_PERMISSIONS;
    SignatureEmail?: string;
    ShareKey: string;
    SharePassphrase: string;
    SharePasswordSalt: string;
    Size: number;
    ThumbnailURLInfo: ThumbnailURLInfo;
    Token: string;
}

/**
 * drive/urls/{token}/files/{linkId} response payload
 */
export interface SharedURLRevision {
    Blocks: DriveFileBlock[];
    CreateTime: number;
    ID: string;
    ManifestSignature: string;
    SignatureAddress: string;
    Size: number;
    State: number;
    Thumbnails: Thumbnail[];
    XAttr: string;
}

/**
 * drive/urls/${token}/security response payload
 */
export interface SharedFileScan {
    Code: number;
    Errors: ScanResultItem[];
    Results: ScanResultItem[];
}

export enum HandshakeInfoVendorType {
    ProtonDrive = 0,
    ProtonDoc = 1,
    ProtonSheet = 2,
}

/**
 * drive/urls/{token}/info response payload
 */
export interface SRPHandshakeInfo {
    Code: number;
    Modulus: string;
    ServerEphemeral: string;
    UrlPasswordSalt: string;
    SRPSession: string;
    Version: AuthVersion;
    Flags: number;

    /** @deprecated Hack to directly redirect to doc onload */
    IsDoc: boolean;

    VendorType: HandshakeInfoVendorType;
}

export interface ThumbnailURLInfo {
    BareURL: string;
    Token: string;
}

export interface SharedURLSessionKeyPayload {
    sharePasswordSalt: string;
    shareSessionKey: SessionKey;
}

export enum SharedURLFlags {
    // CustomPassword flag is set by both types, legacy and new, of custom
    // password. Legacy has set only CustomPassword, whereas the new type
    // has both CustomPassword and GeneratedPasswordIncluded. That is for
    // easier detection whether user should be asked for the password.
    // All new shares should use new logic, and the legacy mode should be
    // removed when all old shares are cancelled.
    Legacy = 0,
    CustomPassword = 1,
    GeneratedPasswordIncluded = 2,
    GeneratedPasswordWithCustom = 3,
}

export enum ShareTargetType {
    Root = 0,
    Folder = 1,
    File = 2,
    Album = 3,
    Photo = 4,
    ProtonVendor = 5,
}

export interface AbuseReportPayload {
    ShareURL: string;
    Password?: string;
    AbuseCategory: string;
    ReporterEmail?: string;
    ReporterMessage?: string;
    ResourcePassphrase: string;
}

export interface ShareMemberPayloadLEGACY {
    MemberID: string;
    ShareID: string;
    AddressID: string;
    AddressKeyID: string;
    Inviter: string;
    CreateTime: number;
    ModifyTime: number;
    Permissions: SHARE_MEMBER_PERMISSIONS;
    KeyPacket: string;
    KeyPacketSignature: string | null;
    SessionKeySignature: string | null;
    State: SHARE_MEMBER_STATE;
    Unlockable: boolean;
}

export interface InviteShareMemberPayload {
    Email: string;
    Inviter: string;
    Permissions: SHARE_MEMBER_PERMISSIONS;
    KeyPacket: string;
    KeyPacketSignature: string;
}

export interface ListDriveSharedWithMeLinksPayload {
    Links: {
        VolumeID: string;
        ShareID: string;
        LinkID: string;
    }[];
    AnchorID: string;
    More: boolean;
}

export interface ListDrivePendingInvitationsPayload {
    Invitations: {
        VolumeID: string;
        ShareID: string;
        InvitationID: string;
        ShareTargetType: ShareTargetType | null;
    }[];
    AnchorID: string;
    More: boolean;
}

export interface ListDrivePendingExternalInvitationsPayload {
    ExternalInvitations: {
        VolumeID: string;
        ShareID: string;
        ExternalInvitationID: string;
    }[];
    AnchorID: string | null;
    More: boolean;
}

export interface ListDriveSharedByMeLinksPayload {
    Links: {
        ContextShareID: string;
        ShareID: string;
        LinkID: string;
    }[];
    AnchorID: string | null;
    More: boolean;
}
