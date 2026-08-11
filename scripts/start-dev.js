'use strict';

const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const applications = {
  admin: { directory: 'BusTrackerAdmin-main', url: 'http://localhost:3002' },
  parent: { directory: 'BusTrackerFront-end-main', url: 'http://localhost:3000' }
};

const selected = process.argv[2];
const application = applications[selected];

if (!application) {
  console.error('Usage: node scripts/start-dev.js <admin|parent>');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function start(command, args, options) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.push(child);
  return child;
}

function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(stop);
  process.exit(exitCode);
}

const api = start(process.execPath, ['server.js'], { cwd: root });

const npmCommand = process.platform === 'win32'
  ? (process.env.ComSpec || 'cmd.exe')
  : 'npm';
const npmArguments = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm.cmd start']
  : ['start'];

const frontend = start(npmCommand, npmArguments, {
  cwd: path.join(root, application.directory),
  env: { ...process.env, BROWSER: 'none' }
});

console.log(`API : http://localhost:9000`);
console.log(`Application ${selected} : ${application.url}`);

api.on('exit', code => shutdown(code || 1));
frontend.on('exit', code => shutdown(code || 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
