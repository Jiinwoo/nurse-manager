import React, { useState, useEffect } from 'react';

import { validateSchedule, summarizeValidation } from '../utils/scheduleValidation';
import { Nurse, Shift, Team, ShiftPreference, ShiftGenerationRules } from '../types';

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<any[]>([]);
  const [targetMonth, setTargetMonth] = useState<string>('');
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [previousMonthShifts, setPreviousMonthShifts] = useState<Shift[]>([]);
  const [showPreviousMonthInput, setShowPreviousMonthInput] = useState(false);
  const [manualPreviousShifts, setManualPreviousShifts] = useState<{
    nurse_id: number;
    shift_date: string;
    shift_type: string;
  }[]>([]);
  const [noPreviousShiftsData, setNoPreviousShiftsData] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // targetMonth가 변경될 때마다 이전 달 데이터 로드
  useEffect(() => {
    if (targetMonth) {
      loadPreviousMonthShifts();
    }
  }, [targetMonth]);

  // Load all shifts, nurses, and preferences
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shiftResponse, nurseResponse, preferenceResponse] = await Promise.all([
        window.api.shifts.getAll(),
        window.api.nurses.getAll(),
        window.api.shiftPreferences.getAll()
      ]);

      if (shiftResponse.success) {
        setShifts(shiftResponse.data || []);
      } else {
        setError(shiftResponse.error || '근무 데이터를 가져오는 중 오류가 발생했습니다.');
      }

      if (nurseResponse.success) {
        setNurses(nurseResponse.data || []);
      } else {
        console.error('간호사 데이터를 가져오는 중 오류:', nurseResponse.error);
      }

      if (preferenceResponse.success) {
        setPreferences(preferenceResponse.data || []);
      } else {
        console.error('희망 근무 데이터를 가져오는 중 오류:', preferenceResponse.error);
      }
    } catch (err) {
      setError('데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 달 마지막 5일 근무 데이터 자동 로드
  const loadPreviousMonthShifts = async () => {
    if (!targetMonth) return;
    
    setNoPreviousShiftsData(false);
    const [year, month] = targetMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const startDay = lastDayOfPrevMonth - 4; // 마지막 5일

    try {
      const response = await window.api.shifts.getByDateRange(
        {
          startDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
          endDate: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDayOfPrevMonth).padStart(2, '0')}`
        }
      );

      if (response.success) {
        if (response.data && response.data.length > 0) {
          setPreviousMonthShifts(response.data || []);
          setNoPreviousShiftsData(false);
        } else {
          setPreviousMonthShifts([]);
          setNoPreviousShiftsData(true);
        }
      }
    } catch (err) {
      console.error('이전 달 근무 데이터 로드 중 오류:', err);
      setNoPreviousShiftsData(true);
    }
  };

  // 이전 달 근무 수동 입력 처리
  const handleManualShiftChange = (nurseId: number, date: string, shiftType: string) => {
    setManualPreviousShifts(prev => {
      const newShifts = [...prev];
      const existingIndex = newShifts.findIndex(s => s.nurse_id === nurseId && s.shift_date === date);

      if (existingIndex >= 0) {
        newShifts[existingIndex].shift_type = shiftType;
      } else {
        newShifts.push({
          nurse_id: nurseId,
          shift_date: date,
          shift_type: shiftType
        });
      }

      return newShifts;
    });
  };

  // 근무표 생성 함수 수정
  const generateSchedule = async () => {
    if (!targetMonth) {
      setError('대상 월을 선택해주세요.');
      return;
    }

    setGeneratingSchedule(true);
    setError(null);
    setValidationSummary(null);

    try {
      const [year, month] = targetMonth.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const daysInMonth = lastDay.getDate();

      // API 호출하여 스케줄 생성
      const response = await window.api.shifts.generateMonthlySchedule({
        year,
        month: month - 1,
        nurses: nurses.map(nurse => nurse.id),
        preferences: preferences.filter(p => {
          const prefDate = new Date(p.preference_date);
          return prefDate.getMonth() === month - 1 && prefDate.getFullYear() === year;
        }),

        rules: {
          maxConsecutiveWorkDays: 4,
          maxConsecutiveNightShifts: 3,
          minOffsAfterNights: 2,
          maxNightShiftsPerMonth: 8,
          dayEveningNurseCount: 4,
          nightNurseCount: 3,
          requireSeniorNurseAtNight: true,
          maxOffDaysPerMonth: 9,
          teamDistribution: true
        }
      });

      if (response.success) {
        const generatedShifts = response.data || [];
        setGeneratedSchedule(generatedShifts);

        // 공휴일 목록 (임시로 주말만 계산)
        // 생성된 근무표에 있는 날짜만 포함
        const uniqueDates = [...new Set(generatedShifts.map(s => s.shift_date))].sort();
        const holidays = [];
        
        for (const date of uniqueDates) {
          const currentDate = new Date(date);
          // 주말(토,일)만 휴일로 처리
          if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            holidays.push(date);
          }
        }
        console.log(generatedShifts);

        // 근무표 검증 TODO: 검증 로직 추가
        // const validation = validateSchedule(
        //   generatedShifts,
        //   nurses,
        //   {
        //     maxConsecutiveWorkDays: 4,
        //     maxConsecutiveNightShifts: 3,
        //     minOffsAfterNights: 2,
        //     maxNightShiftsPerMonth: 8,
        //     dayEveningNurseCount: 4,
        //     nightNurseCount: 3,
        //     requireSeniorNurseAtNight: true,
        //     maxOffDaysPerMonth: 9,
        //     teamDistribution: true
        //   },
        //   preferences,
        //   holidays
        // );

        // // 검증 결과 요약
        // setValidationSummary(summarizeValidation(validation));
      } else {
        setError(response.error || '근무표 생성 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('근무표 생성 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // 생성된 듀티 표 저장
  const saveGeneratedSchedule = async () => {
    if (generatedSchedule.length === 0) {
      setError('저장할 근무표가 없습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await window.api.shifts.saveGeneratedSchedule(generatedSchedule);

      if (response.success) {
        // 저장 후 데이터 다시 로드
        await loadData();
        setGeneratedSchedule([]);
        alert('근무표가 성공적으로 저장되었습니다.');
      } else {
        setError(response.error || '근무표 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('근무표 저장 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜별 근무표 데이터 포맷팅
  const formatScheduleData = () => {
    if (generatedSchedule.length === 0) return [];

    // 날짜별로 그룹화
    const scheduleByDate: Record<string, any[]> = {};

    generatedSchedule.forEach(shift => {
      if (!scheduleByDate[shift.shift_date]) {
        scheduleByDate[shift.shift_date] = [];
      }
      scheduleByDate[shift.shift_date].push(shift);
    });

    // 날짜순으로 정렬
    return Object.keys(scheduleByDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        shifts: scheduleByDate[date]
      }));
  };

  // Helper function to group shifts by date
  const getShiftsByDate = () => {
    const shiftsByDate: Record<string, Shift[]> = {};

    shifts.forEach(shift => {
      if (!shiftsByDate[shift.shift_date]) {
        shiftsByDate[shift.shift_date] = [];
      }
      shiftsByDate[shift.shift_date].push(shift);
    });

    // Sort dates in descending order (newest first)
    return Object.keys(shiftsByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        shifts: shiftsByDate[date]
      }));
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 날짜 선택 변경 처리
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // 월 선택 변경 처리
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetMonth(e.target.value);
    // 이제 targetMonth가 변경되면 useEffect에서 자동으로 loadPreviousMonthShifts 실행됨
  };

  // 희망 근무 가져오기
  const getPreferencesByDate = (date: string) => {
    return preferences.filter(pref => pref.preference_date === date);
  };

  // 특정 간호사의 희망 근무 가져오기
  const getNursePreference = (nurseId: number, date: string) => {
    const pref = preferences.find(p => p.nurse_id === nurseId && p.preference_date === date);
    return pref ? pref.preference_type : null;
  };

  // 희망 근무 표시 토글
  const togglePreferencesView = () => {
    setShowPreferences(!showPreferences);
  };

  // 희망 근무 유형에 따른 배지 클래스
  const getPreferenceBadgeClass = (type: string) => {
    switch (type) {
      case 'day': return 'bg-warning';
      case 'evening': return 'bg-primary';
      case 'night': return 'bg-dark';
      case 'off': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // 희망 근무 유형 표시
  const displayPreferenceType = (type: string) => {
    switch (type) {
      case 'day': return 'D';
      case 'evening': return 'E';
      case 'night': return 'N';
      case 'off': return 'Off';
      default: return '?';
    }
  };

  // CSV 파일 처리
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const lines = csvContent.split('\n');
        
        const newShifts: {
          nurse_id: number;
          shift_date: string;
          shift_type: string;
        }[] = [];
        
        // 첫 번째 줄은 헤더로 간주
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const [nurseIdStr, date, shiftType] = line.split(',').map(val => val.trim());
          const nurseId = parseInt(nurseIdStr, 10);
          
          if (isNaN(nurseId) || !date || !shiftType) {
            throw new Error(`잘못된 CSV 형식: ${line}`);
          }
          
          if (!['day', 'evening', 'night', 'off'].includes(shiftType.toLowerCase())) {
            throw new Error(`잘못된 근무 유형: ${shiftType}. 'day', 'evening', 'night', 'off' 중 하나여야 합니다.`);
          }
          
          newShifts.push({
            nurse_id: nurseId,
            shift_date: date,
            shift_type: shiftType.toLowerCase()
          });
        }
        
        setManualPreviousShifts(newShifts);
      } catch (err) {
        console.error('CSV 파일 처리 중 오류:', err);
        setCsvError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 className="page-title">근무 일정</h2>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="mb-4">
        <p className="text-muted">
          이 페이지에서는 간호사들의 근무 일정을 확인할 수 있습니다.
          근무 일정을 추가하고 관리하는 기능은 곧 제공될 예정입니다.
        </p>
        <div className="alert alert-info">
          <strong>팀 시스템이 추가되었습니다!</strong> 이제 간호사를 팀으로 그룹화하여 같은 근무 일정을 배정할 수 있습니다.
          <br />
          팀 관리 페이지에서 팀을 생성하고 간호사를 팀에 배정해보세요.
        </div>
        <div className="alert alert-success">
          <strong>희망 근무 신청 기능이 추가되었습니다!</strong> 간호사들이 희망하는 근무 유형을 신청할 수 있으며, 근무표 작성 시 참고할 수 있습니다.
          <br />
          <a href="/shift-preference" className="alert-link">희망 근무 신청 페이지</a>에서 확인해보세요.
        </div>
      </div>

      {/* 다음달 듀티 표 생성 섹션 */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">다음달 듀티 표 생성</h5>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="target-month" className="form-label">대상 월 선택</label>
              <input
                type="month"
                id="target-month"
                className="form-control"
                value={targetMonth}
                onChange={handleMonthChange}
              />
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-primary"
                onClick={generateSchedule}
                disabled={!targetMonth || generatingSchedule}
              >
                {generatingSchedule ? '생성 중...' : '근무표 생성'}
              </button>
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowPreviousMonthInput(!showPreviousMonthInput)}
              >
                {showPreviousMonthInput ? '이전 달 수동 입력 숨기기' : '이전 달 수동 입력 보기'}
              </button>
            </div>
          </div>

          {/* 이전 달 자동 로드 결과 표시 */}
          {targetMonth && noPreviousShiftsData && !showPreviousMonthInput && (
            <div className="alert alert-warning mt-3">
              <strong>알림:</strong> 이전 달 마지막 5일의 근무 데이터가 없습니다. 수동으로 입력하세요.
            </div>
          )}

          {/* 이전 달 마지막 5일 근무 입력 */}
          {showPreviousMonthInput && (
            <div className="mt-4">
              <h6>이전 달 마지막 5일 근무 입력</h6>
              
              {/* CSV 업로드 섹션 */}
              <div className="mb-3">
                <label htmlFor="csv-upload" className="form-label">CSV 파일로 일괄 입력</label>
                <div className="input-group">
                  <input
                    type="file"
                    id="csv-upload"
                    className="form-control"
                    accept=".csv"
                    onChange={handleCsvUpload}
                  />
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => document.getElementById('csv-download-template')?.click()}
                  >
                    템플릿 다운로드
                  </button>
                  <a
                    id="csv-download-template"
                    href={`data:text/csv;charset=utf-8,nurse_id,date,shift_type\n${nurses.map(n => `${n.id},YYYY-MM-DD,type`).join('\n')}`}
                    download="nurses_shift_template.csv"
                    style={{ display: 'none' }}
                  >
                    다운로드
                  </a>
                </div>
                <small className="form-text text-muted">
                  CSV 형식: nurse_id,date,shift_type (예: 1,2023-04-26,day)
                  <br />
                  shift_type은 day, evening, night, off 중 하나여야 합니다.
                </small>
                {csvError && (
                  <div className="alert alert-danger mt-2">
                    <strong>CSV 오류:</strong> {csvError}
                  </div>
                )}
              </div>
              
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>간호사</th>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const [year, month] = targetMonth.split('-').map(Number);
                        const prevMonth = month === 1 ? 12 : month - 1;
                        const prevYear = month === 1 ? year - 1 : year;
                        const lastDay = new Date(prevYear, prevMonth, 0).getDate();
                        const date = new Date(prevYear, prevMonth - 1, lastDay - 4 + i);
                        return (
                          <th key={i} className="text-center" style={{ minWidth: '50px', whiteSpace: 'nowrap' }}>
                            {date.getDate()}일
                            <br />
                            <small>
                              {['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}
                            </small>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {nurses.map(nurse => (
                      <tr key={nurse.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{nurse.name}</td>
                        {Array.from({ length: 5 }).map((_, i) => {
                          const [year, month] = targetMonth.split('-').map(Number);
                          const prevMonth = month === 1 ? 12 : month - 1;
                          const prevYear = month === 1 ? year - 1 : year;
                          const lastDay = new Date(prevYear, prevMonth, 0).getDate();
                          const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay - 4 + i).padStart(2, '0')}`;
                          const shift = manualPreviousShifts.find(s => s.nurse_id === nurse.id && s.shift_date === date);

                          return (
                            <td key={i} className="text-center" style={{ minWidth: '50px', whiteSpace: 'nowrap' }}>
                              <select
                                className="form-select form-select-sm"
                                value={shift?.shift_type || ''}
                                onChange={(e) => handleManualShiftChange(nurse.id!, date, e.target.value)}
                              >
                                <option value="">-</option>
                                <option value="day">D</option>
                                <option value="evening">E</option>
                                <option value="night">N</option>
                                <option value="off">Off</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="alert alert-warning">
              <strong>근무표 생성 규칙:</strong>
              <ul className="mb-0 mt-2">
                <li>한 주에 연달아 5일 이상 근무하면 안됨</li>
                <li>나이트 근무는 연달아서 2일 또는 3일까지만 가능하며 이후에는 2개 이상의 오프를 줘야함</li>
                <li>한달에 나이트 근무 개수는 최대 8개까지만 가능하며 균등하게 처리</li>
                <li>오프 수는 해당 달의 휴일의 총 갯수보다 적을 수 없음</li>
                <li>해당 달의 오프 수 - 해당 달의 휴일 갯수는 연차에서 차감됨</li>
                <li>오프 수는 최대 9개를 초과할 수 없음</li>
                <li>Day, Evening은 한 타임에 4명씩 근무하며 Night는 3명씩 근무</li>
                <li>모든 근무 타임에는 4년차 이상 간호사 한명이상 무조건 포함되어야 함</li>
                <li>근무 인원을 뽑을 때는 최대한 모든 팀에서 고르게 뽑음</li>
                <li>3명씩 근무할 때는 같은 팀에서 최대 2명까지만 같이 근무 가능</li>
                <li>희망 근로를 최대한 반영</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 검증 결과 표시 */}
      {validationSummary && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">근무표 검증 결과</h5>
          </div>
          <div className="card-body">
            <pre className="validation-summary">{validationSummary}</pre>
          </div>
        </div>
      )}

      {/* 생성된 듀티 표 미리보기 섹션 */}
      {generatedSchedule.length > 0 && (
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">생성된 근무표 미리보기</h5>
            <button
              className="btn btn-success"
              onClick={saveGeneratedSchedule}
              disabled={isLoading}
            >
              근무표 저장
            </button>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th className="bg-light" style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>간호사 정보</th>
                    {formatScheduleData().map(({ date }) => (
                      <th key={date} className="text-center" style={{ minWidth: '50px', whiteSpace: 'nowrap' }}>
                        {new Date(date).getDate()}일
                        <br />
                        <small>
                          {['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()]}
                        </small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nurses.map(nurse => (
                    <tr key={nurse.id}>
                      <td className="bg-light" style={{ whiteSpace: 'nowrap' }}>
                        <strong>{nurse.name}</strong>
                        <br />
                        <small>팀: {nurse.team_name || '없음'}</small>
                        <br />
                        <small>{nurse.years_experience}년차</small>
                      </td>
                      {formatScheduleData().map(({ date, shifts }) => {
                        const nurseShift = shifts.find(s => s.nurse_id === nurse.id);
                        const preference = getNursePreference(nurse.id!, date);
                        const shiftTypeClass = nurseShift ?
                          nurseShift.shift_type === 'day' ? 'bg-warning text-dark' :
                            nurseShift.shift_type === 'evening' ? 'bg-primary text-white' :
                              nurseShift.shift_type === 'night' ? 'bg-dark text-white' :
                                nurseShift.shift_type === 'off' ? 'bg-success text-white' : ''
                          : '';

                        const preferenceMatch = preference && nurseShift && preference === nurseShift.shift_type;

                        return (
                          <td key={date} className={`text-center ${shiftTypeClass}`} style={{ minWidth: '50px', whiteSpace: 'nowrap' }}>
                            {nurseShift ? displayPreferenceType(nurseShift.shift_type) : '-'}
                            {preferenceMatch && <small className="d-block">✓</small>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <div className="d-flex gap-3">
                <div><span className="badge bg-warning text-dark">D</span> - 주간 근무 (Day)</div>
                <div><span className="badge bg-primary">E</span> - 저녁 근무 (Evening)</div>
                <div><span className="badge bg-dark">N</span> - 야간 근무 (Night)</div>
                <div><span className="badge bg-success">Off</span> - 휴무</div>
                <div><small>✓</small> - 희망 근무와 일치</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">희망 근무 확인</h5>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="preference-date" className="form-label">날짜 선택</label>
              <input
                type="date"
                id="preference-date"
                className="form-control"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            <div className="col-md-4">
              <button
                className="btn btn-outline-primary"
                onClick={togglePreferencesView}
              >
                {showPreferences ? '희망 근무 숨기기' : '희망 근무 표시'}
              </button>
            </div>
          </div>

          {selectedDate && showPreferences && (
            <div className="mt-4">
              <h6>{formatDate(selectedDate)} 희망 근무</h6>
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>간호사</th>
                      <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>희망 근무</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nurses.map(nurse => {
                      const preference = getNursePreference(nurse.id!, selectedDate);
                      return (
                        <tr key={nurse.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{nurse.name}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {preference ? (
                              <span className={`badge ${getPreferenceBadgeClass(preference)}`}>
                                {displayPreferenceType(preference)}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : getShiftsByDate().length > 0 ? (
        <div>
          {getShiftsByDate().map(({ date, shifts }) => (
            <div key={date} className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{formatDate(date)}</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>간호사</th>
                        <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>근무 유형</th>
                        {showPreferences && <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>희망 근무</th>}
                        <th style={{ minWidth: '80px', whiteSpace: 'nowrap' }}>상태</th>
                        <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map(shift => {
                        const preference = getNursePreference(shift.nurse_id, date);
                        return (
                          <tr key={shift.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{shift.nurse_name}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{shift.shift_type}</td>
                            {showPreferences && (
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {preference ? (
                                  <span className={`badge ${getPreferenceBadgeClass(preference)}`}>
                                    {displayPreferenceType(preference)}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            )}
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span className={`badge bg-${shift.status === 'completed' ? 'success' :
                                  shift.status === 'cancelled' ? 'danger' :
                                    'primary'
                                }`}>
                                {shift.status === 'completed' ? '완료' :
                                  shift.status === 'cancelled' ? '취소됨' :
                                    '예정됨'
                                }
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>{shift.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <p>등록된 근무 일정이 없습니다.</p>
          </div>
        </div>
      )}

      <div className="card mt-4">
        <div className="card-header">
          <h5 className="mb-0">희망 근무 범례</h5>
        </div>
        <div className="card-body">
          <div className="d-flex gap-3">
            <div><span className="badge bg-warning">D</span> - 주간 근무 (Day)</div>
            <div><span className="badge bg-primary">E</span> - 저녁 근무 (Evening)</div>
            <div><span className="badge bg-dark">N</span> - 야간 근무 (Night)</div>
            <div><span className="badge bg-success">Off</span> - 휴무</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftManagement; 