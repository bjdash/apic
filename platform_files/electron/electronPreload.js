var electron = require('electron');
var os = require('os');
const log = require('electron-log');

electron.contextBridge.exposeInMainWorld("apicElectron", {
    osType: os.type(),
    electron: electron,
    send: (channel, data) => {
        // whitelist channels
        let validChannels = ["electron-message"];
        if (validChannels.includes(channel)) {
            electron.ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ["electron-message"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    winClose: () => {
        const currentWindow = electron.remote.BrowserWindow.getFocusedWindow();
        if (currentWindow.isDevToolsOpened()) {
            currentWindow.closeDevTools();
        }
        currentWindow.close();
    },
    winMinimize: () => {
        electron.remote.BrowserWindow.getFocusedWindow().minimize();
    },
    winMaximize: () => {
        var win = electron.remote.BrowserWindow.getFocusedWindow();
        if (!win.isMaximized()) {
            win.maximize();
        } else {
            win.unmaximize();
        }
    }
})
