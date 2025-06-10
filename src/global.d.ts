interface Window {
  api: {
    nurses: {
      getAll: () => Promise<any>;
      getById: (id: number) => Promise<any>;
      create: (nurseData: any) => Promise<any>;
      update: (id: number, nurseData: any) => Promise<any>;
      delete: (id: number) => Promise<any>;
      deleteAll: () => Promise<any>;
      removeFromTeam: (id: number) => Promise<any>;
      assignToTeam: (id: number, teamId: number) => Promise<any>;
    };
    shifts: {
      getAll: () => Promise<any>;
      getById: (id: number) => Promise<any>;
      getByNurseId: (nurseId: number) => Promise<any>;
      getByDateRange: (params: { startDate: string, endDate: string }) => Promise<any>;
      create: (shiftData: any) => Promise<any>;
      update: (id: number, shiftData: any) => Promise<any>;
      delete: (id: number) => Promise<any>;
      generateMonthlySchedule: (params: any) => Promise<any>;
      saveGeneratedSchedule: (shifts: any) => Promise<any>;
      findAllSeniorNurseNightShiftCombinations: (params: any) => Promise<any>;
      startBackgroundScheduleGeneration: (params: any) => Promise<any>;
      cancelBackgroundScheduleGeneration: (taskId: string) => Promise<any>;
      onScheduleGenerationUpdate: (callback: (event: any, data: any) => void) => void;
      removeScheduleGenerationListener: (callback: (event: any, data: any) => void) => void;
    };
    teams: {
      getAll: () => Promise<any>;
      getById: (id: number) => Promise<any>;
      getNursesByTeamId: (teamId: number) => Promise<any>;
      getUnassignedNurses: () => Promise<any>;
      create: (teamData: any) => Promise<any>;
      update: (id: number, teamData: any) => Promise<any>;
      delete: (id: number) => Promise<any>;
    };
    shiftPreferences: {
      getAll: () => Promise<any>;
      getByNurseId: (nurseId: number) => Promise<any>;
      getByDateRange: (startDate: string, endDate: string) => Promise<any>;
      create: (prefData: any) => Promise<any>;
      update: (id: number, prefData: any) => Promise<any>;
      delete: (id: number) => Promise<any>;
    };
  };
} 