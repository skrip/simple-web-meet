import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';
import {Router} from 'mediasoup/node/lib/types';
import {object, string, mixed} from 'yup';

/*interface createTransportData {
  participantName: string;
}*/

async function createWebRtcTransport(mediasoupRouter: Router) {
  const {maxIncomingBitrate, initialAvailableOutgoingBitrate} = {
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  };

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: [
      {
        ip: process.env.WEBRTC_IP ? process.env.WEBRTC_IP : '192.168.1.105',
        announcedIp: undefined,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
    enableSctp: true,
    numSctpStreams: {
      OS: 256,
      MIS: 256,
    },
    maxSctpMessageSize: 262144,
    appData: {},
  });

  if (maxIncomingBitrate) {
    try {
      await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    } catch (error) {}
  }

  //console.log('====== transport.id ', transport.id);
  //console.log('====== transport.iceParameters ', transport.iceParameters);
  //console.log('====== transport.sctpParameters ', transport.sctpParameters);
  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    },
  };
}

const createTransport: WsServe = async (ws, message, isBinary) => {
  const createTransportSchema = object({
    method: string().required('createTransport').defined(),
    data: object({
      type: mixed<string>()
        .oneOf(['producer', 'consumer'])
        .defined()
        .required(),
      participantName: string().optional(),
    }).defined(),
  });
  //type createTransportData = InferType<typeof createTransportSchema>;

  try {
    const createTransportS = await createTransportSchema.validate(message);
    const media = MediaWorker.getInstance();
    const rooms = media.Rooms;

    const tp = ws.getTopics();
    let isroom = false;
    tp.map(async t => {
      if (rooms.has(t)) {
        isroom = true;
        const room = rooms.get(t);
        const mediasoupRouter = room?.mediasoupRouter;
        const id = ws.id as string;

        try {
          const type: string = createTransportS.data.type; //message.data.type as string;
          if (mediasoupRouter) {
            const {transport, params} = await createWebRtcTransport(
              mediasoupRouter,
            );
            if (type == 'producer') {
              const cldata = room?.client?.get(id);
              if (cldata) {
                cldata.producer_transport = transport;
                //console.log('producer_transport berhasil dibuat ', id);

                const ps = {
                  method: message.method,
                  response: {
                    result: 200,
                    type: type,
                    createTransport: params,
                  },
                };

                const buf = Buffer.from(JSON.stringify(ps), 'utf8');
                const ahas = toArrayBuffer(buf);
                ws.send(ahas, isBinary, true);

                const client = room?.client;
                client?.forEach((value, key) => {
                  if (key != ws.id) {
                    const ps = {
                      method: 'new_producer_transport',
                      response: {
                        participantName: value.participantName,
                      },
                    };
                    const buf = Buffer.from(JSON.stringify(ps), 'utf8');
                    const ahas = toArrayBuffer(buf);
                    ws.send(ahas, isBinary, true);
                  }
                });

                const pps = {
                  method: 'new_producer_transport',
                  response: {
                    participantName: cldata.participantName,
                  },
                };
                const buf2 = Buffer.from(JSON.stringify(pps), 'utf8');
                const ahas2 = toArrayBuffer(buf2);
                ws.publish(t, ahas2, isBinary, true);
                //console.log('kirim publish new_producer ', id);
              } else {
                console.error('cldata not found');
              }
            } else if (type == 'consumer') {
              const data = createTransportS; //message.data as unknown as createTransportData;
              const participantName = data.data.participantName;
              const cldata = room?.client?.get(id);
              if (cldata) {
                const arrcons = cldata.consumer_transports;
                let cons = arrcons.find(con => {
                  return con.participantName === participantName;
                });
                if (cons) {
                  cons.consumer_transport = transport;
                } else {
                  if (participantName) {
                    cons = {
                      participantName: participantName,
                      consumer_transport: transport,
                      consumer_video: [],
                      consumer_screen_share: [],
                      consumer_audio: [],
                      consumer_data: [],
                    };
                    arrcons.push(cons);
                  }
                }

                const ps = {
                  method: message.method,
                  response: {
                    result: 200,
                    type: type,
                    createTransport: params,
                    participantName: participantName,
                  },
                };

                const buf = Buffer.from(JSON.stringify(ps), 'utf8');
                const ahas = toArrayBuffer(buf);
                ws.send(ahas, isBinary, true);
              } else {
                console.error('cldata not found');
              }
            }
          }
        } catch (err) {
          //console.error('erro createtransport ', err);
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
  } catch (err) {
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

export = createTransport;
