import type { Nurse, Shift, Team, ShiftPreference } from '../types';
import { Database } from 'better-sqlite3';

export class BaseOperations {
  protected db: Database;

  constructor(db: Database) {
    this.db = db;
  }
}

export class NurseOperations extends BaseOperations {
  getAll(): Nurse[] {
    const stmt = this.db.prepare(`
      SELECT n.*, t.name as team_name 
      FROM nurses n 
      LEFT JOIN teams t ON n.team_id = t.id 
      ORDER BY n.years_experience DESC, n.name ASC
    `);
    const nurses = stmt.all() as any[];
    return nurses.map(nurse => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    })) as Nurse[];
  }

  getById(id: number): Nurse | null {
    const stmt = this.db.prepare(`
      SELECT n.*, t.name as team_name 
      FROM nurses n 
      LEFT JOIN teams t ON n.team_id = t.id 
      WHERE n.id = ?
    `);
    const nurse = stmt.get(id) as any;
    if (nurse) {
      return {
        ...nurse,
        available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
      } as Nurse;
    }
    return null;
  }

  create(nurseData: Partial<Nurse>): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO nurses (name, years_experience, available_shift_types, team_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      nurseData.name,
      nurseData.years_experience,
      JSON.stringify(nurseData.available_shift_types),
      nurseData.team_id || null
    );
    return result.changes > 0;
  }

  update(id: number, nurseData: Partial<Nurse>): boolean {
    const updates = [];
    const params = [];

    Object.entries(nurseData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'available_shift_types') {
          updates.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE nurses 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM nurses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteAll(): boolean {
    const stmt = this.db.prepare('DELETE FROM nurses');
    const result = stmt.run();
    return result.changes > 0;
  }

  removeFromTeam(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE nurses 
      SET team_id = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  assignToTeam(id: number, teamId: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE nurses 
      SET team_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    const result = stmt.run(teamId, id);
    return result.changes > 0;
  }
}

export class ShiftOperations extends BaseOperations {
  getAll(): Shift[] {
    const stmt = this.db.prepare(`
      SELECT s.*, n.name as nurse_name 
      FROM shifts s 
      JOIN nurses n ON s.nurse_id = n.id
      ORDER BY shift_date DESC
    `);
    return stmt.all() as Shift[];
  }

  getById(id: number): Shift | null {
    const stmt = this.db.prepare('SELECT * FROM shifts WHERE id = ?');
    return stmt.get(id) as Shift | null;
  }

  getByNurseId(nurseId: number): Shift[] {
    const stmt = this.db.prepare(`
      SELECT * FROM shifts 
      WHERE nurse_id = ? 
      ORDER BY shift_date DESC
    `);
    return stmt.all(nurseId) as Shift[];
  }

  getByDateRange(startDate: string, endDate: string): Shift[] {
    const stmt = this.db.prepare(`
      SELECT s.*, n.name as nurse_name 
      FROM shifts s 
      JOIN nurses n ON s.nurse_id = n.id
      WHERE s.shift_date BETWEEN ? AND ?
      ORDER BY shift_date ASC, n.name ASC
    `);
    return stmt.all(startDate, endDate) as Shift[];
  }

  create(shiftData: Partial<Shift>): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO shifts (nurse_id, shift_date, shift_type, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      shiftData.nurse_id,
      shiftData.shift_date,
      shiftData.shift_type,
      shiftData.status || 'scheduled',
      shiftData.notes || null
    );
    return result.changes > 0;
  }

  update(id: number, shiftData: Partial<Shift>): boolean {
    const updates = [];
    const params = [];

    Object.entries(shiftData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE shifts 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM shifts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getNurseWithTeam(nurseId: number): Nurse | null {
    const stmt = this.db.prepare(`
      SELECT n.*, t.name as team_name 
      FROM nurses n 
      LEFT JOIN teams t ON n.team_id = t.id 
      WHERE n.id = ?
    `);
    const nurse = stmt.get(nurseId) as any;
    
    if (nurse) {
      return {
        ...nurse,
        available_shift_types: JSON.parse(nurse.available_shift_types || '["day","evening","night"]')
      };
    }
    return null;
  }
}

export class TeamOperations extends BaseOperations {
  getAll(): Team[] {
    const stmt = this.db.prepare('SELECT * FROM teams ORDER BY name');
    return stmt.all() as Team[];
  }

  getById(id: number): Team | null {
    const stmt = this.db.prepare('SELECT * FROM teams WHERE id = ?');
    return stmt.get(id) as Team | null;
  }

  getNursesByTeamId(teamId: number): Nurse[] {
    const stmt = this.db.prepare(`
      SELECT * FROM nurses
      WHERE team_id = ?
      ORDER BY name
    `);
    
    const nurses = stmt.all(teamId) as any[];
    return nurses.map(nurse => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    })) as Nurse[];
  }

  getUnassignedNurses(): Nurse[] {
    const stmt = this.db.prepare(`
      SELECT * FROM nurses
      WHERE team_id IS NULL
      ORDER BY name
    `);
    
    const nurses = stmt.all() as any[];
    return nurses.map(nurse => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    })) as Nurse[];
  }

  create(teamData: Partial<Team>): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO teams (name, description)
      VALUES (?, ?)
    `);
    const result = stmt.run(
      teamData.name,
      teamData.description || null
    );
    return result.changes > 0;
  }

  update(id: number, teamData: Partial<Team>): boolean {
    const updates = [];
    const params = [];

    Object.entries(teamData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE teams 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const updateNursesStmt = this.db.prepare(`
      UPDATE nurses
      SET team_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE team_id = ?
    `);
    updateNursesStmt.run(id);
    
    const stmt = this.db.prepare('DELETE FROM teams WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export class ShiftPreferenceOperations extends BaseOperations {
  getAll(): ShiftPreference[] {
    const stmt = this.db.prepare(`
      SELECT sp.*, n.name as nurse_name 
      FROM shift_preferences sp 
      JOIN nurses n ON sp.nurse_id = n.id
      ORDER BY preference_date ASC
    `);
    return stmt.all() as ShiftPreference[];
  }

  getById(id: number): ShiftPreference | null {
    const stmt = this.db.prepare(`
      SELECT sp.*, n.name as nurse_name 
      FROM shift_preferences sp 
      JOIN nurses n ON sp.nurse_id = n.id
      WHERE sp.id = ?
    `);
    return stmt.get(id) as ShiftPreference | null;
  }

  getByNurseId(nurseId: number): ShiftPreference[] {
    const stmt = this.db.prepare(`
      SELECT sp.*, n.name as nurse_name 
      FROM shift_preferences sp 
      JOIN nurses n ON sp.nurse_id = n.id
      WHERE sp.nurse_id = ? 
      ORDER BY preference_date ASC
    `);
    return stmt.all(nurseId) as ShiftPreference[];
  }

  getByDateRange(startDate: string, endDate: string): ShiftPreference[] {
    const stmt = this.db.prepare(`
      SELECT sp.*, n.name as nurse_name 
      FROM shift_preferences sp 
      JOIN nurses n ON sp.nurse_id = n.id
      WHERE sp.preference_date BETWEEN ? AND ?
      ORDER BY preference_date ASC, n.name ASC
    `);
    return stmt.all(startDate, endDate) as ShiftPreference[];
  }

  create(prefData: Partial<ShiftPreference>): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO shift_preferences (nurse_id, preference_date, preference_type, priority, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      prefData.nurse_id,
      prefData.preference_date,
      prefData.preference_type,
      prefData.priority || 1,
      prefData.notes || null
    );
    return result.changes > 0;
  }

  update(id: number, prefData: Partial<ShiftPreference>): boolean {
    const updates = [];
    const params = [];

    Object.entries(prefData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE shift_preferences 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM shift_preferences WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
} 