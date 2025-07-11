import { useCallback, useMemo, useRef } from 'react';

import { c } from 'ttag';

import { ContactEmailsProvider, useActiveBreakpoint } from '@proton/components';
import { isProtonDocsDocument, isProtonDocsSpreadsheet } from '@proton/shared/lib/helpers/mimetype';

import useDriveNavigation from '../../../hooks/drive/useNavigate';
import { useOnItemRenderedMetrics } from '../../../hooks/drive/useOnItemRenderedMetrics';
import {
    type EncryptedLink,
    type ExtendedInvitationDetails,
    type SignatureIssues,
    useBookmarksActions,
    type useSharedWithMeView,
    useThumbnailsDownload,
} from '../../../store';
import { useDocumentActions, useDriveDocsFeatureFlag } from '../../../store/_documents';
import { SortField } from '../../../store/_views/utils/useSorting';
import FileBrowser, {
    type BrowserItemId,
    Cells,
    type FileBrowserBaseItem,
    GridHeader,
    type ListViewHeaderItem,
    useItemContextMenu,
    useSelection,
} from '../../FileBrowser';
import { GridViewItem } from '../FileBrowser/GridViewItemLink';
import { AcceptOrRejectInviteCell, NameCell, SharedByCell, SharedOnCell } from '../FileBrowser/contentCells';
import headerItems from '../FileBrowser/headerCells';
import { translateSortField } from '../SortDropdown';
import { getSelectedSharedWithMeItems } from '../helpers';
import EmptySharedWithMe from './EmptySharedWithMe';
import { SharedWithMeContextMenu } from './SharedWithMeItemContextMenu';

export interface SharedWithMeItem extends FileBrowserBaseItem {
    activeRevision?: EncryptedLink['activeRevision'];
    cachedThumbnailUrl?: string;
    hasThumbnail?: boolean;
    isFile: boolean;
    mimeType: string;
    name: string;
    signatureIssues?: SignatureIssues;
    signatureEmail?: string;
    size: number;
    trashed: number | null;
    rootShareId: string;
    volumeId: string;
    sharedOn?: number;
    sharedBy?: string;
    parentLinkId: string;
    invitationDetails?: ExtendedInvitationDetails;
    bookmarkDetails?: { token: string; createTime: number; urlPassword: string };
}

type Props = {
    shareId: string;
    sharedWithMeView: ReturnType<typeof useSharedWithMeView>;
};

const { CheckboxCell, ContextMenuCell } = Cells;

const largeScreenCells: React.FC<{ item: SharedWithMeItem }>[] = [
    CheckboxCell,
    NameCell,
    SharedByCell,
    ({ item }) => (item.isInvitation ? <AcceptOrRejectInviteCell item={item} /> : <SharedOnCell item={item} />),
    ContextMenuCell,
];
const smallScreenCells: React.FC<{ item: SharedWithMeItem }>[] = [
    CheckboxCell,
    NameCell,
    ({ item }) => (item.isInvitation ? <AcceptOrRejectInviteCell item={item} /> : null),
    ContextMenuCell,
];

const headerItemsLargeScreen: ListViewHeaderItem[] = [
    headerItems.checkbox,
    headerItems.name,
    headerItems.sharedBy,
    headerItems.sharedOnDate,
    headerItems.placeholder,
];

const headerItemsSmallScreen: ListViewHeaderItem[] = [headerItems.checkbox, headerItems.name, headerItems.placeholder];
type SharedWithMeSortFields = Extract<SortField, SortField.name | SortField.sharedBy | SortField.sharedOn>;
const SORT_FIELDS: SharedWithMeSortFields[] = [SortField.name, SortField.sharedBy, SortField.sharedOn];

