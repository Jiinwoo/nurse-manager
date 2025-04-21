import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';
import { NurseOperations, ShiftOperations, TeamOperations, ShiftPreferenceOperations } from './database/operations';

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
    
    // Create shift preferences table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS shift_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nurse_id INTEGER NOT NULL,
        preference_date TEXT NOT NULL,
        preference_type TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
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

// Initialize and export database operations
let nurseOperations: NurseOperations;
let shiftOperations: ShiftOperations;
let teamOperations: TeamOperations;
let shiftPreferenceOperations: ShiftPreferenceOperations;

const initDb = async () => {
  if (!db) {
    db = await initializeDatabase();
    nurseOperations = new NurseOperations(db);
    shiftOperations = new ShiftOperations(db);
    teamOperations = new TeamOperations(db);
    shiftPreferenceOperations = new ShiftPreferenceOperations(db);
  }
  return { db, nurseOperations, shiftOperations, teamOperations, shiftPreferenceOperations };
};

// Export as async operations
export { 
  initDb,
  db,
  nurseOperations,
  shiftOperations,
  teamOperations,
  shiftPreferenceOperations
}; 