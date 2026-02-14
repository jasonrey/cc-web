import { existsSync, mkdirSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from './logger.js';

const OLD_DIR = join(homedir(), '.cc-web');
const NEW_DIR = join(homedir(), '.tofucode');

/**
 * Migrate data from .cc-web to .tofucode on first run
 * This is a one-time migration that runs automatically
 */
export function migrateFromCcWeb() {
  // Skip if new directory already exists (already migrated)
  if (existsSync(NEW_DIR)) {
    return;
  }

  // Skip if old directory doesn't exist (nothing to migrate)
  if (!existsSync(OLD_DIR)) {
    return;
  }

  logger.log('Migrating data from .cc-web to .tofucode...');

  try {
    // Create new directory
    mkdirSync(NEW_DIR, { recursive: true });

    // Files to migrate
    const filesToMigrate = ['.auth.json', 'settings.json'];

    let migratedCount = 0;
    for (const file of filesToMigrate) {
      const oldPath = join(OLD_DIR, file);
      const newPath = join(NEW_DIR, file);

      if (existsSync(oldPath)) {
        copyFileSync(oldPath, newPath);
        migratedCount++;
        logger.log(`  ✓ Migrated ${file}`);
      }
    }

    // Clean up old PID file if it exists (don't migrate it)
    const oldPidFile = join(OLD_DIR, 'cc-web.pid');
    if (existsSync(oldPidFile)) {
      try {
        unlinkSync(oldPidFile);
        logger.log('  ✓ Removed old cc-web.pid');
      } catch (err) {
        // Ignore if we can't delete it
      }
    }

    if (migratedCount > 0) {
      logger.log(`Migration complete! Migrated ${migratedCount} file(s).`);
      logger.log('Note: Old .cc-web directory is still present. You can safely delete it.');
    } else {
      logger.log('No data to migrate.');
    }
  } catch (err) {
    logger.error('Migration failed:', err.message);
    logger.error('You may need to manually copy files from ~/.cc-web to ~/.tofucode');
  }
}
