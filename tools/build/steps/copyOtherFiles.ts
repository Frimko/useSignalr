import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

import paths from '../../paths';

const { cyan, green } = chalk;
const extensions = new Set<string>(['.ts', '.md']);

async function findFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async function findEntry(entry): Promise<string[]> {
      const filePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findFiles(filePath);
      }

      return extensions.has(path.extname(entry.name).toLowerCase())
        ? [filePath]
        : [];
    }),
  );

  return nestedFiles.flat();
}

async function copyOtherFiles(outDir: string): Promise<string[]> {
  const files = await findFiles(paths.srcDir);
  const copiedFiles = await Promise.all(
    files.map(async function copyFile(filePath: string): Promise<string> {
      const relativePath = path.relative(paths.srcDir, filePath);
      const destination = path.join(outDir, relativePath);

      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(filePath, destination);

      return destination;
    }),
  );

  console.log(cyan('Count files: ') + green(copiedFiles.length));
  return copiedFiles;
}

export default copyOtherFiles;
