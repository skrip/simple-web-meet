import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';
import {object, string} from 'yup';

const getRouteCapability: WsServe = async (ws, message, isBinary) => {
  const getRouteCapabilitySchema = object({
    method: string().required('getRouteCapability').defined(),
  });
  //type getRouteCapabilityData = InferType<typeof getRouteCapabilitySchema>;

  try {
    await getRouteCapabilitySchema.validate(message);
    const media = MediaWorker.getInstance();
    const rooms = media.Rooms;

    const tp = ws.getTopics();
    let isroom = false;
    tp.map(t => {
      if (rooms.has(t)) {
        isroom = true;
        const room = rooms.get(t);
        const mediasoupRouter = room?.mediasoupRouter;
        const ps = {
          method: message.method,
          response: {
            result: 200,
            rtpCapabilities: mediasoupRouter?.rtpCapabilities,
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

export = getRouteCapability;
