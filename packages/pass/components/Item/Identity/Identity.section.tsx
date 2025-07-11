import { type FC } from 'react';
import { useSelector } from 'react-redux';

import type { FieldArrayRenderProps } from 'formik';
import { FieldArray, type FormikContextType } from 'formik';
import { c } from 'ttag';

import { Icon } from '@proton/components';
import { ExtraFieldComponent } from '@proton/pass/components/Form/Field/ExtraFieldGroup/ExtraField';
import {
    createExtraField,
    getExtraFieldOptions,
} from '@proton/pass/components/Form/Field/ExtraFieldGroup/ExtraField.utils';
import { Field } from '@proton/pass/components/Form/Field/Field';
import { FieldsetCluster } from '@proton/pass/components/Form/Field/Layout/FieldsetCluster';
import { TextField } from '@proton/pass/components/Form/Field/TextField';
import { CollapsibleSection } from '@proton/pass/components/Layout/Collapsible/CollapsibleSection';
import type { DropdownMenuOption } from '@proton/pass/components/Layout/Dropdown/DropdownMenuBase';
import { DROPDOWN_SEPARATOR, DropdownMenuBase } from '@proton/pass/components/Layout/Dropdown/DropdownMenuBase';
import { useUpselling } from '@proton/pass/components/Upsell/UpsellingProvider';
import { UpsellRef } from '@proton/pass/constants';
import type { IdentityFormSection } from '@proton/pass/hooks/identity/useIdentityForm';
import { usePortal } from '@proton/pass/hooks/usePortal';
import type { ExtraFieldErrors } from '@proton/pass/lib/validation/extra-field';
import { selectPassPlan } from '@proton/pass/store/selectors';
import type {
    DeobfuscatedItemExtraField,
    ExtraFieldType,
    IdentityFieldName,
    IdentityItemFormValues,
    Maybe,
} from '@proton/pass/types';
import { UserPassPlan } from '@proton/pass/types/api/plan';
import { autofocusInput } from '@proton/pass/utils/dom/input';

type IdentityCollapsibleSectionProps = IdentityFormSection & {
    form: FormikContextType<IdentityItemFormValues>;
    onAddOptionalField: (fieldName: IdentityFieldName) => void;
};

export const IdentitySection: FC<IdentityCollapsibleSectionProps> = ({
    customFieldsKey,
    expanded,
    fields,
    form,
    name,
    optionalFields,
    onAddOptionalField,
}) => {
    const { ParentPortal: AddNewPortal, openPortal } = usePortal();
    const isFreePlan = useSelector(selectPassPlan) === UserPassPlan.FREE;
    const upsell = useUpselling();
    const canCreateField = Boolean(optionalFields || customFieldsKey);

    const getDropdownOptions = (helpers: FieldArrayRenderProps, focusIndex: number): DropdownMenuOption[] => {
        const createCustomField = (type: ExtraFieldType) => {
            if (isFreePlan) {
                return upsell({
                    type: 'pass-plus',
                    upsellRef: UpsellRef.IDENTITY_CUSTOM_FIELDS,
                });
            }

            helpers.push<DeobfuscatedItemExtraField>(createExtraField(type));
            autofocusInput(`${helpers.name}[${focusIndex}]`);
        };

        const newFieldOptions = (optionalFields ?? []).map<DropdownMenuOption>((field) => ({
            value: field.name,
            label: field.label,
            icon: 'card-identity',
            onClick: () => {
                onAddOptionalField(field.name);
                autofocusInput(field.name);
            },
        }));

        return [
            ...newFieldOptions,
            ...(newFieldOptions.length > 0 ? [DROPDOWN_SEPARATOR] : []),
            ...getExtraFieldOptions(createCustomField),
        ];
    };

    return (
        <CollapsibleSection label={name} expanded={expanded}>
            <FieldsetCluster>
                {fields.map((field) => (
                    <Field
                        key={field.name}
                        component={field.component ?? TextField}
                        hidden={field.hidden}
                        type="text"
                        {...field}
                    />
                ))}

                {customFieldsKey && (
                    <FieldArray
                        name={customFieldsKey}
                        render={(helpers) => {
                            const customFields = form.values[customFieldsKey];
                            return (
                                <>
                                    {customFields?.map(({ type }, index) => (
                                        <Field
                                            key={`${customFieldsKey}::${index}`}
                                            component={ExtraFieldComponent}
                                            type={type ?? 'text'}
                                            name={`${customFieldsKey}[${index}]`}
                                            onDelete={() => helpers.remove(index)}
                                            touched={Boolean(form.touched?.[customFieldsKey]?.[index])}
                                            error={form.errors?.[customFieldsKey]?.[index] as Maybe<ExtraFieldErrors>}
                                            hideIcon
                                        />
                                    ))}

                                    {openPortal(
                                        canCreateField && (
                                            <DropdownMenuBase
                                                className="mb-2"
                                                dropdownOptions={getDropdownOptions(helpers, customFields.length)}
                                            >
                                                <div className="flex items-center">
                                                    <Icon name="plus" />
                                                    <div className="ml-2 text-semibold">{c('Action').t`Add more`}</div>
                                                </div>
                                            </DropdownMenuBase>
                                        )
                                    )}
                                </>
                            );
                        }}
                    />
                )}
            </FieldsetCluster>
            {AddNewPortal}
        </CollapsibleSection>
    );
};
