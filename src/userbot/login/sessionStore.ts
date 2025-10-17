import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SessionStore');

const SESSION_FILE = path.join(process.cwd(), 'src', 'storage', 'sessions', 'session.json');

export interface SessionData {
  userId: number;
  sessionString: string;
  phoneNumber?: string;
}

class SessionStore {
  private sessions: Map<number, string> = new Map();

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(SESSION_FILE, 'utf-8');
      const parsed: Record<string, string> = JSON.parse(data);
      
      for (const [key, value] of Object.entries(parsed)) {
        this.sessions.set(parseInt(key, 10), value);
      }
      
      logger.info({ count: this.sessions.size }, 'Sessions loaded');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('No session file found, starting fresh');
        await this.save();
      } else {
        logger.error({ error }, 'Failed to load sessions');
      }
    }
  }

  async save(): Promise<void> {
    try {
      const data: Record<string, string> = {};
      
      for (const [userId, sessionString] of this.sessions.entries()) {
        data[userId.toString()] = sessionString;
      }
      
      await fs.writeFile(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug({ count: this.sessions.size }, 'Sessions saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save sessions');
      throw error;
    }
  }

  async set(userId: number, sessionString: string): Promise<void> {
    this.sessions.set(userId, sessionString);
    await this.save();
    logger.info({ userId }, 'Session stored');
  }

  get(userId: number): string | undefined {
    return this.sessions.get(userId);
  }

  async delete(userId: number): Promise<void> {
    this.sessions.delete(userId);
    await this.save();
    logger.info({ userId }, 'Session deleted');
  }

  getAll(): Map<number, string> {
    return new Map(this.sessions);
  }

  has(userId: number): boolean {
    return this.sessions.has(userId);
  }
}

export const sessionStore = new SessionStore();
