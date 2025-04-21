import { setupNurseHandlers } from './nurseHandler';
import { setupTeamHandlers } from './teamHandler';
import { setupShiftHandlers } from './shiftHandler';
import { setupShiftPreferenceHandlers } from './shiftPreferenceHandler';
import type { NurseOperations, TeamOperations, ShiftOperations, ShiftPreferenceOperations } from '../database/operations';

export function setupIpcHandlers(operations: {
  nurseOperations: NurseOperations;
  teamOperations: TeamOperations;
  shiftOperations: ShiftOperations;
  shiftPreferenceOperations: ShiftPreferenceOperations;
}) {
  setupNurseHandlers(operations.nurseOperations);
  setupTeamHandlers(operations.teamOperations);
  setupShiftHandlers(operations.shiftOperations);
  setupShiftPreferenceHandlers(operations.shiftPreferenceOperations);
} 