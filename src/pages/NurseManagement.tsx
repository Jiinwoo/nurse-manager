import React, { useState, useEffect } from 'react';
import { Nurse, Team } from '../renderer.d';

const NurseManagement: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Nurse>>({
    name: '',
    years_experience: 0,
    available_shift_types: ['Day', 'Evening', 'Night'],
    team_id: null
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Available shift types constants
  const SHIFT_TYPES = ['Day', 'Evening', 'Night'];

  // Load nurses and teams on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load all nurses and teams from the database
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nurseResponse, teamResponse] = await Promise.all([
        window.api.nurses.getAll(),
        window.api.teams.getAll()
      ]);
      
      if (nurseResponse.success) {
        setNurses(nurseResponse.data || []);
      } else {
        setError(nurseResponse.error || '간호사 데이터를 가져오는 중 오류가 발생했습니다.');
      }
      
      if (teamResponse.success) {
        setTeams(teamResponse.data || []);
      } else {
        console.error('팀 데이터를 가져오는 중 오류:', teamResponse.error);
      }
    } catch (err) {
      setError('데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name === 'years_experience') {
      // Convert string to number for years_experience
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else if (name === 'team_id') {
      // Handle team_id select
      const teamId = value === '' ? null : parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: teamId }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle shift type checkbox changes
  const handleShiftTypeChange = (shiftType: string) => {
    setFormData(prev => {
      const currentTypes = [...(prev.available_shift_types || [])];
      
      if (currentTypes.includes(shiftType)) {
        // Remove the shift type if it already exists
        return {
          ...prev,
          available_shift_types: currentTypes.filter(type => type !== shiftType)
        };
      } else {
        // Add the shift type if it doesn't exist
        return {
          ...prev,
          available_shift_types: [...currentTypes, shiftType]
        };
      }
    });
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate that at least one shift type is selected
    if (!formData.available_shift_types || formData.available_shift_types.length === 0) {
      setError('적어도 하나의 근무유형을 선택해야 합니다.');
      setIsLoading(false);
      return;
    }

    // Validate that name is not empty
    if (!formData.name || formData.name.trim() === '') {
      setError('간호사 이름을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      if (editingId !== null) {
        // Update existing nurse
        const response = await window.api.nurses.update(editingId, formData);
        if (response.success) {
          await loadData();
          resetForm();
        } else {
          setError(response.error || '간호사 정보 업데이트 중 오류가 발생했습니다.');
        }
      } else {
        // Create new nurse
        const response = await window.api.nurses.create(formData as Omit<Nurse, 'id' | 'created_at' | 'updated_at' | 'team_name'>);
        if (response.success) {
          await loadData();
          resetForm();
        } else {
          setError(response.error || '간호사 추가 중 오류가 발생했습니다.');
        }
      }
    } catch (err) {
      setError('작업 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a nurse
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 간호사를 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.api.nurses.delete(id);
      if (response.success) {
        await loadData();
      } else {
        setError(response.error || '간호사 삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사 삭제 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit a nurse
  const handleEdit = (nurse: Nurse) => {
    setEditingId(nurse.id || null);
    setFormData({
      name: nurse.name,
      years_experience: nurse.years_experience,
      available_shift_types: nurse.available_shift_types,
      team_id: nurse.team_id
    });
  };

  // Reset form to default values
  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      years_experience: 0,
      available_shift_types: ['Day', 'Evening', 'Night'],
      team_id: null
    });
  };

  return (
    <div>
      <h2 className="page-title">간호사 관리</h2>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              {editingId ? '간호사 정보 수정' : '새 간호사 추가'}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">이름</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="years_experience" className="form-label">경력 (년)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="years_experience"
                    name="years_experience"
                    min="0"
                    value={formData.years_experience || 0}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">근무 가능 시간대</label>
                  <div>
                    {SHIFT_TYPES.map(type => (
                      <div className="form-check form-check-inline" key={type}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`shift-${type}`}
                          checked={formData.available_shift_types?.includes(type) || false}
                          onChange={() => handleShiftTypeChange(type)}
                        />
                        <label className="form-check-label" htmlFor={`shift-${type}`}>
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="team_id" className="form-label">팀</label>
                  <select
                    className="form-select"
                    id="team_id"
                    name="team_id"
                    value={formData.team_id === null ? '' : formData.team_id}
                    onChange={handleInputChange}
                  >
                    <option value="">팀 없음</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="d-flex justify-content-between">
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isLoading}
                  >
                    {isLoading ? '처리 중...' : (editingId ? '수정' : '추가')}
                  </button>
                  
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">간호사 목록</div>
            <div className="card-body">
              {isLoading && !nurses.length ? (
                <p>로딩 중...</p>
              ) : nurses.length ? (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>경력 (년)</th>
                        <th>근무 가능 시간대</th>
                        <th>팀</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nurses.map(nurse => (
                        <tr key={nurse.id}>
                          <td>{nurse.name}</td>
                          <td>{nurse.years_experience}</td>
                          <td>{nurse.available_shift_types.join(', ')}</td>
                          <td>{nurse.team_name || '-'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => handleEdit(nurse)}
                            >
                              수정
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => nurse.id && handleDelete(nurse.id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>등록된 간호사가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseManagement; 