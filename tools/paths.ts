import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathFromConsole = fs.realpathSync(process.cwd());

function packageDirectory(relativePath: string) {
  return path.resolve(pathFromConsole, relativePath);
}

function rootDirectory(relativePath: string) {
  return path.resolve(__dirname, '..', relativePath);
}

const paths = {
  rootDir: rootDirectory('.'),

  packageJson: packageDirectory('package.json'),
  tsconfigBuild: packageDirectory('tsconfig.build.json'),
  tsbuildinfo: packageDirectory('tsconfig.tsbuildinfo'),
  srcDir: packageDirectory('src'),
  packageRoot: packageDirectory('.'),
  tsConfig: packageDirectory('tsconfig.json'),
  readmeFile: rootDirectory('README.md'),

  distDir: packageDirectory('dist'),
  prepackDir: packageDirectory('prepack'),
  distDistDir: packageDirectory('prepack/dist'),
  distSrcDir: packageDirectory('prepack/src'),
  distPackage: packageDirectory('prepack/package.json'),
  distReadmeFile: packageDirectory('prepack/README.md'),
};

export default paths;
