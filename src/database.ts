import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

// Dynamic import for better error handling with native modules
const loadBetterSqlite = async () => {
  try {
    // 동적 임포트 사용
    const Database = await import('better-sqlite3').then(module => module.default);
    return Database;
  } catch (err) {
    console.error('Failed to load better-sqlite3:', err);
    throw new Error(`better-sqlite3 모듈 로드 실패: ${err.message}`);
  }
};

// User data directory
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'database');
const dbPath = path.join(dbDir, 'nurse-manager.db');
console.log(dbPath);

// Make sure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: any = null;

// Initialize database connection
const initializeDatabase = async () => {
  try {
    const Database = await loadBetterSqlite();
    db = new Database(dbPath, { verbose: console.log });
    console.log('SQLite 데이터베이스 연결 성공:', dbPath);
    
    // Create shifts table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nurse_id INTEGER NOT NULL,
        shift_date TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nurse_id) REFERENCES nurses (id) ON DELETE CASCADE
      )
    `);

    // Create teams table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nurses table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS nurses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        years_experience INTEGER DEFAULT 0,
        available_shift_types TEXT DEFAULT '["Day","Evening","Night"]',
        team_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
      )
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw new Error(`데이터베이스 초기화 실패: ${err.message}`);
  }
};

// Basic CRUD operations for nurses
const createNurseOperations = (db: any) => ({
  // Create a new nurse
  create: (nurseData: { name: string; years_experience: number; available_shift_types: string[]; team_id?: number | null }) => {
    const stmt = db.prepare(`
      INSERT INTO nurses (name, years_experience, available_shift_types, team_id)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(
      nurseData.name,
      nurseData.years_experience,
      JSON.stringify(nurseData.available_shift_types),
      nurseData.team_id || null
    );
  },

  // Get all nurses
  getAll: () => {
    const stmt = db.prepare(`
      SELECT n.*, t.name as team_name 
      FROM nurses n 
      LEFT JOIN teams t ON n.team_id = t.id 
      ORDER BY n.years_experience DESC, n.name ASC
    `);
    const nurses = stmt.all();
    
    // Parse the JSON string to an array for each nurse
    return nurses.map((nurse: any) => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    }));
  },

  // Get a nurse by ID
  getById: (id: number) => {
    const stmt = db.prepare(`
      SELECT n.*, t.name as team_name 
      FROM nurses n 
      LEFT JOIN teams t ON n.team_id = t.id 
      WHERE n.id = ?
    `);
    const nurse = stmt.get(id);
    
    if (nurse) {
      return {
        ...nurse,
        available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
      };
    }
    
    return null;
  },

  // Update a nurse
  update: (id: number, nurseData: { name?: string; years_experience?: number; available_shift_types?: string[]; team_id?: number | null }) => {
    const updates = [];
    const params = [];

    // Build dynamic update statement
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

    if (updates.length === 0) {
      return { changes: 0 };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id); // Add id for WHERE clause

    const stmt = db.prepare(`
      UPDATE nurses 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  },

  // Remove nurse from team
  removeFromTeam: (id: number) => {
    const stmt = db.prepare(`
      UPDATE nurses 
      SET team_id = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    return stmt.run(id);
  },

  // Assign nurse to team
  assignToTeam: (id: number, teamId: number) => {
    const stmt = db.prepare(`
      UPDATE nurses 
      SET team_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    return stmt.run(teamId, id);
  },

  // Delete a nurse
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM nurses WHERE id = ?');
    return stmt.run(id);
  },

  // Delete all nurses
  deleteAll: () => {
    const stmt = db.prepare('DELETE FROM nurses');
    return stmt.run();
  }
});

// Basic CRUD operations for shifts
const createShiftOperations = (db: any) => ({
  // Create a new shift
  create: (shiftData: { nurse_id: number; shift_date: string; shift_type: string; status?: string; notes?: string }) => {
    const stmt = db.prepare(`
      INSERT INTO shifts (nurse_id, shift_date, shift_type, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      shiftData.nurse_id,
      shiftData.shift_date,
      shiftData.shift_type,
      shiftData.status || 'scheduled',
      shiftData.notes || null
    );
  },

  // Get all shifts
  getAll: () => {
    const stmt = db.prepare(`
      SELECT s.*, n.name as nurse_name 
      FROM shifts s 
      JOIN nurses n ON s.nurse_id = n.id
      ORDER BY shift_date DESC
    `);
    return stmt.all();
  },

  // Get shifts by nurse ID
  getByNurseId: (nurseId: number) => {
    const stmt = db.prepare(`
      SELECT * FROM shifts 
      WHERE nurse_id = ? 
      ORDER BY shift_date DESC
    `);
    return stmt.all(nurseId);
  },

  // Get a shift by ID
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM shifts WHERE id = ?');
    return stmt.get(id);
  },

  // Update a shift
  update: (id: number, shiftData: { shift_date?: string; shift_type?: string; status?: string; notes?: string }) => {
    const updates = [];
    const params = [];

    // Build dynamic update statement
    Object.entries(shiftData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) {
      return { changes: 0 };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id); // Add id for WHERE clause

    const stmt = db.prepare(`
      UPDATE shifts 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  },

  // Delete a shift
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM shifts WHERE id = ?');
    return stmt.run(id);
  }
});

// Basic CRUD operations for teams
const createTeamOperations = (db: any) => ({
  // Create a new team
  create: (teamData: { name: string; description?: string }) => {
    const stmt = db.prepare(`
      INSERT INTO teams (name, description)
      VALUES (?, ?)
    `);
    return stmt.run(
      teamData.name,
      teamData.description || null
    );
  },

  // Get all teams
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM teams ORDER BY name');
    return stmt.all();
  },

  // Get a team by ID
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM teams WHERE id = ?');
    return stmt.get(id);
  },

  // Get nurses by team ID
  getNursesByTeamId: (teamId: number) => {
    const stmt = db.prepare(`
      SELECT * FROM nurses
      WHERE team_id = ?
      ORDER BY name
    `);
    
    const nurses = stmt.all(teamId);
    
    // Parse the JSON string to an array for each nurse
    return nurses.map((nurse: any) => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    }));
  },

  // Get nurses not assigned to any team
  getUnassignedNurses: () => {
    const stmt = db.prepare(`
      SELECT * FROM nurses
      WHERE team_id IS NULL
      ORDER BY name
    `);
    
    const nurses = stmt.all();
    
    // Parse the JSON string to an array for each nurse
    return nurses.map((nurse: any) => ({
      ...nurse,
      available_shift_types: JSON.parse(nurse.available_shift_types || '["Day","Evening","Night"]')
    }));
  },

  // Update a team
  update: (id: number, teamData: { name?: string; description?: string }) => {
    const updates = [];
    const params = [];

    // Build dynamic update statement
    Object.entries(teamData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length === 0) {
      return { changes: 0 };
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id); // Add id for WHERE clause

    const stmt = db.prepare(`
      UPDATE teams 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  },

  // Delete a team
  delete: (id: number) => {
    // First, set team_id to NULL for all nurses in this team
    const updateNursesStmt = db.prepare(`
      UPDATE nurses
      SET team_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE team_id = ?
    `);
    updateNursesStmt.run(id);
    
    // Then delete the team
    const stmt = db.prepare('DELETE FROM teams WHERE id = ?');
    return stmt.run(id);
  }
});

// Initialize and export database operations
let nurseOperations: any = {};
let shiftOperations: any = {};
let teamOperations: any = {};

const initDb = async () => {
  if (!db) {
    db = await initializeDatabase();
    nurseOperations = createNurseOperations(db);
    shiftOperations = createShiftOperations(db);
    teamOperations = createTeamOperations(db);
  }
  return { db, nurseOperations, shiftOperations, teamOperations };
};

// Export as async operations
export { 
  initDb,
  db,
  nurseOperations,
  shiftOperations,
  teamOperations
}; 