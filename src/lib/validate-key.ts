import APIKeys from '../db/api-keys';
import APILogs from '../db/api-logs';

export const validateKey = async (key: string): Promise<[false, undefined] | [true, number]> => {
  const apiKey = await APIKeys.getByPk(key);

  if (apiKey) {
    if (new Date(apiKey.useableSince).getTime() < Date.now() && Date.now() < new Date(apiKey.usableUntil).getTime()) {
      const queryResults = await APILogs.getByIndex('api-key-uses-index', 'key', key);
      const usesInPast24Hours = queryResults.filter((x) => new Date(x.datetime).getTime() > Date.now() - (24 * 60 * 60 * 1000)).length;

      return [true, Math.max(0, apiKey.limit - usesInPast24Hours)];
    }
  }

  return [false, undefined];
};