const SharedWithMe = ({ sharedWithMeView }: Props) => {
    const contextMenuAnchorRef = useRef<HTMLDivElement>(null);

    const { navigateToLink, navigateToAlbum } = useDriveNavigation();

    const browserItemContextMenu = useItemContextMenu();
    const thumbnails = useThumbnailsDownload();
    const selectionControls = useSelection();
    const { viewportWidth } = useActiveBreakpoint();
    const { openDocument } = useDocumentActions();
    const { isDocsEnabled } = useDriveDocsFeatureFlag();
    const { openBookmark } = useBookmarksActions();
    const { incrementItemRenderedCounter } = useOnItemRenderedMetrics(
        sharedWithMeView.layout,
        sharedWithMeView.isLoading
    );
    const { layout, items, sortParams, setSorting, isLoading } = sharedWithMeView;

    const selectedItemIds = selectionControls!.selectedItemIds;
    const selectedBrowserItems = useMemo(
        () => getSelectedSharedWithMeItems(items, selectedItemIds),
        [items, selectedItemIds]
    );

    const handleClick = useCallback(
        (id: BrowserItemId) => {
            const item = items.find((item) => item.id === id);
            if (!item || item.isInvitation) {
                return;
            }
            if (item.isBookmark && item.bookmarkDetails) {
                void openBookmark({
                    token: item.bookmarkDetails.token,
                    urlPassword: item.bookmarkDetails.urlPassword,
                });
                return;
            }
            document.getSelection()?.removeAllRanges();

            if (isProtonDocsDocument(item.mimeType)) {
                if (isDocsEnabled) {
                    return openDocument({
                        type: 'doc',
                        linkId: item.linkId,
                        shareId: item.rootShareId,
                        openBehavior: 'tab',
                    });
                }
                return;
            } else if (isProtonDocsSpreadsheet(item.mimeType)) {
                if (isDocsEnabled) {
                    return openDocument({
                        type: 'sheet',
                        linkId: item.linkId,
                        shareId: item.rootShareId,
                        openBehavior: 'tab',
                    });
                }
                return;
            }

            if (item.albumProperties) {
                navigateToAlbum(item.rootShareId, item.linkId);
                return;
            }
            navigateToLink(item.rootShareId, item.linkId, item.isFile);
        },
        [navigateToLink, navigateToAlbum, items, isDocsEnabled, openDocument]
    );

    const handleItemRender = useCallback(
        (item: SharedWithMeItem) => {
            incrementItemRenderedCounter();
            if (item.hasThumbnail && item.activeRevision && !item.cachedThumbnailUrl) {
                thumbnails.addToDownloadQueue(item.rootShareId, item.linkId, item.activeRevision.id);
            }
        },
        [thumbnails, incrementItemRenderedCounter]
    );

    /* eslint-disable react/display-name */
    const GridHeaderComponent = useMemo(
        () =>
            ({ scrollAreaRef }: { scrollAreaRef: React.RefObject<HTMLDivElement> }) => {
                const activeSortingText = translateSortField(sortParams.sortField);
                return (
                    <GridHeader
                        isLoading={isLoading}
                        sortFields={SORT_FIELDS}
                        onSort={setSorting}
                        sortField={sortParams.sortField}
                        sortOrder={sortParams.sortOrder}
                        itemCount={items.length}
                        scrollAreaRef={scrollAreaRef}
                        activeSortingText={activeSortingText}
                    />
                );
            },
        [sortParams.sortField, sortParams.sortOrder, isLoading]
    );

    if (!items.length && !isLoading) {
        return <EmptySharedWithMe />;
    }

    const Cells = viewportWidth['>=large'] ? largeScreenCells : smallScreenCells;
    const headerItems = viewportWidth['>=large'] ? headerItemsLargeScreen : headerItemsSmallScreen;

    return (
        <ContactEmailsProvider>
            <SharedWithMeContextMenu
                selectedBrowserItems={selectedBrowserItems}
                anchorRef={contextMenuAnchorRef}
                close={browserItemContextMenu.close}
                isOpen={browserItemContextMenu.isOpen}
                open={browserItemContextMenu.open}
                position={browserItemContextMenu.position}
            />
            <FileBrowser
                caption={c('Title').t`Shared`}
                items={items}
                headerItems={headerItems}
                layout={layout}
                loading={isLoading}
                sortParams={sortParams}
                Cells={Cells}
                GridHeaderComponent={GridHeaderComponent}
                GridViewItem={GridViewItem}
                contextMenuAnchorRef={contextMenuAnchorRef}
                onItemContextMenu={browserItemContextMenu.handleContextMenu}
                onItemOpen={handleClick}
                onItemRender={handleItemRender}
                onSort={setSorting}
                onScroll={browserItemContextMenu.close}
            />
        </ContactEmailsProvider>
    );
};

export default SharedWithMe;
