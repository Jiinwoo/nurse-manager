/**
 * 근무 스케줄 생성 알고리즘 테스트 유틸리티
 * 
 * 이 파일은 근무 스케줄 생성 알고리즘을 단위 테스트하기 위한 목적으로 작성되었습니다.
 * 실행 방법: npx ts-node src/test-schedule-generator.ts
 */

// 테스트 데이터 타입 정의
interface TestNurse {
  id: number;
  name: string;
  years_experience: number;
  team_id: number | null;
}

interface TestPreference {
  nurse_id: number;
  preference_date: string;
  preference_type: string;
}

interface TestShift {
  nurse_id: number;
  shift_date: string;
  shift_type: string;
  nurse_name?: string;
}

interface NurseStats {
  consecutiveWorkDays: number;
  consecutiveNightShifts: number;
  nightShiftsCount: number;
  offDaysCount: number;
  lastNightShift: string | null;
  lastShiftType: string | null;
  lastShiftDate: string | null;
  shifts: Record<string, string>;
}

interface TestRules {
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

// 테스트 데이터 생성
function generateTestData() {
  // 테스트용 간호사 데이터
  const nurses: TestNurse[] = [
    { id: 1, name: '김간호', years_experience: 7, team_id: 1 },
    { id: 2, name: '이간호', years_experience: 5, team_id: 1 },
    { id: 3, name: '박간호', years_experience: 3, team_id: 2 },
    { id: 4, name: '최간호', years_experience: 2, team_id: 2 },
    { id: 5, name: '정간호', years_experience: 1, team_id: 3 },
    { id: 6, name: '강간호', years_experience: 6, team_id: 3 },
    { id: 7, name: '조간호', years_experience: 4, team_id: 4 },
    { id: 8, name: '윤간호', years_experience: 2, team_id: 4 },
    { id: 9, name: '장간호', years_experience: 8, team_id: null },
    { id: 10, name: '임간호', years_experience: 1, team_id: null },
    { id: 11, name: '한간호', years_experience: 3, team_id: null },
  ];
  
  // 테스트용 희망 근무
  const preferences: TestPreference[] = [
    // 첫째 주 희망 근무
    { nurse_id: 1, preference_date: '2023-07-01', preference_type: 'day' },
    { nurse_id: 2, preference_date: '2023-07-01', preference_type: 'night' },
    { nurse_id: 3, preference_date: '2023-07-01', preference_type: 'evening' },
    { nurse_id: 4, preference_date: '2023-07-01', preference_type: 'off' },
    { nurse_id: 5, preference_date: '2023-07-02', preference_type: 'day' },
    { nurse_id: 6, preference_date: '2023-07-02', preference_type: 'night' },
    { nurse_id: 7, preference_date: '2023-07-02', preference_type: 'evening' },
    { nurse_id: 8, preference_date: '2023-07-02', preference_type: 'off' },
    // 둘째 주 희망 근무
    { nurse_id: 9, preference_date: '2023-07-07', preference_type: 'day' },
    { nurse_id: 10, preference_date: '2023-07-07', preference_type: 'evening' },
    { nurse_id: 11, preference_date: '2023-07-07', preference_type: 'night' },
    { nurse_id: 1, preference_date: '2023-07-08', preference_type: 'off' },
    { nurse_id: 2, preference_date: '2023-07-08', preference_type: 'day' },
    { nurse_id: 3, preference_date: '2023-07-08', preference_type: 'evening' },
  ];
  
  // 테스트용 규칙
  const rules: TestRules = {
    maxConsecutiveWorkDays: 4,
    maxConsecutiveNightShifts: 3,
    minOffsAfterNights: 2,
    maxNightShiftsPerMonth: 8,
    dayEveningNurseCount: 4,
    nightNurseCount: 3,
    requireSeniorNurseAtNight: true,
    maxOffDaysPerMonth: 9,
    teamDistribution: true
  };
  
  return { nurses, preferences, rules };
}

// 스케줄 생성 알고리즘 (메인 프로세스에서 사용하는 알고리즘과 동일한 로직)
function generateSchedule(year: number, month: number, nurses: TestNurse[], preferences: TestPreference[], rules: TestRules): TestShift[] {
  console.log(`[TEST] Generating schedule for ${year}-${month+1}`);
  
  // 사용할 데이터 준비
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let generatedShifts: TestShift[] = [];
  
  // 공휴일 목록 (테스트용으로 일요일만 공휴일로 설정)
  const holidays: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === 0) { // 일요일
      holidays.push(date.toISOString().split('T')[0]);
    }
  }
  
  // 팀별 간호사 그룹화
  const nursesByTeam: Record<string, TestNurse[]> = {};
  const unassignedNurses: TestNurse[] = [];
  
  for (const nurse of nurses) {
    if (nurse.team_id) {
      if (!nursesByTeam[nurse.team_id]) {
        nursesByTeam[nurse.team_id] = [];
      }
      nursesByTeam[nurse.team_id].push(nurse);
    } else {
      unassignedNurses.push(nurse);
    }
  }
  
  // 근무표 초기화
  const shiftsCalendar: Record<string, {
    day: TestNurse[];
    evening: TestNurse[];
    night: TestNurse[];
    off: TestNurse[];
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
  const nurseStats: Record<number, NurseStats> = {};
  nurses.forEach(nurse => {
    nurseStats[nurse.id] = {
      consecutiveWorkDays: 0,
      consecutiveNightShifts: 0,
      nightShiftsCount: 0,
      offDaysCount: 0,
      lastNightShift: null,
      lastShiftType: null,
      lastShiftDate: null,
      shifts: {}
    };
  });
  
  // 일자별 근무표 생성
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const formattedDate = date.toISOString().split('T')[0];
    const isHoliday = holidays.includes(formattedDate);
    
    // 1. 나이트 근무 배정 (3명)
    const eligibleForNight = nurses.filter(nurse => {
      const stats = nurseStats[nurse.id];
      
      // 나이트 근무 제한 규칙 확인
      const canWorkNight = 
        stats.nightShiftsCount < rules.maxNightShiftsPerMonth &&
        stats.consecutiveWorkDays < rules.maxConsecutiveWorkDays;
      
      // 연속 나이트 근무 체크
      if (stats.consecutiveNightShifts >= rules.maxConsecutiveNightShifts) {
        return false;
      }
      
      // 마지막 나이트 근무 후 최소 오프 일수 체크
      if (stats.lastNightShift) {
        const daysSinceLastNight = Math.floor(
          (date.getTime() - new Date(stats.lastNightShift).getTime()) / (24 * 60 * 60 * 1000)
        );
        
        if (daysSinceLastNight < rules.minOffsAfterNights && 
            stats.consecutiveNightShifts >= rules.maxConsecutiveNightShifts) {
          return false;
        }
      }
      
      return canWorkNight;
    });
    
    // 5년차 이상 간호사 필터링
    const seniorNurses = eligibleForNight.filter(nurse => nurse.years_experience >= 5);
    const juniorNurses = eligibleForNight.filter(nurse => nurse.years_experience < 5);
    
    // 나이트 근무 배정
    const nightShift: TestNurse[] = [];
    
    // 5년차 이상 간호사 한 명 추가
    if (seniorNurses.length > 0) {
      // 희망 근무 반영
      const seniorWithPreference = seniorNurses.find(nurse => {
        return preferences.some(p => 
          p.nurse_id === nurse.id && 
          p.preference_date === formattedDate && 
          p.preference_type === 'night'
        );
      });
      
      if (seniorWithPreference) {
        nightShift.push(seniorWithPreference);
      } else {
        // 희망 근무가 없으면 나이트 근무 수가 적은 간호사 선택
        seniorNurses.sort((a, b) => 
          nurseStats[a.id].nightShiftsCount - nurseStats[b.id].nightShiftsCount
        );
        nightShift.push(seniorNurses[0]);
      }
    }
    
    // 나머지 인원 추가 (팀에서 최대 2명까지만)
    const teamsInNight = new Map<number | null, number>();
    
    // 희망 근무자 우선 추가
    const nursesWithNightPreference = juniorNurses.filter(nurse => {
      return preferences.some(p => 
        p.nurse_id === nurse.id && 
        p.preference_date === formattedDate && 
        p.preference_type === 'night'
      );
    });
    
    for (const nurse of [...nursesWithNightPreference, ...juniorNurses]) {
      if (nightShift.length >= rules.nightNurseCount) break;
      
      // 이미 추가된 간호사는 건너뜀
      if (nightShift.some(n => n.id === nurse.id)) continue;
      
      // 팀 제한 확인
      const teamId = nurse.team_id;
      const teamCount = teamsInNight.get(teamId) || 0;
      
      if (teamCount < 2) {
        nightShift.push(nurse);
        teamsInNight.set(teamId, teamCount + 1);
      }
    }
    
    // 2. Day 근무 배정 (4명)
    // 나이트 근무자 제외한 간호사 목록
    const availableForDayEvening = nurses.filter(nurse => 
      !nightShift.some(n => n.id === nurse.id)
    );
    
    // 희망 근무 필터링
    const dayPreferences = availableForDayEvening.filter(nurse => 
      preferences.some(p => 
        p.nurse_id === nurse.id && 
        p.preference_date === formattedDate && 
        p.preference_type === 'day'
      )
    );
    
    // Day 근무 배정
    const dayShift: TestNurse[] = [];
    const teamsInDay = new Set<number>();
    
    // 희망 근무자 우선 배정
    for (const nurse of dayPreferences) {
      if (dayShift.length >= rules.dayEveningNurseCount) break;
      
      const stats = nurseStats[nurse.id];
      if (stats.consecutiveWorkDays < rules.maxConsecutiveWorkDays) {
        dayShift.push(nurse);
        if (nurse.team_id) teamsInDay.add(nurse.team_id);
      }
    }
    
    // 각 팀에서 한 명씩 추가
    for (const [teamId, teamNurses] of Object.entries(nursesByTeam)) {
      if (dayShift.length >= rules.dayEveningNurseCount) break;
      if (teamsInDay.has(parseInt(teamId))) continue;
      
      // 팀에서 연속 근무일이 적은 간호사 선택
      const eligibleTeamNurses = teamNurses.filter(nurse => 
        !dayShift.some(n => n.id === nurse.id) &&
        !nightShift.some(n => n.id === nurse.id) &&
        nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
      );
      
      if (eligibleTeamNurses.length > 0) {
        eligibleTeamNurses.sort((a, b) => 
          nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
        );
        
        dayShift.push(eligibleTeamNurses[0]);
        teamsInDay.add(parseInt(teamId));
      }
    }
    
    // 팀에 속하지 않는 간호사 추가
    const unassignedForDay = unassignedNurses.filter(nurse => 
      !dayShift.some(n => n.id === nurse.id) &&
      !nightShift.some(n => n.id === nurse.id) &&
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
      const remainingNurses = availableForDayEvening.filter(nurse => 
        !dayShift.some(n => n.id === nurse.id) &&
        nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
      );
      
      if (remainingNurses.length === 0) break;
      
      remainingNurses.sort((a, b) => 
        nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
      );
      
      dayShift.push(remainingNurses[0]);
    }
    
    // 3. Evening 근무 배정 (4명)
    // 이미 Day로 배정된 간호사 제외
    const availableForEvening = availableForDayEvening.filter(nurse => 
      !dayShift.some(n => n.id === nurse.id)
    );
    
    // 희망 근무자 우선 배정
    const eveningPreferences = availableForEvening.filter(nurse => 
      preferences.some(p => 
        p.nurse_id === nurse.id && 
        p.preference_date === formattedDate && 
        p.preference_type === 'evening'
      )
    );
    
    const eveningShift: TestNurse[] = [];
    const teamsInEvening = new Set<number>();
    
    // 희망 근무자 우선 배정
    for (const nurse of eveningPreferences) {
      if (eveningShift.length >= rules.dayEveningNurseCount) break;
      
      const stats = nurseStats[nurse.id];
      if (stats.consecutiveWorkDays < rules.maxConsecutiveWorkDays) {
        eveningShift.push(nurse);
        if (nurse.team_id) teamsInEvening.add(nurse.team_id);
      }
    }
    
    // 각 팀에서 한 명씩 추가
    for (const [teamId, teamNurses] of Object.entries(nursesByTeam)) {
      if (eveningShift.length >= rules.dayEveningNurseCount) break;
      if (teamsInEvening.has(parseInt(teamId))) continue;
      
      // 팀에서 연속 근무일이 적은 간호사 선택
      const eligibleTeamNurses = teamNurses.filter(nurse => 
        !eveningShift.some(n => n.id === nurse.id) &&
        !dayShift.some(n => n.id === nurse.id) &&
        !nightShift.some(n => n.id === nurse.id) &&
        nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
      );
      
      if (eligibleTeamNurses.length > 0) {
        eligibleTeamNurses.sort((a, b) => 
          nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
        );
        
        eveningShift.push(eligibleTeamNurses[0]);
        teamsInEvening.add(parseInt(teamId));
      }
    }
    
    // 팀에 속하지 않는 간호사 추가
    const unassignedForEvening = unassignedNurses.filter(nurse => 
      !eveningShift.some(n => n.id === nurse.id) &&
      !dayShift.some(n => n.id === nurse.id) &&
      !nightShift.some(n => n.id === nurse.id) &&
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
      const remainingNurses = availableForEvening.filter(nurse => 
        !eveningShift.some(n => n.id === nurse.id) &&
        nurseStats[nurse.id].consecutiveWorkDays < rules.maxConsecutiveWorkDays
      );
      
      if (remainingNurses.length === 0) break;
      
      remainingNurses.sort((a, b) => 
        nurseStats[a.id].consecutiveWorkDays - nurseStats[b.id].consecutiveWorkDays
      );
      
      eveningShift.push(remainingNurses[0]);
    }
    
    // 4. 오프(휴무) 배정
    // 근무가 배정되지 않은 모든 간호사
    const offShift = nurses.filter(nurse => 
      !dayShift.some(n => n.id === nurse.id) &&
      !eveningShift.some(n => n.id === nurse.id) &&
      !nightShift.some(n => n.id === nurse.id)
    );
    
    // 5. 근무표 업데이트
    shiftsCalendar[formattedDate].day = dayShift;
    shiftsCalendar[formattedDate].evening = eveningShift;
    shiftsCalendar[formattedDate].night = nightShift;
    shiftsCalendar[formattedDate].off = offShift;
    
    // 6. 간호사 통계 업데이트
    // Day 근무자
    dayShift.forEach(nurse => {
      const stats = nurseStats[nurse.id];
      
      stats.consecutiveWorkDays++;
      stats.consecutiveNightShifts = 0;
      stats.lastShiftType = 'day';
      stats.lastShiftDate = formattedDate;
      stats.shifts[formattedDate] = 'day';
    });
    
    // Evening 근무자
    eveningShift.forEach(nurse => {
      const stats = nurseStats[nurse.id];
      
      stats.consecutiveWorkDays++;
      stats.consecutiveNightShifts = 0;
      stats.lastShiftType = 'evening';
      stats.lastShiftDate = formattedDate;
      stats.shifts[formattedDate] = 'evening';
    });
    
    // Night 근무자
    nightShift.forEach(nurse => {
      const stats = nurseStats[nurse.id];
      
      stats.consecutiveWorkDays++;
      stats.nightShiftsCount++;
      stats.lastNightShift = formattedDate;
      
      if (stats.lastShiftType === 'night') {
        stats.consecutiveNightShifts++;
      } else {
        stats.consecutiveNightShifts = 1;
      }
      
      stats.lastShiftType = 'night';
      stats.lastShiftDate = formattedDate;
      stats.shifts[formattedDate] = 'night';
    });
    
    // Off 근무자
    offShift.forEach(nurse => {
      const stats = nurseStats[nurse.id];
      
      stats.consecutiveWorkDays = 0;
      stats.consecutiveNightShifts = 0;
      stats.offDaysCount++;
      stats.lastShiftType = 'off';
      stats.lastShiftDate = formattedDate;
      stats.shifts[formattedDate] = 'off';
    });
  }
  
  // 근무표 데이터 형식 변환
  for (const date in shiftsCalendar) {
    const shifts = shiftsCalendar[date];
    
    // Day 근무
    shifts.day.forEach(nurse => {
      generatedShifts.push({
        nurse_id: nurse.id,
        shift_date: date,
        shift_type: 'day',
        nurse_name: nurse.name
      });
    });
    
    // Evening 근무
    shifts.evening.forEach(nurse => {
      generatedShifts.push({
        nurse_id: nurse.id,
        shift_date: date,
        shift_type: 'evening',
        nurse_name: nurse.name
      });
    });
    
    // Night 근무
    shifts.night.forEach(nurse => {
      generatedShifts.push({
        nurse_id: nurse.id,
        shift_date: date,
        shift_type: 'night',
        nurse_name: nurse.name
      });
    });
    
    // Off 근무
    shifts.off.forEach(nurse => {
      generatedShifts.push({
        nurse_id: nurse.id,
        shift_date: date,
        shift_type: 'off',
        nurse_name: nurse.name
      });
    });
  }
  
  return generatedShifts;
}

