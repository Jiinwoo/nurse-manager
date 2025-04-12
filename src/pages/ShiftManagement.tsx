import React, { useState, useEffect } from 'react';
import { Shift, Nurse } from '../renderer.d';

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load all shifts and nurses
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shiftResponse, nurseResponse] = await Promise.all([
        window.api.shifts.getAll(),
        window.api.nurses.getAll()
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
                        <th>상태</th>
                        <th>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map(shift => (
                        <tr key={shift.id}>
                          <td>{shift.nurse_name}</td>
                          <td>{shift.shift_type}</td>
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
                      ))}
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
    </div>
  );
};

export default ShiftManagement; 