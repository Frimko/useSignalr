import { execSync } from 'node:child_process';

function getParameterValue(paramName: string): string | null {
  const params = process.argv.find(function findParameter(
    arg: string,
  ): boolean {
    return Boolean(arg.match(`^--${paramName}=.*$`));
  });

  return params ? params.split('=')[1] : null;
}

function shell(cmd: string): ReturnType<typeof execSync> {
  return execSync(cmd, { stdio: ['pipe', 'pipe', 'inherit'] });
}

function publish(): void {
  const msg = getParameterValue('commit-message');
  if (!msg) {
    throw new Error('not have param');
  }

  const re = /^#\d+/i;
  const issueNumMatch = msg.match(re);

  if (!issueNumMatch || !issueNumMatch[0]) {
    throw new Error(
      'The last commit does not contain the issue number. Please make sure the commit message matches the pattern #{issue-num}-message.',
    );
  }

  const issueNum = issueNumMatch[0].trim().replace('#', '');
  shell(
    `npm version prepatch --preid "alpha-${issueNum}" && npm publish --tag alpha-${issueNum}`,
  );
}

publish();
