import { useState } from 'react';

import { c } from 'ttag';

import { Button } from '@proton/atoms';
import { Href } from '@proton/atoms';
import Alert from '@proton/components/components/alert/Alert';
import CalendarSelect from '@proton/components/components/calendarSelect/CalendarSelect';
import useModalState from '@proton/components/components/modalTwo/useModalState';
import type { SelectChangeEvent } from '@proton/components/components/selectTwo/select';
import SettingsParagraph from '@proton/components/containers/account/SettingsParagraph';
import SettingsSection from '@proton/components/containers/account/SettingsSection';
import ExportModal from '@proton/components/containers/calendar/exportModal/ExportModal';
import { getKnowledgeBaseUrl } from '@proton/shared/lib/helpers/url';
import type { VisualCalendar } from '@proton/shared/lib/interfaces/calendar';

interface Props {
    fallbackCalendar?: VisualCalendar;
    personalCalendars: VisualCalendar[];
}

const CalendarExportSection = ({ personalCalendars, fallbackCalendar }: Props) => {
    const [calendar, setCalendar] = useState(fallbackCalendar);
    const [exportModal, setIsExportModalOpen, renderExportModal] = useModalState();

    const calendarOptions = personalCalendars.map(({ ID: id, Name: name, Color: color }) => ({ id, name, color }));

    const handleSelectCalendar = ({ value: id }: SelectChangeEvent<string>) => {
        const selectedCalendar = personalCalendars.find(({ ID }) => ID === id);
        setCalendar(selectedCalendar || fallbackCalendar);
    };

    const handleExport = () => {
        setIsExportModalOpen(true);
    };

    const selectedCalendar = calendar || fallbackCalendar;

    return (
        <SettingsSection>
            {renderExportModal && selectedCalendar && (
                <ExportModal isOpen={exportModal.open} calendar={selectedCalendar} {...exportModal} />
            )}

            {!selectedCalendar && (
                <Alert className="mb-4" type="warning">
                    {c('Info').t`You have no calendars to export.`}
                </Alert>
            )}

            <SettingsParagraph>
                {c('Calendar export section description')
                    .t`Download an ICS file with all the events from the selected calendar.`}
                <br />
                <Href href={getKnowledgeBaseUrl('/protoncalendar-calendars')}>{c('Knowledge base link label')
                    .t`Here's how`}</Href>
            </SettingsParagraph>

            <div className="flex">
                {selectedCalendar && (
                    <span className="flex-1 mr-4 relative">
                        <label
                            id={`label-calendar-${selectedCalendar.ID}`}
                            htmlFor={`calendar-${selectedCalendar.ID}`}
                            className="sr-only"
                        >{c('Action').t`Select a calendar to export`}</label>
                        <CalendarSelect
                            calendarID={selectedCalendar.ID}
                            options={calendarOptions}
                            onChange={handleSelectCalendar}
                            freeze={false}
                            aria-describedby={`label-calendar-${selectedCalendar.ID}`}
                        />
                    </span>
                )}
                <span className="shrink-0">
                    <Button color="norm" onClick={handleExport} disabled={!selectedCalendar}>{c('Action')
                        .t`Download ICS`}</Button>
                </span>
            </div>
        </SettingsSection>
    );
};

export default CalendarExportSection;
