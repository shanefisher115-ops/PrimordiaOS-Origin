"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts - Electron Main Process (Primordia Antigravity Link)
const electron_1 = require("electron");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const CLOUD_URL = "https://ais-dev-i532dsjoooliogd3fsraxc-605188011172.us-east1.run.app";
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handler: Ping Cloud Connection
electron_1.ipcMain.handle('cloud:ping', async (event, clientLabel) => {
    try {
        const response = await axios_1.default.post(`${CLOUD_URL}/api/proxy/test`, { clientLabel });
        return response.data;
    }
    catch (error) {
        return { error: true, message: error.message };
    }
});
// IPC Handler: Remote Calibration Command
electron_1.ipcMain.handle('cloud:calibrate', async (event, params) => {
    try {
        const response = await axios_1.default.post(`${CLOUD_URL}/api/core/calibrate`, params);
        return response.data;
    }
    catch (error) {
        return { error: true, message: error.response?.data?.error || error.message };
    }
});
// IPC Handler: Request Secure AI Advisory Proxy
electron_1.ipcMain.handle('cloud:gemini', async (event, prompt) => {
    try {
        const response = await axios_1.default.post(`${CLOUD_URL}/api/proxy/gemini`, { prompt });
        return response.data;
    }
    catch (error) {
        return { error: true, message: error.response?.data?.error || error.message };
    }
});
// IPC Handler: Pull Historical Telemetry Records
electron_1.ipcMain.handle('cloud:pull-records', async () => {
    try {
        const response = await axios_1.default.get(`${CLOUD_URL}/api/proxy/sync`);
        return response.data;
    }
    catch (error) {
        return { error: true, message: error.message };
    }
});
// IPC Handler: Push Desktop Telemetry Logs
electron_1.ipcMain.handle('cloud:push-records', async (event, items) => {
    try {
        const response = await axios_1.default.post(`${CLOUD_URL}/api/proxy/sync`, { items });
        return response.data;
    }
    catch (error) {
        return { error: true, message: error.message };
    }
});
