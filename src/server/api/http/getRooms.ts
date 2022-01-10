import {HttpServe, MediaWorker} from '../../lib';

interface RoomList {
  name: string;
  jumlah: number;
}

const getRooms: HttpServe = async res => {
  res.onAborted(() => {
    res.aborted = true;
  });

  const media = MediaWorker.getInstance();
  const mediasoupWorker = media.getMediasoupWorker();
  const rooms = media.Rooms;

  if (rooms.size == 0) {
    await media.createRooms('testing', mediasoupWorker, rooms);
    await media.createRooms('meeting', mediasoupWorker, rooms);
    await media.createRooms('Room 1', mediasoupWorker, rooms);
  }

  const arr: Array<RoomList> = [];
  rooms?.forEach(value => {
    const p = {
      name: value.name,
      jumlah: value.client.size,
    };
    arr.push(p);
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
