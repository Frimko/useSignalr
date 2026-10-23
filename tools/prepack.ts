import fs from 'node:fs';

import paths from './paths';

type PackageJson = Record<string, unknown>;

function parsePackageJson(json: string): PackageJson {
  const parsed: unknown = JSON.parse(json);

  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return parsed as PackageJson;
  }

  return {};
}

function getDistPackageObject(): PackageJson {
  try {
    const distPackageJson = fs.readFileSync(paths.prepackPackage, 'utf8');
    return parsePackageJson(distPackageJson);
    // eslint-disable-next-line no-empty
  } catch {}

  return {};
}

function copySyncIfExist(filePathFrom: string, filePathTo: string): void {
  if (fs.existsSync(filePathFrom)) {
    fs.copyFileSync(filePathFrom, filePathTo);
  }
}

// alternative, without lodash methods
function omit(obj: PackageJson, keys: readonly string[]): PackageJson {
  return Object.fromEntries(
    Object.entries(obj).filter(function ([key]) {
      return !keys.includes(key);
    }),
  );
}

function preparePackage(): void {
  try {
    const packageJson = fs.readFileSync(paths.packageJson, 'utf8');
    const object = parsePackageJson(packageJson);
    const distPackageObject = getDistPackageObject();
    const newObject = omit({ ...object, ...distPackageObject }, [
      'scripts',
      'lint-staged',
      'jest',
      'devDependencies',
    ]);

    fs.writeFileSync(paths.prepackPackage, JSON.stringify(newObject, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    });

    copySyncIfExist(paths.readmeFile, paths.prepackReadmeFile);
  } catch (error: unknown) {
    console.error(error);

    process.exit(1);
  }
}

preparePackage();
