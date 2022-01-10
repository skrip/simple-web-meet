import {WsServe, MediaWorker, toArrayBuffer} from '../../lib';
import {object, string} from 'yup';

const joinRoom: WsServe = async (ws, message, isBinary) => {
  const JoinRoomSchema = object({
    method: string().required('joinRoom').defined(),
    data: object({
      roomName: string().defined(),
      participantName: string().defined(),
    }).defined(),
  });
  //type JoinRoomData = InferType<typeof JoinRoomSchema>;

  try {
    const joinRoom = await JoinRoomSchema.validate(message);
    //const data = message.data as unknown as JoinRoomData;
    const roomName = joinRoom.data.roomName;
    const participantName = joinRoom.data.participantName;
    const media = MediaWorker.getInstance();
    const rooms = media.Rooms;
    const id = ws.id as string;
    if (rooms.has(roomName) && participantName) {
      //console.log('ada yang join ', participantName);
      ws.subscribe(roomName);
      ws.roomName = roomName;

      const room = rooms.get(roomName);
      const client = room?.client;
      const iClientData = {
        participantName: participantName,
        producer_transport: undefined,
        consumer_transports: [],
        producer_video: undefined,
        producer_screen_share: undefined,
        producer_audio: undefined,
        producer_data: undefined,
      };
      client?.set(id, iClientData);

      const ps = {
        method: message.method,
        response: {
          result: 200,
        },
      };
      const buf = Buffer.from(JSON.stringify(ps), 'utf8');
      const ahas = toArrayBuffer(buf);
      ws.send(ahas, isBinary, true);
      //console.log('ROOM READY EXISTS');
    } else {
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

export = joinRoom;
