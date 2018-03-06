'use latest';
import { MongoClient } from 'mongodb';

export default function(context, callback) {
  const { MONGO_URL } = context.secrets;

  MongoClient.connect(MONGO_URL, (err, db) => {
    if (err) {
      return callback(err, 'Uh oh');
    }
    callback(null, 'hello!');
  });
}
