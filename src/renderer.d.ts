export interface Nurse {
  id?: number;
  name: string;
  employee_id: string;
  department?: string;
  position?: string;
  contact?: string;
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

interface NurseApi {
  getAll: () => Promise<ApiResponse<Nurse[]>>;
  getById: (id: number) => Promise<ApiResponse<Nurse>>;
  create: (nurseData: Omit<Nurse, 'id' | 'created_at' | 'updated_at'>) => Promise<ApiResponse<any>>;
  update: (id: number, nurseData: Partial<Omit<Nurse, 'id' | 'created_at' | 'updated_at'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

interface ShiftApi {
  getAll: () => Promise<ApiResponse<Shift[]>>;
  getById: (id: number) => Promise<ApiResponse<Shift>>;
  getByNurseId: (nurseId: number) => Promise<ApiResponse<Shift[]>>;
  create: (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, shiftData: Partial<Omit<Shift, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

interface ElectronApi {
  nurses: NurseApi;
  shifts: ShiftApi;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
} 