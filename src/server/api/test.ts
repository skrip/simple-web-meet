import {HttpServe, connectToMongoDB, collections} from '../lib';

const test: HttpServe = res => {
  res.onAborted(() => {
    res.aborted = true;
  });

  setTimeout(function () {
    (async () => {
      await connectToMongoDB();
      const has = await collections.devices?.find().toArray();
      res.writeStatus('200 OK');
      res.writeHeader('Content-Type', 'application/json');
      const q = {
        result: 200,
        data: has,
      };

      if (!res.aborted) {
        res.end(JSON.stringify(q));
      }
    })().catch(err => {
      throw err;
    });
  }, 1000);
};

export = test;
