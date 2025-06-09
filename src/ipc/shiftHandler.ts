import { ipcMain } from 'electron';
import type { ApiResponse, Shift, ShiftPreference, ShiftGenerationRules } from '../types';
import { ShiftOperations } from '../database/operations';
import { ScheduleGenerator } from '../services/scheduleGenerator';

export function setupShiftHandlers(shiftOperations: ShiftOperations) {
  const scheduleGenerator = new ScheduleGenerator(shiftOperations);

  ipcMain.handle('shift:getAll', async (): Promise<ApiResponse<Shift[]>> => {
    try {
      return { success: true, data: shiftOperations.getAll() };
    } catch (error) {
      console.error('Error getting shifts:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:getById', async (_, id: number): Promise<ApiResponse<Shift>> => {
    try {
      return { success: true, data: shiftOperations.getById(id) };
    } catch (error) {
      console.error(`Error getting shift ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:getByNurseId', async (_, nurseId: number): Promise<ApiResponse<Shift[]>> => {
    try {
      return { success: true, data: shiftOperations.getByNurseId(nurseId) };
    } catch (error) {
      console.error(`Error getting shifts for nurse ${nurseId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:getByDateRange', async (_, { startDate, endDate }): Promise<ApiResponse<Shift[]>> => {
    try {
      const shifts = await shiftOperations.getByDateRange(startDate, endDate);
      return { success: true, data: shifts };
    } catch (error) {
      return { success: false, error: '근무 데이터를 가져오는 중 오류가 발생했습니다.' };
    }
  });

  ipcMain.handle('shift:create', async (_, shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>): Promise<ApiResponse<any>> => {
    try {
      const result = shiftOperations.create(shiftData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating shift:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:update', async (_, id: number, shiftData: Partial<Omit<Shift, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>): Promise<ApiResponse<any>> => {
    try {
      const result = shiftOperations.update(id, shiftData);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating shift ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:delete', async (_, id: number): Promise<ApiResponse<any>> => {
    try {
      const result = shiftOperations.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error deleting shift ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:generateMonthlySchedule', async (_, params: {
    year: number;
    month: number;
    nurses: number[];
    preferences: ShiftPreference[];
    rules: ShiftGenerationRules;
  }): Promise<ApiResponse<Shift[]>> => {
    try {
      const generatedShifts = await scheduleGenerator.generateMonthlySchedule(params);
      return { success: true, data: generatedShifts };
    } catch (error) {
      console.error('Error generating monthly schedule:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:saveGeneratedSchedule', async (_, shifts: Shift[]): Promise<ApiResponse<any>> => {
    try {
      const savedShifts = [];
      for (const shift of shifts) {
        const result = shiftOperations.create({
          nurse_id: shift.nurse_id,
          shift_date: shift.shift_date,
          shift_type: shift.shift_type,
          status: shift.status || 'scheduled',
          notes: shift.notes || '자동 생성됨'
        });
        savedShifts.push(result);
      }
      return { success: true, data: savedShifts };
    } catch (error) {
      console.error('Error saving generated schedule:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shift:findAllSeniorNurseNightShiftCombinations', async (_, params: {
    year: number;
    month: number;
    seniorNurses: any[];
    existingShifts: Shift[];
    rules: ShiftGenerationRules;
    maxSolutions?: number;
  }): Promise<ApiResponse<any[]>> => {
    try {
      const solutions = await scheduleGenerator.findAllSeniorNurseNightShiftCombinations(params);
      const sortedSolutions = scheduleGenerator.sortSolutionsByScore(solutions);
      return { success: true, data: sortedSolutions };
    } catch (error) {
      console.error('Error finding senior nurse night shift combinations:', error);
      return { success: false, error: error.message };
    }
  });
} 