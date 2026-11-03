import { request as requestFactory, test as base, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { ArticlesApi } from '../api/articles.api';
import { UsersApi } from '../api/users.api';
import { createApiRequestOptions } from '../helpers/api-request-options';

type ApiWorkerFixtures = {
  apiBaseURL: string;
};

type ApiFixtures = {
  apiRequest: APIRequestContext;
  articlesApi: ArticlesApi;
  usersApi: UsersApi;
};

async function getAvailablePort(): Promise<number> {
  const server = createServer();

  return new Promise((resolvePort, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not determine an available local API port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function waitForApiServer(
  baseURL: string,
  serverProcess: ChildProcess,
  getOutput: () => string,
  getStartError: () => Error | undefined,
): Promise<void> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const startError = getStartError();
    if (startError) {
      throw new Error(`Could not start the local API server.\n${startError.message}\n${getOutput()}`);
    }

    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      throw new Error(`Local API server exited before becoming ready.\n${getOutput()}`);
    }

    try {
      const response = await fetch(`${baseURL}/articles`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  }

  throw new Error(`Local API server did not become ready at ${baseURL}.\n${getOutput()}`);
}

async function stopApiServer(serverProcess: ChildProcess): Promise<void> {
  if (
    serverProcess.pid === undefined ||
    serverProcess.exitCode !== null ||
    serverProcess.signalCode !== null
  ) {
    return;
  }

  await new Promise<void>((resolveStop) => {
    let stopped = false;
    const finish = () => {
      if (!stopped) {
        stopped = true;
        clearTimeout(forceStopTimer);
        resolveStop();
      }
    };
    const forceStopTimer = setTimeout(() => {
      serverProcess.kill('SIGKILL');
    }, 5_000);
    serverProcess.once('exit', () => {
      finish();
    });

    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      finish();
      return;
    }

    serverProcess.kill('SIGTERM');
  });
}

export const test = base.extend<ApiFixtures, ApiWorkerFixtures>({
  apiBaseURL: [
    async ({}, use) => {
      const port = await getAvailablePort();
      const temporaryDirectory = mkdtempSync(join(tmpdir(), 'sb-api-test-'));
      const databasePath = join(temporaryDirectory, 'db.json');
      const baseURL = `http://127.0.0.1:${port}`;
      try {
        copyFileSync(resolve(__dirname, '../../data/db.json'), databasePath);
        const serverProcess = spawn(
          process.execPath,
          [
            require.resolve('json-server/lib/cli/bin.js'),
            '--watch',
            databasePath,
            '--host',
            '127.0.0.1',
            '--port',
            String(port),
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        );
        let output = '';
        let startError: Error | undefined;
        const appendOutput = (chunk: Buffer) => {
          output = `${output}${chunk.toString()}`.slice(-4_000);
        };
        serverProcess.stdout?.on('data', appendOutput);
        serverProcess.stderr?.on('data', appendOutput);
        serverProcess.once('error', (error) => {
          startError = error;
        });

        try {
          await waitForApiServer(baseURL, serverProcess, () => output, () => startError);
          await use(baseURL);
        } finally {
          await stopApiServer(serverProcess);
        }
      } finally {
        rmSync(temporaryDirectory, { recursive: true, force: true });
      }
    },
    { scope: 'worker' },
  ],
  apiRequest: async ({ apiBaseURL }, use) => {
    const apiRequest = await requestFactory.newContext(createApiRequestOptions(apiBaseURL));
    try {
      await use(apiRequest);
    } finally {
      await apiRequest.dispose();
    }
  },
  articlesApi: async ({ apiRequest }, use) => {
    await use(new ArticlesApi(apiRequest));
  },
  usersApi: async ({ apiRequest }, use) => {
    await use(new UsersApi(apiRequest));
  },
});

export { expect };
