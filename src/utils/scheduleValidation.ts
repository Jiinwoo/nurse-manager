/**
 * 근무표 검증 유틸리티
 * 
 * 이 파일은 생성된 근무표가 규칙을 준수하는지 검증하는 함수들을 포함합니다.
 */

import { Nurse, Shift } from "src/types";


/**
 * 규칙을 나타내는 인터페이스
 */
export interface ScheduleRules {
  maxConsecutiveWorkDays: number;       // 연속 근무 최대 일수
  maxConsecutiveNightShifts: number;    // 연속 나이트 최대 일수
  minOffsAfterNights: number;           // 나이트 후 최소 오프 일수
  maxNightShiftsPerMonth: number;       // 월 최대 나이트 근무 수
  dayEveningNurseCount: number;         // 데이/이브닝 근무자 수
  nightNurseCount: number;              // 나이트 근무자 수
  requireSeniorNurseAtNight: boolean;   // 나이트에 시니어 간호사 필수
  maxOffDaysPerMonth: number;           // 월 최대 오프 일수
  teamDistribution: boolean;            // 팀 분배 규칙 적용
}

/**
 * 간호사별 근무 통계
 */
interface NurseStats {
  consecutiveWorkDays: number;
  consecutiveNightShifts: number;
  nightShiftsCount: number;
  offDaysCount: number;
  shiftsByDate: Record<string, string>;
}

/**
 * 날짜별 근무 기록
 */
interface DateShifts {
  day: Nurse[];
  evening: Nurse[];
  night: Nurse[];
  off: Nurse[];
}

/**
 * 근무표 검증 결과
 */
export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  stats: {
    totalNurses: number;
    totalDays: number;
    preferenceMatchRate: number;
    holidayOffMatchRate: number;
  };
}

/**
 * 규칙 위반 항목
 */
export interface ValidationViolation {
  rule: string;
  details: string;
  severity: 'error' | 'warning';
  nurse?: Nurse;
  date?: string;
}

/**
 * 근무표 검증
 * 
 * @param shifts 생성된 근무표
 * @param nurses 간호사 목록
 * @param rules 적용할 규칙
 * @param preferences 희망 근무 목록
 * @param holidays 휴일 목록
 * @returns 검증 결과
 */
