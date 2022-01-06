import * as dotenv from 'dotenv';
dotenv.config({path: process.cwd() + '/.env'});
import {initApp} from '.';

async function startServer() {
  const wsApp = await initApp(true);
  wsApp.listen(
    '0.0.0.0',
    parseInt(process.env.APP_PORT ? process.env.APP_PORT : '3020'),
    listenSocket => {
      if (listenSocket) {
        console.log(
          'start server ',
          process.env.APP_PORT ? process.env.APP_PORT : '3020',
        );
      } else {
        console.error('failed to start server');
      }
    },
  );
}

startServer().catch(err => {
  console.error(err);
});
