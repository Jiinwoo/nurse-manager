import React, { useState, useEffect } from 'react';
import { Nurse, ShiftPreference } from '../renderer.d';

const ShiftPreferencePage: React.FC = () => {
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [selectedNurse, setSelectedNurse] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<{[key: string]: string}>({});
  const [allNursePreferences, setAllNursePreferences] = useState<ShiftPreference[]>([]);
  const [showAllPreferences, setShowAllPreferences] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const SHIFT_TYPES = ['day', 'evening', 'night', 'off'];

  // 컴포넌트 마운트시 데이터 로드
  useEffect(() => {
    loadNurses();
    setNextMonth();
  }, []);

  // 선택한 달이 변경되면 모든 간호사의 희망근무도 로드
  useEffect(() => {
    if (selectedMonth) {
      loadAllNursePreferences(selectedMonth);
    }
  }, [selectedMonth]);

  // 다음달을 기본으로 설정
  const setNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const yearMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(yearMonth);
    generateCalendarDays(yearMonth);
  };

  // 선택한 달에 대한 캘린더 일 생성
  const generateCalendarDays = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days: Date[] = [];

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month - 1, i));
    }

    setCalendarDays(days);
  };

  // 날짜 변경 처리
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yearMonth = e.target.value;
    setSelectedMonth(yearMonth);
    generateCalendarDays(yearMonth);
    // 날짜가 변경되면 이전 선택을 초기화
    setSelectedPreferences({});
    
    // 새 날짜에 대한 기존 선호도 로드
    if (selectedNurse) {
      loadPreferences(selectedNurse, yearMonth);
    }
  };

  // 간호사 변경 처리
  const handleNurseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nurseId = parseInt(e.target.value);
    setSelectedNurse(nurseId);
    loadPreferences(nurseId, selectedMonth);
  };

  // 간호사 로드
  const loadNurses = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.nurses.getAll();
      if (response.success) {
        setNurses(response.data || []);
      } else {
        setError('간호사 목록을 가져오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사 데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 선택된 간호사와 날짜 범위에 대한 희망 근무 로드
  const loadPreferences = async (nurseId: number, yearMonth: string) => {
    if (!nurseId || !yearMonth) return;
    
    setIsLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      
      const response = await window.api.shiftPreferences.getByNurseId(nurseId);
      
      if (response.success) {
        const nursePrefs = response.data || [];
        setPreferences(nursePrefs.filter(pref => {
          const prefDate = new Date(pref.preference_date);
          return prefDate.getMonth() + 1 === month && prefDate.getFullYear() === year;
        }));
        
        // 기존 선호도를 선택 상태로 설정
        const newPreferences: {[key: string]: string} = {};
        nursePrefs.forEach(pref => {
          newPreferences[pref.preference_date] = pref.preference_type;
        });
        setSelectedPreferences(newPreferences);
      } else {
        setError('희망 근무 데이터를 가져오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('희망 근무 데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 간호사의 희망근무 로드
  const loadAllNursePreferences = async (yearMonth: string) => {
    if (!yearMonth) return;
    
    setIsLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      
      const response = await window.api.shiftPreferences.getByDateRange(startDate, endDate);
      
      if (response.success) {
        setAllNursePreferences(response.data || []);
      } else {
        console.error('모든 희망 근무 데이터를 가져오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('모든 희망 근무 데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 선호도 변경 처리
  const handlePreferenceChange = (date: Date, type: string) => {
    const dateString = date.toISOString().split('T')[0];
    
    setSelectedPreferences(prev => {
      const newPreferences = { ...prev };
      if (newPreferences[dateString] === type) {
        // 같은 타입이 선택되었다면 선택 해제
        delete newPreferences[dateString];
      } else {
        // 새로운 타입 선택
        newPreferences[dateString] = type;
      }
      return newPreferences;
    });
  };

  // 희망 근무 저장
  const savePreferences = async () => {
    if (!selectedNurse) {
      setError('간호사를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 기존 선호도 삭제 (해당 월에 대해)
      if (preferences.length > 0) {
        for (const pref of preferences) {
          await window.api.shiftPreferences.delete(pref.id!);
        }
      }
      
      // 새 선호도 저장
      const savePromises = Object.entries(selectedPreferences).map(([date, type]) => {
        return window.api.shiftPreferences.create({
          nurse_id: selectedNurse,
          preference_date: date,
          preference_type: type,
          priority: 1
        });
      });
      
      await Promise.all(savePromises);
      setSuccess('희망 근무가 성공적으로 저장되었습니다.');
      
      // 새로 로드
      if (selectedNurse) {
        loadPreferences(selectedNurse, selectedMonth);
      }
      loadAllNursePreferences(selectedMonth);
    } catch (err) {
      setError('희망 근무를 저장하는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 상세 날짜 포맷팅
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 요일 가져오기
  const getDayOfWeek = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 요일에 따른 스타일 클래스
  const getDayClass = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return 'text-danger'; // 일요일
    if (day === 6) return 'text-primary'; // 토요일
    return '';
  };

  // 선호도 버튼 클래스
  const getPreferenceButtonClass = (date: Date, type: string) => {
    const dateString = date.toISOString().split('T')[0];
    const isSelected = selectedPreferences[dateString] === type;
    
    let baseClass = 'btn btn-sm ';
    
    if (isSelected) {
      switch (type) {
        case 'day': return baseClass + 'btn-warning';
        case 'evening': return baseClass + 'btn-primary';
        case 'night': return baseClass + 'btn-dark';
        case 'off': return baseClass + 'btn-success';
        default: return baseClass + 'btn-secondary';
      }
    } else {
      return baseClass + 'btn-outline-secondary';
    }
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

  // 특정 날짜의 희망근무 목록 가져오기
  const getPreferencesByDate = (dateString: string) => {
    return allNursePreferences.filter(pref => pref.preference_date === dateString);
  };

  // 전체 희망근무 토글
  const toggleAllPreferences = () => {
    setShowAllPreferences(!showAllPreferences);
    setSelectedDate(null);
  };

  // 날짜 선택 핸들러
  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
  };

  return (
    <div>
      <h2 className="page-title">희망 근무 신청</h2>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      
      <div className="card mb-4">
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="nurse-select" className="form-label">간호사 선택</label>
              <select 
                id="nurse-select" 
                className="form-select"
                value={selectedNurse || ''}
                onChange={handleNurseChange}
              >
                <option value="">간호사 선택...</option>
                {nurses.map(nurse => (
                  <option key={nurse.id} value={nurse.id}>
                    {nurse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="month-select" className="form-label">월 선택</label>
              <input 
                type="month" 
                id="month-select" 
                className="form-control"
                value={selectedMonth}
                onChange={handleMonthChange}
              />
            </div>
          </div>
          
          <div className="alert alert-info">
            <strong>희망 근무 신청 안내:</strong> 선호하는 근무 유형(Day, Evening, Night, Off)을 각 날짜에 선택하여 신청할 수 있습니다.
            같은 유형을 다시 클릭하면 선택이 취소됩니다.
          </div>
          
          <div className="mb-3">
            <button
              className="btn btn-outline-info me-2"
              onClick={toggleAllPreferences}
            >
              {showAllPreferences ? '개인별 희망근무 입력으로 돌아가기' : '전체 희망근무 확인하기'}
            </button>
          </div>
          
          {!showAllPreferences ? (
            selectedNurse ? (
              <>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>요일</th>
                        <th>희망 근무</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calendarDays.map(day => (
                        <tr key={day.toISOString()}>
                          <td>{formatDate(day)}</td>
                          <td className={getDayClass(day)}>{getDayOfWeek(day)}</td>
                          <td>
                            <div className="btn-group">
                              {SHIFT_TYPES.map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  className={getPreferenceButtonClass(day, type)}
                                  onClick={() => handlePreferenceChange(day, type)}
                                  disabled={isLoading}
                                >
                                  {type === 'day' ? 'D' : 
                                   type === 'evening' ? 'E' : 
                                   type === 'night' ? 'N' : 'Off'}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="d-flex justify-content-end mt-3">
                  <button 
                    className="btn btn-primary" 
                    onClick={savePreferences}
                    disabled={isLoading || !selectedNurse}
                  >
                    {isLoading ? '저장 중...' : '희망 근무 저장'}
                  </button>
                </div>
              </>
            ) : (
              <div className="alert alert-warning">
                간호사를 선택하면 희망 근무를 신청할 수 있습니다.
              </div>
            )
          ) : (
            // 전체 희망근무 표시
            <>
              <h4 className="mt-4 mb-3">{selectedMonth.split('-')[0]}년 {selectedMonth.split('-')[1]}월 전체 희망근무</h4>
              
              {selectedDate ? (
                // 선택 날짜의 희망 근무 상세 표시
                <div className="card mb-3">
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{formatFullDate(selectedDate)}</h5>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setSelectedDate(null)}
                      >
                        달력으로 돌아가기
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>간호사</th>
                            <th>희망 근무</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPreferencesByDate(selectedDate).length > 0 ? (
                            getPreferencesByDate(selectedDate).map(pref => (
                              <tr key={pref.id}>
                                <td>{pref.nurse_name}</td>
                                <td>
                                  <span className={`badge ${getPreferenceBadgeClass(pref.preference_type)}`}>
                                    {displayPreferenceType(pref.preference_type)}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="text-center">해당 날짜에 신청된 희망 근무가 없습니다.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // 전체 달력 표시
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>요일</th>
                        <th>희망 근무 신청 수</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calendarDays.map(day => {
                        const dateString = day.toISOString().split('T')[0];
                        const prefCount = getPreferencesByDate(dateString).length;
                        return (
                          <tr key={day.toISOString()}>
                            <td>{formatDate(day)}</td>
                            <td className={getDayClass(day)}>{getDayOfWeek(day)}</td>
                            <td>
                              {prefCount > 0 ? (
                                <span className="badge bg-info">{prefCount}명</span>
                              ) : (
                                <span className="text-muted">0명</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleDateClick(day)}
                                disabled={prefCount === 0}
                              >
                                상세보기
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="card">
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

export default ShiftPreferencePage; 