import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';
import {
  ProducerOptions,
  RtpObserverAddRemoveProducerOptions,
} from 'mediasoup/node/lib/types';

interface appDataType {
  type: string;
}
const produce: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  let isroom = false;
  tp.map(async t => {
    if (rooms.has(t)) {
      isroom = true;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {kind, rtpParameters, appData} = message.data as ProducerOptions;
        const appdata = appData as appDataType;
        const room = rooms.get(t);
        let producerId = '';
        const id = ws.id as string;
        let type: string = kind;
        if (appdata.type) {
          type = appdata.type;
        }
        if (type === 'screen_share') {
          const cldata = room?.client?.get(id);
          if (cldata) {
            const transport = cldata.producer_transport;
            const producer_screen_share = await transport?.produce({
              kind,
              rtpParameters,
            });
            cldata.producer_screen_share = producer_screen_share;
            producerId = producer_screen_share?.id as string;
            const ps = {
              method: message.method,
              response: {
                result: 200,
                id: producer_screen_share?.id,
                type: type,
              },
            };
            const buf = Buffer.from(JSON.stringify(ps), 'utf8');
            const ahas = toArrayBuffer(buf); //hasil
            ws.send(ahas, isBinary, true);
            console.log('selesai produce screen share');
          }
        } else if (type === 'video') {
          const cldata = room?.client?.get(id);
          if (cldata) {
            const transport = cldata.producer_transport;
            const producer_video = await transport?.produce({
              kind,
              rtpParameters,
            });
            cldata.producer_video = producer_video;
            producerId = producer_video?.id as string;
            const ps = {
              method: message.method,
              response: {
                result: 200,
                id: producer_video?.id,
                type: type,
              },
            };
            const buf = Buffer.from(JSON.stringify(ps), 'utf8');
            const ahas = toArrayBuffer(buf); //hasil
            ws.send(ahas, isBinary, true);
            console.log('selesai produce video');
          } else {
            console.error('cldata not found');
          }
        } else if (type === 'audio') {
          const cldata = room?.client?.get(id);
          if (cldata) {
            const transport = cldata.producer_transport;
            const producer_audio = await transport?.produce({
              kind,
              rtpParameters,
            });
            cldata.producer_audio = producer_audio;
            if (producer_audio?.id) {
              const opt: RtpObserverAddRemoveProducerOptions = {
                producerId: producer_audio?.id,
              };
              await room?.audioLevelObserver.addProducer(opt);
              await room?.activeSpeakerObserver.addProducer(opt);
            }

            producerId = producer_audio?.id as string;
            const ps = {
              method: message.method,
              response: {
                result: 200,
                id: producer_audio?.id,
                type: type,
              },
            };
            const buf = Buffer.from(JSON.stringify(ps), 'utf8');
            const ahas = toArrayBuffer(buf);
            ws.send(ahas, isBinary, true);
            console.log('selesai produce audio');
          } else {
            console.error('cldata not found');
          }
        }

        const cldata = room?.client?.get(id);
        if (cldata) {
          const pps = {
            method: 'new_producer',
            response: {
              participantName: cldata.participantName,
              producerId,
              kind,
              type: type,
            },
          };
          const buf2 = Buffer.from(JSON.stringify(pps), 'utf8');
          const ahas2 = toArrayBuffer(buf2);
          ws.publish(t, ahas2, isBinary, true);
          console.log('kirim publish new_producer ', id);
        }
      } catch (err) {
        console.error(err);
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

export = produce;
