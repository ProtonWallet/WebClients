import { ColorScheme, ThemeModeSetting } from '@proton/shared/lib/themes/constants';

import { canGetInboxDesktopInfo, getInboxDesktopInfo, hasInboxDesktopFeature } from '../desktop/ipcHelpers';
import type { ThemeSetting } from '../themes/themes';
import { electronAppTheme, getDarkThemes } from '../themes/themes';
import { isElectronApp, isElectronOnMac, isElectronOnWindows } from './desktop';

export const updateElectronThemeModeClassnames = (theme: ThemeSetting) => {
    let prefersDark = false;

    if (theme.Mode === ThemeModeSetting.Dark) {
        prefersDark = true;
    } else if (theme.Mode === ThemeModeSetting.Auto) {
        if (canGetInboxDesktopInfo && hasInboxDesktopFeature('FullTheme')) {
            prefersDark = getInboxDesktopInfo('colorScheme') === ColorScheme.Dark;
        } else {
            prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    const selectedTheme = prefersDark ? theme.DarkTheme : theme.LightTheme;
    const isUsingDarkTheme = getDarkThemes().includes(selectedTheme);

    if (isUsingDarkTheme) {
        document.body.classList.add('is-electron-dark');
        document.body.classList.remove('is-electron-light');
    } else {
        document.body.classList.remove('is-electron-dark');
        document.body.classList.add('is-electron-light');
    }
};

export const initElectronClassnames = () => {
    if (isElectronApp) {
        document.body.classList.add('is-electron');

        if (hasInboxDesktopFeature('ThemeSelection') && canGetInboxDesktopInfo) {
            updateElectronThemeModeClassnames(getInboxDesktopInfo('theme'));
        } else {
            updateElectronThemeModeClassnames(electronAppTheme);
        }
    }

    if (isElectronOnMac) {
        document.body.classList.add('is-electron-mac');
    }

    if (isElectronOnWindows) {
        document.body.classList.add('is-electron-windows');
    }
};
