import fs from 'node:fs';
import path from 'node:path';

type PackageMetadata = {
  sideEffects: boolean;
  module: string;
  typings: string;
};

function isFile(pathFile: string): boolean {
  return fs.statSync(pathFile).isFile();
}

function isDir(pathDir: string): boolean {
  return fs.statSync(pathDir).isDirectory();
}

function findDirs(dirPath: string): string[] {
  const dirList = fs.readdirSync(dirPath);
  return dirList.flatMap(function findDirectory(name: string): string[] {
    const pathToItem = path.join(dirPath, name);
    if (isFile(pathToItem) && name === 'index.d.ts') {
      return [path.join(dirPath)];
    }

    if (!isDir(pathToItem)) {
      return [];
    }

    return findDirs(pathToItem);
  });
}

/**
 * @see https://webpack.js.org/guides/tree-shaking/
 */
async function addPackages(outDir: string): Promise<string[]> {
  const files = findDirs(outDir);

  await Promise.all(
    files.map(async function addPackage(filePath: string): Promise<void> {
      const data: PackageMetadata = {
        sideEffects: false,
        module: './index.js',
        typings: './index.d.ts',
      };

      await fs.promises.writeFile(
        `${filePath}/package.json`,
        JSON.stringify(data, null, 2),
      );
    }),
  );

  return files;
}

export default addPackages;
