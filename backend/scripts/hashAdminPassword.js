import bcrypt from 'bcryptjs';

function readHiddenPassword() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command directly in an interactive terminal; do not pass a password as an argument.');
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let password = '';
    process.stdout.write('Admin password (input hidden): ');
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
    };
    const onData = (character) => {
      if (character === '\u0003') {
        cleanup();
        process.stdout.write('\nCancelled.\n');
        reject(new Error('Password entry cancelled'));
        return;
      }
      if (character === '\r' || character === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (character === '\u007f' || character === '\b') {
        password = password.slice(0, -1);
        return;
      }
      password += character;
    };

    input.on('data', onData);
  });
}

try {
  const password = await readHiddenPassword();
  if (Buffer.byteLength(password, 'utf8') < 14) {
    throw new Error('Use an admin password that is at least 14 bytes long.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Use an admin password that is no more than 72 bytes long.');
  }
  process.stdout.write(`${await bcrypt.hash(password, 12)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
