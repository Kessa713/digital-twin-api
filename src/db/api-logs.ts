import { Table } from './schema';

export type APILog = {
  key: string,
  datetime: string,
  ip?: string,
  browser?: string,
  device?: string,
  prompt: string,
  fullResponse?: string,
  resultContent?: string,
  responseMs: number,
  usagePromptTokens: number;
  usageCompletionTokens: number;
}

class DBApiLogs extends Table<APILog> {}

const APILogs = new DBApiLogs(
  'api-logs',
  {
    key: {
      type: 'String',
      required: true,
    },
    datetime: {
      type: 'String',
      required: true,
    },
    ip: {
      type: 'String',
      required: false,
    },
    browser: {
      type: 'String',
      required: false,
    },
    device: {
      type: 'String',
      required: false,
    },
    prompt: {
      type: 'String',
      required: true,
    },
    fullResponse: {
      type: 'String',
      required: false,
    },
    resultContent: {
      type: 'String',
      required: false,
    },
    responseMs: {
      type: 'Number',
      required: true,
    },
    usagePromptTokens: {
      type: 'Number',
      required: true,
    },
    usageCompletionTokens: {
      type: 'Number',
      required: true,
    },
  },
  'key',
);

export default APILogs;
