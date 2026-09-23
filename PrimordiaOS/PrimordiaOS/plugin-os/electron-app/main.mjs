// main.ts - Electron Main Process (Primordia Antigravity Link)
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import axios from 'axios';

const config = require('./config.json');


let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    title: 'Primordia Core Controller'
  });

  mainWindow.loadFile('index.html');
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

// IPC Handler: Ping Cloud Connection
ipcMain.handle('cloud:ping', async (event, clientLabel: string) => {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/proxy/test`, { clientLabel });
    return response.data;
  } catch (error: any) {
    return { error: true, message: error.message };
  }
});

// IPC Handler: Remote Calibration Command
ipcMain.handle('cloud:calibrate', async (event, params: { gravityG: number; fieldRadius: number; frequencyHz: number; reason: string }) => {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/core/calibrate`, params);
    return response.data;
  } catch (error: any) {
    return { error: true, message: error.response?.data?.error || error.message };
  }
});

// IPC Handler: Request Secure AI Advisory Proxy
ipcMain.handle('cloud:gemini', async (event, prompt: string) => {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/proxy/gemini`, { prompt });
    return response.data;
  } catch (error: any) {
    return { error: true, message: error.response?.data?.error || error.message };
  }
});

// IPC Handler: Pull Historical Telemetry Records
ipcMain.handle('cloud:pull-records', async () => {
  try {
    const response = await axios.get(`${CLOUD_URL}/api/proxy/sync`);
    return response.data;
  } catch (error: any) {
    return { error: true, message: error.message };
  }
});

// IPC Handler: Push Desktop Telemetry Logs
ipcMain.handle('cloud:push-records', async (event, items: any[]) => {
  try {
    const response = await axios.post(`${CLOUD_URL}/api/proxy/sync`, { items });
    return response.data;
  } catch (error: any) {
    return { error: true, message: error.message };
  }
});
