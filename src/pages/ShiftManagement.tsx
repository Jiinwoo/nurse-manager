import React, { useState, useEffect } from 'react';
import { Shift, Nurse, ShiftPreference } from '../renderer.d';

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showPreferences, setShowPreferences] = useState(false);
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

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
                      <th>간호사</th>
                      <th>희망 근무</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nurses.map(nurse => {
                      const preference = getNursePreference(nurse.id!, selectedDate);
                      return (
                        <tr key={nurse.id}>
                          <td>{nurse.name}</td>
                          <td>
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
                        <th>간호사</th>
                        <th>근무 유형</th>
                        {showPreferences && <th>희망 근무</th>}
                        <th>상태</th>
                        <th>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map(shift => {
                        const preference = getNursePreference(shift.nurse_id, date);
                        return (
                          <tr key={shift.id}>
                            <td>{shift.nurse_name}</td>
                            <td>{shift.shift_type}</td>
                            {showPreferences && (
                              <td>
                                {preference ? (
                                  <span className={`badge ${getPreferenceBadgeClass(preference)}`}>
                                    {displayPreferenceType(preference)}
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            )}
                            <td>
                              <span className={`badge bg-${
                                shift.status === 'completed' ? 'success' :
                                shift.status === 'cancelled' ? 'danger' :
                                'primary'
                              }`}>
                                {shift.status === 'completed' ? '완료' :
                                 shift.status === 'cancelled' ? '취소됨' :
                                 '예정됨'
                                }
                              </span>
                            </td>
                            <td>{shift.notes || '-'}</td>
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