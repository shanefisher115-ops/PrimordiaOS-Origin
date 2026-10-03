const { app, BrowserWindow } = require('electron');
const path = require('path');

// Initialize the backend Express & WebSocket telemetry server
require('./server.js');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        backgroundColor: '#030712',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Allow server time to bind, then load the local operational UI
    setTimeout(() => {
        win.loadURL('http://localhost:3000');
    }, 1200);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});