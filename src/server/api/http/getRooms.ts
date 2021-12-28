import {HttpServe, MediaWorker, ClientData, RoomData} from '../../lib';
import {RtpCodecCapability, Worker} from 'mediasoup/node/lib/types';

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
    console.log('activeSpeakerObserver on dominantspeaker ', dominantSpeaker);
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
