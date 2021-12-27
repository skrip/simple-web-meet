import * as dotenv from 'dotenv';
dotenv.config({path: process.cwd() + '/.env'});
import ws from 'uWebSockets.js';
import {toBuffer, MediaWorker, toArrayBuffer, Message} from './lib';
import {serveDir} from 'uwebsocket-serve';
import {lstatSync, Stats, readFile} from 'fs';
import {v4 as uuidv4} from 'uuid';
export const wsApp = ws.SSLApp({
  key_file_name: process.env.KEY_FILE,
  cert_file_name: process.env.CERT_FILE,
});

const publicPath = process.cwd() + '/dist/client';
const serveStatic = serveDir(publicPath);
const media = MediaWorker.getInstance();

import joinRoom = require('./api/ws/joinRoom');
import getRouteCapability = require('./api/ws/getRouteCapability');
import createTransport = require('./api/ws/createTransport');
import connectProducerTransport = require('./api/ws/connectProducerTransport');
import produce = require('./api/ws/produce');
import consume = require('./api/ws/consume');
import connectConsumerTransport = require('./api/ws/connectConsumerTransport');
import resume = require('./api/ws/resume');
import getRoomProducers = require('./api/ws/getRoomProducers');

wsApp.ws('/websocket', {
  idleTimeout: 4 * 10,
  maxBackpressure: 1024,
  compression: ws.SHARED_COMPRESSOR,
  maxPayloadLength: 32 * 1024 * 1024,
  open: () => {
    console.log('connect ');
  },
  close: ws => {
    let id = '';
    let roomName = '';
    if (ws.id) {
      id = ws.id as string;
    } else {
      console.log('tidak punya id ');
      return;
    }
    const tp: Array<string> = [];
    if (ws.roomName) {
      roomName = ws.roomName as string;
      tp.push(roomName);
    }

    const media = MediaWorker.getInstance();
    const rooms = media.Rooms;
    let participantName = '';

    tp.map(t => {
      // remove from client
      if (rooms.has(t)) {
        const clients = rooms.get(t)?.client;
        if (clients) {
          if (clients.has(id)) {
            const cl = clients?.get(id);

            if (!cl) {
              return;
            }

            participantName = cl.participantName;
            if (cl?.producer_transport) {
              cl?.producer_transport?.close();
              console.log('producer_transport closed');
            }

            const arrcons = cl.consumer_transports;
            for (let i = 0; i < arrcons.length; i++) {
              arrcons[i].consumer_transport?.close();
            }

            if (cl?.producer_video) {
              const producer_video = cl?.producer_video;
              for (const [key, value] of clients) {
                if (key !== id) {
                  const arrcons = value.consumer_transports;
                  for (let i = 0; i < arrcons.length; i++) {
                    const consumer_video = arrcons[i].consumer_video;
                    if (consumer_video) {
                      let i = consumer_video.length;
                      while (i--) {
                        if (consumer_video[i].producerId == producer_video.id) {
                          consumer_video.splice(i, 1);
                          console.log(
                            'consumer_video hapus ',
                            producer_video.id,
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
            if (cl?.producer_audio) {
              const producer_audio = cl?.producer_audio;
              for (const [key, value] of clients) {
                if (key !== id) {
                  const arrcons = value.consumer_transports;
                  for (let i = 0; i < arrcons.length; i++) {
                    const consumer_audio = arrcons[i].consumer_audio;
                    if (consumer_audio) {
                      let i = consumer_audio.length;
                      while (i--) {
                        if (consumer_audio[i].producerId == producer_audio.id) {
                          consumer_audio.splice(i, 1);
                          console.log(
                            'consumer_audio hapus ',
                            producer_audio.id,
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
            if (cl?.producer_data) {
              const producer_data = cl?.producer_data;
              for (const [key, value] of clients) {
                if (key !== id) {
                  const arrcons = value.consumer_transports;
                  for (let i = 0; i < arrcons.length; i++) {
                    const consumer_data = arrcons[i].consumer_data;
                    if (consumer_data) {
                      let i = consumer_data.length;
                      while (i--) {
                        if (consumer_data[i].producerId == producer_data.id) {
                          consumer_data.splice(i, 1);
                          console.log('consumer_data hapus ', producer_data.id);
                        }
                      }
                    }
                  }
                }
              }
            }
            clients.delete(id);
            console.log('clients hapus');

            const roomName = ws.roomName as string;
            const ps = {
              method: 'clientClose',
              response: {
                room: roomName,
                participantName: participantName,
              },
            };
            const buf = Buffer.from(JSON.stringify(ps), 'utf8');
            const ahas = toArrayBuffer(buf);
            wsApp.publish(roomName, ahas);
          }
        }
      }
    });

    if (media.wsDevices.has(id)) {
      media.wsDevices.delete(id);
      console.log('wsDevices remove ', id);
    }
  },
  message: (ws, message, isBinary) => {
    const msg = toBuffer(message).toString();
    const msgo: Message = JSON.parse(msg) as Message;
    if (msgo.method == 'LOGIN') {
      const id = uuidv4();
      ws.id = id;
      media.wsDevices.set(id, ws);

      const buf = Buffer.from(
        JSON.stringify({
          method: msgo.method,
          response: {
            result: 200,
            id: id,
          },
        }),
        'utf8',
      );
      const ahas = toArrayBuffer(buf);
      ws.send(ahas, isBinary, true);
      console.log('LOGIN ', id);
    } else if (msgo.method == 'getRouteCapability') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('getRouteCapability ', ws.id);
        getRouteCapability(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'joinRoom') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('joinRoom ', ws.id);
        joinRoom(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'createTransport') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('createTransport ', ws.id);
        createTransport(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'connectProducerTransport') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('connectProducerTransport ', ws.id);
        connectProducerTransport(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'produce') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('produce ', ws.id);
        produce(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'consume') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('consume ', ws.id);
        consume(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'connectConsumerTransport') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('connectConsumerTransport ', ws.id);
        connectConsumerTransport(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'resume') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('resume ', ws.id);
        resume(ws, msgo, isBinary);
      }
    } else if (msgo.method == 'getRoomProducers') {
      if (!ws.id) {
        console.log('belum punya ID');
      } else {
        console.log('getRoomProducers ', ws.id);
        getRoomProducers(ws, msgo, isBinary);
      }
    }
  },
});

import test = require('./api/test');

wsApp.get('/', serveStatic);
wsApp.get('/api/test', test);
wsApp.any('/*', (res, req) => {
  const filePath = process.cwd() + '/dist/client' + req.getUrl();
  const stats: Stats | undefined = lstatSync(filePath, {throwIfNoEntry: false});

  if (!stats || stats.isDirectory()) {
    res.onAborted(() => {
      res.aborted = true;
    });
    readFile(
      process.cwd() + '/dist/client/index.html',
      'utf-8',
      (err, data) => {
        if (err) {
          res.writeStatus('404 Not Found');
          res.writeHeader('Content-Type', 'text/html');

          if (!res.aborted) {
            res.end('Not FOund');
          }
        } else {
          res.writeStatus('200 OK');
          res.writeHeader('Content-Type', 'text/html');

          if (!res.aborted) {
            res.end(data);
          }
        }
      },
    );
  } else {
    serveStatic(res, req);
  }
});

wsApp.listen(
  '0.0.0.0',
  parseInt(process.env.APP_PORT ? process.env.APP_PORT : '3020'),
  listenSocket => {
    if (listenSocket) {
      console.log(
        'start server ',
        process.env.APP_PORT ? process.env.APP_PORT : '3020',
      );
    } else {
      console.error('failed to start server');
    }
  },
);

const initMedia = async () => {
  await media.runMediasoupWorkers();
};
initMedia().catch(err => {
  console.error(err);
});
