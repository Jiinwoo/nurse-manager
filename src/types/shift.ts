export interface Shift {
  id?: number;
  nurse_id: number;
  shift_date: string;
  shift_type: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  nurse_name?: string;
  team_name?: string | null;
  years_experience?: number;
}

export interface ShiftPreference {
  id?: number;
  nurse_id: number;
  preference_date: string;
  preference_type: string;
  priority?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  nurse_name?: string;
}

export interface ShiftGenerationRules {
  maxConsecutiveWorkDays: number;
  maxConsecutiveNightShifts: number;
  minOffsAfterNights: number;
  maxNightShiftsPerMonth: number;
  dayEveningNurseCount: number;
  nightNurseCount: number;
  requireSeniorNurseAtNight: boolean;
  maxOffDaysPerMonth: number;
  teamDistribution: boolean;
} 