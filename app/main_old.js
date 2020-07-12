// Handle Squirrel events for Windows immediately on start
if (require('electron-squirrel-startup')) return;

const electron = require('electron');
const {app} = electron;
const {BrowserWindow} = electron;
const {autoUpdater} = electron;
const {ipcMain} = electron;
const os = require('os');


var mainWindow = null;

var updateFeed = 'http://localhost/apic/app/dist/win/';
var isDevelopment = process.env.NODE_ENV === 'development';
var feedURL = "";
var quitAndUpdateFn = null;

function attachUpdateListeners() {
    if (os.platform() === 'darwin') {
        //updateFeed = 'http://ea-todo.herokuapp.com/updates/latest'; 
    } else if (os.platform() === 'win32') {
        //updateFeed = 'http://eatodo.s3.amazonaws.com/updates/latest/win' + (os.arch() === 'x64' ? '64' : '32');
        //updateFeed = 'http://localhost/apic/app/dist/win/';
    }

    autoUpdater.addListener("update-available", function (event) {
        sendMessage('update-available');
    });
    autoUpdater.addListener("update-downloaded", function (event, releaseNotes, releaseName, releaseDate, updateURL, quitAndUpdate) {
        quitAndUpdateFn = quitAndUpdate;
        sendMessage('update-downloaded');
    });
    autoUpdater.addListener("error", function (error) {
        sendMessage('update-error');
    });
    autoUpdater.addListener("checking-for-update", function (event) {
        sendMessage('checking-for-update');
    });
    autoUpdater.addListener("update-not-available", function () {
        sendMessage('update-not-available');
    });
}

function checkForUpdate(url) {
    updateFeed = url ? url : updateFeed;
    const appVersion = require('./package.json').version;
    var feedURL = updateFeed + '?v=' + appVersion;
    autoUpdater.setFeedURL(feedURL);
    autoUpdater.checkForUpdates();
}

ipcMain.on('electron-message', onMessageReceived);
function onMessageReceived(event, data){
    if(data.type){
        switch(data.type){
            case 'check-for-update':
                var url = '';
                if(data.message){
                    url = data.message.url;
                }
                checkForUpdate(url);
                break;
            case 'restart-apic':
                if(typeof quitAndUpdateFn === 'function'){
                    quitAndUpdateFn();
                }else if(autoUpdater.quitAndInstall){
                    autoUpdater.quitAndInstall();
                }
                break;
        }
    }
}

attachUpdateListeners();

function sendMessage(type, data){
    if (mainWindow) {
        mainWindow.webContents.send('electron-message', {type:type, data:data});
    }
}

// Quit when all windows are closed
app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {

    console.log("Starting application");

    mainWindow = new BrowserWindow({
        name: "apic",
        toolbar: true
    });
    mainWindow.maximize()
    mainWindow.loadURL('file://' + __dirname + "/src/index.html");

    mainWindow.webContents.openDevTools({detach:true});

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    if (!isDevelopment) {
        mainWindow.webContents.on('did-frame-finish-load', function () {
            //console.log("Checking for updates: " + feedURL);
            //autoUpdater.checkForUpdates();
        });
    }

});