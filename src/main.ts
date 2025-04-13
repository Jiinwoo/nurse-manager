import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDb } from './database';
import type { Shift } from './renderer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 앱 시작 시 DB 초기화 오류를 확인하기 위한 플래그
let dbInitialized = false;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  // 데이터베이스 초기화가 실패했다면 오류 메시지 표시
  if (!dbInitialized) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;">
          <h2>데이터베이스 연결 오류</h2>
          <p>데이터베이스 초기화 중 오류가 발생했습니다. 애플리케이션을 다시 시작하거나 개발자에게 문의하세요.</p>
        </div>';
      `);
    });
  }
};

// Set up IPC handlers for database operations with async initialization
async function setupIpcHandlers() {
  try {
    // 데이터베이스 초기화 및 작업 객체 가져오기
    const { nurseOperations, shiftOperations, teamOperations, shiftPreferenceOperations } = await initDb();
    dbInitialized = true;
    
    // Nurse operations
    ipcMain.handle('nurse:getAll', async () => {
      try {
        return { success: true, data: nurseOperations.getAll() };
      } catch (error) {
        console.error('Error getting nurses:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:getById', async (_, id) => {
      try {
        return { success: true, data: nurseOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:create', async (_, nurseData) => {
      try {
        const result = nurseOperations.create(nurseData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating nurse:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:update', async (_, id, nurseData) => {
      try {
        const result = nurseOperations.update(id, nurseData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:delete', async (_, id) => {
      try {
        const result = nurseOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting nurse ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:deleteAll', async () => {
      try {
        const result = nurseOperations.deleteAll();
        return { success: true, data: result };
      } catch (error) {
        console.error('Error deleting all nurses:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:removeFromTeam', async (_, id) => {
      try {
        const result = nurseOperations.removeFromTeam(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error removing nurse ${id} from team:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nurse:assignToTeam', async (_, id, teamId) => {
      try {
        const result = nurseOperations.assignToTeam(id, teamId);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error assigning nurse ${id} to team ${teamId}:`, error);
        return { success: false, error: error.message };
      }
    });

    // Team operations
    ipcMain.handle('team:getAll', async () => {
      try {
        return { success: true, data: teamOperations.getAll() };
      } catch (error) {
        console.error('Error getting teams:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getById', async (_, id) => {
      try {
        return { success: true, data: teamOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getNursesByTeamId', async (_, teamId) => {
      try {
        return { success: true, data: teamOperations.getNursesByTeamId(teamId) };
      } catch (error) {
        console.error(`Error getting nurses for team ${teamId}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:getUnassignedNurses', async () => {
      try {
        return { success: true, data: teamOperations.getUnassignedNurses() };
      } catch (error) {
        console.error('Error getting unassigned nurses:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:create', async (_, teamData) => {
      try {
        const result = teamOperations.create(teamData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating team:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:update', async (_, id, teamData) => {
      try {
        const result = teamOperations.update(id, teamData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('team:delete', async (_, id) => {
      try {
        const result = teamOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting team ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    // Shift operations
    ipcMain.handle('shift:getAll', async () => {
      try {
        return { success: true, data: shiftOperations.getAll() };
      } catch (error) {
        console.error('Error getting shifts:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:getById', async (_, id) => {
      try {
        return { success: true, data: shiftOperations.getById(id) };
      } catch (error) {
        console.error(`Error getting shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:getByNurseId', async (_, nurseId) => {
      try {
        return { success: true, data: shiftOperations.getByNurseId(nurseId) };
      } catch (error) {
        console.error(`Error getting shifts for nurse ${nurseId}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:create', async (_, shiftData) => {
      try {
        const result = shiftOperations.create(shiftData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating shift:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:update', async (_, id, shiftData) => {
      try {
        const result = shiftOperations.update(id, shiftData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shift:delete', async (_, id) => {
      try {
        const result = shiftOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting shift ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    // 근무표 생성 알고리즘
    ipcMain.handle('shift:generateMonthlySchedule', async (_, params) => {
      try {
        console.log('Generating monthly schedule with params:', params);
        
        const { year, month, nurses: nurseIds, preferences, rules } = params;
        
        // 사용할 데이터 준비
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let generatedShifts: Shift[] = [];
        
        // 공휴일 목록 (실제로는 API로 가져오거나 DB에서 관리해야 함)
        // 임시로 일요일과 토요일을 공휴일로 간주
        const holidays: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          // 일요일, 토요일
          if (date.getDay() === 0 || date.getDay() === 6) {
            holidays.push(date.toISOString().split('T')[0]);
          }
        }
        
        // 간호사 데이터 조회
        const nursesData: any[] = [];
        for (const nurseId of nurseIds) {
          const nurse = nurseOperations.getById(nurseId);
          if (nurse) {
            nursesData.push(nurse);
          }
        }
        
        // 팀별 간호사 그룹화
        const nursesByTeam: Record<string, any[]> = {};
        const unassignedNurses: any[] = [];
        
        for (const nurse of nursesData) {
          if (nurse.team_id) {
            if (!nursesByTeam[nurse.team_id]) {
              nursesByTeam[nurse.team_id] = [];
            }
            nursesByTeam[nurse.team_id].push(nurse);
          } else {
            unassignedNurses.push(nurse);
          }
        }
        
        // 팀의 수 확인
        const teamIds = Object.keys(nursesByTeam);
        const teamCount = teamIds.length;
        
        // 교대 근무 알고리즘 시작
        // 일자별 근무표 초기화
        const shiftsCalendar: Record<string, {
          day: any[];
          evening: any[];
          night: any[];
          off: any[];
        }> = {};
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const formattedDate = date.toISOString().split('T')[0];
          
          shiftsCalendar[formattedDate] = {
            day: [],
            evening: [],
            night: [],
            off: []
          };
        }
        
        // 간호사별 근무 상태 추적
        const nurseStats: Record<number, {
          consecutiveWorkDays: number;
          consecutiveNightShifts: number;
          nightShiftsCount: number;
          offDaysCount: number;
          lastNightShift: string | null;
          lastShiftType: string | null;
          lastShiftDate: string | null;
          shifts: Record<string, string>;
          nightSequenceStarted: boolean; // 나이트 시퀀스 시작 여부
          nightSequenceLength: number;   // 현재 나이트 시퀀스 길이
          reservedOffs: Set<string>;     // 예약된 오프 날짜
        }> = {};
        
        nursesData.forEach(nurse => {
          nurseStats[nurse.id] = {
            consecutiveWorkDays: 0,
            consecutiveNightShifts: 0,
            nightShiftsCount: 0,
            offDaysCount: 0,
            lastNightShift: null,
            lastShiftType: null,
            lastShiftDate: null,
            shifts: {},
            nightSequenceStarted: false,
            nightSequenceLength: 0,
            reservedOffs: new Set<string>() // 예약된 오프 날짜
          };
        });
        
        // 진행 중인 나이트 시퀀스를 추적
        const nurseNightSequences: Record<number, {
          active: boolean;
          startDate: string;
          currentLength: number;
          targetLength: number;
        }> = {};
        
        // 나이트 시퀀스 초기화
        nursesData.forEach(nurse => {
          nurseNightSequences[nurse.id] = {
            active: false,
            startDate: '',
            currentLength: 0,
            targetLength: 0
          };
        });
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const formattedDate = date.toISOString().split('T')[0];
          const isHoliday = holidays.includes(formattedDate);
          
          // 나이트 시퀀스 시작 가능성 확인 - 최소 2일 연속 근무가 가능한지 체크
          const canStartNightSequence = (nurseId: number) => {
            // 월말에 시퀀스 시작 방지 (최소 2일이 필요)
            if (day >= daysInMonth) return false;
            
            const stats = nurseStats[nurseId];
            
            // 연속 근무일 제한 확인
            if (stats.consecutiveWorkDays >= rules.maxConsecutiveWorkDays - 1) return false;
            
            // 나이트 근무 최대 수 제한 확인
            if (stats.nightShiftsCount >= rules.maxNightShiftsPerMonth - 1) return false;
            
            return true;
          };
          
          // 1-1. 나이트 근무 배정 (3명)
          // 5년차 이상 간호사가 1명 이상 포함되어야 함
          let eligibleForNight = nursesData.filter(nurse => {
            const stats = nurseStats[nurse.id];
            const nightSeq = nurseNightSequences[nurse.id];
            
            // 이미 나이트 시퀀스가 진행 중인 경우, 반드시 계속 배정
            if (nightSeq.active && nightSeq.currentLength < nightSeq.targetLength) {
              return true;
            }
            
            // 나이트 시퀀스가 끝난 경우, 오프 필요
            if (stats.lastShiftType === 'night' && 
                (stats.consecutiveNightShifts >= rules.maxConsecutiveNightShifts || 
                 (nightSeq.active && nightSeq.currentLength >= nightSeq.targetLength))) {
              return false;
            }
            
            // 나이트 근무 제한 규칙 확인
            const canWorkNight = 
              // 나이트 근무 최대 수 체크
              stats.nightShiftsCount < rules.maxNightShiftsPerMonth &&
              // 연속 근무일 체크
              stats.consecutiveWorkDays < rules.maxConsecutiveWorkDays &&
              // 새로운 나이트 시퀀스를 시작할 수 있는지 체크 (최소 2일 연속 필요)
              canStartNightSequence(nurse.id);
            
            // 마지막 나이트 근무 후 최소 오프 일수 체크
            if (stats.lastNightShift) {
              const daysSinceLastNight = Math.floor(
                (date.getTime() - new Date(stats.lastNightShift).getTime()) / (24 * 60 * 60 * 1000)
              );
              
              if (daysSinceLastNight < rules.minOffsAfterNights && 
                  stats.consecutiveNightShifts >= 2) {
                return false;
              }
            }
            
            return canWorkNight;
          });
          
          // 진행 중인 나이트 시퀀스 간호사 우선 배정
          const nursesInNightSequence = eligibleForNight.filter(nurse => 
            nurseNightSequences[nurse.id].active && 
            nurseNightSequences[nurse.id].currentLength < nurseNightSequences[nurse.id].targetLength
          );
          
          // 5년차 이상 간호사 필터링
          const seniorNurses = eligibleForNight.filter(nurse => 
            nurse.years_experience >= 5 && !nursesInNightSequence.some(n => n.id === nurse.id)
          );
          
          const juniorNurses = eligibleForNight.filter(nurse => 
            nurse.years_experience < 5 && !nursesInNightSequence.some(n => n.id === nurse.id)
          );
          
          // 팀 분배 규칙을 고려한 나이트 근무 배정
          const nightShift: any[] = [...nursesInNightSequence]; // 시퀀스 중인 간호사 먼저 배정
          
          // 나머지 인원 배정
          const remainingCount = rules.nightNurseCount - nightShift.length;
          
          if (remainingCount > 0) {
            // [요구사항] 근무 타임에 5년차 이상 간호사는 한명 무조건 포함되어야 한다.
            // 현재 나이트 시퀀스 중인 간호사 중 5년차 이상인지 확인
            const hasSeniorInSequence = nightShift.some(nurse => nurse.years_experience >= 5);
            
            // 5년차 이상 간호사가 없으면 추가
            if (!hasSeniorInSequence && seniorNurses.length > 0) {
              // 희망 근무 반영
              const seniorWithPreference = seniorNurses.find(nurse => {
                return preferences.some((p: any) => 
                  p.nurse_id === nurse.id && 
                  p.preference_date === formattedDate && 
                  p.preference_type === 'night'
                );
              });
              
              if (seniorWithPreference) {
                nightShift.push(seniorWithPreference);
                
                // 새로운 나이트 시퀀스 시작
                if (!nurseNightSequences[seniorWithPreference.id].active) {
                  // 시퀀스 길이를 2 또는 3으로 설정 (1은 허용하지 않음)
                  const targetLength = Math.min(3, Math.max(2, Math.floor(Math.random() * 2) + 2));
                  nurseNightSequences[seniorWithPreference.id] = {
                    active: true,
                    startDate: formattedDate,
                    currentLength: 1,
                    targetLength: targetLength
                  };
                  
                  // 다음날도 미리 나이트 근무 확정 (최소 2일 연속 보장)
                  if (day < daysInMonth) {
                    const nextDate = new Date(year, month, day + 1);
                    const nextFormattedDate = nextDate.toISOString().split('T')[0];
                    nurseStats[seniorWithPreference.id].shifts[nextFormattedDate] = 'pre_night';
                  }
                }
              } else {
                // 희망 근무가 없으면 나이트 근무 수가 적은 간호사 선택
                seniorNurses.sort((a, b) => 
                  nurseStats[a.id].nightShiftsCount - nurseStats[b.id].nightShiftsCount
                );
                
                nightShift.push(seniorNurses[0]);
                
                // 새로운 나이트 시퀀스 시작
                if (!nurseNightSequences[seniorNurses[0].id].active) {
                  // 시퀀스 길이를 2 또는 3으로 설정 (1은 허용하지 않음)
                  const targetLength = Math.min(3, Math.max(2, Math.floor(Math.random() * 2) + 2));
                  nurseNightSequences[seniorNurses[0].id] = {
                    active: true,
                    startDate: formattedDate,
                    currentLength: 1,
                    targetLength: targetLength
                  };
                  
                  // 다음날도 미리 나이트 근무 확정 (최소 2일 연속 보장)
                  if (day < daysInMonth) {
                    const nextDate = new Date(year, month, day + 1);
                    const nextFormattedDate = nextDate.toISOString().split('T')[0];
                    nurseStats[seniorNurses[0].id].shifts[nextFormattedDate] = 'pre_night';
                  }
                }
              }
            }
            
            // [요구사항] 3명씩 근무할 때는 같은 팀에서 최대 2명이상 같이 근무하지 않는다.
            // Night 근무 배정에 팀 제한 규칙 적용
            const teamsInNight = new Map<string, number>();
            
            // 이미 배정된 간호사들의 팀 카운트
            nightShift.forEach(nurse => {
              const teamId = nurse.team_id || 'unassigned';
              teamsInNight.set(teamId, (teamsInNight.get(teamId) || 0) + 1);
            });
            
            // 각 팀별 인원 계산 (Day, Evening, Night 모두 적용)
            const validateTeamRule = (shift: any[], shiftName: string): boolean => {
              if (!shift || !Array.isArray(shift) || shift.length === 0) {
                return true; // 배열이 비어있으면 위반사항 없음
              }
              
              // 각 팀별 인원 수 계산
              const teamsCount = new Map<string, number>();
              
              shift.forEach(nurse => {
                if (nurse && typeof nurse === 'object') {
                  const teamId = nurse.team_id || 'unassigned';
                  teamsCount.set(teamId, (teamsCount.get(teamId) || 0) + 1);
                }
              });
              
              // 동일 팀에서 3명 이상 근무하는 경우 체크
              let hasViolation = false;
              teamsCount.forEach((count, teamId) => {
                if (count > 2) {
                  console.error(`Team rule violation: Team ${teamId} has ${count} nurses in ${shiftName} shift, max allowed is 2.`);
                  hasViolation = true;
                }
              });
              
              return !hasViolation;
            };
            
            // 시프트에 배정되지 않은 간호사 찾기
            const remainingNurses = nursesData.filter(nurse => 
              !nightShift.some(n => n.id === nurse.id)
            );
            
            // Day, Evening 근무 배정
            const dayShift: any[] = [];
            const eveningShift: any[] = [];
            
            // 가능한 간호사 찾기 (나이트 근무자 제외)
            const availableForDayEvening = remainingNurses.filter(nurse => 
              nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
            );
            
            // 각 팀에서 한 명씩 Day 근무 배정 (희망자 우선)
            for (const teamId of teamIds) {
              if (dayShift.length >= rules.dayEveningNurseCount - 1) break; // 팀에 속하지 않는 간호사 1명 위한 자리 남김
              
              const teamNurses = availableForDayEvening.filter(nurse => 
                nurse.team_id === teamId &&
                !dayShift.some(n => n.id === nurse.id)
              );
              
              if (teamNurses.length > 0) {
                // 연속 근무일이 적은 간호사 우선
                teamNurses.sort((a, b) => 
                  nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
                );
                
                // 5년차 이상 간호사가 있으면 우선 배정
                const seniorInTeam = teamNurses.find(nurse => nurse.years_experience >= 5);
                dayShift.push(seniorInTeam || teamNurses[0]);
              }
            }
            
            // 팀에 속하지 않는 간호사 한 명 추가
            const unassignedForDay = unassignedNurses.filter(nurse => 
              !nightShift.some(n => n.id === nurse.id) &&
              !dayShift.some(n => n.id === nurse.id) &&
              nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
            );
            
            if (unassignedForDay.length > 0 && dayShift.length < rules.dayEveningNurseCount) {
              unassignedForDay.sort((a, b) => 
                nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
              );
              
              dayShift.push(unassignedForDay[0]);
            }
            
            // 여전히 부족하면 추가 인원 배정
            while (dayShift.length < rules.dayEveningNurseCount) {
              const remainingForDay = availableForDayEvening.filter(nurse => 
                !dayShift.some(n => n.id === nurse.id)
              );
              
              if (remainingForDay.length === 0) break;
              
              remainingForDay.sort((a, b) => 
                nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
              );
              
              dayShift.push(remainingForDay[0]);
            }
            
            // Evening 근무 배정 (Day 제외 간호사)
            const availableForEvening = availableForDayEvening.filter(nurse => 
              !dayShift.some(n => n.id === nurse.id)
            );
            
            // 각 팀에서 한 명씩 Evening 근무 배정
            for (const teamId of teamIds) {
              if (eveningShift.length >= rules.dayEveningNurseCount - 1) break; // 팀에 속하지 않는 간호사 1명 위한 자리 남김
              
              const teamNurses = availableForEvening.filter(nurse => 
                nurse.team_id === teamId &&
                !eveningShift.some(n => n.id === nurse.id)
              );
              
              if (teamNurses.length > 0) {
                // 연속 근무일이 적은 간호사 우선
                teamNurses.sort((a, b) => 
                  nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
                );
                
                // 5년차 이상 간호사가 있으면 우선 배정
                const seniorInTeam = teamNurses.find(nurse => nurse.years_experience >= 5);
                eveningShift.push(seniorInTeam || teamNurses[0]);
              }
            }
            
            // 팀에 속하지 않는 간호사 한 명 추가
            const unassignedForEvening = unassignedNurses.filter(nurse => 
              !nightShift.some(n => n.id === nurse.id) &&
              !dayShift.some(n => n.id === nurse.id) &&
              !eveningShift.some(n => n.id === nurse.id) &&
              nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
            );
            
            if (unassignedForEvening.length > 0 && eveningShift.length < rules.dayEveningNurseCount) {
              unassignedForEvening.sort((a, b) => 
                nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
              );
              
              eveningShift.push(unassignedForEvening[0]);
            }
            
            // 여전히 부족하면 추가 인원 배정
            while (eveningShift.length < rules.dayEveningNurseCount) {
              const remainingForEvening = availableForEvening.filter(nurse => 
                !eveningShift.some(n => n.id === nurse.id)
              );
              
              if (remainingForEvening.length === 0) break;
              
              remainingForEvening.sort((a, b) => 
                nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
              );
              
              eveningShift.push(remainingForEvening[0]);
            }
            
            // 오프 배정 (나머지 간호사)
            const offShift = nursesData.filter(nurse => 
              !nightShift.some(n => n.id === nurse.id) &&
              !dayShift.some(n => n.id === nurse.id) &&
              !eveningShift.some(n => n.id === nurse.id)
            );
            
            // 근무표 업데이트
            shiftsCalendar[formattedDate].day = dayShift;
            shiftsCalendar[formattedDate].evening = eveningShift;
            shiftsCalendar[formattedDate].night = nightShift;
            shiftsCalendar[formattedDate].off = offShift;
            
            // Day, Evening, Night 근무 배정 후 팀 규칙 검증
            if (shiftsCalendar[formattedDate]) {
              validateTeamRule(nightShift, 'night');
              
              try {
                if (shiftsCalendar[formattedDate].day) {
                  validateTeamRule(shiftsCalendar[formattedDate].day, 'day');
                }
                
                if (shiftsCalendar[formattedDate].evening) {
                  validateTeamRule(shiftsCalendar[formattedDate].evening, 'evening');
                }
              } catch (error) {
                console.error(`Error validating team rules for ${formattedDate}:`, error);
              }
            }
            
            // 간호사 통계 업데이트
            // Day 근무자
            dayShift.forEach(nurse => {
              if (!nurse || !nurse.id) return;
              
              const stats = nurseStats[nurse.id];
              if (!stats) return;
              
              stats.consecutiveWorkDays++;
              stats.consecutiveNightShifts = 0;
              stats.lastShiftType = 'day';
              stats.lastShiftDate = formattedDate;
              stats.shifts[formattedDate] = 'day';
            });
            
            // Evening 근무자
            eveningShift.forEach(nurse => {
              if (!nurse || !nurse.id) return;
              
              const stats = nurseStats[nurse.id];
              if (!stats) return;
              
              stats.consecutiveWorkDays++;
              stats.consecutiveNightShifts = 0;
              stats.lastShiftType = 'evening';
              stats.lastShiftDate = formattedDate;
              stats.shifts[formattedDate] = 'evening';
            });
            
            // Night 근무자
            nightShift.forEach(nurse => {
              if (!nurse || !nurse.id) return;
              
              const stats = nurseStats[nurse.id];
              if (!stats) return;
              
              const nightSeq = nurseNightSequences[nurse.id];
              if (!nightSeq) return;
              
              stats.consecutiveWorkDays++;
              stats.nightShiftsCount++;
              stats.lastNightShift = formattedDate;
              
              if (stats.lastShiftType === 'night') {
                stats.consecutiveNightShifts++;
              } else {
                stats.consecutiveNightShifts = 1;
              }
              
              // 나이트 시퀀스 업데이트
              if (nightSeq.active) {
                nightSeq.currentLength++;
              }
              
              stats.lastShiftType = 'night';
              stats.lastShiftDate = formattedDate;
              stats.shifts[formattedDate] = 'night';
            });
            
            // Off 근무자
            offShift.forEach(nurse => {
              if (!nurse || !nurse.id) return;
              
              const stats = nurseStats[nurse.id];
              if (!stats) return;
              
              stats.consecutiveWorkDays = 0;
              stats.offDaysCount++;
              
              // 나이트 시퀀스가 완료되었는지 확인
              const nightSeq = nurseNightSequences[nurse.id];
              if (nightSeq && nightSeq.active && nightSeq.currentLength >= nightSeq.targetLength) {
                // 나이트 시퀀스 완료
                nurseNightSequences[nurse.id] = {
                  active: false,
                  startDate: '',
                  currentLength: 0,
                  targetLength: 0
                };
              }
              
              // 연속 나이트 근무 초기화 (나이트 시퀀스 중이 아닌 경우만)
              if (nightSeq && !nightSeq.active) {
                stats.consecutiveNightShifts = 0;
              }
              
              stats.lastShiftType = 'off';
              stats.lastShiftDate = formattedDate;
              stats.shifts[formattedDate] = 'off';
            });
          }
        }
        
        // 2. 생성된 근무표 검증 및 최적화
        
        // [요구사항] 오프 수는 해당 달의 휴일의 총 갯수 보다 적을 수 없다.
        // [요구사항] 오프 수는 최대 9개를 초과할 수 없다.
        for (const nurseId in nurseStats) {
          // 유효성 확인
          if (nurseStats[nurseId]) {
            const stats = nurseStats[nurseId];
            
            // 오프 수가 해당 달의 휴일보다 적은지 확인
            if (stats.offDaysCount < holidays.length) {
              console.warn(`Nurse ${nurseId} has ${stats.offDaysCount} off days, which is less than the number of holidays (${holidays.length}).`);
              
              // 최대한 오프 수 늘리기 (실제 구현에서는 보다 복잡한 로직 필요)
              // 여기서는 단순히 경고만 출력
            }
            
            // 오프 수가 최대치를 초과하는지 확인
            if (stats.offDaysCount > rules.maxOffDaysPerMonth) {
              console.warn(`Nurse ${nurseId} has ${stats.offDaysCount} off days, exceeding the limit of ${rules.maxOffDaysPerMonth}.`);
              
              // 실제 구현에서는 오프를 다른 근무로 바꾸는 로직 필요
              // 여기서는 단순히 경고만 출력
            }
            
            // [요구사항] 해당 달의 오프 수 - 해당 달의 휴일 갯수는 연차에서 차감된다.
            const usedVacationDays = Math.max(0, stats.offDaysCount - holidays.length);
            console.log(`Nurse ${nurseId} has used ${usedVacationDays} vacation days.`);
            
            // 실제 구현에서는 연차 차감 로직 추가
          }
        }
        
        // 근무표 데이터 형식 변환
        for (const date in shiftsCalendar) {
          const shifts = shiftsCalendar[date];
          
          // Day 근무
          shifts.day.forEach((nurse: any) => {
            generatedShifts.push({
              nurse_id: nurse.id,
              shift_date: date,
              shift_type: 'day',
              status: 'scheduled',
              notes: '자동 생성됨',
              nurse_name: nurse.name,
              team_name: nurse.team_name || null,
              years_experience: nurse.years_experience
            });
          });
          
          // Evening 근무
          shifts.evening.forEach((nurse: any) => {
            generatedShifts.push({
              nurse_id: nurse.id,
              shift_date: date,
              shift_type: 'evening',
              status: 'scheduled', 
              notes: '자동 생성됨',
              nurse_name: nurse.name,
              team_name: nurse.team_name || null,
              years_experience: nurse.years_experience
            });
          });
          
          // Night 근무
          shifts.night.forEach((nurse: any) => {
            generatedShifts.push({
              nurse_id: nurse.id,
              shift_date: date,
              shift_type: 'night',
              status: 'scheduled',
              notes: '자동 생성됨',
              nurse_name: nurse.name,
              team_name: nurse.team_name || null,
              years_experience: nurse.years_experience
            });
          });
          
          // Off 근무
          shifts.off.forEach((nurse: any) => {
            generatedShifts.push({
              nurse_id: nurse.id,
              shift_date: date,
              shift_type: 'off',
              status: 'scheduled',
              notes: '자동 생성됨',
              nurse_name: nurse.name,
              team_name: nurse.team_name || null,
              years_experience: nurse.years_experience
            });
          });
        }
        
        // 간호사별 근무 상태 유효성 검사
        nursesData.forEach(nurse => {
          const stats = nurseStats[nurse.id];
          
          // 전체 달의 근무 확인
          const nurseDates = Object.keys(stats.shifts);
          
          // 나이트 연속 근무 체크 (최소 2일, 최대 3일)
          let currentNightStreak = 0;
          let foundSingleNight = false;
          
          nurseDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          for (let i = 0; i < nurseDates.length; i++) {
            const date = nurseDates[i];
            if (stats.shifts[date] === 'night') {
              currentNightStreak++;
              
              // 날짜가 마지막 날이거나 다음 날이 나이트가 아닌 경우 시퀀스 종료
              if (i === nurseDates.length - 1 || stats.shifts[nurseDates[i+1]] !== 'night') {
                // 1일만 나이트 근무한 경우 경고
                if (currentNightStreak === 1) {
                  foundSingleNight = true;
                  console.warn(`Nurse ${nurse.name} (ID: ${nurse.id}) worked only 1 night shift starting on ${date}`);
                }
                
                // 나이트 근무 후 오프 체크
                if (currentNightStreak > 0) {
                  let offsAfterNight = 0;
                  for (let j = i + 1; j < Math.min(i + 3, nurseDates.length); j++) {
                    if (stats.shifts[nurseDates[j]] === 'off') {
                      offsAfterNight++;
                    } else {
                      break; // 연속된 오프가 아니면 중단
                    }
                  }
                  
                  // 나이트 근무 후 오프가 2일 미만인 경우 경고
                  if (offsAfterNight < rules.minOffsAfterNights) {
                    console.warn(`Nurse ${nurse.name} (ID: ${nurse.id}) had only ${offsAfterNight} off days after ${currentNightStreak} consecutive night shifts ending on ${date}`);
                  }
                }
                
                // 시퀀스 초기화
                currentNightStreak = 0;
              }
            } else {
              currentNightStreak = 0;
            }
          }
          
          if (foundSingleNight) {
            console.warn(`Nurse ${nurse.name} (ID: ${nurse.id}) has instances of single night shifts. Night shifts should be at least 2 days.`);
          }
        });
        
        // 최종 검증: 1일 나이트 발견 시 수정
        nursesData.forEach(nurse => {
          const stats = nurseStats[nurse.id];
          const nurseDates = Object.keys(stats.shifts).sort((a, b) => 
            new Date(a).getTime() - new Date(b).getTime()
          );
          
          for (let i = 0; i < nurseDates.length; i++) {
            const date = nurseDates[i];
            
            // 나이트 근무 발견
            if (stats.shifts[date] === 'night') {
              let nightCount = 1;
              
              // 전, 후 날짜 확인으로 연속 나이트 체크
              // 이전날 체크
              if (i > 0 && stats.shifts[nurseDates[i-1]] === 'night') {
                nightCount++;
              }
              
              // 다음날 체크
              if (i < nurseDates.length - 1 && stats.shifts[nurseDates[i+1]] === 'night') {
                nightCount++;
              }
              
              // 1일 나이트 발견
              if (nightCount === 1) {
                console.warn(`Fixing single night shift for nurse ${nurse.name} (ID: ${nurse.id}) on ${date}`);
                
                // 해당 날짜의 시프트를 가져옴
                const dateObj = new Date(date);
                const dayOfMonth = dateObj.getDate();
                const shiftsForDate = shiftsCalendar[date];
                
                // 해당 간호사 나이트에서 제거
                shiftsForDate.night = shiftsForDate.night.filter((n: any) => n.id !== nurse.id);
                
                // 오프로 변경 (또는 다른 근무로 변경 가능)
                shiftsForDate.off.push(nurse);
                stats.shifts[date] = 'off';
                
                // 통계 업데이트
                stats.nightShiftsCount--;
                stats.offDaysCount++;
                
                // 다른 간호사 중 나이트를 연속으로 할 수 있는 간호사를 찾아 교체
                for (const otherNurse of nursesData) {
                  if (otherNurse.id === nurse.id) continue;
                  
                  const otherStats = nurseStats[otherNurse.id];
                  
                  // 해당 날이 오프이고, 연속 2일 나이트가 가능한 조건 확인
                  if (otherStats.shifts[date] === 'off' && 
                      (i < nurseDates.length - 1 && otherStats.shifts[nurseDates[i+1]] === 'night' || 
                       i > 0 && otherStats.shifts[nurseDates[i-1]] === 'night')) {
                      
                    // 나이트로 변경
                    shiftsForDate.off = shiftsForDate.off.filter((n: any) => n.id !== otherNurse.id);
                    shiftsForDate.night.push(otherNurse);
                    otherStats.shifts[date] = 'night';
                    
                    // 통계 업데이트
                    otherStats.nightShiftsCount++;
                    otherStats.offDaysCount--;
                    
                    console.log(`Replaced with nurse ${otherNurse.name} (ID: ${otherNurse.id}) who can work consecutive nights`);
                    break;
                  }
                }
              }
            }
          }
        });
        
        return { success: true, data: generatedShifts };
      } catch (error) {
        console.error('Error generating monthly schedule:', error);
        return { success: false, error: error.message };
      }
    });
    
    ipcMain.handle('shift:saveGeneratedSchedule', async (_, shifts) => {
      try {
        console.log('Saving generated schedule:', shifts);
        
        // 시프트를 하나씩 저장
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

    // ShiftPreference operations
    ipcMain.handle('shiftPreference:getAll', async () => {
      try {
        return { success: true, data: shiftPreferenceOperations.getAll() };
      } catch (error) {
        console.error('Error getting shift preferences:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shiftPreference:getByNurseId', async (_, nurseId) => {
      try {
        return { success: true, data: shiftPreferenceOperations.getByNurseId(nurseId) };
      } catch (error) {
        console.error(`Error getting preferences for nurse ${nurseId}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shiftPreference:getByDateRange', async (_, startDate, endDate) => {
      try {
        return { success: true, data: shiftPreferenceOperations.getByDateRange(startDate, endDate) };
      } catch (error) {
        console.error(`Error getting preferences between ${startDate} and ${endDate}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shiftPreference:create', async (_, prefData) => {
      try {
        const result = shiftPreferenceOperations.create(prefData);
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating shift preference:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shiftPreference:update', async (_, id, prefData) => {
      try {
        const result = shiftPreferenceOperations.update(id, prefData);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error updating shift preference ${id}:`, error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('shiftPreference:delete', async (_, id) => {
      try {
        const result = shiftPreferenceOperations.delete(id);
        return { success: true, data: result };
      } catch (error) {
        console.error(`Error deleting shift preference ${id}:`, error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('IPC 핸들러 설정 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
    // 오류 발생 시 기본 IPC 핸들러 설정 - 오류 메시지 반환
    setupErrorHandlers();
  }
}

// 데이터베이스 초기화 실패 시 모든 IPC 요청에 오류 반환하는 핸들러
function setupErrorHandlers() {
  const errorResponse = { 
    success: false, 
    error: '데이터베이스 연결에 실패했습니다. 애플리케이션을 다시 시작해주세요.' 
  };
  
  // Nurse operations with error responses
  ipcMain.handle('nurse:getAll', async () => errorResponse);
  ipcMain.handle('nurse:getById', async () => errorResponse);
  ipcMain.handle('nurse:create', async () => errorResponse);
  ipcMain.handle('nurse:update', async () => errorResponse);
  ipcMain.handle('nurse:delete', async () => errorResponse);
  ipcMain.handle('nurse:deleteAll', async () => errorResponse);
  ipcMain.handle('nurse:removeFromTeam', async () => errorResponse);
  ipcMain.handle('nurse:assignToTeam', async () => errorResponse);
  
  // Team operations with error responses
  ipcMain.handle('team:getAll', async () => errorResponse);
  ipcMain.handle('team:getById', async () => errorResponse);
  ipcMain.handle('team:getNursesByTeamId', async () => errorResponse);
  ipcMain.handle('team:getUnassignedNurses', async () => errorResponse);
  ipcMain.handle('team:create', async () => errorResponse);
  ipcMain.handle('team:update', async () => errorResponse);
  ipcMain.handle('team:delete', async () => errorResponse);
  
  // Shift operations with error responses
  ipcMain.handle('shift:getAll', async () => errorResponse);
  ipcMain.handle('shift:getById', async () => errorResponse);
  ipcMain.handle('shift:getByNurseId', async () => errorResponse);
  ipcMain.handle('shift:create', async () => errorResponse);
  ipcMain.handle('shift:update', async () => errorResponse);
  ipcMain.handle('shift:delete', async () => errorResponse);

  // ShiftPreference operations with error responses
  ipcMain.handle('shiftPreference:getAll', async () => errorResponse);
  ipcMain.handle('shiftPreference:getByNurseId', async () => errorResponse);
  ipcMain.handle('shiftPreference:getByDateRange', async () => errorResponse);
  ipcMain.handle('shiftPreference:create', async () => errorResponse);
  ipcMain.handle('shiftPreference:update', async () => errorResponse);
  ipcMain.handle('shiftPreference:delete', async () => errorResponse);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // 데이터베이스 초기화 및 IPC 핸들러 설정
  await setupIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
