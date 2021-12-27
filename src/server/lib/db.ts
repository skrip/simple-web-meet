import * as mongoDB from 'mongodb';

export enum colName {
  USERS = 'users',
  DEVICES = 'devices',
}
export const collections: {
  users?: mongoDB.Collection;
  devices?: mongoDB.Collection;
} = {};

export async function connectToMongoDB() {
  if (Object.keys(collections).length === 0) {
    const MONGO_SERVER = 'localhost';
    const MONGO_PORT = '27017';
    const MONGO_DB_NAME = 'WebMeet';

    const url = `mongodb://${MONGO_SERVER}:${
      MONGO_PORT ? MONGO_PORT : '27017'
    }`;
    const client: mongoDB.MongoClient = new mongoDB.MongoClient(url);
    await client.connect();
    const db: mongoDB.Db = client.db(MONGO_DB_NAME);

    const usersCollection: mongoDB.Collection = db.collection(colName.USERS);
    collections.users = usersCollection;

    const devicesCollection: mongoDB.Collection = db.collection(
      colName.DEVICES,
    );
    collections.devices = devicesCollection;

    console.log('Successfully connected to database: ');
  }
}
