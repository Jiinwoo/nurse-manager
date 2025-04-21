import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDb } from './database';
import { setupIpcHandlers } from './ipc';
import { logger } from './utils/logger';
import { handleError } from './utils/errorHandler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 앱 시작 시 DB 초기화 오류를 확인하기 위한 플래그
let dbInitialized = false;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // 데이터베이스 초기화가 실패했다면 오류 메시지 표시
  if (!dbInitialized) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;">
          <h2>데이터베이스 연결 오류</h2>
          <p>데이터베이스 초기화 중 오류가 발생했습니다. 애플리케이션을 다시 시작하거나 개발자에게 문의하세요.</p>
        </div>';
      `);
    });
  }
};

// Set up IPC handlers for database operations with async initialization
async function setupHandlers() {
  try {
    // 데이터베이스 초기화 및 작업 객체 가져오기
    const operations = await initDb();
    dbInitialized = true;
    
    // IPC 핸들러 설정
    setupIpcHandlers(operations);
    
    logger.info('IPC 핸들러 설정 완료');
  } catch (error) {
    logger.error('데이터베이스 초기화 실패:', error);
    handleError(error);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await setupHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
