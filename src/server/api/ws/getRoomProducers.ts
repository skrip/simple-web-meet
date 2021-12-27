import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';

const getRoomProducers: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  let isroom = false;
  tp.map(t => {
    if (rooms.has(t)) {
      isroom = true;
      const room = rooms.get(t);

      const client = room?.client;
      client?.forEach((value, key) => {
        if (key != ws.id) {
          if (value.producer_video) {
            if (value.producer_video.id) {
              const ps = {
                method: 'new_producer',
                response: {
                  participantName: value.participantName,
                  producerId: value.producer_video?.id,
                  kind: 'video',
                },
              };
              const buf = Buffer.from(JSON.stringify(ps), 'utf8');
              const ahas = toArrayBuffer(buf);
              ws.send(ahas, isBinary, true);
            }
          }

          if (value.producer_audio) {
            if (value.producer_audio.id) {
              const ps2 = {
                method: 'new_producer',
                response: {
                  participantName: value.participantName,
                  producerId: value.producer_audio?.id,
                  kind: 'audio',
                },
              };
              const buf2 = Buffer.from(JSON.stringify(ps2), 'utf8');
              const ahas2 = toArrayBuffer(buf2);
              ws.send(ahas2, isBinary, true);
            }
          }
        }
      });
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

export = getRoomProducers;
