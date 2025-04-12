import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Define the types directly in this file since we have import issues
interface Nurse {
  id?: number;
  name: string;
  employee_id: string;
  department?: string;
  position?: string;
  contact?: string;
  created_at?: string;
  updated_at?: string;
}

interface Shift {
  id?: number;
  nurse_id: number;
  shift_date: string;
  shift_type: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  nurse_name?: string; // For joined queries
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface NurseApi {
  getAll: () => Promise<ApiResponse<Nurse[]>>;
  getById: (id: number) => Promise<ApiResponse<Nurse>>;
  create: (nurseData: Omit<Nurse, 'id' | 'created_at' | 'updated_at'>) => Promise<ApiResponse<any>>;
  update: (id: number, nurseData: Partial<Omit<Nurse, 'id' | 'created_at' | 'updated_at'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

interface ShiftApi {
  getAll: () => Promise<ApiResponse<Shift[]>>;
  getById: (id: number) => Promise<ApiResponse<Shift>>;
  getByNurseId: (nurseId: number) => Promise<ApiResponse<Shift[]>>;
  create: (shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>) => Promise<ApiResponse<any>>;
  update: (id: number, shiftData: Partial<Omit<Shift, 'id' | 'nurse_id' | 'created_at' | 'updated_at' | 'nurse_name'>>) => Promise<ApiResponse<any>>;
  delete: (id: number) => Promise<ApiResponse<any>>;
}

// Extend the Window interface
declare global {
  interface Window {
    api: {
      nurses: NurseApi;
      shifts: ShiftApi;
    }
  }
}

// Main app component
const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>간호사 관리 시스템</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <NurseManager />
        </div>
        <div style={{ flex: 1 }}>
          <ShiftManager />
        </div>
      </div>
    </div>
  );
};

// Nurse management component
const NurseManager: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [formData, setFormData] = useState<Omit<Nurse, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    employee_id: '',
    department: '',
    position: '',
    contact: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load nurses on component mount
  useEffect(() => {
    loadNurses();
  }, []);

  // Load all nurses from the database
  const loadNurses = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.nurses.getAll();
      if (response.success) {
        setNurses(response.data || []);
      } else {
        setError(response.error || '간호사 데이터를 가져오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('간호사 데이터를 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingId !== null) {
        // Update existing nurse
        const response = await window.api.nurses.update(editingId, formData);
        if (response.success) {
          await loadNurses();
          resetForm();
        } else {
          setError(response.error || '간호사 정보 업데이트 중 오류가 발생했습니다.');
        }
      } else {
        // Create new nurse
        const response = await window.api.nurses.create(formData);
        if (response.success) {
          await loadNurses();
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
        await loadNurses();
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
    if (!nurse.id) return;
    
    setFormData({
      name: nurse.name,
      employee_id: nurse.employee_id,
      department: nurse.department || '',
      position: nurse.position || '',
      contact: nurse.contact || ''
    });
    setEditingId(nurse.id);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      employee_id: '',
      department: '',
      position: '',
      contact: ''
    });
    setEditingId(null);
  };

