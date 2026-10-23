import { execSync } from 'node:child_process';
import * as dotenv from 'dotenv';
import paths from './paths';

function shell(cmd: string): ReturnType<typeof execSync> {
  return execSync(cmd, { stdio: ['pipe', 'pipe', 'inherit'] });
}

function publish(): void {
  const dotenvResult = dotenv.config({
    path: paths.envFile,
  });

  if (dotenvResult.parsed && 'NPM_ACCESS_TOKEN' in dotenvResult.parsed) {
    const token = dotenvResult.parsed['NPM_ACCESS_TOKEN'];
    shell(
      `cd ./prepack && npm publish --//registry.npmjs.org/:_authToken="${token}"`,
    );
  } else {
    throw new Error('No ACCESS_TOKEN in .env file');
  }
}

publish();
