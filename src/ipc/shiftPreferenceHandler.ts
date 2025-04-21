import { ipcMain } from 'electron';
import type { ApiResponse, ShiftPreference } from '../types';
import { ShiftPreferenceOperations } from '../database/operations';

export function setupShiftPreferenceHandlers(shiftPreferenceOperations: ShiftPreferenceOperations) {
  ipcMain.handle('shiftPreference:getAll', async (): Promise<ApiResponse<ShiftPreference[]>> => {
    try {
      return { success: true, data: shiftPreferenceOperations.getAll() };
    } catch (error) {
      console.error('Error getting shift preferences:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:getById', async (_, id: number): Promise<ApiResponse<ShiftPreference>> => {
    try {
      return { success: true, data: shiftPreferenceOperations.getById(id) };
    } catch (error) {
      console.error(`Error getting shift preference ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:getByNurseId', async (_, nurseId: number): Promise<ApiResponse<ShiftPreference[]>> => {
    try {
      return { success: true, data: shiftPreferenceOperations.getByNurseId(nurseId) };
    } catch (error) {
      console.error(`Error getting shift preferences for nurse ${nurseId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:getByDateRange', async (_, { startDate, endDate }): Promise<ApiResponse<ShiftPreference[]>> => {
    try {
      const preferences = shiftPreferenceOperations.getByDateRange(startDate, endDate);
      return { success: true, data: preferences };
    } catch (error) {
      console.error('Error getting shift preferences by date range:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:create', async (_, prefData: Omit<ShiftPreference, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>): Promise<ApiResponse<any>> => {
    try {
      const result = shiftPreferenceOperations.create(prefData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating shift preference:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:update', async (_, id: number, prefData: Partial<Omit<ShiftPreference, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>): Promise<ApiResponse<any>> => {
    try {
      const result = shiftPreferenceOperations.update(id, prefData);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating shift preference ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shiftPreference:delete', async (_, id: number): Promise<ApiResponse<any>> => {
    try {
      const result = shiftPreferenceOperations.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error deleting shift preference ${id}:`, error);
      return { success: false, error: error.message };
    }
  });
} 