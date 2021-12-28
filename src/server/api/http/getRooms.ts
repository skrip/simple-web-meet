import {
  HttpServe,
  MediaWorker,
  ClientData,
  RoomData,
  toArrayBuffer,
} from '../../lib';
import {RtpCodecCapability, Worker, Producer} from 'mediasoup/node/lib/types';

const createRooms = async (
  roomName: string,
  mediasoupWorker: Worker,
  rooms: Map<string, RoomData>,
) => {
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
              media.wsApp?.publish(roomName, ahas);
            }
          }
        }
      }
    }
  });

  const client: Map<string, ClientData> = new Map();
  const roomData: RoomData = {
    name: roomName,
    mediasoupRouter: mediasoupRouter,
    audioLevelObserver: audioLevelObserver,
    activeSpeakerObserver: activeSpeakerObserver,
    client: client,
  };
  rooms.set(roomName, roomData);
};

const getRooms: HttpServe = async res => {
  res.onAborted(() => {
    res.aborted = true;
  });

  const media = MediaWorker.getInstance();
  const mediasoupWorker = media.getMediasoupWorker();
  const rooms = media.Rooms;

  if (rooms.size == 0) {
    await createRooms('testing', mediasoupWorker, rooms);
    await createRooms('meeting', mediasoupWorker, rooms);
    await createRooms('Room 1', mediasoupWorker, rooms);
  }

  const arr: Array<string> = [];
  rooms?.forEach(value => {
    arr.push(value.name);
  });

  res.writeStatus('200 OK');
  res.writeHeader('Content-Type', 'application/json');
  const q = {
    result: 200,
    data: arr,
  };

  if (!res.aborted) {
    res.end(JSON.stringify(q));
  }
};

export = getRooms;
