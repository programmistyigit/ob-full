import { createLogger } from './logger';

const logger = createLogger('TargetIDs');

export class TargetIDList {
  private static instance: TargetIDList;
  private targetIds: Set<number>;

  private constructor() {
    this.targetIds = new Set<number>();
    this.loadFromEnv();
  }

  public static getInstance(): TargetIDList {
    if (!TargetIDList.instance) {
      TargetIDList.instance = new TargetIDList();
    }
    return TargetIDList.instance;
  }

  private loadFromEnv(): void {
    const envTargets = process.env.TARGET_IDS || '';
    if (envTargets) {
      const ids = envTargets.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      ids.forEach(id => this.targetIds.add(id));
      logger.info({ count: ids.length }, 'Loaded target IDs from environment');
    }
  }

  public isTarget(userId: number): boolean {
    return this.targetIds.has(userId);
  }

  public addTarget(userId: number): void {
    this.targetIds.add(userId);
    logger.info({ userId }, 'Added target ID');
  }

  public removeTarget(userId: number): void {
    this.targetIds.delete(userId);
    logger.info({ userId }, 'Removed target ID');
  }

  public getTargets(): number[] {
    return Array.from(this.targetIds);
  }

  public hasTargets(): boolean {
    return this.targetIds.size > 0;
  }
}

export const targetIDList = TargetIDList.getInstance();
