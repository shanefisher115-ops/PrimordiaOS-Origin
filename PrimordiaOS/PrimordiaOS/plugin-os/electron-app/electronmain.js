const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Worker } = require('worker_threads');
const { IPC } = require(path.join(__dirname, '../shared/constants.js'));

let mainWindow;
let physicsWorker;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

function createPhysicsWorker() {
  physicsWorker = new Worker(path.join(__dirname, 'worker/physics.worker.js'));

  physicsWorker.on('message', (state) => {
    mainWindow.webContents.send(IPC.PHYSICS_STATE, state);
  });
}

app.whenReady().then(() => {
  createWindow();
  createPhysicsWorker();

  ipcMain.on(IPC.PHYSICS_FORCE, (_e, payload) => {
    physicsWorker.postMessage({ type: IPC.PHYSICS_FORCE, payload });
  });

  ipcMain.on(IPC.VIEW_SUBSCRIBE, () => {});

  setTimeout(() => {
    mainWindow.webContents.send(IPC.PRIORITY_UPDATE, {
      fileId: 'CAD_FILE_A',
      priority: 'high'
    });
  }, 3000);
});
