const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const libpath = require('path');
const nodeUrl = require('url');
const Store = require('electron-store');
const {
    env: { NODE_ENV, platform }
} = process;


/** @type {Electron.BrowserWindow} */
let browserWindow = null;
/** @type {Electron.BrowserWindow} */
let helpWindow = null;
/** @type {Electron.BrowserWindow} */
let loginWindow = null;

const isMac = platform === 'darwin';

Store.initRenderer();


Menu.setApplicationMenu(
    Menu.buildFromTemplate([
        {
            role: 'fileMenu',
            submenu: [
                {
                    label: 'Save',
                    accelerator: 'CommandOrControl+S',
                    click: () => {
                        browserWindow.webContents.send('menu:save');
                    }
                },
                {
                    label: 'Save As',
                    accelerator: 'CommandOrControl+Shift+S',
                    click: () => {
                        browserWindow.webContents.send('menu:saveas');
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CommandOrControl+Z',
                    click: () => {
                        browserWindow.webContents.send('menu:undo');
                    }
                },
                {
                    label: 'Redo',
                    accelerator: 'CommandOrControl+Shift+Z',
                    click: () => {
                        browserWindow.webContents.send('menu:redo');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CommandOrControl+X',
                    click: () => {
                        browserWindow.webContents.send('menu:cut');
                    }
                },
                {
                    label: 'Copy',
                    accelerator: 'CommandOrControl+C',
                    click: () => {
                        browserWindow.webContents.send('menu:copy');
                    }
                },
                {
                    label: 'Paste',
                    accelerator: 'CommandOrControl+V',
                    click: () => {
                        browserWindow.webContents.send('menu:paste');
                    }
                },
                ...(isMac
                    ? [
                          { type: 'separator' },
                          {
                              label: 'Speech',
                              submenu: [
                                  { role: 'startspeaking' },
                                  { role: 'stopspeaking' }
                              ]
                          }
                      ]
                    : [])
            ]
        },
        ...(NODE_ENV === 'development' ? [{ role: 'viewMenu' }] : []),
        { role: 'windowMenu' }
    ])
);


const create = () => {
    const w = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            devTools: NODE_ENV === 'development'
                ? true
                : false,
            nodeIntegration: true,
            contextIsolation: false
        },
        title: "Emo Motion Editor",
        icon: `${libpath.join(__dirname, 'icon.png')}`,
    });
    const splash = new BrowserWindow({
        width: 854,
        height: 481,
        transparent: true,
        frame: false,
        center: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        hasShadow: false,
        title: "Emo Motion Editor",
        icon: `${libpath.join(__dirname, 'icon.png')}`,
    });

    splash.loadURL(`file://${libpath.join(__dirname, 'splash/splash.html')}`);
    let splash_load_ms = Date.now();

    w.loadURL(
        NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : `file://${libpath.join(__dirname, 'dst/index.html')}`
    );

    w.on('ready-to-show', () => {
        let load_time = Date.now() - splash_load_ms;
        let show_delay = load_time >= 2000 ? 0 : 2000-load_time;
        setTimeout(() => {
            w.maximize();
            w.show();
            setTimeout(() => {
                splash.destroy();
            }, 500);
        }, show_delay);
    })
    w.on('close', (e) => {
        if (browserWindow) {
            e.preventDefault();
            browserWindow.webContents.send('app-close');
        }
    });
    w.on('closed', (e) => {
        browserWindow = null;
    });

    browserWindow = w;
};


ipcMain.on('app-close-finished', _ => {
    browserWindow = null;
    app.quit();
});

ipcMain.on('app-change-main-window-title', (event, title) => {
    if (browserWindow) {
        browserWindow.setTitle(title);
    }
});

ipcMain.on('app-menu-event-forward', (event, name) => {
    if (browserWindow) {
        browserWindow.webContents.send(name);
    }
});

ipcMain.on('app-window-show-help', (event, name) => {
    if (!helpWindow) {
        helpWindow = new BrowserWindow({
            show: false,
            width: 1024,
            height: 768,
            autoHideMenuBar: true,
            title: "Emo Motion Editor - Help",
            icon: `${libpath.join(__dirname, 'icon.png')}`,
            webPreferences: {
                devTools: false,
            }
        });
        helpWindow.on('closed', () => {
            helpWindow = null;
        });
        helpWindow.webContents.on('did-finish-load', () => {
            helpWindow.show();
        });
        helpWindow.loadURL("https://github.com/YUKAI/emo-motion-editor/wiki/How-To-Use");
    }
    else {
        helpWindow.focus();
    }
});


