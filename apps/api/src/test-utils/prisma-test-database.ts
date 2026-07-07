import { execFileSync } from 'child_process';
import { join } from 'path';

export function migrateTestDatabase(dbPath: string): void {
  const projectRoot = join(__dirname, '../..');
  const migrationPath = join(
    projectRoot,
    'prisma/migrations/001_init/migration.sql',
  );
  process.env.DATABASE_URL = sqliteFileUrl(dbPath);

  execFileSync('/usr/bin/sqlite3', [dbPath, `.read ${migrationPath}`], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'pipe',
  });
}

export function sqliteFileUrl(dbPath: string): string {
  return dbPath.startsWith('file:') ? dbPath : `file://${dbPath}`;
}