  return (
    <div>
      <h2>간호사 관리</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>이름:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>사원번호:</label>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>부서:</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>직위:</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>연락처:</label>
          <input
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {editingId !== null ? '수정' : '추가'}
          </button>
          
          {editingId !== null && (
            <button 
              type="button" 
              onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              취소
            </button>
          )}
        </div>
      </form>
      
      <h3>간호사 목록</h3>
      {isLoading ? (
        <p>로딩 중...</p>
      ) : nurses.length === 0 ? (
        <p>등록된 간호사가 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>이름</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>사원번호</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>부서</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>직위</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>연락처</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {nurses.map(nurse => (
              <tr key={nurse.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{nurse.name}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{nurse.employee_id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{nurse.department}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{nurse.position}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{nurse.contact}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button 
                    onClick={() => nurse.id && handleEdit(nurse)}
                    style={{ marginRight: '5px', padding: '5px 10px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => nurse.id && handleDelete(nurse.id)}
                    style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Shift management component
const ShiftManager: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [formData, setFormData] = useState<Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'nurse_name'>>({
    nurse_id: 0,
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: '주간',
    status: '예정',
    notes: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load shifts and nurses on component mount
  useEffect(() => {
    loadShifts();
    loadNurses();
  }, []);

  // Load all shifts from the database
  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.shifts.getAll();
      if (response.success) {
        setShifts(response.data || []);
      } else {
        setError(response.error || '근무 일정을 가져오는 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('근무 일정을 가져오는 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load all nurses for the dropdown
  const loadNurses = async () => {
    try {
      const response = await window.api.nurses.getAll();
      if (response.success) {
        setNurses(response.data || []);
        // Set default nurse_id if nurses are available
        if (response.data && response.data.length > 0 && formData.nurse_id === 0) {
          setFormData(prev => ({ ...prev, nurse_id: response.data[0].id || 0 }));
        }
      }
    } catch (err) {
      console.error('간호사 목록을 가져오는 중 오류:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'nurse_id' ? parseInt(value, 10) : value 
    }));
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingId !== null) {
        // Update existing shift
        const { nurse_id, ...updateData } = formData;
        const response = await window.api.shifts.update(editingId, updateData);
        if (response.success) {
          await loadShifts();
          resetForm();
        } else {
          setError(response.error || '근무 일정 업데이트 중 오류가 발생했습니다.');
        }
      } else {
        // Create new shift
        const response = await window.api.shifts.create(formData);
        if (response.success) {
          await loadShifts();
          resetForm();
        } else {
          setError(response.error || '근무 일정 추가 중 오류가 발생했습니다.');
        }
      }
    } catch (err) {
      setError('작업 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a shift
  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 근무 일정을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.api.shifts.delete(id);
      if (response.success) {
        await loadShifts();
      } else {
        setError(response.error || '근무 일정 삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('근무 일정 삭제 중 예외가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Edit a shift
  const handleEdit = async (shift: Shift) => {
    if (!shift.id) return;
    
    setFormData({
      nurse_id: shift.nurse_id,
      shift_date: shift.shift_date,
      shift_type: shift.shift_type,
      status: shift.status || '예정',
      notes: shift.notes || ''
    });
    setEditingId(shift.id);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nurse_id: nurses.length > 0 ? (nurses[0].id || 0) : 0,
      shift_date: new Date().toISOString().split('T')[0],
      shift_type: '주간',
      status: '예정',
      notes: ''
    });
    setEditingId(null);
  };

  return (
    <div>
      <h2>근무 일정 관리</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>간호사:</label>
          <select
            name="nurse_id"
            value={formData.nurse_id}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '8px' }}
            disabled={editingId !== null} // Don't allow changing nurse on edit
          >
            <option value="">간호사 선택</option>
            {nurses.map(nurse => (
              <option key={nurse.id} value={nurse.id}>
                {nurse.name} ({nurse.employee_id})
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>근무일:</label>
          <input
            type="date"
            name="shift_date"
            value={formData.shift_date}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>근무 유형:</label>
          <select
            name="shift_type"
            value={formData.shift_type}
            onChange={handleInputChange}
            required
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="주간">주간</option>
            <option value="야간">야간</option>
            <option value="당직">당직</option>
            <option value="반일">반일</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>상태:</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="예정">예정</option>
            <option value="완료">완료</option>
            <option value="취소">취소</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>메모:</label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', height: '80px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {editingId !== null ? '수정' : '추가'}
          </button>
          
          {editingId !== null && (
            <button 
              type="button" 
              onClick={resetForm}
              style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              취소
            </button>
          )}
        </div>
      </form>
      
      <h3>근무 일정 목록</h3>
      {isLoading ? (
        <p>로딩 중...</p>
      ) : shifts.length === 0 ? (
        <p>등록된 근무 일정이 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>간호사</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>근무일</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>근무 유형</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>상태</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map(shift => (
              <tr key={shift.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{shift.nurse_name}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{shift.shift_date}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{shift.shift_type}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{shift.status}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button 
                    onClick={() => shift.id && handleEdit(shift)}
                    style={{ marginRight: '5px', padding: '5px 10px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => shift.id && handleDelete(shift.id)}
                    style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Render the app
const root = createRoot(document.getElementById('root') || document.body);
root.render(<App />);