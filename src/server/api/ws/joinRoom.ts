import {
  WsServe,
  MediaWorker,
  RoomData,
  toArrayBuffer,
  ClientData,
} from '../../lib';
import {RtpCodecCapability, Producer} from 'mediasoup/node/lib/types';

interface JoinRoomData {
  roomName: string;
  participantName: string;
}

const joinRoom: WsServe = async (ws, message, isBinary) => {
  const data = message.data as unknown as JoinRoomData;
  const roomName = data.roomName;
  const participantName = data.participantName;
  const media = MediaWorker.getInstance();
  const rooms = media.Rooms;
  const id = ws.id as string;
  if (rooms.has(roomName) && participantName) {
    console.log('ada yang join ', participantName);
    ws.subscribe(roomName);
    ws.roomName = roomName;

    const room = rooms.get(roomName);
    const client = room?.client;
    const iClientData = {
      participantName: participantName,
      producer_transport: undefined,
      consumer_transports: [],
      producer_video: undefined,
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
    console.log('ROOM READY EXISTS');
  } else {
    console.log('ada yang join ', participantName);
    const mediasoupWorker = media.getMediasoupWorker();
    const mediaCodecs: RtpCodecCapability[] = [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
    ];

    const appData = {};
    const mediasoupRouter = await mediasoupWorker.createRouter({
      mediaCodecs,
      appData,
    });
    const audioLevelObserver = await mediasoupRouter.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -80,
      interval: 800,
    });
    audioLevelObserver.on('volumes', (/*volumes*/) => {
      //console.log('audioLevelObserver on Volumes ', volumes);
    });
    const activeSpeakerObserver =
      await mediasoupRouter.createActiveSpeakerObserver();
    activeSpeakerObserver.on('dominantspeaker', dominantSpeaker => {
      interface DominantSpeaker {
        producer: Producer;
      }
      const dS = dominantSpeaker as DominantSpeaker;
      console.log('activeSpeakerObserver on dominantspeaker ', dS.producer.id);
      const media = MediaWorker.getInstance();
      const rooms = media.Rooms;
      for (const [, /*key*/ value] of rooms) {
        const clients = value.client;
        for (const [, /*key2*/ value2] of clients) {
          const arrcons = value2.consumer_transports;
          for (let i = 0; i < arrcons.length; i++) {
            for (let x = 0; x < arrcons[i].consumer_audio.length; x++) {
              if (arrcons[i].consumer_audio[x].producerId == dS.producer.id) {
                const participantName = arrcons[i].participantName;
                const roomName = value.name;
                const ps = {
                  method: 'ActiveSpeaker',
                  response: {
                    participantName: participantName,
                  },
                };
                const buf = Buffer.from(JSON.stringify(ps), 'utf8');
                const ahas = toArrayBuffer(buf);
                media.wsApp?.publish(roomName, ahas, true);
              }
            }
          }
        }
      }
    });

    const client: Map<string, ClientData> = new Map();
    const iClientData = {
      participantName: participantName,
      producer_transport: undefined,
      consumer_transports: [],
      producer_video: undefined,
      producer_audio: undefined,
      producer_data: undefined,
    };
    client.set(id, iClientData);
    const roomData: RoomData = {
      name: roomName,
      mediasoupRouter: mediasoupRouter,
      audioLevelObserver: audioLevelObserver,
      activeSpeakerObserver: activeSpeakerObserver,
      client: client,
    };
    rooms.set(roomName, roomData);

    ws.subscribe(roomName);
    ws.roomName = roomName;

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
};

export = joinRoom;
