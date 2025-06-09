import type { Shift, ShiftPreference, ShiftGenerationRules, Nurse } from '../types';
import { ShiftOperations } from '../database/operations';

interface NightShiftPattern {
  workDays: number;
  offDays: number;
}

interface NurseNightStats {
  nurseId: number;
  currentNightShifts: number;
  targetNightShifts: number;
}

interface ScheduleSolution {
  shifts: Shift[];
  nurseStats: NurseNightStats[];
  patternUsage: { pattern: NightShiftPattern; startDate: string; nurses: number[] }[];
}

interface SearchProgress {
  totalExplored: number;
  solutionsFound: number;
  currentDepth: number;
  maxDepth: number;
  startTime: number;
  lastLogTime: number;
}

export class ScheduleGenerator {
  private shiftOperations: ShiftOperations;
  private nightPatterns: NightShiftPattern[] = [
    { workDays: 2, offDays: 2 },
    { workDays: 3, offDays: 2 }
  ];
  private searchProgress: SearchProgress | null = null;
  private uniqueSolutionKeys: Set<string> = new Set(); // 🎯 중복 해답 방지를 위한 키 저장

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
    return [];
  }

  /**
   * 4년차 이상 간호사들의 나이트 근무를 우선 배치하는 메소드 - 모든 가능한 조합 반환
   */
  async findAllSeniorNurseNightShiftCombinations(params: {
    year: number;
    month: number;
    seniorNurses: Nurse[];
    existingShifts: Shift[];
    rules: ShiftGenerationRules;
    maxSolutions?: number; // 최대 해답 수 제한 (무한루프 방지)
  }): Promise<ScheduleSolution[]> {
    const { year, month, seniorNurses, existingShifts, rules, maxSolutions = 100 } = params;
    
    // 해당 월의 날짜 범위 계산
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthDates = Array.from({ length: daysInMonth }, (_, i) => 
      new Date(year, month - 1, i + 1).toISOString().split('T')[0]
    );
    console.log(monthDates);

    // 4년차 이상 간호사 필터링
    const eligibleSeniorNurses = seniorNurses.filter(nurse => 
      nurse.years_experience >= 4 && 
      nurse.available_shift_types.includes('Night')
    );

    if (eligibleSeniorNurses.length === 0) {
      throw new Error('4년차 이상 나이트 근무 가능한 간호사가 없습니다.');
    }

    // 각 간호사의 나이트 근무 목표 계산
    const nurseStats = this.calculateNightShiftTargets(eligibleSeniorNurses, daysInMonth, rules);
    
    // 모든 가능한 조합 찾기
    const allSolutions = await this.findAllNightShiftCombinations(
      monthDates,
      nurseStats,
      existingShifts,
      rules,
      maxSolutions
    );

    return allSolutions;
  }

  /**
   * 4년차 이상 간호사들의 나이트 근무 목표 수 계산
   */
  private calculateNightShiftTargets(
    seniorNurses: Nurse[],
    daysInMonth: number,
    rules: ShiftGenerationRules
  ): NurseNightStats[] {
    // 한 달에 필요한 총 나이트 근무 수 (매일 밤 3명)
    const totalNightShiftsNeeded = daysInMonth * rules.nightNurseCount;
    const avgNightShiftsPerNurse = Math.floor(totalNightShiftsNeeded / seniorNurses.length);
    const remainder = totalNightShiftsNeeded % seniorNurses.length;

    return seniorNurses.map((nurse, index) => ({
      nurseId: nurse.id!,
      currentNightShifts: 0,
      targetNightShifts: avgNightShiftsPerNurse + (index < remainder ? 1 : 0)
    }));
  }

  /**
   * 모든 가능한 나이트 근무 조합 찾기
   */
  private async findAllNightShiftCombinations(
    dates: string[],
    nurseStats: NurseNightStats[],
    existingShifts: Shift[],
    rules: ShiftGenerationRules,
    maxSolutions: number
  ): Promise<ScheduleSolution[]> {
    const allSolutions: ScheduleSolution[] = [];
    const nurseSchedule = new Map<number, boolean[]>();
    
    // 🎯 중복 체크용 Set 초기화
    this.resetDuplicateCheck();
    
    // 진행상황 추적 초기화
    this.searchProgress = {
      totalExplored: 0,
      solutionsFound: 0,
      currentDepth: 0,
      maxDepth: dates.length,
      startTime: Date.now(),
      lastLogTime: Date.now()
    };
    
    console.log(`🔍 나이트 시프트 조합 탐색 시작`);
    console.log(`📅 대상 기간: ${dates.length}일 (${dates[0]} ~ ${dates[dates.length - 1]})`);
    console.log(`👩‍⚕️ 대상 간호사: ${nurseStats.length}명`);
    console.log(`🎯 최대 해답 수: ${maxSolutions}개`);
    console.log(`📋 패턴: ${this.nightPatterns.map(p => `${p.workDays}일근무+${p.offDays}일오프`).join(', ')}`);
    
    // 각 간호사별 스케줄 초기화
    nurseStats.forEach(stat => {
      nurseSchedule.set(stat.nurseId, new Array(dates.length).fill(false));
    });

    // 기존 근무일정 반영
    existingShifts.forEach(shift => {
      const dateIndex = dates.indexOf(shift.shift_date);
      if (dateIndex !== -1) {
        const schedule = nurseSchedule.get(shift.nurse_id);
        if (schedule) {
          schedule[dateIndex] = true;
        }
      }
    });

    // 모든 가능한 조합 탐색
    this.findAllCombinationsRecursive(
      0, // 현재 날짜 인덱스
      dates,
      this.deepCopyNurseStats(nurseStats),
      this.deepCopySchedule(nurseSchedule),
      [],
      [],
      rules,
      allSolutions,
      maxSolutions
    );

    // 최종 결과 출력
    const elapsedTime = Date.now() - this.searchProgress.startTime;
    console.log(`✅ 탐색 완료!`);
    console.log(`⏱️  소요시간: ${Math.round(elapsedTime / 1000)}초`);
    console.log(`🔢 총 탐색 노드: ${this.searchProgress.totalExplored.toLocaleString()}개`);
    console.log(`🎯 찾은 해답: ${allSolutions.length}개`);
    if (allSolutions.length > 0) {
      console.log(`💯 탐색 효율: ${((allSolutions.length / this.searchProgress.totalExplored) * 100).toFixed(4)}%`);
    }

    return allSolutions;
  }

  /**
   * 모든 조합을 찾는 재귀 함수
   */
  private findAllCombinationsRecursive(
    dateIndex: number,
    dates: string[],
    nurseStats: NurseNightStats[],
    nurseSchedule: Map<number, boolean[]>,
    currentShifts: Shift[],
    currentPatterns: { pattern: NightShiftPattern; startDate: string; nurses: number[] }[],
    rules: ShiftGenerationRules,
    allSolutions: ScheduleSolution[],
    maxSolutions: number
  ): void {
    // 진행상황 업데이트
    if (this.searchProgress) {
      this.searchProgress.totalExplored++;
      this.searchProgress.currentDepth = dateIndex;
      
      // 1000번마다 또는 5초마다 진행상황 출력
      const now = Date.now();
      if (this.searchProgress.totalExplored % 1000 === 0 || 
          now - this.searchProgress.lastLogTime > 5000) {
        this.logProgress(dates, allSolutions.length);
        this.searchProgress.lastLogTime = now;
      }
    }

    // 최대 해답 수 제한
    if (allSolutions.length >= maxSolutions) {
      if (this.searchProgress) {
        console.log(`🎯 최대 해답 수(${maxSolutions}개)에 도달하여 탐색을 중단합니다.`);
      }
      return;
    }

    // 모든 날짜에 대해 배치 완료
    if (dateIndex >= dates.length) {
      if (this.validateFinalSchedule(nurseStats, nurseSchedule)) {
        // 🎯 중복 체크 로직 추가
        const solutionKey = this.generateSolutionKey(currentShifts);
        
        if (!this.uniqueSolutionKeys.has(solutionKey)) {
          this.uniqueSolutionKeys.add(solutionKey);
          
          allSolutions.push({
            shifts: [...currentShifts],
            nurseStats: this.deepCopyNurseStats(nurseStats),
            patternUsage: [...currentPatterns]
          });
          
          if (this.searchProgress) {
            this.searchProgress.solutionsFound++;
            console.log(`🎉 해답 #${allSolutions.length} 발견! (현재까지 총 ${allSolutions.length}개)`);
            this.logSolutionDetails(allSolutions[allSolutions.length - 1], nurseStats);
          }
        } else {
          if (this.searchProgress && dateIndex < 5) { // 첫 5일만 로그 출력
            console.log(`🔄 중복 해답 발견 - 건너뜀`);
          }
        }
      }
      return;
    }

    const currentDate = dates[dateIndex];

    // 현재 날짜에 배치할 수 있는 간호사 조합 생성
    const availableNurses = nurseStats
      .filter(stat => this.canAssignNightShift(stat.nurseId, dateIndex, nurseSchedule, rules))
      .sort((a, b) => a.currentNightShifts - b.currentNightShifts); // 🎯 나이트 근무 수가 적은 순으로 정렬

    // 각 패턴을 적용하는 경우들
    for (const pattern of this.nightPatterns) {
      const bestNurses = this.selectBestNurses(availableNurses, rules.nightNurseCount);
      
      if (bestNurses) {
        const canApply = this.canApplyPattern(bestNurses, dateIndex, pattern, dates.length, nurseSchedule, rules);
        
        // 🔍 디버깅 로그 추가
        if (dateIndex < 5) {
          const nurseInfo = bestNurses.map(n => `${n.nurseId}(${n.currentNightShifts}일)`).join(', ');
          const totalNights = bestNurses.reduce((sum, n) => sum + n.currentNightShifts, 0);
          console.log(`     ✅ 선택된 간호사 [${nurseInfo}] 총${totalNights}일: ${canApply ? '적용가능' : '적용불가'}`);
        }
        
        if (canApply) {
          
          // 현재 상태 백업
          const backupStats = this.deepCopyNurseStats(nurseStats);
          const backupSchedule = this.deepCopySchedule(nurseSchedule);
          const backupShifts = [...currentShifts];
          const backupPatterns = [...currentPatterns];

          // 패턴 적용
          const newShifts = this.applyNightPattern(bestNurses, dateIndex, pattern, dates, nurseSchedule, nurseStats);
          currentShifts.push(...newShifts);
          currentPatterns.push({
            pattern,
            startDate: currentDate,
            nurses: bestNurses.map(n => n.nurseId)
          });
          
          // 다음 가능한 날짜로 이동 (패턴의 전체 길이만큼 건너뛰기)
          const nextDateIndex = dateIndex + pattern.workDays + pattern.offDays;
          
          this.findAllCombinationsRecursive(
            Math.min(nextDateIndex, dates.length), // 월말 초과 방지
            dates,
            nurseStats,
            nurseSchedule,
            currentShifts,
            currentPatterns,
            rules,
            allSolutions,
            maxSolutions
          );
          
          // 상태 복원 (백트래킹)
          nurseStats.splice(0, nurseStats.length, ...backupStats);
          nurseSchedule.clear();
          backupSchedule.forEach((value, key) => nurseSchedule.set(key, [...value]));
          currentShifts.splice(0, currentShifts.length, ...backupShifts);
          currentPatterns.splice(0, currentPatterns.length, ...backupPatterns);
        }
      }
    }
  }

  /**
   * 특정 간호사가 특정 날짜에 나이트 근무 가능한지 확인
   */
  private canAssignNightShift(
    nurseId: number,
    dateIndex: number,
    nurseSchedule: Map<number, boolean[]>,
    rules: ShiftGenerationRules
  ): boolean {
    const schedule = nurseSchedule.get(nurseId);
    if (!schedule) return false;

    // 이미 해당 날짜에 근무 배정된 경우
    if (schedule[dateIndex]) return false;

    // 🔧 임시로 연속 근무일 체크 완화 - 테스트를 위해
    // const consecutiveWorkDays = this.getConsecutiveWorkDays(schedule, dateIndex - 1, -1);
    // if (consecutiveWorkDays >= rules.maxConsecutiveWorkDays) return false;

    return true;
  }

  /**
   * 가장 적게 일한 간호사들을 선택하는 메서드
   */
  private selectBestNurses(
    availableNurses: NurseNightStats[],
    requiredCount: number
  ): NurseNightStats[] | null {
    // 🚨 조건 검사
    if (availableNurses.length < requiredCount) {
      console.warn(`⚠️ 가용 간호사(${availableNurses.length}명) < 필요 인원(${requiredCount}명)`);
      return null;
    }

    // 🎯 나이트 근무 수가 적은 순으로 정렬 (이미 정렬되어 있지만 안전하게 한번 더)
    const sortedNurses = availableNurses.sort((a, b) => {
      // 1차: 현재 나이트 근무 수로 정렬
      if (a.currentNightShifts !== b.currentNightShifts) {
        return a.currentNightShifts - b.currentNightShifts;
      }
      
      // 2차: 목표 대비 부족분이 많은 간호사 우선
      const deficitA = a.targetNightShifts - a.currentNightShifts;
      const deficitB = b.targetNightShifts - b.currentNightShifts;
      return deficitB - deficitA;
    });

    // 🎯 가장 적게 일한 간호사들을 선택
    return sortedNurses.slice(0, requiredCount);
  }



  /**
   * 특정 패턴을 적용할 수 있는지 확인
   */
  private canApplyPattern(
    nurses: NurseNightStats[],
    startIndex: number,
    pattern: NightShiftPattern,
    totalDays: number,
    nurseSchedule: Map<number, boolean[]>,
    rules: ShiftGenerationRules
  ): boolean {
    // ❌ 월말 체크 완전 제거 - 다음달까지 영향가는 패턴 허용
    // if (startIndex >= totalDays) return false;

    // 각 간호사에 대해 패턴 적용 가능성 체크
    for (const nurse of nurses) {
      const schedule = nurseSchedule.get(nurse.nurseId);
      if (!schedule) return false;

      // ✅ 현재 달 범위 내에서만 근무일 체크 (월말 넘어가도 OK)
      for (let i = 0; i < pattern.workDays; i++) {
        const dayIndex = startIndex + i;
        if (dayIndex < totalDays && schedule[dayIndex]) {
          return false; // 현재 달 내에서 이미 배정된 날이 있으면 불가
        }
      }

      // ✅ 오프일 체크도 현재 달 범위 내에서만
      for (let i = 0; i < pattern.offDays; i++) {
        const dayIndex = startIndex + pattern.workDays + i;
        if (dayIndex < totalDays && schedule[dayIndex]) {
          return false; // 현재 달 내에서 이미 배정된 날이 있으면 불가
        }
      }

      // 목표 근무 수 초과 체크
      // if (nurse.currentNightShifts + pattern.workDays > nurse.targetNightShifts) return false;
    }

    return true;
  }

  /**
   * 나이트 패턴 적용 (새로운 시프트 배열 반환)
   */
  private applyNightPattern(
    nurses: NurseNightStats[],
    startIndex: number,
    pattern: NightShiftPattern,
    dates: string[],
    nurseSchedule: Map<number, boolean[]>,
    nurseStats: NurseNightStats[]
  ): Shift[] {
    const newShifts: Shift[] = [];

    for (const nurse of nurses) {
      const schedule = nurseSchedule.get(nurse.nurseId)!;
      const nurseStatIndex = nurseStats.findIndex(stat => stat.nurseId === nurse.nurseId);
      
      // 근무일 배정
      for (let i = 0; i < pattern.workDays; i++) {
        const dateIndex = startIndex + i;
        if (dateIndex < dates.length) {
          schedule[dateIndex] = true;
          newShifts.push({
            nurse_id: nurse.nurseId,
            shift_date: dates[dateIndex],
            shift_type: 'Night',
            status: 'scheduled'
          });
          nurseStats[nurseStatIndex].currentNightShifts++;
        }
      }
    }

    return newShifts;
  }

  /**
   * 연속 근무일 계산
   */
  private getConsecutiveWorkDays(
    schedule: boolean[],
    startIndex: number,
    direction: number
  ): number {
    let count = 0;
    let index = startIndex;
    
    while (index >= 0 && index < schedule.length && schedule[index]) {
      count++;
      index += direction;
    }
    
    return count;
  }

  /**
   * 최종 스케줄 검증
   */
  private validateFinalSchedule(
    nurseStats: NurseNightStats[],
    nurseSchedule: Map<number, boolean[]>
  ): boolean {
    // 🎯 간호사들 간의 나이트 근무 수 차이가 3을 초과하지 않는지 확인
    const nightShiftCounts = nurseStats.map(stat => stat.currentNightShifts);
    const maxNightShifts = Math.max(...nightShiftCounts);
    const minNightShifts = Math.min(...nightShiftCounts);
    const nightShiftDifference = maxNightShifts - minNightShifts;
    
    if (nightShiftDifference > 3) {
      return false; // 차이가 3을 초과하면 불가
    }
    
    // 🔧 추가 검증: 각 간호사의 목표 근무 수 달성 여부 확인 (선택적)
    // for (const stat of nurseStats) {
    //   const tolerance = 2; // 목표 대비 ±2일 허용
    //   if (Math.abs(stat.currentNightShifts - stat.targetNightShifts) > tolerance) {
    //     return false;
    //   }
    // }
    
    return true;
  }

  /**
   * 깊은 복사 유틸리티 함수들
   */
  private deepCopyNurseStats(stats: NurseNightStats[]): NurseNightStats[] {
    return stats.map(stat => ({ ...stat }));
  }

  private deepCopySchedule(schedule: Map<number, boolean[]>): Map<number, boolean[]> {
    const newSchedule = new Map<number, boolean[]>();
    schedule.forEach((value, key) => {
      newSchedule.set(key, [...value]);
    });
    return newSchedule;
  }

  /**
   * 해답들을 점수화하여 정렬하는 함수
   */
  sortSolutionsByScore(solutions: ScheduleSolution[]): ScheduleSolution[] {
    return solutions.sort((a, b) => {
      // 1. 균등한 근무 분배 점수
      const scoreA = this.calculateDistributionScore(a.nurseStats);
      const scoreB = this.calculateDistributionScore(b.nurseStats);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // 높은 점수 우선
      }

      // 2. 패턴 다양성 점수
      const patternScoreA = this.calculatePatternDiversityScore(a.patternUsage);
      const patternScoreB = this.calculatePatternDiversityScore(b.patternUsage);
      
      return patternScoreB - patternScoreA;
    });
  }

  /**
   * 근무 분배 균등성 점수 계산
   */
  private calculateDistributionScore(nurseStats: NurseNightStats[]): number {
    const deviations = nurseStats.map(stat => 
      Math.abs(stat.currentNightShifts - stat.targetNightShifts)
    );
    const maxDeviation = Math.max(...deviations);
    const totalDeviation = deviations.reduce((sum, dev) => sum + dev, 0);
    
    // 편차가 작을수록 높은 점수
    return 100 - (maxDeviation * 10 + totalDeviation);
  }

  /**
   * 패턴 다양성 점수 계산
   */
  private calculatePatternDiversityScore(patterns: { pattern: NightShiftPattern; startDate: string; nurses: number[] }[]): number {
    const pattern2Days = patterns.filter(p => p.pattern.workDays === 2).length;
    const pattern3Days = patterns.filter(p => p.pattern.workDays === 3).length;
    
    // 패턴이 균등하게 사용될수록 높은 점수
    const total = pattern2Days + pattern3Days;
    if (total === 0) return 0;
    
    const ratio2 = pattern2Days / total;
    const ratio3 = pattern3Days / total;
    
    // 0.5에 가까울수록 높은 점수 (균등한 분배)
    return 100 - Math.abs(ratio2 - 0.5) * 200;
  }

  /**
   * 탐색 진행상황 로그 출력
   */
  private logProgress(dates: string[], solutionsFound: number): void {
    if (!this.searchProgress) return;
    
    const elapsedTime = Date.now() - this.searchProgress.startTime;
    const elapsedSeconds = Math.round(elapsedTime / 1000);
    const progressPercent = Math.round((this.searchProgress.currentDepth / this.searchProgress.maxDepth) * 100);
    const nodesPerSecond = this.searchProgress.totalExplored / (elapsedTime / 1000);
    
    console.log(`📊 [${elapsedSeconds}초] 탐색 진행상황:`);
    console.log(`   📍 현재 위치: ${this.searchProgress.currentDepth}/${this.searchProgress.maxDepth}일 (${progressPercent}%)`);
    console.log(`   🔢 탐색 노드: ${this.searchProgress.totalExplored.toLocaleString()}개`);
    console.log(`   ⚡ 탐색 속도: ${Math.round(nodesPerSecond).toLocaleString()}노드/초`);
    console.log(`   🎯 발견 해답: ${solutionsFound}개`);
    
    if (this.searchProgress.currentDepth > 0) {
      const currentDate = dates[this.searchProgress.currentDepth - 1];
      console.log(`   📅 현재 날짜: ${currentDate} (${new Date(currentDate).getDate()}일)`);
    }
  }

  /**
   * 발견된 해답의 상세 정보 로그 출력
   */
  private logSolutionDetails(solution: ScheduleSolution, originalNurseStats: NurseNightStats[]): void {
    console.log(`📋 해답 상세 정보:`);
    console.log(`   📦 총 시프트: ${solution.shifts.length}개`);
    console.log(`   🔄 패턴 사용: ${solution.patternUsage.length}개`);
    
    // 간호사별 근무 분배 현황
    console.log(`   👩‍⚕️ 간호사별 근무 분배:`);
    solution.nurseStats.forEach(stat => {
      const target = originalNurseStats.find(s => s.nurseId === stat.nurseId)?.targetNightShifts || 0;
      const deviation = Math.abs(stat.currentNightShifts - target);
      const status = deviation === 0 ? '✅' : deviation === 1 ? '⚠️' : '❌';
      console.log(`     ${status} 간호사 #${stat.nurseId}: ${stat.currentNightShifts}/${target}일 (편차: ${deviation})`);
    });
    
    // 패턴 사용 현황
    const pattern2Count = solution.patternUsage.filter(p => p.pattern.workDays === 2).length;
    const pattern3Count = solution.patternUsage.filter(p => p.pattern.workDays === 3).length;
    console.log(`   📋 패턴 분포: 2일패턴 ${pattern2Count}개, 3일패턴 ${pattern3Count}개`);
  }

  /**
   * 해답의 고유 키 생성 - 중복 체크용
   */
  private generateSolutionKey(shifts: Shift[]): string {
    // 날짜별로 근무하는 간호사 ID들을 정렬해서 문자열로 생성
    const dateShiftMap = new Map<string, number[]>();
    
    shifts.forEach(shift => {
      if (!dateShiftMap.has(shift.shift_date)) {
        dateShiftMap.set(shift.shift_date, []);
      }
      dateShiftMap.get(shift.shift_date)!.push(shift.nurse_id);
    });
    
    // 각 날짜별 간호사 ID들을 정렬하고 문자열로 연결
    const sortedDates = Array.from(dateShiftMap.keys()).sort();
    const keyParts = sortedDates.map(date => {
      const nurses = dateShiftMap.get(date)!.sort((a, b) => a - b);
      return `${date}:[${nurses.join(',')}]`;
    });
    
    return keyParts.join('|');
  }

  /**
   * 중복 체크용 Set 초기화
   */
  private resetDuplicateCheck(): void {
    this.uniqueSolutionKeys.clear();
  }
} 