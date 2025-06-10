import { ipcMain, BrowserWindow } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import type { ApiResponse, Shift, ShiftPreference, ShiftGenerationRules } from '../types';
import { ShiftOperations } from '../database/operations';
import { ScheduleGenerator } from '../services/scheduleGenerator';

// 진행 중인 워커들을 관리하는 Map
const activeWorkers = new Map<string, Worker | { cancel: () => void }>();

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

    // 백그라운드 스케줄 생성 시작 - setTimeout을 이용한 비동기 처리
  ipcMain.handle('shift:startBackgroundScheduleGeneration', async (event, params: {
    year: number;
    month: number;
    seniorNurses: any[];
    existingShifts: Shift[];
    rules: ShiftGenerationRules;
    maxSolutions?: number;
  }): Promise<ApiResponse<{ taskId: string }>> => {
    try {
      const taskId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 취소 가능한 작업을 위한 플래그
      let isCancelled = false;
      activeWorkers.set(taskId, { cancel: () => { isCancelled = true; } } as any);

             // 커스텀 ScheduleGenerator 클래스
       class BackgroundScheduleGenerator extends ScheduleGenerator {
         constructor() {
           super(shiftOperations);
         }

         protected logProgress(dates: string[], solutionsFound: number): void {
           if (!this.searchProgress || isCancelled) return;
           
           const elapsedTime = Date.now() - this.searchProgress.startTime;
           const elapsedSeconds = Math.round(elapsedTime / 1000);
           const progressPercent = Math.round((this.searchProgress.currentDepth / this.searchProgress.maxDepth) * 100);
           const nodesPerSecond = this.searchProgress.totalExplored / (elapsedTime / 1000);
           
           const mainWindow = BrowserWindow.getAllWindows()[0];
           if (mainWindow) {
             mainWindow.webContents.send('schedule-generation-update', {
               taskId,
               type: 'progress',
               data: {
                 currentDepth: this.searchProgress.currentDepth,
                 maxDepth: this.searchProgress.maxDepth,
                 progressPercent,
                 totalExplored: this.searchProgress.totalExplored,
                 solutionsFound,
                 elapsedSeconds,
                 nodesPerSecond: Math.round(nodesPerSecond),
                 currentDate: this.searchProgress.currentDepth > 0 ? dates[this.searchProgress.currentDepth - 1] : null
               }
             });
           }
         }

         protected logSolutionDetails(solution: any, originalNurseStats: any[]): void {
           if (isCancelled) return;
           
           const mainWindow = BrowserWindow.getAllWindows()[0];
           if (mainWindow) {
             mainWindow.webContents.send('schedule-generation-update', {
               taskId,
               type: 'solution_found',
               data: {
                 solutionIndex: this.searchProgress?.solutionsFound || 0,
                 totalShifts: solution.shifts.length,
                 patternCount: solution.patternUsage.length,
                 nurseStats: solution.nurseStats.map((stat: any) => {
                   const target = originalNurseStats.find((s: any) => s.nurseId === stat.nurseId)?.targetNightShifts || 0;
                   return {
                     nurseId: stat.nurseId,
                     current: stat.currentNightShifts,
                     target,
                     deviation: Math.abs(stat.currentNightShifts - target)
                   };
                 })
               }
             });
           }
         }

         // 재귀 함수에서 취소 체크를 위한 오버라이드
         protected async findAllCombinationsRecursive(
           dateIndex: number,
           dates: string[],
           nurseStats: any[],
           nurseSchedule: Map<number, boolean[]>,
           currentShifts: any[],
           currentPatterns: any[],
           rules: any,
           allSolutions: any[],
           maxSolutions: number
         ): Promise<void> {
           // 취소 체크
           if (isCancelled) {
             throw new Error('작업이 취소되었습니다.');
           }
           
           // 부모 클래스의 메소드 호출
           return super.findAllCombinationsRecursive(
             dateIndex,
             dates,
             nurseStats,
             nurseSchedule,
             currentShifts,
             currentPatterns,
             rules,
             allSolutions,
             maxSolutions
           );
         }
       }

      // 비동기 작업 시작
      setTimeout(async () => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        
        try {
          if (mainWindow) {
            mainWindow.webContents.send('schedule-generation-update', {
              taskId,
              type: 'started',
              data: { message: '스케줄 생성 작업을 시작합니다.' }
            });
          }

          const generator = new BackgroundScheduleGenerator();
          const solutions = await generator.findAllSeniorNurseNightShiftCombinations(params);
          
          if (isCancelled) {
            if (mainWindow) {
              mainWindow.webContents.send('schedule-generation-update', {
                taskId,
                type: 'cancelled',
                data: { message: '작업이 취소되었습니다.' }
              });
            }
            return;
          }

          const sortedSolutions = generator.sortSolutionsByScore(solutions);
          
          if (mainWindow) {
            mainWindow.webContents.send('schedule-generation-update', {
              taskId,
              type: 'completed',
              data: { solutions: sortedSolutions, totalCount: sortedSolutions.length }
            });
          }
          
        } catch (error: any) {
          if (mainWindow && !isCancelled) {
            mainWindow.webContents.send('schedule-generation-update', {
              taskId,
              type: 'error',
              data: { error: error.message }
            });
          }
        } finally {
          activeWorkers.delete(taskId);
        }
      }, 100); // 100ms 후 시작

      return { success: true, data: { taskId } };
    } catch (error: any) {
      console.error('Error starting background schedule generation:', error);
      return { success: false, error: error.message };
    }
  });

  // 백그라운드 작업 취소
  ipcMain.handle('shift:cancelBackgroundScheduleGeneration', async (_, taskId: string): Promise<ApiResponse<any>> => {
    try {
      const worker = activeWorkers.get(taskId);
      if (worker) {
        if ('cancel' in worker && typeof worker.cancel === 'function') {
          worker.cancel();
        } else if ('postMessage' in worker && typeof worker.postMessage === 'function') {
          worker.postMessage({ type: 'cancel' });
        }
        return { success: true, data: { message: '취소 요청이 전송되었습니다.' } };
      } else {
        return { success: false, error: '해당 작업을 찾을 수 없습니다.' };
      }
    } catch (error: any) {
      console.error('Error cancelling background task:', error);
      return { success: false, error: error.message };
    }
  });

  // 기존 동기 방식 유지 (호환성을 위해)
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
    } catch (error: any) {
      console.error('Error finding senior nurse night shift combinations:', error);
      return { success: false, error: error.message };
    }
  });
} 