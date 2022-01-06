import * as dotenv from 'dotenv';
dotenv.config({path: process.cwd() + '/.env'});
import {initApp} from '../';
import WebSocket from 'ws';
import {TemplatedApp} from 'uWebSockets.js';

async function startServer(): Promise<TemplatedApp> {
  const wsApp = await initApp(false);
  wsApp.listen(
    '0.0.0.0',
    parseInt(process.env.APP_PORT ? process.env.APP_PORT : '3020'),
    listenSocket => {
      if (listenSocket) {
        //
      } else {
        console.error('failed to start server');
      }
    },
  );
  return wsApp;
}

async function konek(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const port = process.env.APP_PORT ? process.env.APP_PORT : '3200';
    const client = new WebSocket(`ws://localhost:${port}/websocket`);
    client.on('open', function () {
      resolve(client);
    });
    client.on('error', function () {
      reject();
    });
  });
}

async function kirim(client: WebSocket, msg: string): Promise<Buffer> {
  return new Promise(resolve => {
    client.on('message', function (message) {
      const b = message as Buffer;
      resolve(b);
    });

    client.send(msg);
  });
}

describe('test Connection', () => {
  let client: WebSocket;
  beforeAll(async () => {
    await startServer();
    client = await konek();
  });
  afterAll(() => {
    client.close();
  });

  it('test web socket', async () => {
    const t = {
      test: 'test',
    };
    const hasil: Buffer = await kirim(client, JSON.stringify(t));
    const str = hasil.toString();
    expect(str).toBe('{}');
  });
});
