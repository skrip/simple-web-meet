import {createWorker} from 'mediasoup';
import {
  Worker,
  Router,
  AudioLevelObserver,
  WebRtcTransport,
  Producer,
  Consumer,
} from 'mediasoup/node/lib/types';
import {WebSocket} from 'uWebSockets.js';

export interface ConsumerData {
  participantName: string;
  consumer_transport: WebRtcTransport | undefined;
  consumer_video: Array<Consumer>;
  consumer_audio: Array<Consumer>;
  consumer_data: Array<Consumer>;
}

export interface ClientData {
  participantName: string;
  producer_transport: WebRtcTransport | undefined;
  consumer_transports: Array<ConsumerData>;
  producer_video: Producer | undefined;
  producer_audio: Producer | undefined;
  producer_data: Producer | undefined;
}

export interface RoomData {
  name: string;
  mediasoupRouter: Router;
  audioLevelObserver: AudioLevelObserver;
  client: Map<string, ClientData>;
}

export class MediaWorker {
  private static instance: MediaWorker;
  private mediasoupWorkers: Array<Worker>;
  private nextMediasoupWorkerIdx;
  readonly numWorkers: number;
  private WsDevices: Map<string, WebSocket> = new Map();
  private rooms: Map<string, RoomData> = new Map();

  private constructor() {
    this.numWorkers = 2;
    this.nextMediasoupWorkerIdx = 0;
    this.mediasoupWorkers = [];
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

        setInterval(() => {
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
        }, 120000);
      }
    }
  }

  public getMediasoupWorker(): Worker {
    const worker = this.mediasoupWorkers[this.nextMediasoupWorkerIdx];

    if (++this.nextMediasoupWorkerIdx === this.mediasoupWorkers.length) {
      this.nextMediasoupWorkerIdx = 0;
    }

    return worker;
  }
}
