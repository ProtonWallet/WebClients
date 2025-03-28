import { fromUnixTime } from 'date-fns';
import { c, msgid } from 'ttag';

import { useUser } from '@proton/account/user/hooks';
import { Avatar, Button } from '@proton/atoms/index';
import { Icon } from '@proton/components/index';
import { getInitials } from '@proton/shared/lib/helpers/string';
import { dateLocale } from '@proton/shared/lib/i18n';

import type { OnFileSkippedSuccessCallbackData, OnFileUploadSuccessCallbackData } from '../../../store';
import type { DecryptedAlbum } from '../../PhotosStore/PhotosWithAlbumsProvider';
import { PhotosUploadButton } from '../toolbar/PhotosUploadButton';

interface AlbumCoverHeaderProps {
    album: DecryptedAlbum;
    onShare: () => void;
    shareId: string;
    linkId: string;
    photoCount: number;
    onFileUpload?: (file: OnFileUploadSuccessCallbackData) => void;
    onFileSkipped?: (file: OnFileSkippedSuccessCallbackData) => void;
}

export const AlbumCoverHeader = ({
    album,
    shareId,
    linkId,
    photoCount,
    onFileUpload,
    onFileSkipped,
    onShare,
}: AlbumCoverHeaderProps) => {
    const formattedDate = new Intl.DateTimeFormat(dateLocale.code, {
        dateStyle: 'long',
    }).format(fromUnixTime(album.createTime));

    const [user] = useUser();

    const { Email, DisplayName, Name } = user;

    const nameToDisplay = DisplayName || Name || ''; // nameToDisplay can be falsy for external account
    const initials = getInitials(nameToDisplay || Email || '');

    return (
        <div className="flex shrink-0 flex-row flex-nowrap items-center p-4" data-testid="album-gallery-cover-section">
            {album.cachedThumbnailUrl || album.cover?.cachedThumbnailUrl ? (
                <img
                    loading="eager"
                    key={album.cachedThumbnailUrl || album.cover?.cachedThumbnailUrl}
                    src={album.cachedThumbnailUrl || album.cover?.cachedThumbnailUrl}
                    alt=""
                    className="bg-weak rounded mr-4 w-1/3 flex h-custom object-cover"
                    style={{
                        '--h-custom': '14rem',
                    }}
                    data-testid="cover-image"
                />
            ) : (
                <span
                    className="bg-weak rounded mr-4 w-1/3 flex h-custom object-cover"
                    style={{
                        '--h-custom': '14rem',
                    }}
                    data-testid="cover-image"
                >
                    <Icon name="album" className="m-auto" size={6} />
                </span>
            )}

            <div className="flex flex-column flex-nowrap mx-auto shrink-0 flex-1" data-testid="cover-info">
                <h1 className="text-bold h2">{album.name}</h1>
                <p className="color-weak mt-1">
                    {formattedDate}
                    <span className="ml-1">
                        ⋅ {c('Info').ngettext(msgid`${photoCount} item`, `${photoCount} items`, photoCount)}
                    </span>
                </p>
                <div className="flex flex-wrap flex-row gap-2" data-testid="cover-options">
                    <Avatar color="weak" data-testid="cover-avatar">
                        {initials}
                    </Avatar>
                    {album.permissions.isAdmin && (
                        <Button
                            color="weak"
                            shape="solid"
                            size="small"
                            className="inline-flex flex-row flex-nowrap items-center"
                            onClick={onShare}
                            data-testid="cover-share"
                        >
                            <Icon name="user-plus" className="mr-2" />
                            {c('Action').t`Share`}
                        </Button>
                    )}

                    {album.permissions.isEditor && (
                        <PhotosUploadButton
                            type="norm"
                            shareId={shareId}
                            linkId={linkId}
                            onFileUpload={onFileUpload}
                            onFileSkipped={onFileSkipped}
                            data-testid="upload-photos"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
