import fs from 'node:fs';
import chalk from 'chalk';

import paths from '../paths';
import buildTypes from './steps/buildTypes';
import copyOtherFiles from './steps/copyOtherFiles';
import { getPackageName, measure, shell, step } from '../utils';

const { red, yellow } = chalk;

function mkDir(): void {
  fs.mkdirSync(paths.prepackDir, { recursive: true });
  fs.mkdirSync(paths.distDistDir, { recursive: true });
}

function clean(): void {
  fs.rmSync(paths.distDir, { force: true, recursive: true });
  fs.rmSync(paths.prepackDir, { force: true, recursive: true });
  fs.rmSync(paths.tsbuildinfo, { force: true });
}

const runBuildTypes = step(
  'generating .d.ts',
  async function buildTypesStep(): Promise<void> {
    buildTypes(paths.distDistDir);
  },
);

const runBuild = step('es modules', async function buildStep(): Promise<void> {
  shell('yarn build');
});

const runBuildCopyOtherFiles = step(
  'copy other files',
  async function copyOtherFilesStep(): Promise<void> {
    await copyOtherFiles(paths.distSrcDir);
  },
);

async function run(): Promise<void> {
  try {
    await measure(async function buildAll() {
      console.log('\n');
      console.log(yellow(`start ${getPackageName()}`));
      clean();
      mkDir();
      await runBuild();
      await runBuildTypes();
      await runBuildCopyOtherFiles();
      console.log(
        yellow('------------------------------------------------------'),
      );
    }, '🎉 All done in ');
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.stack || error.message : String(error);

    console.error(red(message));

    process.exit(1);
  }
}

Promise.resolve(true).then(run);
