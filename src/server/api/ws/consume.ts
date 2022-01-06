import {WsServe, MediaWorker, toArrayBuffer, ClientData} from '../../lib';
import {
  Router,
  WebRtcTransport,
  Producer,
  RtpCapabilities,
  Consumer,
} from 'mediasoup/node/lib/types';

interface ConsumerRet {
  producerId: string;
  consumer: Consumer;
}
async function createConsumer(
  mediasoupRouter: Router,
  consumerTransport: WebRtcTransport | undefined,
  producer: Producer | undefined,
  rtpCapabilities: RtpCapabilities,
): Promise<ConsumerRet | undefined> {
  if (
    !mediasoupRouter.canConsume({
      producerId: producer?.id as string,
      rtpCapabilities,
    })
  ) {
    console.error('can not consume producer');
    return undefined;
  }

  let consumer;
  const producerId = producer?.id as string;
  if (producer?.kind == 'video') {
    try {
      consumer = await consumerTransport?.consume({
        producerId: producerId,
        rtpCapabilities,
        paused: true,
      });
    } catch (error) {
      console.error('consume failed', error);
      return;
    }

    if (consumer?.type === 'simulcast') {
      await consumer.setPreferredLayers({spatialLayer: 2, temporalLayer: 2});
    }

    if (consumer) {
      return {
        producerId: producerId,
        consumer: consumer,
      };
    }
  }

  try {
    consumer = await consumerTransport?.consume({
      producerId: producerId,
      rtpCapabilities,
      paused: false,
    });
  } catch (error) {
    console.error('consume failed', error);
    return;
  }

  if (consumer?.type === 'simulcast') {
    await consumer.setPreferredLayers({spatialLayer: 2, temporalLayer: 2});
  }

  if (consumer) {
    return {
      producerId: producerId,
      consumer: consumer,
    };
  }
}

const consume: WsServe = (ws, message, isBinary) => {
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;

  const tp = ws.getTopics();
  const id = ws.id as string;
  let isroom = false;
  tp.map(async t => {
    if (rooms.has(t)) {
      isroom = true;
      const room = rooms.get(t);
      const mediasoupRouter = room?.mediasoupRouter as Router;

      const tmpdev: Array<ClientData> = []; // buat producer
      let transport = {};
      const client = room?.client;
      client?.forEach((value, key) => {
        if (key != id) {
          tmpdev.push(value);
        }
      });
      const cldata = room?.client?.get(id); // own pengen consume

      let hasdata = false;
      const type = message.data.type as string;
      for (let i = 0; i < tmpdev.length; i++) {
        if (type === 'screen_share') {
          const producer_screen_share = tmpdev[i].producer_screen_share;
          if (producer_screen_share) {
            if (producer_screen_share.id === message.data.producerId) {
              const arrcons = cldata?.consumer_transports;
              const cons = arrcons?.find(con => {
                return con.participantName === message.data.participantName;
              });
              if (cons) {
                const rtpCapabilities = message.data
                  .rtpCapabilities as RtpCapabilities;
                const d = await createConsumer(
                  mediasoupRouter,
                  cons.consumer_transport,
                  producer_screen_share,
                  rtpCapabilities,
                );
                if (d) {
                  let ada = false;
                  for (let x = 0; x < cons.consumer_screen_share.length; x++) {
                    if (
                      cons.consumer_screen_share[x].producerId ==
                      d.consumer.producerId
                    ) {
                      cons.consumer_screen_share[x] = d.consumer;
                      ada = true;
                    }
                  }
                  if (!ada) {
                    cons.consumer_screen_share.push(d.consumer);
                  }
                  transport = {
                    producerId: d.producerId,
                    id: d.consumer.id,
                    kind: d.consumer.kind,
                    rtpParameters: d.consumer.rtpParameters,
                    type: d.consumer.type,
                    producerPaused: d.consumer.producerPaused,
                  };
                  hasdata = true;
                }
              }
            }
          } else {
            console.error('producer_screen_share not found');
          }
        } else if (message.data.kind === 'video') {
          const producer_video = tmpdev[i].producer_video;
          if (producer_video) {
            if (producer_video.id === message.data.producerId) {
              const arrcons = cldata?.consumer_transports;
              const cons = arrcons?.find(con => {
                return con.participantName === message.data.participantName;
              });
              if (cons) {
                const rtpCapabilities = message.data
                  .rtpCapabilities as RtpCapabilities;
                const d = await createConsumer(
                  mediasoupRouter,
                  cons.consumer_transport,
                  producer_video,
                  rtpCapabilities,
                );
                if (d) {
                  let ada = false;
                  for (let x = 0; x < cons.consumer_video.length; x++) {
                    if (
                      cons.consumer_video[x].producerId == d.consumer.producerId
                    ) {
                      cons.consumer_video[x] = d.consumer;
                      ada = true;
                    }
                  }
                  if (!ada) {
                    cons.consumer_video.push(d.consumer);
                  }
                  transport = {
                    producerId: d.producerId,
                    id: d.consumer.id,
                    kind: d.consumer.kind,
                    rtpParameters: d.consumer.rtpParameters,
                    type: d.consumer.type,
                    producerPaused: d.consumer.producerPaused,
                  };
                  hasdata = true;
                }
              }
            }
          } else {
            console.error('producer_video not found');
          }
        } else if (message.data.kind === 'audio') {
          const producer_audio = tmpdev[i].producer_audio;
          if (producer_audio) {
            if (producer_audio.id === message.data.producerId) {
              const rtpCapabilities = message.data
                .rtpCapabilities as RtpCapabilities;
              const arrcons = cldata?.consumer_transports;
              const cons = arrcons?.find(con => {
                return con.participantName === message.data.participantName;
              });
              if (cons) {
                const d = await createConsumer(
                  mediasoupRouter,
                  cons.consumer_transport,
                  producer_audio,
                  rtpCapabilities,
                );
                if (d) {
                  let ada = false;
                  for (let x = 0; x < cons.consumer_audio.length; x++) {
                    if (
                      cons.consumer_audio[x].producerId == d.consumer.producerId
                    ) {
                      cons.consumer_audio[x] = d.consumer;
                      ada = true;
                    }
                  }
                  if (!ada) {
                    cons.consumer_audio.push(d.consumer);
                  }
                  transport = {
                    producerId: d.producerId,
                    id: d.consumer.id,
                    kind: d.consumer.kind,
                    rtpParameters: d.consumer.rtpParameters,
                    type: d.consumer.type,
                    producerPaused: d.consumer.producerPaused,
                  };
                  hasdata = true;
                }
              }
            }
          } else {
            console.error('producer_audio not found');
          }
        }
      }

      if (hasdata) {
        const participantName = message.data.participantName as string;
        const ps = {
          method: message.method,
          response: {
            result: 200,
            transport: transport,
            participantName,
            type,
          },
        };
        console.log('PS ', ps);
        const buf = Buffer.from(JSON.stringify(ps), 'utf8');
        const ahas = toArrayBuffer(buf);
        ws.send(ahas, isBinary, true);
      } else {
        console.error('tidak ada producer yg cocok ', message);
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

export = consume;
