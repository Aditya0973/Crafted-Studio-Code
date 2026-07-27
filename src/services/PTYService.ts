import { EventEmitter } from 'events';
import { spawn, exec, ChildProcess } from 'child_process';
import os from 'os';

export interface PTYOptions {
  id: string;
  cwd: string;
  shellPath?: string;
  cols?: number;
  rows?: number;
}

export interface PTYInstance {
  id: string;
  cwd: string;
  shellPath: string;
  pid?: number;
  onData: (callback: (data: string) => void) => () => void;
  onExit: (callback: (code: number) => void) => () => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
}

// Dynamic load node-pty if native module is compiled
let nodePty: typeof import('node-pty') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodePty = require('node-pty');
} catch {
  nodePty = null;
}

export class PTYService {
  private static instance: PTYService | null = null;
  private instances: Map<string, PTYInstance> = new Map();

  private constructor() {}

  public static getInstance(): PTYService {
    if (!PTYService.instance) {
      PTYService.instance = new PTYService();
    }
    return PTYService.instance;
  }

  // Get default OS shell
  public getDefaultShell(): string {
    if (os.platform() === 'win32') {
      return process.env.COMSPEC || 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  // Create terminal PTY process
  public createPTY(options: PTYOptions): PTYInstance {
    const { id, cwd, cols = 80, rows = 24 } = options;

    if (this.instances.has(id)) {
      return this.instances.get(id)!;
    }

    const shell = options.shellPath || this.getDefaultShell();

    // 1. Native node-pty module
    if (nodePty) {
      try {
        const ptyProc = nodePty.spawn(shell, [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd,
          env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
        });

        const emitter = new EventEmitter();

        ptyProc.onData((data: string) => emitter.emit('data', data));
        ptyProc.onExit(({ exitCode }) => emitter.emit('exit', exitCode));

        const instance: PTYInstance = {
          id,
          cwd,
          shellPath: shell,
          pid: ptyProc.pid,
          onData: (cb) => {
            emitter.on('data', cb);
            return () => emitter.off('data', cb);
          },
          onExit: (cb) => {
            emitter.on('exit', cb);
            return () => emitter.off('exit', cb);
          },
          write: (data: string) => ptyProc.write(data),
          resize: (c: number, r: number) => {
            try {
              ptyProc.resize(c, r);
            } catch {
              /* ignore resize bounds */
            }
          },
          kill: () => {
            try {
              if (os.platform() === 'win32' && ptyProc.pid) {
                exec(`taskkill /F /T /PID ${ptyProc.pid}`);
              } else {
                ptyProc.kill();
              }
            } catch {
              ptyProc.kill();
            }
          },
        };

        this.instances.set(id, instance);
        return instance;
      } catch (err) {
        console.warn('[PTYService] Native node-pty spawn failed, falling back to process stream:', err);
      }
    }

    // 2. Fallback stdio process stream
    const isWin = os.platform() === 'win32';
    const shellArgs = isWin
      ? shell.toLowerCase().includes('powershell')
        ? ['-NoLogo', '-NoExit']
        : []
      : ['-i'];

    const child: ChildProcess = spawn(shell, shellArgs, {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
      },
      shell: true,
    });

    const emitter = new EventEmitter();

    if (child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => emitter.emit('data', chunk.toString('utf-8')));
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => emitter.emit('data', chunk.toString('utf-8')));
    }

    child.on('exit', (code) => emitter.emit('exit', code || 0));

    const fallbackInstance: PTYInstance = {
      id,
      cwd,
      shellPath: shell,
      pid: child.pid,
      onData: (cb) => {
        emitter.on('data', cb);
        return () => emitter.off('data', cb);
      },
      onExit: (cb) => {
        emitter.on('exit', cb);
        return () => emitter.off('exit', cb);
      },
      write: (data: string) => {
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(data);
        }
      },
      resize: () => {
        /* No-op on fallback */
      },
      kill: () => {
        try {
          if (child.pid && isWin) {
            exec(`taskkill /F /T /PID ${child.pid}`);
          } else {
            child.kill();
          }
        } catch {
          /* ignore */
        }
      },
    };

    this.instances.set(id, fallbackInstance);
    return fallbackInstance;
  }

  // Get PTY by ID
  public getPTY(id: string): PTYInstance | undefined {
    return this.instances.get(id);
  }

  // Kill PTY instance & child process tree
  public killPTY(id: string): void {
    const inst = this.instances.get(id);
    if (inst) {
      inst.kill();
      this.instances.delete(id);
    }
  }

  // Kill all active PTY instances on app quit
  public killAll(): void {
    this.instances.forEach((inst) => inst.kill());
    this.instances.clear();
  }
}
