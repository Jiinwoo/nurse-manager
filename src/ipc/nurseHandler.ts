import { ipcMain } from 'electron';
import type { ApiResponse, Nurse } from '../types';
import { NurseOperations } from '../database/operations';

export function setupNurseHandlers(nurseOperations: NurseOperations) {
  ipcMain.handle('nurse:getAll', async (): Promise<ApiResponse<Nurse[]>> => {
    try {
      return { success: true, data: nurseOperations.getAll() };
    } catch (error) {
      console.error('Error getting nurses:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:getById', async (_, id: number): Promise<ApiResponse<Nurse>> => {
    try {
      return { success: true, data: nurseOperations.getById(id) };
    } catch (error) {
      console.error(`Error getting nurse ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:create', async (_, nurseData: Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.create(nurseData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating nurse:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:update', async (_, id: number, nurseData: Partial<Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>>): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.update(id, nurseData);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating nurse ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:delete', async (_, id: number): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error deleting nurse ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:deleteAll', async (): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.deleteAll();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error deleting all nurses:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:removeFromTeam', async (_, id: number): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.removeFromTeam(id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error removing nurse ${id} from team:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('nurse:assignToTeam', async (_, id: number, teamId: number): Promise<ApiResponse<any>> => {
    try {
      const result = nurseOperations.assignToTeam(id, teamId);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error assigning nurse ${id} to team ${teamId}:`, error);
      return { success: false, error: error.message };
    }
  });
} 