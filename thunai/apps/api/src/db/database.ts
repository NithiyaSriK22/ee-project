import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

export interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
}

export interface DatabaseConnection {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T;
  close(): void;
}

let dbInstance: DatabaseConnection | null = null;

export function getDatabase(dbPath?: string): DatabaseConnection {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = dbPath || ENV.DB_PATH;
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Try better-sqlite3
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const db = new BetterSqlite3(targetPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    dbInstance = {
      exec(sql: string) {
        db.exec(sql);
      },
      prepare(sql: string) {
        const stmt = db.prepare(sql);
        return {
          run(...params: unknown[]) {
            return stmt.run(...params);
          },
          get(...params: unknown[]) {
            return stmt.get(...params);
          },
          all(...params: unknown[]) {
            return stmt.all(...params);
          },
        };
      },
      transaction<T>(fn: (...args: any[]) => T) {
        return db.transaction(fn);
      },
      close() {
        db.close();
        dbInstance = null;
      },
    };

    return dbInstance;
  } catch (betterSqliteErr: any) {
    // 2. Fall back to built-in node:sqlite (Node 22+)
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(targetPath);
      db.exec('PRAGMA foreign_keys = ON;');

      dbInstance = {
        exec(sql: string) {
          db.exec(sql);
        },
        prepare(sql: string) {
          const stmt = db.prepare(sql);
          return {
            run(...params: unknown[]) {
              const res = stmt.run(...(params as any[]));
              return {
                changes: Number(res.changes || 0),
                lastInsertRowid: res.lastInsertRowid,
              };
            },
            get(...params: unknown[]) {
              return stmt.get(...(params as any[]));
            },
            all(...params: unknown[]) {
              return stmt.all(...(params as any[]));
            },
          };
        },
        transaction<T>(fn: (...args: any[]) => T) {
          return (...args: any[]) => {
            db.exec('BEGIN IMMEDIATE;');
            try {
              const result = fn(...args);
              db.exec('COMMIT;');
              return result;
            } catch (err) {
              db.exec('ROLLBACK;');
              throw err;
            }
          };
        },
        close() {
          db.close();
          dbInstance = null;
        },
      };

      return dbInstance;
    } catch (nodeSqliteErr: any) {
      throw new Error(
        `Failed to initialize SQLite database with better-sqlite3 or node:sqlite. Details: ${betterSqliteErr.message} | ${nodeSqliteErr.message}`
      );
    }
  }
}

export function initSchema(db: DatabaseConnection): void {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