// 규칙 검증 함수들
function validateSchedule(shifts: TestShift[], nurses: TestNurse[], rules: TestRules) {
  console.log('\n[TEST] Validating generated schedule against rules...');
  
  // 간호사별 근무 통계 계산
  const nurseStats: Record<number, {
    consecutiveWorkDays: number;
    consecutiveNightShifts: number;
    nightShiftsCount: number;
    offDaysCount: number;
    shiftsByDate: Record<string, string>;
  }> = {};
  
  // 초기화
  nurses.forEach(nurse => {
    nurseStats[nurse.id] = {
      consecutiveWorkDays: 0,
      consecutiveNightShifts: 0,
      nightShiftsCount: 0,
      offDaysCount: 0,
      shiftsByDate: {}
    };
  });
  
  // 날짜별 정렬
  shifts.sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  
  // 날짜별로 간호사 근무 기록
  const dateMap: Record<string, Record<string, TestNurse[]>> = {};
  
  shifts.forEach(shift => {
    if (!dateMap[shift.shift_date]) {
      dateMap[shift.shift_date] = {
        day: [],
        evening: [],
        night: [],
        off: []
      };
    }
    
    const nurse = nurses.find(n => n.id === shift.nurse_id);
    if (nurse) {
      dateMap[shift.shift_date][shift.shift_type].push(nurse);
    }
    
    // 간호사별 통계 업데이트
    if (!nurseStats[shift.nurse_id]) return;
    
    // 근무 유형 기록
    nurseStats[shift.nurse_id].shiftsByDate[shift.shift_date] = shift.shift_type;
    
    // 근무 타입별 카운트
    if (shift.shift_type === 'night') {
      nurseStats[shift.nurse_id].nightShiftsCount++;
    } else if (shift.shift_type === 'off') {
      nurseStats[shift.nurse_id].offDaysCount++;
    }
  });
  
  // 날짜 순으로 연속 근무일 계산
  const dates = Object.keys(dateMap).sort();
  
  nurses.forEach(nurse => {
    let consecutiveWork = 0;
    let consecutiveNight = 0;
    
    for (const date of dates) {
      const shiftType = nurseStats[nurse.id].shiftsByDate[date];
      
      if (shiftType === 'day' || shiftType === 'evening' || shiftType === 'night') {
        consecutiveWork++;
        
        if (shiftType === 'night') {
          consecutiveNight++;
        } else {
          consecutiveNight = 0;
        }
      } else {
        // 오프인 경우
        consecutiveWork = 0;
        consecutiveNight = 0;
      }
      
      // 최댓값 업데이트
      nurseStats[nurse.id].consecutiveWorkDays = Math.max(
        nurseStats[nurse.id].consecutiveWorkDays,
        consecutiveWork
      );
      
      nurseStats[nurse.id].consecutiveNightShifts = Math.max(
        nurseStats[nurse.id].consecutiveNightShifts,
        consecutiveNight
      );
    }
  });
  
  // 규칙 검증
  let violations = 0;
  
  // 1. 한 주에 연달아 5일 이상 근무하면 안됨
  nurses.forEach(nurse => {
    if (nurseStats[nurse.id].consecutiveWorkDays > rules.maxConsecutiveWorkDays) {
      console.error(`❌ Rule violation: Nurse ${nurse.name} has ${nurseStats[nurse.id].consecutiveWorkDays} consecutive work days, exceeding limit of ${rules.maxConsecutiveWorkDays}`);
      violations++;
    }
  });
  
  // 2. 나이트 근무는 연달아서 2일 또는 3일까지만 가능
  nurses.forEach(nurse => {
    if (nurseStats[nurse.id].consecutiveNightShifts > rules.maxConsecutiveNightShifts) {
      console.error(`❌ Rule violation: Nurse ${nurse.name} has ${nurseStats[nurse.id].consecutiveNightShifts} consecutive night shifts, exceeding limit of ${rules.maxConsecutiveNightShifts}`);
      violations++;
    }
  });
  
  // 3. 한달에 나이트 근무 개수는 최대 8개까지만 가능
  nurses.forEach(nurse => {
    if (nurseStats[nurse.id].nightShiftsCount > rules.maxNightShiftsPerMonth) {
      console.error(`❌ Rule violation: Nurse ${nurse.name} has ${nurseStats[nurse.id].nightShiftsCount} night shifts, exceeding limit of ${rules.maxNightShiftsPerMonth}`);
      violations++;
    }
  });
  
  // 4. 오프 수는 최대 9개를 초과할 수 없다
  nurses.forEach(nurse => {
    if (nurseStats[nurse.id].offDaysCount > rules.maxOffDaysPerMonth) {
      console.error(`❌ Rule violation: Nurse ${nurse.name} has ${nurseStats[nurse.id].offDaysCount} off days, exceeding limit of ${rules.maxOffDaysPerMonth}`);
      violations++;
    }
  });
  
  // 5. Day, Evening은 한 타임에 4명씩 근무하며 Night는 3명씩 근무
  dates.forEach(date => {
    if (dateMap[date].day.length !== rules.dayEveningNurseCount) {
      console.error(`❌ Rule violation: Date ${date} has ${dateMap[date].day.length} day nurses, but should have ${rules.dayEveningNurseCount}`);
      violations++;
    }
    
    if (dateMap[date].evening.length !== rules.dayEveningNurseCount) {
      console.error(`❌ Rule violation: Date ${date} has ${dateMap[date].evening.length} evening nurses, but should have ${rules.dayEveningNurseCount}`);
      violations++;
    }
    
    if (dateMap[date].night.length !== rules.nightNurseCount) {
      console.error(`❌ Rule violation: Date ${date} has ${dateMap[date].night.length} night nurses, but should have ${rules.nightNurseCount}`);
      violations++;
    }
  });
  
  // 6. 나이트에 5년차 이상 간호사 1명 필수
  dates.forEach(date => {
    const seniorNurseInNight = dateMap[date].night.some(nurse => nurse.years_experience >= 5);
    
    if (!seniorNurseInNight) {
      console.error(`❌ Rule violation: Date ${date} doesn't have a senior nurse (5+ years) in night shift`);
      violations++;
    }
  });
  
  // 7. 팀 제한 검증 (최대 2명까지만 같은 팀에서 나이트 근무)
  dates.forEach(date => {
    const teamCounts = new Map<number | null, number>();
    
    dateMap[date].night.forEach(nurse => {
      const teamId = nurse.team_id;
      teamCounts.set(teamId, (teamCounts.get(teamId) || 0) + 1);
    });
    
    for (const [teamId, count] of teamCounts.entries()) {
      if (count > 2) {
        console.error(`❌ Rule violation: Date ${date} has ${count} nurses from team ${teamId} in night shift, exceeding limit of 2`);
        violations++;
      }
    }
  });
  
  // 결과 출력
  if (violations === 0) {
    console.log('✅ All rules passed!');
  } else {
    console.log(`❌ Found ${violations} rule violations`);
  }
  
  return violations === 0;
}