export function validateSchedule(
  shifts: Shift[], 
  nurses: Nurse[], 
  rules: ScheduleRules,
  preferences: any[] = [],
  holidays: string[] = []
): ValidationResult {
  const violations: ValidationViolation[] = [];
  
  // 간호사별 근무 통계 계산
  const nurseStats: Record<number, NurseStats> = {};
  
  // 초기화
  nurses.forEach(nurse => {
    nurseStats[nurse.id!] = {
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
  const dateMap: Record<string, DateShifts> = {};
  
  // 고유한 날짜 추출
  const uniqueDates = [...new Set(shifts.map(s => s.shift_date))].sort();
  
  // 날짜별 맵 초기화
  uniqueDates.forEach(date => {
    dateMap[date] = {
      day: [],
      evening: [],
      night: [],
      off: []
    };
  });
  
  // 근무 기록 처리
  shifts.forEach(shift => {
    const nurseId = shift.nurse_id;
    
    // 간호사 찾기
    const nurse = nurses.find(n => n.id === nurseId);
    if (!nurse) return;
    
    // 날짜별 근무 기록
    if (!dateMap[shift.shift_date]) {
      dateMap[shift.shift_date] = {
        day: [],
        evening: [],
        night: [],
        off: []
      };
    }
    
    // 근무 유형별 기록
    dateMap[shift.shift_date][shift.shift_type as keyof DateShifts].push(nurse);
    
    // 간호사별 통계 업데이트
    if (!nurseStats[nurseId]) return;
    
    // 근무 유형 기록
    nurseStats[nurseId].shiftsByDate[shift.shift_date] = shift.shift_type;
    
    // 근무 타입별 카운트
    if (shift.shift_type === 'night') {
      nurseStats[nurseId].nightShiftsCount++;
    } else if (shift.shift_type === 'off') {
      nurseStats[nurseId].offDaysCount++;
    }
  });
  
  // 날짜 순으로 연속 근무일 계산
  const dates = Object.keys(dateMap).sort();
  
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
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
  
  // 1. 한 주에 연달아 5일 이상 근무하면 안됨
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
    if (nurseStats[nurse.id].consecutiveWorkDays > rules.maxConsecutiveWorkDays) {
      violations.push({
        rule: '연속 근무일 제한',
        details: `간호사 ${nurse.name}의 연속 근무일이 ${nurseStats[nurse.id].consecutiveWorkDays}일로, 제한(${rules.maxConsecutiveWorkDays}일)을 초과합니다.`,
        severity: 'error',
        nurse
      });
    }
  });
  
  // 2. 나이트 근무는 연달아서 2일 또는 3일까지만 가능
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
    if (nurseStats[nurse.id].consecutiveNightShifts > rules.maxConsecutiveNightShifts) {
      violations.push({
        rule: '연속 나이트 근무 제한',
        details: `간호사 ${nurse.name}의 연속 나이트 근무가 ${nurseStats[nurse.id].consecutiveNightShifts}일로, 제한(${rules.maxConsecutiveNightShifts}일)을 초과합니다.`,
        severity: 'error',
        nurse
      });
    }
  });
  
  // 3. 한달에 나이트 근무 개수는 최대 8개까지만 가능
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
    if (nurseStats[nurse.id].nightShiftsCount > rules.maxNightShiftsPerMonth) {
      violations.push({
        rule: '월 나이트 근무 수 제한',
        details: `간호사 ${nurse.name}의 나이트 근무가 ${nurseStats[nurse.id].nightShiftsCount}회로, 제한(${rules.maxNightShiftsPerMonth}회)을 초과합니다.`,
        severity: 'error',
        nurse
      });
    }
  });
  
  // 4. 오프 수는 최대 9개를 초과할 수 없다
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
    if (nurseStats[nurse.id].offDaysCount > rules.maxOffDaysPerMonth) {
      violations.push({
        rule: '월 오프 일수 제한',
        details: `간호사 ${nurse.name}의 오프 일수가 ${nurseStats[nurse.id].offDaysCount}일로, 제한(${rules.maxOffDaysPerMonth}일)을 초과합니다.`,
        severity: 'error',
        nurse
      });
    }
  });
  
  // 5. 오프 수는 해당 달의 휴일의 총 갯수보다 적을 수 없다
  nurses.forEach(nurse => {
    if (!nurse.id) return;
    
    if (nurseStats[nurse.id].offDaysCount < holidays.length) {
      violations.push({
        rule: '최소 오프 일수',
        details: `간호사 ${nurse.name}의 오프 일수가 ${nurseStats[nurse.id].offDaysCount}일로, 최소 필요 일수(${holidays.length}일)보다 적습니다.`,
        severity: 'warning',
        nurse
      });
    }
  });
  
  // 6. Day, Evening은 한 타임에 4명씩 근무하며 Night는 3명씩 근무
  dates.forEach(date => {
    if (dateMap[date].day.length !== rules.dayEveningNurseCount) {
      violations.push({
        rule: '근무자 수 제한',
        details: `${date}의 주간(Day) 근무자 수가 ${dateMap[date].day.length}명으로, 필요 인원(${rules.dayEveningNurseCount}명)과 일치하지 않습니다.`,
        severity: 'error',
        date
      });
    }
    
    if (dateMap[date].evening.length !== rules.dayEveningNurseCount) {
      violations.push({
        rule: '근무자 수 제한',
        details: `${date}의 저녁(Evening) 근무자 수가 ${dateMap[date].evening.length}명으로, 필요 인원(${rules.dayEveningNurseCount}명)과 일치하지 않습니다.`,
        severity: 'error',
        date
      });
    }
    
    if (dateMap[date].night.length !== rules.nightNurseCount) {
      violations.push({
        rule: '근무자 수 제한',
        details: `${date}의 야간(Night) 근무자 수가 ${dateMap[date].night.length}명으로, 필요 인원(${rules.nightNurseCount}명)과 일치하지 않습니다.`,
        severity: 'error',
        date
      });
    }
  });
  
  // 7. 근무 타임에 5년차 이상 간호사 한명 포함되어야 한다.
  if (rules.requireSeniorNurseAtNight) {
    dates.forEach(date => {
      const seniorNurseInNight = dateMap[date].night.some(nurse => nurse.years_experience >= 5);
      
      if (!seniorNurseInNight) {
        violations.push({
          rule: '시니어 간호사 필수',
          details: `${date}의 야간(Night) 근무에 5년차 이상 간호사가 포함되어 있지 않습니다.`,
          severity: 'error',
          date
        });
      }
    });
  }
  
  // 8. 팀 제한 검증 (나이트에서 같은 팀 최대 2명까지)
  if (rules.teamDistribution) {
    dates.forEach(date => {
      const teamCounts = new Map<number | null, number>();
      
      dateMap[date].night.forEach(nurse => {
        const teamId = nurse.team_id;
        teamCounts.set(teamId, (teamCounts.get(teamId) || 0) + 1);
      });
      
      for (const [teamId, count] of teamCounts.entries()) {
        if (count > 2) {
          violations.push({
            rule: '팀 분배 제한',
            details: `${date}의 야간(Night) 근무에 팀 ${teamId}에서 ${count}명이 배정되어, 최대 허용 인원(2명)을 초과합니다.`,
            severity: 'error',
            date
          });
        }
      }
    });
  }
  
  // 9. Day, Evening 근무에서 각 팀에서 한 명씩 차출 규칙
  if (rules.teamDistribution) {
    dates.forEach(date => {
      // Day 근무 팀 분배 검증
      const dayTeams = new Set(dateMap[date].day.map(nurse => nurse.team_id).filter(id => id !== null));
      
      // Evening 근무 팀 분배 검증
      const eveningTeams = new Set(dateMap[date].evening.map(nurse => nurse.team_id).filter(id => id !== null));
      
      // 타임별 미할당 간호사 수
      const unassignedInDay = dateMap[date].day.filter(nurse => nurse.team_id === null).length;
      const unassignedInEvening = dateMap[date].evening.filter(nurse => nurse.team_id === null).length;
      
      // Day 검증
      if (dayTeams.size + unassignedInDay < rules.dayEveningNurseCount) {
        violations.push({
          rule: '팀 분배 규칙',
          details: `${date}의 주간(Day) 근무에 ${dayTeams.size}개 팀에서만 간호사가 배정되었습니다. 각 팀에서 한 명씩 차출되어야 합니다.`,
          severity: 'warning',
          date
        });
      }
      
      // Evening 검증
      if (eveningTeams.size + unassignedInEvening < rules.dayEveningNurseCount) {
        violations.push({
          rule: '팀 분배 규칙',
          details: `${date}의 저녁(Evening) 근무에 ${eveningTeams.size}개 팀에서만 간호사가 배정되었습니다. 각 팀에서 한 명씩 차출되어야 합니다.`,
          severity: 'warning',
          date
        });
      }
    });
  }
  
  // 10. 희망 근무 반영률 계산
  let totalPreferences = 0;
  let matchedPreferences = 0;
  
  preferences.forEach((pref: any) => {
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
  
  // 11. 휴일에 오프 일치율 계산
  let holidayOffMatches = 0;
  
  holidays.forEach(holiday => {
    // 해당 날짜의 오프 간호사 수
    const offNursesCount = dateMap[holiday]?.off.length || 0;
    
    // 전체 간호사 중 비율 계산
    const offRate = offNursesCount / nurses.length;
    
    // 50% 이상이면 잘 반영된 것으로 간주
    if (offRate >= 0.5) {
      holidayOffMatches++;
    } else {
      violations.push({
        rule: '휴일 오프 반영',
        details: `휴일(${holiday})에 ${offNursesCount}명만 오프 배정되었습니다. 더 많은 간호사가 오프를 가질 수 있도록 해야합니다.`,
        severity: 'warning',
        date: holiday
      });
    }
  });
  
  // 결과 리턴
  return {
    isValid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    stats: {
      totalNurses: nurses.length,
      totalDays: dates.length,
      preferenceMatchRate: totalPreferences > 0 ? (matchedPreferences / totalPreferences) * 100 : 0,
      holidayOffMatchRate: holidays.length > 0 ? (holidayOffMatches / holidays.length) * 100 : 0
    }
  };
}

/**
 * 검증 결과 요약
 * 
 * @param result 검증 결과
 * @returns 요약 문자열
 */
export function summarizeValidation(result: ValidationResult): string {
  const { isValid, violations, stats } = result;
  
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  
  let summary = `검증 결과: ${isValid ? '유효함' : '오류 있음'}\n`;
  summary += `오류: ${errorCount}개, 경고: ${warningCount}개\n`;
  summary += `희망 근무 반영률: ${stats.preferenceMatchRate.toFixed(2)}%\n`;
  summary += `휴일 오프 일치율: ${stats.holidayOffMatchRate.toFixed(2)}%\n\n`;
  
  if (violations.length > 0) {
    summary += '주요 문제:\n';
    
    // 오류 먼저 표시
    violations
      .filter(v => v.severity === 'error')
      .slice(0, 5)
      .forEach(v => {
        summary += `- [오류] ${v.rule}: ${v.details}\n`;
      });
    
    // 그 다음 경고 표시
    violations
      .filter(v => v.severity === 'warning')
      .slice(0, 5)
      .forEach(v => {
        summary += `- [경고] ${v.rule}: ${v.details}\n`;
      });
    
    // 나머지는 생략
    if (violations.length > 10) {
      summary += `그 외 ${violations.length - 10}개 문제 발견\n`;
    }
  }
  
  return summary;
} 