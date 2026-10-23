import { config } from 'dotenv';
import { resolve } from 'node:path';

export function loadRootEnvironment(
  fromDirectory: string = __dirname,
  processEnvironment: Record<string, string> = process.env as Record<string, string>,
): void {
  config({ path: resolve(fromDirectory, '../../../../.env'), processEnv: processEnvironment, quiet: true });
}

loadRootEnvironment();
