import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';
import {DtlsParameters} from 'mediasoup/node/lib/types';

const connectConsumerTransport: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  let isroom = false;
  tp.map(async t => {
    if (rooms.has(t)) {
      isroom = true;
      const room = rooms.get(t);
      const id = ws.id as string;

      const cldata = room?.client?.get(id);
      if (cldata) {
        const arrcons = cldata.consumer_transports;
        const cons = arrcons.find(con => {
          return con.participantName === message.data.participantName;
        });
        if (cons) {
          const consumer = cons.consumer_transport;
          const dtlsParameters = message.data.dtlsParameters as DtlsParameters;
          await consumer?.connect({dtlsParameters});
        } else {
          console.error('consumer not found');
        }
      } else {
        console.error('cldata not found');
      }

      const ps = {
        method: message.method,
        response: {
          result: 200,
        },
      };
      const buf = Buffer.from(JSON.stringify(ps), 'utf8');
      const ahas = toArrayBuffer(buf); //hasil
      ws.send(ahas, isBinary, true);
    }
  });
  if (!isroom) {
    const ps = {
      method: message.method,
      response: {
        result: 400,
      },
    };
    const buf = Buffer.from(JSON.stringify(ps), 'utf8');
    const ahas = toArrayBuffer(buf);
    ws.send(ahas, isBinary, true);
  }
};

export = connectConsumerTransport;