ipcMain.handle('app-dialog-show-message-box', async (event, args) => {
    const ret = await dialog.showMessageBox(browserWindow, args);
    return ret.response;
});

ipcMain.handle('app-dialog-show-open', async (event, args) => {
    const ret = await dialog.showOpenDialog(browserWindow, args);
    return ret.canceled ? undefined : ret.filePaths;
});

ipcMain.handle('app-dialog-show-save', async (event, args) => {
    const ret = await dialog.showSaveDialog(browserWindow, args);
    return ret.canceled ? undefined : ret.filePath;
});

ipcMain.handle('app-window-show-api-login', (event, config) => {
    if (!loginWindow) {
        loginWindow = new BrowserWindow({
            show: false,
            width: 1024,
            height: 768,
            parent: browserWindow,
            modal: true,
            autoHideMenuBar: true,
            webPreferences: {
                devTools: false,
            },
        });
        var tosPopup = null;

        var urlParams = {
            redirect_uri: config.redirectUri
        };
        var url = config.loginUrl + '?' + (new URLSearchParams(urlParams)).toString();

        return new Promise(function(resolve, reject) {
            loginWindow.loadURL(url);

            function show_tos(tosUrl) {
                if (!tosPopup) {
                    tosPopup = new BrowserWindow({
                        show: false,
                        parent: loginWindow,
                        modal: true,
                        autoHideMenuBar: true,
                        webPreferences: {
                            devTools: false,
                        },
                    });
                    tosPopup.on('closed', () => {
                        tosPopup.removeAllListeners
                        tosPopup = null;
                    });
                    tosPopup.webContents.on('did-finish-load', () => { tosPopup.show(); });
                    tosPopup.loadURL(tosUrl);
                }
            }
            function hide_tos() {
                if (tosPopup) {
                    tosPopup.removeAllListeners('closed');
                    tosPopup.close();
                    tosPopup = null;
                }
            }
            function authorize_callback(c_url) {
                var code = c_url.searchParams.get('code');
                var error = c_url.searchParams.get('error');

                if (c_url.origin+c_url.pathname != config.redirectUri) {
                    return;
                }

                hide_tos();
                loginWindow.removeAllListeners('closed');
                loginWindow.close();
                loginWindow = null;

                if (error !== null) {
                    reject(error);
                }
                else if (code) {
                    resolve(code);
                }
                else {
                    reject("Did not receive code");
                }
            }
            loginWindow.webContents.on('did-finish-load', () => {
                loginWindow.show();
            });
            loginWindow.webContents.on('will-navigate', (event, navUrl) => {
                var c_url = new nodeUrl.URL(navUrl);
                console.log("Will navigate to:", c_url);
                if (c_url.href === config.termsUrl) {
                    event.preventDefault();
                    show_tos(c_url.href);
                }
                else {
                    authorize_callback(c_url);
                }
            });
            loginWindow.webContents.on('will-redirect', (event, navUrl, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
                var c_url = new nodeUrl.URL(navUrl);
                console.log("Will redirect to:", c_url);
                authorize_callback(c_url);
            });
            loginWindow.on('close', () => {
                hide_tos();
            });
            loginWindow.on('closed', () => {
                loginWindow = null;
                reject("Window closed by user");
            });
        });
    }
    else {
        loginWindow.focus();
    }
});


app.on('ready', () => {
    if (NODE_ENV === 'development') {
        const {
            default: installExtension,
            REACT_DEVELOPER_TOOLS
        } = require('electron-devtools-installer');

        installExtension(REACT_DEVELOPER_TOOLS).catch(console.error);
    }

    create();
});

app.on('activate', () => {
    if (!browserWindow) {
        create();
    }
});

app.on('quit', () => {
    if (helpWindow) {
        try {
            helpWindow.close();
        }
        finally {
        }
    }
    if (loginWindow) {
        try {
            loginWindow.close();
        }
        finally {
        }
    }
});
