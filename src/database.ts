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
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS nurses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        employee_id TEXT UNIQUE NOT NULL,
        department TEXT,
        position TEXT,
        contact TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
  create: (nurseData: { name: string; employee_id: string; department?: string; position?: string; contact?: string }) => {
    const stmt = db.prepare(`
      INSERT INTO nurses (name, employee_id, department, position, contact)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      nurseData.name,
      nurseData.employee_id,
      nurseData.department || null,
      nurseData.position || null,
      nurseData.contact || null
    );
  },

  // Get all nurses
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM nurses ORDER BY name');
    return stmt.all();
  },

  // Get a nurse by ID
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM nurses WHERE id = ?');
    return stmt.get(id);
  },

  // Update a nurse
  update: (id: number, nurseData: { name?: string; employee_id?: string; department?: string; position?: string; contact?: string }) => {
    const updates = [];
    const params = [];

    // Build dynamic update statement
    Object.entries(nurseData).forEach(([key, value]) => {
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
      UPDATE nurses 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  },

  // Delete a nurse
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM nurses WHERE id = ?');
    return stmt.run(id);
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

// Initialize and export database operations
let nurseOperations: any = {};
let shiftOperations: any = {};

const initDb = async () => {
  if (!db) {
    db = await initializeDatabase();
    nurseOperations = createNurseOperations(db);
    shiftOperations = createShiftOperations(db);
  }
  return { db, nurseOperations, shiftOperations };
};

// Export as async operations
export { 
  initDb,
  db,
  nurseOperations,
  shiftOperations
}; 