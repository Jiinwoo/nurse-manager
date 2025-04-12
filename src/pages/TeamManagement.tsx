import React, { useState, useEffect } from 'react';
import { Team, Nurse } from '../renderer.d';

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Nurse[]>([]);
  const [unassignedNurses, setUnassignedNurses] = useState<Nurse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    description: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load teams and unassigned nurses on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load team members when selected team changes
  useEffect(() => {
    if (selectedTeam?.id) {
      loadTeamMembers(selectedTeam.id);
    } else {
      setTeamMembers([]);
    }
  }, [selectedTeam]);

  // Load all teams and nurses from the database
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamResponse, nurseResponse, unassignedResponse] = await Promise.all([
        window.api.teams.getAll(),
        window.api.nurses.getAll(),
        window.api.teams.getUnassignedNurses()
      ]);
      
      if (teamResponse.success) {
        setTeams(teamResponse.data || []);
      } else {
        setError(teamResponse.error || '팀 데이터를 가져오는 중 오류가 발생했습니다.');
      }
      
      if (nurseResponse.success) {
        setNurses(nurseResponse.data || []);
      } else {
        console.error('간호사 데이터를 가져오는 중 오류:', nurseResponse.error);
      }

      if (unassignedResponse.success) {
        setUnassignedNurses(unassignedResponse.data || []);
      } else {
        console.error('미배정 간호사 데이터를 가져오는 중 오류:', unassignedResponse.error);
      }
    } catch (err) {
      setError('데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load team members for a specific team
  const loadTeamMembers = async (teamId: number) => {
    setIsLoading(true);
    try {
      const response = await window.api.teams.getNursesByTeamId(teamId);
      if (response.success) {
        setTeamMembers(response.data || []);
      } else {
        console.error(`팀 멤버 정보를 가져오는 중 오류: ${response.error}`);
      }
    } catch (err) {
      console.error('팀 멤버 정보를 가져오는 중 예외 발생:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate that name is not empty
    if (!formData.name || formData.name.trim() === '') {
      setError('팀 이름을 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      if (editingId !== null) {
        // Update existing team
        const response = await window.api.teams.update(editingId, formData);
        if (response.success) {
          await loadData();
          resetForm();
        } else {
          setError(response.error || '팀 정보 업데이트 중 오류가 발생했습니다.');
        }
      } else {
        // Create new team
        const response = await window.api.teams.create(formData as Omit<Team, 'id' | 'created_at' | 'updated_at'>);
        if (response.success) {
          await loadData();
          resetForm();
        } else {
          setError(response.error || '팀 추가 중 오류가 발생했습니다.');
        }
      }
    } catch (err) {
      setError('작업 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a team
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 팀을 삭제하시겠습니까? 팀에 속한 간호사들은 미배정 상태가 됩니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.api.teams.delete(id);
      if (response.success) {
        if (selectedTeam?.id === id) {
          setSelectedTeam(null);
        }
        await loadData();
      } else {
        setError(response.error || '팀 삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('팀 삭제 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit a team
  const handleEdit = (team: Team) => {
    setEditingId(team.id || null);
    setFormData({
      name: team.name,
      description: team.description || ''
    });
  };

  // Reset form to default values
  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: ''
    });
  };

  // Select a team to view its members
  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
  };

  // Add a nurse to the selected team
  const handleAddToTeam = async (nurseId: number) => {
    if (!selectedTeam?.id) {
      setError('먼저 팀을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.api.nurses.assignToTeam(nurseId, selectedTeam.id);
      if (response.success) {
        await Promise.all([
          loadTeamMembers(selectedTeam.id),
          loadData()
        ]);
      } else {
        setError(response.error || '간호사를 팀에 추가하는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사를 팀에 추가하는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a nurse from the selected team
  const handleRemoveFromTeam = async (nurseId: number) => {
    setIsLoading(true);
    try {
      const response = await window.api.nurses.removeFromTeam(nurseId);
      if (response.success) {
        await Promise.all([
          loadTeamMembers(selectedTeam?.id || 0),
          loadData()
        ]);
      } else {
        setError(response.error || '간호사를 팀에서 제거하는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사를 팀에서 제거하는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">팀 관리</h2>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      <div className="row">
        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header">
              {editingId ? '팀 정보 수정' : '새 팀 추가'}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">팀 이름</label>
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
                  <label htmlFor="description" className="form-label">설명</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description || ''}
                    onChange={handleInputChange}
                  />
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
          
          <div className="card">
            <div className="card-header">팀 목록</div>
            <div className="card-body">
              {isLoading && !teams.length ? (
                <p>로딩 중...</p>
              ) : teams.length ? (
                <div className="list-group">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedTeam?.id === team.id ? 'active' : ''}`}
                      onClick={() => handleSelectTeam(team)}
                    >
                      <div>
                        <h6 className="mb-1">{team.name}</h6>
                        {team.description && (
                          <small>{team.description}</small>
                        )}
                      </div>
                      <div>
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(team);
                          }}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            team.id && handleDelete(team.id);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>등록된 팀이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header">
              {selectedTeam ? `"${selectedTeam.name}" 팀 멤버` : '팀을 선택해주세요'}
            </div>
            <div className="card-body">
              {!selectedTeam ? (
                <p>좌측에서 팀을 선택하면 해당 팀의 간호사 목록이 표시됩니다.</p>
              ) : isLoading ? (
                <p>로딩 중...</p>
              ) : teamMembers.length ? (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>경력 (년)</th>
                        <th>근무 가능 시간대</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map(nurse => (
                        <tr key={nurse.id}>
                          <td>{nurse.name}</td>
                          <td>{nurse.years_experience}</td>
                          <td>{nurse.available_shift_types.join(', ')}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => nurse.id && handleRemoveFromTeam(nurse.id)}
                            >
                              팀에서 제거
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>이 팀에 소속된 간호사가 없습니다.</p>
              )}
            </div>
          </div>
          
          {selectedTeam && (
            <div className="card">
              <div className="card-header">미배정 간호사</div>
              <div className="card-body">
                {isLoading ? (
                  <p>로딩 중...</p>
                ) : unassignedNurses.length ? (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>경력 (년)</th>
                          <th>근무 가능 시간대</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedNurses.map(nurse => (
                          <tr key={nurse.id}>
                            <td>{nurse.name}</td>
                            <td>{nurse.years_experience}</td>
                            <td>{nurse.available_shift_types.join(', ')}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => nurse.id && handleAddToTeam(nurse.id)}
                              >
                                팀에 추가
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>미배정 간호사가 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement; 