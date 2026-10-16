import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

import paths from './paths';

const { yellow, magenta, cyan, green } = chalk;

interface Task {
  (): void | Promise<void>;
}

interface AsyncTask {
  (): Promise<void>;
}

async function measure(fn: Task, text = '✨  Done in '): Promise<void> {
  const start = new Date().getTime();
  await fn();
  const end = new Date().getTime();
  const ms = end - start;
  const seconds = (ms % 60000) / 1000;
  if (ms >= 1000) {
    const minutes = Math.floor(ms / 60000);
    console.log(
      yellow(
        `${text}${minutes ? `${minutes}m. ` : ''}${seconds ? `${seconds.toFixed(2)}s.` : ''}`,
      ),
    );
    return;
  }

  console.log(yellow(`${text}${seconds.toFixed(2)}s.`));
}

function step(name: string, fn: Task): AsyncTask {
  return async function runStep(): Promise<void> {
    await measure(async function measureStep() {
      console.log(
        magenta('------------------------------------------------------'),
      );
      console.log(cyan('Building: ') + green(name));
      await fn();
      console.log(cyan('Built: ') + green(name));
    });
  };
}

function shell(cmd: string): ReturnType<typeof execSync> {
  return execSync(cmd, {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: paths.rootDir,
  });
}

function getPackageName(): string {
  try {
    const pathJson = path.resolve(paths.packageRoot, 'package.json');
    const jsonFile = fs.readFileSync(pathJson, 'utf8');
    const object = JSON.parse(jsonFile) as { name?: unknown };

    if (typeof object.name !== 'string') {
      throw new Error('package.json does not contain a valid name');
    }

    return object.name;
  } catch (error: unknown) {
    console.error(error);

    process.exit(1);
  }
}

export { getPackageName, measure, step, shell };
