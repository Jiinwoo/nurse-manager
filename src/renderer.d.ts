export interface Nurse {
  id?: number;
  name: string;
  years_experience: number;
  available_shift_types: string[];
  team_id?: number | null;
  team_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id?: number;
  nurse_id: number;
  shift_date: string;
  shift_type: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  nurse_name?: string; // For joined queries
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ShiftApi {
  getAll: () => Promise<ApiResponse<Shift[]>>;
  getById: (id: number) => Promise<ApiResponse<Shift>>;
  getByNurseId: (nurseId: number) => Promise<ApiResponse<Shift[]>>;
  create: (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, shiftData: Partial<Omit<Shift, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

interface TeamApi {
  getAll: () => Promise<ApiResponse<Team[]>>;
  getById: (id: number) => Promise<ApiResponse<Team>>;
  getNursesByTeamId: (teamId: number) => Promise<ApiResponse<Nurse[]>>;
  getUnassignedNurses: () => Promise<ApiResponse<Nurse[]>>;
  create: (teamData: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => Promise<ApiResponse<any>>;
  update: (id: number, teamData: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

interface NurseApi {
  getAll: () => Promise<ApiResponse<Nurse[]>>;
  getById: (id: number) => Promise<ApiResponse<Nurse>>;
  create: (nurseData: Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, nurseData: Partial<Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
  removeFromTeam: (id: number) => Promise<ApiResponse<any>>;
  assignToTeam: (id: number, teamId: number) => Promise<ApiResponse<any>>;
}

interface ElectronApi {
  nurses: NurseApi;
  shifts: ShiftApi;
  teams: TeamApi;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
} 