import { ipcMain } from 'electron';
import type { ApiResponse, Team, Nurse } from '../types';
import { TeamOperations } from '../database/operations';

export function setupTeamHandlers(teamOperations: TeamOperations) {
  ipcMain.handle('team:getAll', async (): Promise<ApiResponse<Team[]>> => {
    try {
      return { success: true, data: teamOperations.getAll() };
    } catch (error) {
      console.error('Error getting teams:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:getById', async (_, id: number): Promise<ApiResponse<Team>> => {
    try {
      return { success: true, data: teamOperations.getById(id) };
    } catch (error) {
      console.error(`Error getting team ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:getNursesByTeamId', async (_, teamId: number): Promise<ApiResponse<Nurse[]>> => {
    try {
      return { success: true, data: teamOperations.getNursesByTeamId(teamId) };
    } catch (error) {
      console.error(`Error getting nurses for team ${teamId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:getUnassignedNurses', async (): Promise<ApiResponse<Nurse[]>> => {
    try {
      return { success: true, data: teamOperations.getUnassignedNurses() };
    } catch (error) {
      console.error('Error getting unassigned nurses:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:create', async (_, teamData: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<any>> => {
    try {
      const result = teamOperations.create(teamData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating team:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:update', async (_, id: number, teamData: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<any>> => {
    try {
      const result = teamOperations.update(id, teamData);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating team ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:delete', async (_, id: number): Promise<ApiResponse<any>> => {
    try {
      const result = teamOperations.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error deleting team ${id}:`, error);
      return { success: false, error: error.message };
    }
  });
} 