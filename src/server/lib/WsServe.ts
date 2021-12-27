import ws from 'uWebSockets.js';
import {Message} from './message';

export type WsServe = {
  (ws: ws.WebSocket, msg: Message, isBinary: boolean): void;
};
