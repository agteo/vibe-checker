import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
const backendPort = Number(process.env.PORT || 3001);

function log(name, message, stream = process.stdout) {
  stream.write(`[${name}] ${message}\n`);
}

function isPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        resolve(false);
        return;
      }

      reject(error);
    });
  });
}

function run(name, args) {
  const child = process.platform === 'win32'
    ? spawn(`${npmCommand} ${args.join(' ')}`, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      })
    : spawn(npmCommand, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

  const prefix = `[${name}] `;

  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefix + chunk.toString().replace(/\n/g, `\n${prefix}`).replace(`${prefix}$`, ''));
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefix + chunk.toString().replace(/\n/g, `\n${prefix}`).replace(`${prefix}$`, ''));
  });

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    process.stdout.write(`${prefix}stopped with ${reason}\n`);

    if (signal || (code ?? 0) !== 0) {
      shutdown(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  while (children.length > 0) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(exitCode), 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  run('frontend', ['run', 'dev:frontend']);

  try {
    const backendAlreadyRunning = await isPortInUse(backendPort);

    if (backendAlreadyRunning) {
      log('backend', `port ${backendPort} is already in use, assuming an existing backend is available and skipping duplicate startup`);
      return;
    }

    run('backend', ['run', 'dev:backend']);
  } catch (error) {
    log(
      'backend',
      `failed to check port ${backendPort}: ${error instanceof Error ? error.message : 'unknown error'}`,
      process.stderr
    );
    shutdown(1);
  }
}

main();
