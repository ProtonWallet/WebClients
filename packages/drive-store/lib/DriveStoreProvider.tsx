import { PublicSessionProvider } from '../store/_api';
import { DevicesProvider } from '../store/_devices';
import { DownloadsProvider } from '../store/_downloads';
import { DriveEventManagerProvider } from '../store/_events';
import { InvitationsStateProvider } from '../store/_invitations/useInvitationsState';
import { LinksProvider, PublicLinksProvider } from '../store/_links';
import { SharesProvider } from '../store/_shares';
import { UploadProvider } from '../store/_uploads';
import { VolumesProvider } from '../store/_volumes';

export const DriveStoreProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <DriveEventManagerProvider>
            <VolumesProvider>
                <SharesProvider>
                    <LinksProvider>
                        <DevicesProvider>
                            <DownloadsProvider>
                                <UploadProvider>
                                    <InvitationsStateProvider>{children}</InvitationsStateProvider>
                                </UploadProvider>
                            </DownloadsProvider>
                        </DevicesProvider>
                    </LinksProvider>
                </SharesProvider>
            </VolumesProvider>
        </DriveEventManagerProvider>
    );
};

export const PublicDriveStoreProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <VolumesProvider>
            <SharesProvider>
                <PublicSessionProvider>
                    <PublicLinksProvider>{children}</PublicLinksProvider>
                </PublicSessionProvider>
            </SharesProvider>
        </VolumesProvider>
    );
};
