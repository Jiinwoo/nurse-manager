// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Nurse operations
  nurses: {
    getAll: () => ipcRenderer.invoke('nurse:getAll'),
    getById: (id: number) => ipcRenderer.invoke('nurse:getById', id),
    create: (nurseData: any) => ipcRenderer.invoke('nurse:create', nurseData),
    update: (id: number, nurseData: any) => ipcRenderer.invoke('nurse:update', id, nurseData),
    delete: (id: number) => ipcRenderer.invoke('nurse:delete', id),
    deleteAll: () => ipcRenderer.invoke('nurse:deleteAll'),
    removeFromTeam: (id: number) => ipcRenderer.invoke('nurse:removeFromTeam', id),
    assignToTeam: (id: number, teamId: number) => ipcRenderer.invoke('nurse:assignToTeam', id, teamId),
  },
  
  // Shift operations
  shifts: {
    getAll: () => ipcRenderer.invoke('shift:getAll'),
    getById: (id: number) => ipcRenderer.invoke('shift:getById', id),
    getByNurseId: (nurseId: number) => ipcRenderer.invoke('shift:getByNurseId', nurseId),
    getByDateRange: (params: { startDate: string, endDate: string }) => ipcRenderer.invoke('shift:getByDateRange', params),
    create: (shiftData: any) => ipcRenderer.invoke('shift:create', shiftData),
    update: (id: number, shiftData: any) => ipcRenderer.invoke('shift:update', id, shiftData),
    delete: (id: number) => ipcRenderer.invoke('shift:delete', id),
    generateMonthlySchedule: (params: any) => ipcRenderer.invoke('shift:generateMonthlySchedule', params),
    saveGeneratedSchedule: (shifts: any) => ipcRenderer.invoke('shift:saveGeneratedSchedule', shifts),
    findAllSeniorNurseNightShiftCombinations: (params: any) => ipcRenderer.invoke('shift:findAllSeniorNurseNightShiftCombinations', params),
    
    // 백그라운드 스케줄 생성
    startBackgroundScheduleGeneration: (params: any) => ipcRenderer.invoke('shift:startBackgroundScheduleGeneration', params),
    cancelBackgroundScheduleGeneration: (taskId: string) => ipcRenderer.invoke('shift:cancelBackgroundScheduleGeneration', taskId),
    
    // 이벤트 리스너
    onScheduleGenerationUpdate: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('schedule-generation-update', callback);
    },
    removeScheduleGenerationListener: (callback: (event: any, data: any) => void) => {
      ipcRenderer.removeListener('schedule-generation-update', callback);
    }
  },
  
  // Team operations
  teams: {
    getAll: () => ipcRenderer.invoke('team:getAll'),
    getById: (id: number) => ipcRenderer.invoke('team:getById', id),
    getNursesByTeamId: (teamId: number) => ipcRenderer.invoke('team:getNursesByTeamId', teamId),
    getUnassignedNurses: () => ipcRenderer.invoke('team:getUnassignedNurses'),
    create: (teamData: any) => ipcRenderer.invoke('team:create', teamData),
    update: (id: number, teamData: any) => ipcRenderer.invoke('team:update', id, teamData),
    delete: (id: number) => ipcRenderer.invoke('team:delete', id),
  },
  
  // Shift Preference operations
  shiftPreferences: {
    getAll: () => ipcRenderer.invoke('shiftPreference:getAll'),
    getByNurseId: (nurseId: number) => ipcRenderer.invoke('shiftPreference:getByNurseId', nurseId),
    getByDateRange: (startDate: string, endDate: string) => ipcRenderer.invoke('shiftPreference:getByDateRange', startDate, endDate),
    create: (prefData: any) => ipcRenderer.invoke('shiftPreference:create', prefData),
    update: (id: number, prefData: any) => ipcRenderer.invoke('shiftPreference:update', id, prefData),
    delete: (id: number) => ipcRenderer.invoke('shiftPreference:delete', id),
  }
});
