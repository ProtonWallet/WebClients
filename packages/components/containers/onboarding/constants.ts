import { ThemeTypes } from '@proton/shared/lib/themes/constants';
import { PROTON_THEMES_MAP } from '@proton/shared/lib/themes/themes';

export const ONBOARDING_THEMES = [
    ThemeTypes.Duotone,
    ThemeTypes.Carbon,
    ThemeTypes.Monokai,
    ThemeTypes.Snow,
    ThemeTypes.ContrastLight,
    ThemeTypes.Classic,
].map((id) => PROTON_THEMES_MAP[id]);
