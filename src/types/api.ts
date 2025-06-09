import { Nurse, Team, Shift, ShiftPreference, ApiResponse, ShiftGenerationRules } from './index';

export interface NurseApi {
  getAll: () => Promise<ApiResponse<Nurse[]>>;
  getById: (id: number) => Promise<ApiResponse<Nurse>>;
  create: (nurseData: Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, nurseData: Partial<Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
  deleteAll: () => Promise<ApiResponse<any>>;
  removeFromTeam: (id: number) => Promise<ApiResponse<any>>;
  assignToTeam: (id: number, teamId: number) => Promise<ApiResponse<any>>;
}

export interface ShiftApi {
  getAll: () => Promise<ApiResponse<Shift[]>>;
  getById: (id: number) => Promise<ApiResponse<Shift>>;
  getByNurseId: (nurseId: number) => Promise<ApiResponse<Shift[]>>;
  getByDateRange: (params: { startDate: string, endDate: string }) => Promise<ApiResponse<Shift[]>>;
  create: (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, shiftData: Partial<Omit<Shift, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
  generateMonthlySchedule: (params: {
    year: number;
    month: number;
    nurses: number[];
    preferences: ShiftPreference[];
    rules: ShiftGenerationRules;
  }) => Promise<ApiResponse<Shift[]>>;
  saveGeneratedSchedule: (shifts: Shift[]) => Promise<ApiResponse<any>>;
  findAllSeniorNurseNightShiftCombinations: (params: {
    year: number;
    month: number;
    seniorNurses: Nurse[];
    existingShifts: Shift[];
    rules: ShiftGenerationRules;
    maxSolutions?: number;
  }) => Promise<ApiResponse<any[]>>;
}

export interface TeamApi {
  getAll: () => Promise<ApiResponse<Team[]>>;
  getById: (id: number) => Promise<ApiResponse<Team>>;
  getNursesByTeamId: (teamId: number) => Promise<ApiResponse<Nurse[]>>;
  getUnassignedNurses: () => Promise<ApiResponse<Nurse[]>>;
  create: (teamData: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => Promise<ApiResponse<any>>;
  update: (id: number, teamData: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

export interface ShiftPreferenceApi {
  getAll: () => Promise<ApiResponse<ShiftPreference[]>>;
  getByNurseId: (nurseId: number) => Promise<ApiResponse<ShiftPreference[]>>;
  getByDateRange: (params: { startDate: string, endDate: string }) => Promise<ApiResponse<ShiftPreference[]>>;
  create: (prefData: Omit<ShiftPreference, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, prefData: Partial<Omit<ShiftPreference, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

export interface ElectronApi {
  nurses: NurseApi;
  shifts: ShiftApi;
  teams: TeamApi;
  shiftPreferences: ShiftPreferenceApi;
} 