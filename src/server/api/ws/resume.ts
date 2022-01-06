import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';

const resume: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  let isroom = false;
  tp.map(t => {
    if (rooms.has(t)) {
      isroom = true;
      const room = rooms.get(t);
      const id = ws.id as string;
      const cldata = room?.client?.get(id);
      const type = message.data.type as string;
      if (cldata) {
        const arrcons = cldata?.consumer_transports;
        const cons = arrcons?.find(con => {
          return con.participantName === message.data.participantName;
        });

        if (cons) {
          if (type === 'screen_share') {
            const consumer_screen_share = cons.consumer_screen_share;
            consumer_screen_share.map(async con => {
              console.log(
                'consumer screen_share on resume producerId === ',
                con.producerId,
              );
              await con.resume();
            });
          } else {
            const consumer_video = cons.consumer_video;
            const consumer_audio = cons.consumer_audio;
            consumer_video.map(async con => {
              console.log('consumer on resume producerId === ', con.producerId);
              await con.resume();
            });
            consumer_audio.map(async con => {
              console.log('consumer on resume producerId === ', con.producerId);
              await con.resume();
            });
          }
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
      const ahas = toArrayBuffer(buf);
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

export = resume;
