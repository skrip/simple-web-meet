import {createWorker} from 'mediasoup';
import {
  Worker,
  Router,
  AudioLevelObserver,
  ActiveSpeakerObserver,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
} from 'mediasoup/node/lib/types';
import {WebSocket, TemplatedApp} from 'uWebSockets.js';
import {toArrayBuffer} from '.';

export interface ConsumerData {
  participantName: string;
  consumer_transport: WebRtcTransport | undefined;
  consumer_video: Array<Consumer>;
  consumer_screen_share: Array<Consumer>;
  consumer_audio: Array<Consumer>;
  consumer_data: Array<Consumer>;
}

export interface ClientData {
  participantName: string;
  producer_transport: WebRtcTransport | undefined;
  consumer_transports: Array<ConsumerData>;
  producer_video: Producer | undefined;
  producer_screen_share: Producer | undefined;
  producer_audio: Producer | undefined;
  producer_data: Producer | undefined;
}

export interface RoomData {
  name: string;
  mediasoupRouter: Router;
  audioLevelObserver: AudioLevelObserver;
  activeSpeakerObserver: ActiveSpeakerObserver;
  client: Map<string, ClientData>;
}

export class MediaWorker {
  private static instance: MediaWorker;
  private mediasoupWorkers: Array<Worker>;
  private nextMediasoupWorkerIdx;
  readonly numWorkers: number;
  private WsDevices: Map<string, WebSocket> = new Map();
  private rooms: Map<string, RoomData> = new Map();
  private WsApp: TemplatedApp | null = null;

  private constructor() {
    this.numWorkers = 2;
    this.nextMediasoupWorkerIdx = 0;
    this.mediasoupWorkers = [];
  }

  get wsApp() {
    return this.WsApp;
  }

  set wsApp(WsApp) {
    this.WsApp = WsApp;
  }

  get wsDevices() {
    return this.WsDevices;
  }

  get Rooms() {
    return this.rooms;
  }

  public static getInstance(): MediaWorker {
    if (!MediaWorker.instance) {
      MediaWorker.instance = new MediaWorker();
    }

    return MediaWorker.instance;
  }

  public async runMediasoupWorkers(): Promise<void> {
    if (this.mediasoupWorkers.length == 0) {
      console.log('running %d mediasoup Workers...', this.numWorkers);

      for (let i = 0; i < this.numWorkers; ++i) {
        const worker = await createWorker({
          logLevel: 'debug',
          logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp',
            'rtx',
            'bwe',
            'score',
            'simulcast',
            'svc',
          ],
          rtcMinPort: 10000,
          rtcMaxPort: 40000,
        });

        worker.on('died', () => {
          console.error(
            'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]',
            worker.pid,
          );

          setTimeout(() => process.exit(1), 2000);
        });

        this.mediasoupWorkers.push(worker);

        /*setInterval(() => {
          (async () => {
            const usage = await worker.getResourceUsage();

            console.info(
              'mediasoup Worker resource usage [pid:%d]: %o',
              worker.pid,
              usage,
            );
          })().catch(err => {
            throw err;
          });
        }, 120000);*/
      }
    }
  }

  public createRooms = async (
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

  public getMediasoupWorker(): Worker {
    const worker = this.mediasoupWorkers[this.nextMediasoupWorkerIdx];

    if (++this.nextMediasoupWorkerIdx === this.mediasoupWorkers.length) {
      this.nextMediasoupWorkerIdx = 0;
    }

    return worker;
  }
}
