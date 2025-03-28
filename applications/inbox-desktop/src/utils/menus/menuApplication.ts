import { app, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { c } from "ttag";
import { uninstallProton } from "../../macos/uninstall";
import { clearStorage, isMac } from "../helpers";
import { getMainWindow, getSpellCheckStatus, resetZoom, toggleSpellCheck, updateZoom } from "../view/viewManagement";
import { isProdEnv } from "../isProdEnv";

type MenuKey = "app" | "file" | "edit" | "view" | "window";
interface MenuProps extends MenuItemConstructorOptions {
    key: MenuKey;
}

interface MenuInsertProps {
    menu: MenuProps[];
    key: MenuKey;
    otherOsEntries?: MenuItemConstructorOptions[];
    macEntries?: MenuItemConstructorOptions[];
    allOSEntries?: MenuItemConstructorOptions[];
}

const insertInMenu = ({ menu, key, otherOsEntries, macEntries, allOSEntries }: MenuInsertProps) => {
    const editIndex = menu.findIndex((item) => item.key === key);
    if (!editIndex) return;

    const submenu = menu[editIndex].submenu as MenuItemConstructorOptions[];
    if (isMac && macEntries) {
        menu[editIndex].submenu = [...submenu, ...macEntries];
    } else if (!isMac && otherOsEntries) {
        menu[editIndex].submenu = [...submenu, ...otherOsEntries];
    }

    menu[editIndex].submenu = [...submenu, ...(allOSEntries ?? [])];
};

export const setApplicationMenu = () => {
    const quitMenuProps: MenuProps["submenu"] = isMac ? [] : [{ role: "quit" }];

    const temp: MenuProps[] = [
        {
            label: c("Menu").t`File`,
            key: "file",
            submenu: [
                {
                    label: c("App menu").t`Clear application data`,
                    type: "normal",
                    click: () => clearStorage(),
                },
                {
                    label: c("App menu").t`Show logs`,
                    type: "normal",
                    click: () => shell.openPath(app.getPath("logs")),
                },
                ...quitMenuProps,
            ],
        },
        {
            label: c("Menu").t`Edit`,
            key: "edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "pasteAndMatchStyle", accelerator: "CmdOrCtrl+Shift+V" },
                { role: "selectAll" },
                {
                    label: c("App menu").t`Check spelling while typing`,
                    type: "checkbox",
                    checked: getSpellCheckStatus(),
                    click: (item) => {
                        toggleSpellCheck(item.checked);
                    },
                },
            ],
        },
        {
            label: c("Menu").t`View`,
            key: "view",
            submenu: [
                {
                    label: c("App menu").t`Reload`,
                    accelerator: "CmdOrCtrl+R",
                    click: () => {
                        const mainWindow = getMainWindow();
                        if (mainWindow) {
                            const view = mainWindow.getBrowserView();
                            if (view) {
                                view.webContents.reload();
                            } else {
                                mainWindow.webContents.reload();
                            }
                        }
                    },
                },
                {
                    label: c("App menu").t`Force Reload`,
                    accelerator: "CmdOrCtrl+Shift+R",
                    click: () => {
                        const mainWindow = getMainWindow();
                        if (mainWindow) {
                            const view = mainWindow.getBrowserView();
                            if (view) {
                                view.webContents.reloadIgnoringCache();
                            } else {
                                mainWindow.webContents.reloadIgnoringCache();
                            }
                        }
                    },
                },
                { type: "separator" },
                { label: c("App menu").t`Actual Size`, accelerator: "CmdOrCtrl+0", click: resetZoom },
                { label: c("App menu").t`Zoom In`, accelerator: "CmdOrCtrl+Plus", click: () => updateZoom("in") },
                { label: c("App menu").t`Zoom Out`, accelerator: "CmdOrCtrl+-", click: () => updateZoom("out") },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
        {
            label: c("Menu").t`Window`,
            key: "window",
            submenu: [{ role: "minimize" }, { role: "close" }, { role: "zoom" }],
        },
    ];

    if (isMac) {
        temp.unshift({
            label: app.name,
            key: "app",
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                {
                    label: c("App menu").t`Start Proton Mail at login`,
                    type: "checkbox",
                    checked: app.getLoginItemSettings().openAtLogin,
                    click: () => {
                        app.setLoginItemSettings({
                            openAtLogin: !app.getLoginItemSettings().openAtLogin,
                        });
                    },
                },
                {
                    label: c("App menu").t`Uninstall Proton Mail`,
                    type: "normal",
                    click: () => uninstallProton(),
                },
                { type: "separator" },
                { role: "quit" },
            ],
        });

        if (!isProdEnv()) {
            const submenu = temp[0].submenu as MenuItemConstructorOptions[];
            temp[0].submenu = [...submenu, { type: "separator" }, { role: "services" }];
        }
    }

    insertInMenu({
        menu: temp,
        key: "edit",
        otherOsEntries: [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }],
        macEntries: [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
                label: c("App menu").t`Speech`,
                submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
        ],
    });

    const menu = Menu.buildFromTemplate(temp);
    Menu.setApplicationMenu(menu);
};
