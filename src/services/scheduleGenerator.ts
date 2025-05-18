import type { Shift, ShiftPreference, ShiftGenerationRules, Nurse } from '../types';
import { ShiftOperations } from '../database/operations';

interface NurseStats {
  consecutiveWorkDays: number;
  consecutiveNightShifts: number;
  nightShiftsCount: number;
  offDaysCount: number;
  shifts: Record<string, string>;
  reservedOffs: Set<string>;
  nightSequence: {
    active: boolean;
    remainingDays: number;
  };
}

export class ScheduleGenerator {
  private shiftOperations: ShiftOperations;

  constructor(shiftOperations: ShiftOperations) {
    this.shiftOperations = shiftOperations;
  }

  /**
   * 월간 스케줄을 생성하는 함수
   */
  async generateMonthlySchedule(params: {
    year: number;
    month: number;
    nurses: number[];
    preferences: ShiftPreference[];
    rules: ShiftGenerationRules;
  }): Promise<Shift[]> {
    const { year, month, nurses, preferences, rules } = params;
    
    // 간호사 데이터 가져오기
    const nursesData = await Promise.all(
      nurses.map(id => this.shiftOperations.getNurseWithTeam(id))
    );
    
    // 해당 월의 총 일수 계산
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 간호사별 통계 초기화
    const stats: Record<number, NurseStats> = {};
    nursesData.forEach(nurse => {
      if (!nurse) return;
      
      stats[nurse.id] = {
        consecutiveWorkDays: 0,
        consecutiveNightShifts: 0,
        nightShiftsCount: 0,
        offDaysCount: 0,
        shifts: {},
        reservedOffs: new Set(),
        nightSequence: {
          active: false,
          remainingDays: 0
        }
      };
    });
    
    // 빈 시프트 배열 생성
    const generatedShifts: Shift[] = [];
    
    // 날짜별로 처리
    for (let day = 1; day <= daysInMonth; day++) {
      const shiftDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // 오늘 근무를 배정받은 간호사 목록
      const assignedNursesToday: number[] = [];
      
      // 먼저 활성화된 나이트 시퀀스 처리 (이미 시작된 나이트 연속 근무)
      const activeSequenceNurses = Object.keys(stats)
        .filter(nurseId => {
          const stat = stats[Number(nurseId)];
          return stat.nightSequence.active && stat.nightSequence.remainingDays > 0;
        })
        .map(nurseId => Number(nurseId));
      
      // 활성화된 시퀀스 간호사들에게 나이트 근무 배정
      for (const nurseId of activeSequenceNurses) {
        // 예약된 오프가 있으면 스킵
        if (stats[nurseId].reservedOffs.has(shiftDate)) continue;
        
        // 나이트 근무 추가
        generatedShifts.push({
          id: 0,
          nurse_id: nurseId,
          nurse_name: nursesData.find(n => n?.id === nurseId)?.name || '',
          shift_date: shiftDate,
          shift_type: 'night',
          status: 'scheduled',
          notes: '연속 나이트 근무',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // 통계 업데이트
        stats[nurseId].shifts[shiftDate] = 'night';
        stats[nurseId].nightShiftsCount++;
        stats[nurseId].consecutiveNightShifts++;
        stats[nurseId].nightSequence.remainingDays--;
        
        // 시퀀스가 끝났으면 오프 예약
        if (stats[nurseId].nightSequence.remainingDays === 0) {
          stats[nurseId].nightSequence.active = false;
          
          // 오프 예약 (2일)
          const reserveOffDays = rules.minOffsAfterNights;
          const lastDate = new Date(shiftDate);
          
          for (let i = 1; i <= reserveOffDays; i++) {
            const offDate = new Date(lastDate);
            offDate.setDate(lastDate.getDate() + i);
            
            // 이번 달에 포함된 오프만 처리
            if (offDate.getMonth() === month && offDate.getFullYear() === year) {
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(offDate.getDate()).padStart(2, '0')}`;
              stats[nurseId].reservedOffs.add(formattedDate);
            }
          }
          
          // 연속 일수 초기화
          stats[nurseId].consecutiveNightShifts = 0;
        }
        
        assignedNursesToday.push(nurseId);
      }
      
      // 추가로 필요한 야간 간호사 수 계산
      const additionalNursesNeeded = rules.nightNurseCount - activeSequenceNurses.length;
      
      // 야간 근무 배정 필요 시 (새로운 나이트 시퀀스 시작)
      if (additionalNursesNeeded > 0) {
        const nightNurses = await this.assignNewNightSequence(
          shiftDate,
          nursesData,
          stats,
          rules,
          preferences,
          assignedNursesToday,
          additionalNursesNeeded
        );
        
        // 각 새로운 야간 근무자에 대해 근무 데이터 생성
        nightNurses.forEach(nurseId => {
          // 나이트 시퀀스 길이 결정 (2일 또는 3일)
          const sequenceLength = Math.floor(Math.random() * 2) + 2; // 2 또는 3
          
          // 나이트 시퀀스 설정
          stats[nurseId].nightSequence.active = true;
          stats[nurseId].nightSequence.remainingDays = sequenceLength - 1; // 오늘 하루 제외
          
          generatedShifts.push({
            id: 0,
            nurse_id: nurseId,
            nurse_name: nursesData.find(n => n?.id === nurseId)?.name || '',
            shift_date: shiftDate,
            shift_type: 'night',
            status: 'scheduled',
            notes: '자동 생성됨',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          // 통계 업데이트
          stats[nurseId].shifts[shiftDate] = 'night';
          stats[nurseId].nightShiftsCount++;
          stats[nurseId].consecutiveNightShifts++;
          
          assignedNursesToday.push(nurseId);
        });
      }
      
      // 나이트 근무 후 오프 예약된 간호사들에게 오프 추가
      nursesData.forEach(nurse => {
        if (!nurse) return;
        const nurseId = nurse.id;
        
        if (stats[nurseId].reservedOffs.has(shiftDate)) {
          generatedShifts.push({
            id: 0,
            nurse_id: nurseId,
            nurse_name: nurse.name,
            shift_date: shiftDate,
            shift_type: 'off',
            status: 'scheduled',
            notes: '나이트 근무 후 오프',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          stats[nurseId].shifts[shiftDate] = 'off';
          stats[nurseId].offDaysCount++;
          assignedNursesToday.push(nurseId);
        }
      });
    }
    
    return generatedShifts;
  }

  private async assignNewNightSequence(
    date: string,
    nurses: Nurse[],
    stats: Record<number, NurseStats>,
    rules: ShiftGenerationRules,
    preferences: ShiftPreference[],
    assignedNurses: number[],
    count: number
  ): Promise<number[]> {
    const selectedNurses: number[] = [];
    const availableNurses = nurses.filter(nurse => {
      if (!nurse) return false;
      
      // 이미 오늘 배정된 간호사는 제외
      if (assignedNurses.includes(nurse.id)) return false;
      
      // 나이트 시퀀스가 활성화된 간호사 제외
      if (stats[nurse.id].nightSequence.active) return false;
      
      // 나이트 연속 근무일수 체크 (최대 3일)
      if (stats[nurse.id].consecutiveNightShifts >= rules.maxConsecutiveNightShifts) {
        return false;
      }
      
      // 오프 예약된 날짜 체크
      if (stats[nurse.id].reservedOffs.has(date)) {
        return false;
      }
      
      // 한달 나이트 근무 수 체크 (최대 8회)
      if (stats[nurse.id].nightShiftsCount >= rules.maxNightShiftsPerMonth) {
        return false;
      }
      
      return true;
    });
    
    // 팀별 가용 간호사 그룹화
    const nursesByTeam: Record<string, any[]> = {};
    availableNurses.forEach(nurse => {
      const teamKey = nurse.team_id ? `team_${nurse.team_id}` : 'unassigned';
      if (!nursesByTeam[teamKey]) {
        nursesByTeam[teamKey] = [];
      }
      nursesByTeam[teamKey].push(nurse);
    });
    
    // 4년차 이상 간호사 확인
    const seniorNurses = availableNurses.filter(nurse => nurse.years_experience >= 4);
    
    // 나이트 근무 수가 적은 간호사부터 정렬 (팀 균형 고려)
    const sortedNursesByTeam: Nurse[] = [];
    
    // 각 팀에서 나이트 근무 수가 적은 순으로 정렬
    Object.keys(nursesByTeam).forEach(teamKey => {
      // 팀 내에서 나이트 근무 수가 적은 순으로 정렬
      const sortedTeamNurses = nursesByTeam[teamKey].sort((a, b) => {
        // 나이트 근무 수가 적은 순
        const countDiff = stats[a.id].nightShiftsCount - stats[b.id].nightShiftsCount;
        if (countDiff !== 0) return countDiff;
        
        // // 같다면 4년차 이상 간호사 우선
        // const seniorA = a.years_experience >= 4;
        // const seniorB = b.years_experience >= 4;
        // if (seniorA && !seniorB) return -1;
        // if (!seniorA && seniorB) return 1;
        
        // // 나이트 근무 희망자 우선
        // const prefA = preferences.find(p => p.nurse_id === a.id && p.preference_date === date && p.preference_type === 'night');
        // const prefB = preferences.find(p => p.nurse_id === b.id && p.preference_date === date && p.preference_type === 'night');
        // if (prefA && !prefB) return -1;
        // if (!prefA && prefB) return 1;
        
        return 0;
      });
      
      sortedNursesByTeam.push(...sortedTeamNurses);
    });
    
    // 팀별 선택된 간호사 수 카운트
    const selectedTeamCount: Record<string, number> = {};
    
    // 1. 먼저 4년차 이상 간호사 최소 1명 포함
    let hasSeniorNurse = false;
    
    for (const nurse of sortedNursesByTeam) {
      // 이미 4년차 이상이 선택되었으면 스킵
      if (hasSeniorNurse) break;
      
      if (nurse.years_experience >= 4) {
        selectedNurses.push(nurse.id);
        hasSeniorNurse = true;
        
        // 팀 카운트 증가
        const teamKey = nurse.team_id ? `team_${nurse.team_id}` : 'unassigned';
        selectedTeamCount[teamKey] = (selectedTeamCount[teamKey] || 0) + 1;
      }
    }
    
    if (!hasSeniorNurse) {
      console.log("no senior nurse Day", date);
    }

    // 2. 나머지 인원 선택 (팀 균형 고려)
    for (const nurse of sortedNursesByTeam) {
      // 이미 선택된 간호사면 스킵
      if (selectedNurses.includes(nurse.id)) continue;
      
      // 필요한 인원이 다 채워졌으면 종료
      if (selectedNurses.length >= count) break;
      
      // 4년차 간호사가 이미 선택되었다면 4년차 이상 간호사는 제외
      if (hasSeniorNurse) {
        if (nurse.years_experience >= 4) continue;
      }
      
      const teamKey = nurse.team_id ? `team_${nurse.team_id}` : 'unassigned';
      
      // 이 팀에서 이미 최대 인원을 선택했으면 스킵 (한 팀에서 최대 2명)
      if (selectedTeamCount[teamKey] && selectedTeamCount[teamKey] >= 1) continue;
      
      selectedNurses.push(nurse.id);
      selectedTeamCount[teamKey] = (selectedTeamCount[teamKey] || 0) + 1;
    }
    
    // // 만약 충분한 간호사를 선택하지 못했으면, 팀 제한을 무시하고 추가
    // if (selectedNurses.length < count) {
    //   for (const nurse of sortedNursesByTeam) {
    //     // 이미 선택된 간호사면 스킵
    //     if (selectedNurses.includes(nurse.id)) continue;
        
    //     // 필요한 인원이 다 채워졌으면 종료
    //     if (selectedNurses.length >= count) break;
        
    //     selectedNurses.push(nurse.id);
    //   }
    // }
    
    // 4년차 이상 간호사 포함 규칙 최종 검증
    if (rules.requireSeniorNurseAtNight && !hasSeniorNurse && selectedNurses.length > 0) {
      // 4년차 이상 간호사가 없는 경우, 강제로 한명 포함시킴
      const availableSeniors = availableNurses.filter(nurse => nurse.years_experience >= 4);
      
      if (availableSeniors.length > 0) {
        // 첫번째 선택된 간호사를 4년차 이상으로 교체
        selectedNurses[0] = availableSeniors[0].id;
      }
    }
    
    return selectedNurses;
  }
} 