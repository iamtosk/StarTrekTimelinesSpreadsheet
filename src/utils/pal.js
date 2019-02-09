// #!if ENV === 'electron'
const electron = require('electron');
const app = electron.app || electron.remote.app;
const shell = electron.shell || electron.remote.shell;
const dialog = electron.dialog || electron.remote.dialog;
const fs = require('fs');
const os = require('os');

import { ipcRenderer } from 'electron';
// #!endif

export function getAppVersion() {
// #!if ENV === 'electron'
    return app.getVersion();
// #!else
    return process.env.APP_VERSION + '-web';
// #!endif
}

// #!if ENV === 'electron'
export function getAppPath(name) {
    return app.getPath(name);
}
// #!endif

export function getOSDetails() {
// #!if ENV === 'electron'
    return `${os.platform()} ${os.arch()} (${os.release()})`;
// #!else
    return navigator.userAgent;
// #!endif
}

export function openDevTools() {
// #!if ENV === 'electron'
    ipcRenderer.send("open-dev-tools", "");
// #!else
    alert('Open the developer tools by pressing F12');
// #!endif
}

export function openShellExternal(url) {
// #!if ENV === 'electron'
    shell.openExternal(url);
// #!else
    window.open(url, '_blank');
// #!endif
}

export function download(filename, text, title, buttonLabel) {
    let extension = filename.split('.').pop();
// #!if ENV === 'electron'
    let extName = '';
    if (extension === 'csv') {
        extName = 'Comma separated file (*.csv)';
    } else if (extension === 'xlsx') {
        extName = 'Excel spreadsheet (*.xlsx)';
    } else if (extension === 'json') {
        extName = 'JSON formatted file (*.json)';
    } else if (extension === 'html') {
        extName = 'HTML file (*.html)';
    }

    dialog.showSaveDialog(
        {
            filters: [{ name: extName, extensions: [extension] }],
            title: title,
            defaultPath: filename,
            buttonLabel: buttonLabel
        },
        (fileName) => {
            if (fileName === undefined)
                return;

            fs.writeFile(fileName, text, (err) => {
                if (!err) {
                    shell.openItem(fileName);
                }
            });

        });
// #!else
    let mimeType = '';
    let isText = true;
    if (extension === 'csv') {
        mimeType = 'text/csv;charset=utf-8';
    } else if (extension === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        isText = false;
    } else if (extension === 'json') {
        mimeType = 'text/json;charset=utf-8';
    } else if (extension === 'html') {
        mimeType = 'text/html;charset=utf-8';
    }

    function downloadData(dataUrl) {
        let pom = document.createElement('a');
        pom.setAttribute('href', dataUrl);
        pom.setAttribute('download', filename);

        if (document.createEvent) {
            let event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        }
        else {
            pom.click();
        }
    }

    if (isText) {
        downloadData(`data:${mimeType},${encodeURIComponent(text)}`, filename);
    } else {
        var a = new FileReader();
        a.onload = (e) => {
            downloadData(e.target.result);
        };
        a.readAsDataURL(text);
    }
// #!endif
}