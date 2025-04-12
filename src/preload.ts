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
  },
  
  // Shift operations
  shifts: {
    getAll: () => ipcRenderer.invoke('shift:getAll'),
    getById: (id: number) => ipcRenderer.invoke('shift:getById', id),
    getByNurseId: (nurseId: number) => ipcRenderer.invoke('shift:getByNurseId', nurseId),
    create: (shiftData: any) => ipcRenderer.invoke('shift:create', shiftData),
    update: (id: number, shiftData: any) => ipcRenderer.invoke('shift:update', id, shiftData),
    delete: (id: number) => ipcRenderer.invoke('shift:delete', id),
  }
});
