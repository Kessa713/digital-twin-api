import { Table } from './schema';

export type APIKey = {
  key: string,
  limit: number,
  useableSince: string,
  usableUntil: string,
}

class DBApiKeys extends Table<APIKey> {}

const APIKeys = new DBApiKeys(
  'api-keys',
  {
    key: {
      type: 'String',
      required: true,
    },
    limit: {
      type: 'Number',
      required: true,
    },
    useableSince: {
      type: 'String',
      required: true,
    },
    usableUntil: {
      type: 'String',
      required: true,
    },
  },
  'key',
);

export default APIKeys;
