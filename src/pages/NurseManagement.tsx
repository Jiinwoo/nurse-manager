import React, { useState, useEffect, useRef } from 'react';
import { Nurse, Team } from '../renderer.d';
import Papa from 'papaparse';

interface CsvNurseData {
  이름?: string;
  연차?: string;
  팀?: string;
  '선호 근무'?: string;
  // 또는 순서대로 파싱할 경우를 위한 필드
  [key: number]: string;
}

const NurseManagement: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Nurse>>({
    name: '',
    years_experience: 0,
    available_shift_types: ['Day', 'Evening', 'Night'],
    team_id: null
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: keyof Nurse | 'team_name', direction: 'asc' | 'desc'}>({
    key: 'years_experience',
    direction: 'desc'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Convert shift types from CSV format (D, E, N) to DB format (Day, Evening, Night)
  const convertShiftTypes = (shiftTypesStr: string): string[] => {
    // Expected format: "(D, E, N)" or similar
    const shiftTypesMatch = shiftTypesStr.match(/\(([^)]+)\)/);
    if (!shiftTypesMatch) return [];
    
    const csvShiftTypes = shiftTypesMatch[1].split(',').map(type => type.trim());
    const dbShiftTypes: string[] = [];
    
    for (const type of csvShiftTypes) {
      if (type === 'D') dbShiftTypes.push('Day');
      else if (type === 'E') dbShiftTypes.push('Evening');
      else if (type === 'N') dbShiftTypes.push('Night');
    }
    
    return dbShiftTypes;
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

  // Find team ID by team code
  const findTeamIdByCode = (teamCode: string): number | null => {
    if (!teamCode || teamCode === '-') return null;
    
    const team = teams.find(t => t.name === `${teamCode}`);
    return team?.id || null;
  };
  
  // Handle CSV file selection and upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setCsvError('CSV 파일만 업로드 가능합니다.');
        return;
      }
      
      setCsvLoading(true);
      setIsImporting(true);
      setCsvError(null);
      
      Papa.parse<CsvNurseData>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            if (results.errors.length > 0) {
              setCsvError(`CSV 파싱 오류: ${results.errors[0].message}`);
              setCsvLoading(false);
              setIsImporting(false);
              return;
            }
            
            let successCount = 0;
            
            // Process each row
            for (const row of results.data) {
              try {
                // Extract data from the row
                // Handle both named columns and positional data
                const name = row['이름'] || row[0];
                const yearsExperienceStr = row['연차'] || row[1];
                const teamCode = row['팀'] || row[2];
                const shiftTypesStr = row['선호 근무'] || row[3];
                
                if (!name || !yearsExperienceStr || !shiftTypesStr) {
                  console.warn('Skipping row with missing data:', row);
                  continue;
                }
                
                // Parse years of experience
                const years_experience = parseInt(yearsExperienceStr, 10);
                if (isNaN(years_experience)) {
                  console.warn('Skipping row with invalid years of experience:', row);
                  continue;
                }
                
                // Convert shift types
                const available_shift_types = convertShiftTypes(shiftTypesStr);
                if (available_shift_types.length === 0) {
                  console.warn('Skipping row with invalid shift types:', row);
                  continue;
                }
                
                // Find team ID
                const team_id = findTeamIdByCode(teamCode);
                
                // Create nurse object
                const nurseData = {
                  name,
                  years_experience,
                  available_shift_types,
                  team_id
                };
                
                // Create nurse in database
                const response = await window.api.nurses.create(nurseData);
                
                if (response.success) {
                  successCount++;
                } else {
                  console.error('Error creating nurse:', response.error);
                }
              } catch (rowError) {
                console.error('Error processing CSV row:', row, rowError);
              }
            }
            
            if (successCount > 0) {
              setCsvSuccess(`${successCount}명의 간호사가 성공적으로 데이터베이스에 추가되었습니다.`);
              await loadData(); // Reload the nurse list
              
              // Clear success message after 3 seconds
              setTimeout(() => {
                setCsvSuccess(null);
              }, 3000);
            } else {
              setCsvError('추가된 간호사가 없습니다. 파일을 확인해주세요.');
            }
          } catch (err: any) {
            setCsvError(`CSV 파일 처리 중 오류: ${err.message}`);
            console.error('CSV 처리 오류:', err);
          } finally {
            setCsvLoading(false);
            setIsImporting(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        },
        error: (error) => {
          setCsvError(`CSV 파일 파싱 중 오류: ${error.message}`);
          setCsvLoading(false);
          setIsImporting(false);
        }
      });
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

  // Delete all nurses
  const handleDeleteAll = async () => {
    if (!window.confirm('정말로 모든 간호사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    // Double confirm for critical action
    if (!window.confirm('이 작업은 모든 간호사 데이터를 영구적으로 삭제합니다. 계속하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.api.nurses.deleteAll();
      if (response.success) {
        await loadData();
        setError(null);
      } else {
        setError(response.error || '간호사 일괄 삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사 일괄 삭제 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort nurses
  const requestSort = (key: keyof Nurse | 'team_name') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted nurses
  const getSortedNurses = () => {
    const sortableNurses = [...nurses];
    if (sortConfig.key) {
      sortableNurses.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;
        
        if (sortConfig.key === 'team_name') {
          // Special handling for team_name which might be null
          const aValue = a.team_name || '';
          const bValue = b.team_name || '';
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof a[sortConfig.key] === 'string') {
          return sortConfig.direction === 'asc'
            ? (a[sortConfig.key] as string).localeCompare(b[sortConfig.key] as string)
            : (b[sortConfig.key] as string).localeCompare(a[sortConfig.key] as string);
        }
        
        // For numbers or other types
        return sortConfig.direction === 'asc'
          ? (a[sortConfig.key] as number) - (b[sortConfig.key] as number)
          : (b[sortConfig.key] as number) - (a[sortConfig.key] as number);
      });
    }
    return sortableNurses;
  };

  // Get sort indicator
  const getSortDirectionIndicator = (key: keyof Nurse | 'team_name') => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
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
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="d-flex justify-content-between">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? '처리 중...' 
                      : (editingId ? '정보 수정' : '추가하기')}
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
          
          {/* CSV File Upload */}
          <div className="card mt-4">
            <div className="card-header">
              CSV 파일로 간호사 일괄 등록
            </div>
            <div className="card-body">
              {csvError && <div className="alert alert-danger">{csvError}</div>}
              {csvSuccess && <div className="alert alert-success">{csvSuccess}</div>}
              
              <p className="mb-3">
                CSV 파일을 업로드하여 데이터베이스에 간호사를 일괄 등록할 수 있습니다. 
                <br />
                <small className="text-muted">
                  CSV 파일 형식: 이름, 경력(년), 팀(A/B/C/-), 선호 근무(D, E, N)
                </small>
              </p>
              
              <div className="mb-3">
                <label htmlFor="csv-file" className="form-label">CSV 파일 선택</label>
                <input
                  type="file"
                  className="form-control"
                  id="csv-file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={csvLoading}
                  ref={fileInputRef}
                />
              </div>
              
              {csvLoading && (
                <div className="text-center my-3">
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span>{isImporting ? '간호사 데이터를 DB에 가져오는 중...' : '처리 중...'}</span>
                </div>
              )}
              
              <div className="mt-3">
                <small className="text-muted">
                  * CSV 파일의 내용은 데이터베이스에 추가됩니다. nurse.csv 파일의 내용은 변경되지 않습니다.
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>간호사 목록</span>
              {nurses.length > 0 && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                >
                  전체 삭제
                </button>
              )}
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center mt-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">로딩중...</span>
                  </div>
                </div>
              ) : nurses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                          이름 {getSortDirectionIndicator('name')}
                        </th>
                        <th onClick={() => requestSort('years_experience')} style={{ cursor: 'pointer' }}>
                          경력 {getSortDirectionIndicator('years_experience')}
                        </th>
                        <th>
                          근무 가능 시간대
                        </th>
                        <th onClick={() => requestSort('team_name')} style={{ cursor: 'pointer' }}>
                          팀 {getSortDirectionIndicator('team_name')}
                        </th>
                        <th>동작</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedNurses().map(nurse => (
                        <tr key={nurse.id}>
                          <td>{nurse.name}</td>
                          <td>{nurse.years_experience}년</td>
                          <td>
                            {nurse.available_shift_types?.join(', ') || '정보 없음'}
                          </td>
                          <td>{nurse.team_name || '팀 없음'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => handleEdit(nurse)}
                            >
                              수정
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(nurse.id as number)}
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
                <div className="alert alert-info mt-3">
                  등록된 간호사가 없습니다. 새 간호사를 추가해보세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseManagement; 