import type { MouseEventHandler, ReactNode, Ref, RefObject } from 'react';
import { forwardRef } from 'react';

import { c } from 'ttag';

import { Kbd, Tooltip } from '@proton/atoms';
import { Icon } from '@proton/components';
import { isSafari as checkIsSafari, metaKey, shiftKey } from '@proton/shared/lib/helpers/browser';
import clsx from '@proton/utils/clsx';

import useMailModel from 'proton-mail/hooks/useMailModel';

interface ButtonProps {
    onClick: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    title?: ReactNode;
    children?: ReactNode;
    disabled?: boolean;
    dataTestId?: string;
}

const TitleBarButton = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { onClick, children, className = '', title, disabled = false, dataTestId }: ButtonProps,
        ref: Ref<HTMLButtonElement>
    ) => {
        return (
            <Tooltip title={title}>
                <button
                    type="button"
                    className={clsx([
                        'composer-title-bar-button interactive-pseudo-inset relative flex p-2',
                        className,
                    ])}
                    onClick={onClick}
                    disabled={disabled}
                    data-testid={dataTestId}
                    ref={ref}
                >
                    {children}
                </button>
            </Tooltip>
        );
    }
);

TitleBarButton.displayName = 'TitleBarButton';

interface Props {
    title: string;
    minimized: boolean;
    maximized: boolean;
    toggleMinimized: () => void;
    toggleMaximized: () => void;
    onClose: MouseEventHandler<HTMLButtonElement>;
    handleStartDragging: React.MouseEventHandler<HTMLElement>;
    minimizeButtonRef: RefObject<HTMLButtonElement>;
    composerID: string;
}

const ComposerTitleBar = ({
    title,
    minimized,
    maximized,
    toggleMinimized,
    toggleMaximized,
    handleStartDragging,
    onClose,
    minimizeButtonRef,
    composerID,
}: Props) => {
    const isSafari = checkIsSafari();

    const { Shortcuts } = useMailModel('MailSettings');

    const handleDoubleClick = () => {
        if (minimized) {
            toggleMinimized();
        } else {
            toggleMaximized();
        }
    };

    const titleMinimize =
        Shortcuts && !isSafari ? (
            <>
                {minimized ? c('Action').t`Maximize composer` : c('Action').t`Minimize composer`}
                <br />
                <Kbd shortcut={metaKey} /> + <Kbd shortcut="M" />
            </>
        ) : minimized ? (
            c('Action').t`Maximize composer`
        ) : (
            c('Action').t`Minimize composer`
        );

    const titleMaximize =
        Shortcuts && !isSafari ? (
            <>
                {maximized ? c('Action').t`Contract composer` : c('Action').t`Expand composer`}
                <br />
                <Kbd shortcut={metaKey} /> + <Kbd shortcut={shiftKey} /> + <Kbd shortcut="M" />
            </>
        ) : maximized ? (
            c('Action').t`Contract composer`
        ) : (
            c('Action').t`Expand composer`
        );

    const titleClose = Shortcuts ? (
        <>
            {c('Action').t`Close composer`}
            <br />
            <Kbd shortcut="Escape" />
        </>
    ) : (
        c('Action').t`Close composer`
    );

    return (
        <header
            className="composer-title-bar ui-prominent flex flex-row items-stretch flex-nowrap px-1 w-full"
            data-testid="composer:header"
            onDoubleClick={handleDoubleClick}
        >
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role */}
            <span
                className={clsx([
                    'flex-1 flex flex-row flex-nowrap items-center py-3 pr-4 ml-2',
                    (!maximized || minimized) && 'cursor-move',
                ])}
                onMouseDown={handleStartDragging}
                role="heading"
                aria-level={1}
                id={`composer-title-${composerID}`}
            >
                <Icon
                    name="dots"
                    className="my-auto mr-2 shrink-0"
                    alt={
                        // translator: this string is for blind user: it will be vocalized in blind navigation context: "Composer: " <title of the message>
                        c('Info').t`Composer:`
                    }
                />
                <span className="text-ellipsis user-select-none">{title}</span>
            </span>
            <TitleBarButton
                className={clsx(['hidden md:flex', minimized && 'rotateX-180'])}
                title={titleMinimize}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimized();
                }}
                dataTestId="composer:minimize-button"
                ref={minimizeButtonRef}
            >
                <Icon name="low-dash" alt={title} className="m-auto" />
            </TitleBarButton>
            <TitleBarButton
                title={titleMaximize}
                className="hidden md:flex"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleMaximized();
                }}
                dataTestId="composer:maximize-button"
            >
                <Icon name={maximized ? 'arrows-to-center' : 'arrows-from-center'} alt={title} className="m-auto" />
            </TitleBarButton>
            <TitleBarButton title={titleClose} onClick={onClose} dataTestId="composer:close-button">
                <Icon name="cross-big" alt={title} className="m-auto" />
            </TitleBarButton>
        </header>
    );
};

export default ComposerTitleBar;
