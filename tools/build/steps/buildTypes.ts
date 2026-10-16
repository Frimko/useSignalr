import paths from '../../paths';
import { shell } from '../../utils';

function buildTypes(outDir: string): void {
  const args: string[] = [
    '--project',
    paths.tsconfigBuild,
    '--d',
    '--emitDeclarationOnly',
    '--outDir',
    outDir,
  ];

  const command = ['yarn tsc', ...args].join(' ');
  shell(command);
}

export default buildTypes;
