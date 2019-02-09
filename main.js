/*
    StarTrekTimelinesSpreadsheet - A tool to help with crew management in Star Trek Timelines
    Copyright (C) 2017-2018 IAmPicard

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
'use strict';

// Import parts of electron to use
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path')
const url = require('url')
const FB = require('fb');
const appConfig = require('electron-settings');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// If seeing certificate errors, uncomment this line. DO NOT SHIP THIS TURNED ON!
// app.commandLine.appendSwitch('ignore-certificate-errors'); 

// Keep a reference for dev mode
let dev = false;
if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
  dev = true;
}

function windowStateKeeper(windowName) {
  let window, windowState;
  function setBounds() {
    // Restore from appConfig
    if (appConfig.has(`windowState.${windowName}`)) {
      windowState = appConfig.get(`windowState.${windowName}`);
      return;
    }
    // Default
    windowState = {
      x: undefined,
      y: undefined,
      width: 1000,
      height: 800,
    };
  }
  function saveState() {
    if (!windowState.isMaximized) {
      windowState = window.getBounds();
    }
    windowState.isMaximized = window.isMaximized();
    appConfig.set(`windowState.${windowName}`, windowState);
  }
  function track(win) {
    window = win;
    ['resize', 'move', 'close'].forEach(event => {
      win.on(event, saveState);
    });
  }
  setBounds();
  return ({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    isMaximized: windowState.isMaximized,
    track,
  });
}

function createWindow() {
  // Get window state
  const mainWindowStateKeeper = windowStateKeeper('main');

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: mainWindowStateKeeper.x,
    y: mainWindowStateKeeper.y,
    width: mainWindowStateKeeper.width,
    height: mainWindowStateKeeper.height,
    show: false,
    contextIsolation: true,
    icon: path.join(__dirname, 'src/assets/icons/ATFleet.ico'),
    webPreferences: { webSecurity: false, nodeIntegration: true }
  });

  // Track window state
  mainWindowStateKeeper.track(mainWindow);

  mainWindow.setTitle('Star Trek Timelines Crew Management v' + app.getVersion());
  mainWindow.setMenu(null);

  // and load the index.html of the app.
  let indexPath;
  if (dev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true
    });
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'dist', 'index.html'),
      slashes: true
    });
  }
  mainWindow.loadURL(indexPath);

  // Don't show until we are ready and loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open the DevTools automatically if developing
    if (dev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

ipcMain.on("open-dev-tools", function (event, arg) {
  mainWindow.webContents.openDevTools();
});

ipcMain.on("fb-authenticate", function (event, arg) {
  var options = {
    client_id: "322613001274224",
    scopes: "public_profile",
    redirect_uri: "https://www.facebook.com/connect/login_success.html"
  };
  var authWindow = new BrowserWindow({
    width: 450, height: 300, show: false,
    parent: mainWindow, modal: true, webPreferences: { nodeIntegration: false }
  });
  var facebookAuthURL = "https://www.facebook.com/v2.8/dialog/oauth?client_id=" + options.client_id + "&redirect_uri=" + options.redirect_uri + "&response_type=token,granted_scopes&scope=" + options.scopes + "&display=popup";
  authWindow.loadURL(facebookAuthURL);
  authWindow.show();

  authWindow.on('closed', function () {
    mainWindow.webContents.send("fb_closed");
  });

  session.defaultSession.webRequest.onBeforeRedirect({ urls: ['https://www.facebook.com/*'] }, (details, callback) => {
    var raw_code = /access_token=([^&]*)/.exec(details.redirectURL) || null;
    var access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
    var error = /\?error=(.+)$/.exec(details.redirectURL);

    if (access_token) {
      FB.setAccessToken(access_token);
      FB.api('/me', { fields: ['id', 'name', 'picture.width(200).height(200)'] }, function (res) {
        res.access_token = access_token;
        mainWindow.webContents.send("fb_access_token", res);
      });
      authWindow.close();
    }
  })
});

app.setAppUserModelId("IAmPicard.StarTrekTimelinesTool");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
