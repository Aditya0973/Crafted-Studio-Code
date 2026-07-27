import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { initializeSchema } from './schema';

export interface IDatabaseStatement {
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface IDatabase {
  prepare(sql: string): IDatabaseStatement;
  exec(sql: string): void;
  pragma(sql: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close(): void;
}

class SqlJsAdapter implements IDatabase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private dbFilePath: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any, dbFilePath: string) {
    this.db = db;
    this.dbFilePath = dbFilePath;
  }

  private saveDisk(): void {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbFilePath, buffer);
    } catch (err) {
      console.error('[Database] Error persisting sql.js database to disk:', err);
    }
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.saveDisk();
  }

  pragma(sql: string): void {
    try {
      this.db.exec(`PRAGMA ${sql};`);
    } catch {
      // Ignore pragmas unsupported in WASM SQLite
    }
  }

  prepare(sql: string): IDatabaseStatement {
    const adapter = this;
    return {
      get(...params: unknown[]): Record<string, unknown> | undefined {
        const stmt = adapter.db.prepare(sql);
        try {
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const obj = stmt.getAsObject();
            return obj as Record<string, unknown>;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all(...params: unknown[]): Record<string, unknown>[] {
        const stmt = adapter.db.prepare(sql);
        const results: Record<string, unknown>[] = [];
        try {
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject() as Record<string, unknown>);
          }
          return results;
        } finally {
          stmt.free();
        }
      },

      run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
        adapter.db.run(sql, params);
        adapter.saveDisk();
        return { changes: adapter.db.getRowsModified(), lastInsertRowid: 0 };
      },
    };
  }

  transaction<T extends (...args: any[]) => any>(fn: T): T {
    const adapter = this;
    return ((...args: any[]) => {
      adapter.db.exec('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        adapter.db.exec('COMMIT;');
        adapter.saveDisk();
        return result;
      } catch (err) {
        adapter.db.exec('ROLLBACK;');
        throw err;
      }
    }) as T;
  }

  close(): void {
    this.saveDisk();
    this.db.close();
  }
}

let dbInstance: IDatabase | null = null;

export async function initDatabaseAsync(dbDir: string): Promise<IDatabase> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'crafted_studio.db');
  console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

  let loadedNative = false;

  // Attempt native better-sqlite3 instantiation
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const nativeDb = new BetterSqlite3(dbPath);
    console.log('[Database] Loaded Native Better SQLite3 driver successfully.');

    dbInstance = {
      prepare: (sql) => nativeDb.prepare(sql),
      exec: (sql) => nativeDb.exec(sql),
      pragma: (sql) => nativeDb.pragma(sql),
      transaction: (fn) => nativeDb.transaction(fn),
      close: () => nativeDb.close(),
    };
    loadedNative = true;
  } catch {
    console.warn('[Database] Native better-sqlite3 addon unavailable. Using WebAssembly SQLite engine.');
  }

  if (!loadedNative) {
    let fileBuffer: Buffer | undefined;
    if (fs.existsSync(dbPath)) {
      fileBuffer = fs.readFileSync(dbPath);
    }

    const SQL = await initSqlJs();
    const sqlJsDb = new SQL.Database(fileBuffer);
    dbInstance = new SqlJsAdapter(sqlJsDb, dbPath);
  }

  const activeDb = dbInstance as IDatabase;
  initializeSchema(activeDb);
  return activeDb;
}

export function initDatabase(dbDir: string): IDatabase {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'crafted_studio.db');
  console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

  // Attempt native better-sqlite3 instantiation
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const nativeDb = new BetterSqlite3(dbPath);
    console.log('[Database] Loaded Native Better SQLite3 driver successfully.');

    dbInstance = {
      prepare: (sql) => nativeDb.prepare(sql),
      exec: (sql) => nativeDb.exec(sql),
      pragma: (sql) => nativeDb.pragma(sql),
      transaction: (fn) => nativeDb.transaction(fn),
      close: () => nativeDb.close(),
    };
    initializeSchema(dbInstance);
    return dbInstance;
  } catch {
    console.warn('[Database] Native better-sqlite3 addon unavailable. Falling back to WASM engine.');
  }

  let fileBuffer: Buffer | undefined;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }

  // Synchronous sql.js fallback for Node main process environment
  const SQLModule = require('sql.js/js/sql-debug.js') || require('sql.js');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sqlJsDb: any;
  if (SQLModule.Database) {
    sqlJsDb = new SQLModule.Database(fileBuffer);
  } else {
    // Synchronous fallback node sqlite memory adapter
    throw new Error('Unable to initialize synchronous SQLite engine.');
  }

  dbInstance = new SqlJsAdapter(sqlJsDb, dbPath);
  initializeSchema(dbInstance);
  return dbInstance;
}

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[Database] Closed SQLite database connection.');
  }
}
