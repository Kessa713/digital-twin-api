/* eslint-disable no-use-before-define */
import { AttributeValue } from '@aws-sdk/client-dynamodb/dist-types/models/models_0';

export const jsonToDbListParse = (inputArray: unknown[]): AttributeValue[] => {
  const returnArray: AttributeValue[] = [];
  for (const arrayItem of inputArray) {
    if (arrayItem === undefined || arrayItem === null) {
      returnArray.push({ NULL: true });
    } else if (Array.isArray(arrayItem)) {
      returnArray.push({ L: jsonToDbListParse(arrayItem) });
    } else if (typeof arrayItem === 'string') {
      returnArray.push({ S: arrayItem });
    } else if (typeof arrayItem === 'boolean') {
      returnArray.push({ BOOL: arrayItem });
    } else if (typeof arrayItem === 'number' || arrayItem instanceof Number) {
      returnArray.push({ N: arrayItem.toString() });
    } else if (typeof arrayItem === 'object') {
      returnArray.push({ M: jsonToDbObjectParse(arrayItem as Record<string, unknown>) });
    } else {
      throw new Error(`jsonToDbListParse failed for object ${JSON.stringify(inputArray)} on arrayItem "${arrayItem}"`);
    }
  }

  return returnArray;
};

export const jsonToDbObjectParse = (inputObject: Record<string, unknown>): Record<string, AttributeValue> => {
  const returnObject: Record<string, AttributeValue> = {};
  for (const [key, value] of Object.entries(inputObject)) {
    if (value === null) {
      returnObject[key] = { NULL: true };
    } else if (Array.isArray(value)) {
      returnObject[key] = { L: jsonToDbListParse(value) };
    } else if (typeof value === 'string') {
      returnObject[key] = { S: value };
    } else if (typeof value === 'boolean') {
      returnObject[key] = { BOOL: value };
    } else if (typeof value === 'number' || value instanceof Number) {
      returnObject[key] = { N: value.toString() };
    } else if (typeof value === 'object') {
      returnObject[key] = { M: jsonToDbObjectParse(value as Record<string, unknown>) };
    } else {
      throw new Error(`jsonToDbObjectParse failed for object ${JSON.stringify(inputObject)} on key "${key}"`);
    }
  }

  return returnObject;
};

const dbToJsonListParse = (inputList: AttributeValue[]): unknown[] => inputList.map((li) => {
  if (li.S !== undefined) {
    return li.S;
  }
  if (li.N !== undefined) {
    return +li.N;
  }
  if (li.SS !== undefined) {
    return li.SS;
  }
  if (li.NS !== undefined) {
    return li.NS.map((N) => +N);
  }
  if (li.NULL !== undefined) {
    throw new Error('Database returned null, which is unhandled');
  }
  if (li.BOOL !== undefined) {
    return li.BOOL;
  }
  if (li.L !== undefined) {
    return dbToJsonListParse(li.L);
  }
  if (li.M !== undefined) {
    return dbToJsonObjectParse(li.M);
  }
  throw new Error(`dbToJsonListParse failed for object ${JSON.stringify(inputList)}`);
});

const dbToJsonObjectParse = (inputObject: Record<string, AttributeValue>) => {
  const returnObject: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(inputObject)) {
    if (value.S !== undefined) {
      returnObject[key] = value.S;
    } else if (value.N !== undefined) {
      returnObject[key] = +value.N;
    } else if (value.SS !== undefined) {
      returnObject[key] = value.SS;
    } else if (value.NS !== undefined) {
      returnObject[key] = value.NS.map((N) => +N);
    } else if (value.NULL !== undefined) {
      throw new Error('Database returned null, which is unhandled');
    } else if (value.BOOL !== undefined) {
      returnObject[key] = value.BOOL;
    } else if (value.L !== undefined) {
      returnObject[key] = dbToJsonListParse(value.L);
    } else if (value.M !== undefined) {
      returnObject[key] = dbToJsonObjectParse(value.M);
    } else {
      throw new Error(`dbToJsonObjectParse failed for object ${JSON.stringify(inputObject)}`);
    }
  }
  return returnObject;
};

export const jsonToDbObject = (inputObject: Record<string, unknown>): Record<string, AttributeValue> => {
  return jsonToDbObjectParse(inputObject);
};

export const dbObjectToJson = <C>(inputObject: Record<string, AttributeValue> | undefined):(C | undefined) => {
  if (!inputObject) { return undefined; }

  return <C>dbToJsonObjectParse(inputObject);
};
