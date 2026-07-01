import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), '.data', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export type LogType = 'worker' | 'queue' | 'errors' | 'network';

export interface LogParams {
  workerId?: string;
  domain?: string;
  status?: string;
  processingTimeMs?: number;
  retryCount?: number;
  message?: string;
}

export class LoggerService {
  private static MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB rotating threshold

  /**
   * Logs an entry to the specified log type with rotational safety.
   */
  static log(type: LogType, params: LogParams): void {
    try {
      const logFile = path.join(LOG_DIR, `${type}.log`);
      
      // Perform log rotation if file exceeds threshold
      this.rotateIfNeeded(logFile);

      const timestamp = new Date().toISOString();
      const workerId = params.workerId || 'SYSTEM';
      const domain = params.domain || 'N/A';
      const status = params.status || 'N/A';
      const duration = params.processingTimeMs !== undefined ? `${params.processingTimeMs}ms` : 'N/A';
      const retry = params.retryCount !== undefined ? params.retryCount : '0';
      const message = params.message ? ` - ${params.message}` : '';

      const logLine = `[${timestamp}] [Worker: ${workerId}] [Domain: ${domain}] [Status: ${status}] [Duration: ${duration}] [Retry: ${retry}]${message}\n`;

      fs.appendFileSync(logFile, logLine, 'utf-8');

      // Also mirror errors to the central console
      if (type === 'errors') {
        console.error(`[LOGGER - ERROR] ${logLine.trim()}`);
      }
    } catch (err) {
      console.error('[LoggerService] Failed to write to log:', err);
    }
  }

  /**
   * Rotates a log file if its size exceeds the threshold.
   */
  private static rotateIfNeeded(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return;

      const stats = fs.statSync(filePath);
      if (stats.size < this.MAX_LOG_SIZE) return;

      // Rotate file (keep .1.log, .2.log)
      const rotatedPath1 = `${filePath}.1`;
      const rotatedPath2 = `${filePath}.2`;

      if (fs.existsSync(rotatedPath1)) {
        if (fs.existsSync(rotatedPath2)) {
          fs.unlinkSync(rotatedPath2);
        }
        fs.renameSync(rotatedPath1, rotatedPath2);
      }
      fs.renameSync(filePath, rotatedPath1);
    } catch (err) {
      console.error('[LoggerService] Error during log rotation:', err);
    }
  }

  // Convenient shorthand wrappers
  static worker(workerId: string, domain: string, status: string, durationMs: number, retry: number, message?: string): void {
    this.log('worker', { workerId, domain, status, processingTimeMs: durationMs, retryCount: retry, message });
  }

  static queue(domain: string, status: string, message?: string): void {
    this.log('queue', { domain, status, message });
  }

  static error(domain: string, message: string, workerId?: string, retry?: number): void {
    this.log('errors', { domain, status: 'FAILED', workerId, retryCount: retry, message });
  }

  static network(domain: string, status: string, durationMs: number, message?: string): void {
    this.log('network', { domain, status, processingTimeMs: durationMs, message });
  }
}
