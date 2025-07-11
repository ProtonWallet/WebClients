import type { ChangeEvent, FocusEventHandler, MouseEventHandler } from 'react';

import { useUserSettings } from '@proton/account/userSettings/hooks';
import Icon, { type IconName } from '@proton/components/components/icon/Icon';
import Checkbox from '@proton/components/components/input/Checkbox';
import ContactImage from '@proton/components/containers/contacts/ContactImage';
import { DENSITY } from '@proton/shared/lib/constants';
import { toValidHtmlId } from '@proton/shared/lib/dom/toValidHtmlId';
import clsx from '@proton/utils/clsx';

import './ItemCheckbox.scss';

interface Props {
    ID?: string;
    name?: string;
    email?: string;
    iconName?: IconName;
    color?: string;
    compactClassName?: string;
    normalClassName?: string;
    bimiSelector?: string;
    displaySenderImage?: boolean;
    checked: boolean;
    variant?: 'default' | 'small';
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ItemCheckbox = ({
    ID = '',
    name = '',
    email = '',
    iconName,
    color,
    compactClassName,
    normalClassName,
    checked,
    bimiSelector,
    displaySenderImage,
    variant = 'default',
    onChange = () => {},
}: Props) => {
    const [userSettings] = useUserSettings();
    const isCompactView = userSettings.Density === DENSITY.COMPACT;

    /**
     * Due to the way we handle focus of parent elements
     * we need to stop propagation of click and focus
     * on checkbox label.
     */
    const handleClick: MouseEventHandler<HTMLLabelElement> = (event) => event.stopPropagation();
    const handleFocus: FocusEventHandler<HTMLLabelElement> = (event) => event.stopPropagation();

    return isCompactView ? (
        <Checkbox
            className={clsx(['item-icon-compact', compactClassName])}
            checked={checked}
            onChange={onChange}
            labelOnClick={handleClick}
            data-item-id={ID}
            aria-describedby={toValidHtmlId(`message-subject-${ID}`)}
            data-testid="item-checkbox"
        />
    ) : (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/label-has-associated-control, jsx-a11y/click-events-have-key-events
        <label
            className={clsx(['item-checkbox-label relative', normalClassName])}
            onClick={handleClick}
            onFocus={handleFocus}
        >
            <input
                type="checkbox"
                className="item-checkbox absolute inset-0 cursor-pointer m-0"
                checked={checked}
                onChange={onChange}
                data-item-id={ID}
                aria-describedby={toValidHtmlId(`message-subject-${ID}`)}
                data-testid="item-checkbox"
            />
            <span
                className={clsx(
                    'item-icon shrink-0 relative rounded inline-flex',
                    variant === 'small' && 'item-icon--small'
                )}
                style={{
                    backgroundColor: color ?? '',
                }}
                data-testid="element-list:message-checkbox"
                aria-hidden="true"
            >
                <span className="m-auto item-abbr rounded overflow-hidden" aria-hidden="true">
                    {iconName ? (
                        <Icon name={iconName} color="white" />
                    ) : (
                        <ContactImage
                            email={email}
                            name={name}
                            bimiSelector={bimiSelector}
                            displaySenderImage={displaySenderImage}
                            className="rounded relative"
                        />
                    )}
                </span>
                <span className="item-icon-fakecheck m-auto">
                    <Icon color={color ? 'white' : undefined} name="checkmark" className="item-icon-fakecheck-icon" />
                </span>
            </span>
        </label>
    );
};

export default ItemCheckbox;
