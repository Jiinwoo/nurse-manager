import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDb } from './database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 앱 시작 시 DB 초기화 오류를 확인하기 위한 플래그
let dbInitialized = false;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
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
async function setupIpcHandlers() {
  try {
    // 데이터베이스 초기화 및 작업 객체 가져오기
    const { nurseOperations, shiftOperations, teamOperations } = await initDb();
    dbInitialized = true;
    
    // Nurse operations
    ipcMain.handle('nurse:getAll', async () => {
      try {
        return { success: true, data: nurseOperations.getAll() };
      } catch (error) {
        console.error('Error getting nurses:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:getById', async (_, id) => {
      try {
        return { success: true, data: nurseOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:create', async (_, nurseData) => {
      try {
        const result = nurseOperations.create(nurseData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating nurse:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:update', async (_, id, nurseData) => {
      try {
        const result = nurseOperations.update(id, nurseData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:delete', async (_, id) => {
      try {
        const result = nurseOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:removeFromTeam', async (_, id) => {
      try {
        const result = nurseOperations.removeFromTeam(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error removing nurse ${id} from team:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:assignToTeam', async (_, id, teamId) => {
      try {
        const result = nurseOperations.assignToTeam(id, teamId);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error assigning nurse ${id} to team ${teamId}:`, error);
        return { success: false, error: error.message };
      }
    });

    // Team operations
    ipcMain.handle('team:getAll', async () => {
      try {
        return { success: true, data: teamOperations.getAll() };
      } catch (error) {
        console.error('Error getting teams:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getById', async (_, id) => {
      try {
        return { success: true, data: teamOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getNursesByTeamId', async (_, teamId) => {
      try {
        return { success: true, data: teamOperations.getNursesByTeamId(teamId) };
      } catch (error) {
        console.error(`Error getting nurses for team ${teamId}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getUnassignedNurses', async () => {
      try {
        return { success: true, data: teamOperations.getUnassignedNurses() };
      } catch (error) {
        console.error('Error getting unassigned nurses:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:create', async (_, teamData) => {
      try {
        const result = teamOperations.create(teamData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating team:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:update', async (_, id, teamData) => {
      try {
        const result = teamOperations.update(id, teamData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:delete', async (_, id) => {
      try {
        const result = teamOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    // Shift operations
    ipcMain.handle('shift:getAll', async () => {
      try {
        return { success: true, data: shiftOperations.getAll() };
      } catch (error) {
        console.error('Error getting shifts:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:getById', async (_, id) => {
      try {
        return { success: true, data: shiftOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:getByNurseId', async (_, nurseId) => {
      try {
        return { success: true, data: shiftOperations.getByNurseId(nurseId) };
      } catch (error) {
        console.error(`Error getting shifts for nurse ${nurseId}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:create', async (_, shiftData) => {
      try {
        const result = shiftOperations.create(shiftData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating shift:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:update', async (_, id, shiftData) => {
      try {
        const result = shiftOperations.update(id, shiftData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:delete', async (_, id) => {
      try {
        const result = shiftOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('IPC 핸들러 설정 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
    // 오류 발생 시 기본 IPC 핸들러 설정 - 오류 메시지 반환
    setupErrorHandlers();
  }
}

// 데이터베이스 초기화 실패 시 모든 IPC 요청에 오류 반환하는 핸들러
function setupErrorHandlers() {
  const errorResponse = { 
    success: false, 
    error: '데이터베이스 연결에 실패했습니다. 애플리케이션을 다시 시작해주세요.' 
  };
  
  // Nurse operations with error responses
  ipcMain.handle('nurse:getAll', async () => errorResponse);
  ipcMain.handle('nurse:getById', async () => errorResponse);
  ipcMain.handle('nurse:create', async () => errorResponse);
  ipcMain.handle('nurse:update', async () => errorResponse);
  ipcMain.handle('nurse:delete', async () => errorResponse);
  ipcMain.handle('nurse:removeFromTeam', async () => errorResponse);
  ipcMain.handle('nurse:assignToTeam', async () => errorResponse);
  
  // Team operations with error responses
  ipcMain.handle('team:getAll', async () => errorResponse);
  ipcMain.handle('team:getById', async () => errorResponse);
  ipcMain.handle('team:getNursesByTeamId', async () => errorResponse);
  ipcMain.handle('team:getUnassignedNurses', async () => errorResponse);
  ipcMain.handle('team:create', async () => errorResponse);
  ipcMain.handle('team:update', async () => errorResponse);
  ipcMain.handle('team:delete', async () => errorResponse);
  
  // Shift operations with error responses
  ipcMain.handle('shift:getAll', async () => errorResponse);
  ipcMain.handle('shift:getById', async () => errorResponse);
  ipcMain.handle('shift:getByNurseId', async () => errorResponse);
  ipcMain.handle('shift:create', async () => errorResponse);
  ipcMain.handle('shift:update', async () => errorResponse);
  ipcMain.handle('shift:delete', async () => errorResponse);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // 데이터베이스 초기화 및 IPC 핸들러 설정
  await setupIpcHandlers();
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
