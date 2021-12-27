import ws from 'uWebSockets.js';

export type HttpServe = {
  (res: ws.HttpResponse, req: ws.HttpRequest): void;
};
