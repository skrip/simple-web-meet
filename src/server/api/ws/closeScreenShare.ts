import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';

const closeScreenShare: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  let isroom = false;
  tp.map(t => {
    if (rooms.has(t)) {
      isroom = true;
      const room = rooms.get(t);
      const clients = room?.client;
      const id = ws.id as string;
      const cldata = room?.client?.get(id);
      //const type = message.data.type as string;
      if (cldata && clients) {
        if (cldata?.producer_screen_share) {
          const producer_screen_share = cldata?.producer_screen_share;
          for (const [key, value] of clients) {
            if (key !== id) {
              const arrcons = value.consumer_transports;
              for (let i = 0; i < arrcons.length; i++) {
                const consumer_data = arrcons[i].consumer_screen_share;
                if (consumer_data) {
                  let i = consumer_data.length;
                  while (i--) {
                    if (
                      consumer_data[i].producerId == producer_screen_share.id
                    ) {
                      consumer_data.splice(i, 1);
                      console.log(
                        'consumer_screen_share hapus ',
                        producer_screen_share.id,
                      );
                    }
                  }
                }
              }
            }
          }

          cldata.producer_screen_share.close();

          const pps = {
            method: 'closeScreenShare',
            response: {
              participantName: cldata.participantName,
            },
          };
          const buf2 = Buffer.from(JSON.stringify(pps), 'utf8');
          const ahas2 = toArrayBuffer(buf2);
          ws.publish(t, ahas2, isBinary, true);
          console.log('kirim publish new_producer ', id);
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

export = closeScreenShare;
