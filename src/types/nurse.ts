export interface Nurse {
  id?: number;
  name: string;
  years_experience: number;
  available_shift_types: string[];
  team_id: number | null;
  team_name?: string;
  created_at?: string;
  updated_at?: string;
} 