/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as dotenv from 'dotenv';
dotenv.config({path: process.cwd() + '/.env'});
import {initApp} from '../';
import WebSocket from 'ws';
import {TemplatedApp} from 'uWebSockets.js';
import {MediaWorker} from '../lib';

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

function isUUID(uuid: string): boolean {
  const s = uuid.match(
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$',
  );
  if (s === null) {
    return false;
  }
  return true;
}

describe('test Connection', () => {
  let client: WebSocket;
  let cid: string;
  //let wsa: TemplatedApp;
  beforeAll(async () => {
    await startServer();
    client = await konek();

    const media = MediaWorker.getInstance();
    const mediasoupWorker = media.getMediasoupWorker();
    const rooms = media.Rooms;

    await media.createRooms('testing', mediasoupWorker, rooms);
  });
  afterAll(() => {
    client.close();
  });

  it('send json', async () => {
    const t = {
      test: 'test',
    };
    const hasil: Buffer = await kirim(client, JSON.stringify(t));
    const str = hasil.toString();
    expect(str).toBe('{}');
  });

  it('send text', async () => {
    const t = 'test';
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    expect(str).toBe('{}');
  });

  it('send Login', async () => {
    const t = JSON.stringify({
      method: 'LOGIN',
    });
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    const js = JSON.parse(str);
    cid = js.response.id;
    expect(js.response.result).toBe(200);
    expect(isUUID(cid)).toBe(true);
  });

  it('Join Room not found', async () => {
    const t = JSON.stringify({
      method: 'joinRoom',
      data: {
        participantName: 'saya sendiri',
        roomName: 'saya sendiri',
      },
    });
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    const js = JSON.parse(str);
    expect(js.response.result).toBe(400);
  });

  it('Join Room found', async () => {
    const roomName = 'testing';
    const participantName = 'saya sendiri';
    const t = JSON.stringify({
      method: 'joinRoom',
      data: {
        participantName: participantName,
        roomName: roomName,
      },
    });
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    const js = JSON.parse(str);
    expect(js.response.result).toBe(200);

    const media = MediaWorker.getInstance();
    const rooms = media.Rooms;
    expect(rooms.has(roomName)).toBe(true);

    const room = rooms.get(roomName);
    const cclient = room?.client;
    expect(cclient?.has(cid)).toBe(true);

    const cl = cclient?.get(cid);
    expect(cl?.participantName).toBe(participantName);
  });

  it('getRouteCapability', async () => {
    const t = JSON.stringify({
      method: 'getRouteCapability',
    });
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    const js = JSON.parse(str);
    expect(js.response.result).toBe(200);
    const rtpCapabilities = js.response.rtpCapabilities;
    expect(rtpCapabilities).toHaveProperty('codecs');
    expect(rtpCapabilities).toHaveProperty('headerExtensions');
  });

  it('create Transport Producer', async () => {
    const t = JSON.stringify({
      method: 'createTransport',
      data: {
        type: 'producer',
      },
    });
    const hasil: Buffer = await kirim(client, t);
    const str = hasil.toString();
    const js = JSON.parse(str);
    expect(js.response.result).toBe(200);
    expect(js.response).toHaveProperty('type');
    expect(js.response).toHaveProperty('createTransport');
  });
});