// 희망 근무 반영률 계산
function calculatePreferenceMatchRate(shifts: TestShift[], preferences: TestPreference[]) {
  console.log('\n[TEST] Calculating preference match rate...');
  
  let totalPreferences = 0;
  let matchedPreferences = 0;
  
  preferences.forEach(pref => {
    totalPreferences++;
    
    const matchingShift = shifts.find(shift => 
      shift.nurse_id === pref.nurse_id && 
      shift.shift_date === pref.preference_date &&
      shift.shift_type === pref.preference_type
    );
    
    if (matchingShift) {
      matchedPreferences++;
    }
  });
  
  const matchRate = (matchedPreferences / totalPreferences) * 100;
  console.log(`Preference match rate: ${matchRate.toFixed(2)}% (${matchedPreferences}/${totalPreferences})`);
  
  return matchRate;
}

// 테스트 실행
function runTest() {
  console.log('='.repeat(50));
  console.log('Nurse Schedule Generator - Test Suite');
  console.log('='.repeat(50));
  
  // 테스트 데이터 생성
  const { nurses, preferences, rules } = generateTestData();
  
  // 스케줄 생성
  const generatedSchedule = generateSchedule(2023, 6, nurses, preferences, rules);
  
  // 생성된 스케줄 기본 정보 출력
  console.log(`Generated ${generatedSchedule.length} shift assignments for ${nurses.length} nurses`);
  
  // 규칙 준수 검증
  const isValid = validateSchedule(generatedSchedule, nurses, rules);
  
  // 희망 근무 반영률 계산
  const preferenceMatchRate = calculatePreferenceMatchRate(generatedSchedule, preferences);
  
  console.log('\n[TEST] Summary:');
  console.log(`- Rules compliance: ${isValid ? '✅ Passed' : '❌ Failed'}`);
  console.log(`- Preference match rate: ${preferenceMatchRate.toFixed(2)}%`);
  console.log('='.repeat(50));
  
  return isValid;
}

// 테스트 실행
runTest(); 