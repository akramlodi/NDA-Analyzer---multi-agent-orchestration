import type { JobData } from './types';

declare global {
  // eslint-disable-next-line no-var
  var __jobStore: Map<string, JobData> | undefined;
}

if (!global.__jobStore) {
  global.__jobStore = new Map<string, JobData>();
}

export const jobStore: Map<string, JobData> = global.__jobStore;
