const {
    app,
    BrowserWindow,
    Menu,
    protocol,
    ipcMain,
    shell
} = require('electron');
const log = require('electron-log');
const {
    autoUpdater
} = require("electron-updater");
const path = require('path');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;
log.info('App starting...');

function sendStatusToWindow(type, data) {
    log.info({ type: type, data: data });
    mainWindow.webContents.send('electron-message', { type: type, data: data });
}

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update');
});
autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available');
});
autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available');
});
autoUpdater.on('error', (err) => {
    sendStatusToWindow('update-error');
});
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow('download-progress', {
        speedBPS: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
    });
});
autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded');
});

ipcMain.on('electron-message', onMessageReceived);
function onMessageReceived(event, data) {
    if (data.type) {
        switch (data.type) {
            case 'check-for-update':
                autoUpdater.checkForUpdates();
                break;
            case 'restart-apic':
                autoUpdater.quitAndInstall();
                break;
            case 'open-devtools':
                mainWindow.webContents.openDevTools()
                break
        }
    }
}

// Quit when all windows are closed
app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    log.info("Starting application");
    Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        name: "apic",
        toolbar: true,
        frame: false,
        webPreferences: {
            webSecurity: false,
            enableRemoteModule: true,
            // nodeIntegration: true //dont use this unless have to, use below preload option
            preload: `${__dirname}/electronPreload.js`
        }
    });
    mainWindow.maximize();
    mainWindow.loadURL('file://' + __dirname + "/index.html");
    // mainWindow.webContents.openDevTools({
    //     detach: true
    // });
    mainWindow.webContents.closeDevTools();
    mainWindow.autoHideMenuBar = true;

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // mainWindow.webContents.on('did-frame-finish-load', function () {
    // //log.info("Checking for updates: " + feedURL);
    // //autoUpdater.checkForUpdates();
    // });
});

// app.on('activate', () => {
    // // On macOS it's common to re-create a window in the app when the
    // // dock icon is clicked and there are no other windows open.
    // if (mainWindow === null) {
        // createWindow();
    // }
// });
