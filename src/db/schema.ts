import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand, QueryCommand,
  ReturnValue, ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb/dist-types/models/models_0';
import {
  dbObjectToJson,
  jsonToDbListParse,
  jsonToDbObject,
  jsonToDbObjectParse,
} from './utils';

type Index = {
  partitionKey: string;
  sortKey?: string;
  name: string;
  projection: 'all' | 'keys' | 'specified';
  attributes: string[];
}

type ColumnData = 'String' | 'Number' | 'Bool' | 'List' | 'Map' | 'StringSet' | 'NumberSet'; // SS, NS, NULL are not used

type Columns = {
  [name: string]: {
    type: ColumnData;
    required: boolean;
  };
}

const TypeMap: Record<ColumnData, keyof AttributeValue> = {
  String: 'S',
  Number: 'N',
  Bool: 'BOOL',
  List: 'L',
  Map: 'M',
  StringSet: 'SS',
  NumberSet: 'NS',
};

const dynamodb = new DynamoDBClient({ region: 'ap-southeast-1' });

export class Table<C extends Record<string, unknown>> {
  constructor(
    private tableName: string,
    private columns: Columns,
    private partitionKey: string,
    private sortKey?: string,
    private indexes: Index[] = [],
  ) {
    // Validate partition key
    const pkey = columns[partitionKey];
    if (!pkey || !pkey.required) {
      throw new Error(`Partition key is required in columns of ${tableName}`);
    }
    if (!(['String', 'Number']).includes(pkey.type)) {
      throw new Error(`Partition key of invalid type in ${tableName}`);
    }

    // Validate sort key
    if (sortKey) {
      if (partitionKey === sortKey) {
        throw new Error(`Partition key and sort key of ${tableName} cannot be the same`);
      }
      if (!(['String', 'Number']).includes(pkey.type)) {
        throw new Error(`Sort key of invalid type in ${tableName}`);
      }
    }
  }

  async create(item: {
    attributes: C,
    throwIfExists?: boolean,
  }): Promise<void> {
    const Item = jsonToDbObject(item.attributes);

    // Index values cannot be empty string. Remove them here.
    for (const index of this.indexes) {
      if (Item[index.partitionKey].S === '') {
        delete Item[index.partitionKey];
      }
    }

    await dynamodb.send(new PutItemCommand({
      TableName: this.tableName,
      Item,
      ...(item?.throwIfExists && { ConditionExpression: `attribute_not_exists(${this.partitionKey})` }),
    }));
  }

  async scan(): Promise<C[]> {
    const { Items } = await dynamodb.send(new ScanCommand({
      TableName: this.tableName,
    }));

    // Index values cannot be empty string. Recover them here.
    if (Items) {
      for (const item of Items) {
        for (const index of this.indexes) {
          if (!item[index.partitionKey]) {
            item[index.partitionKey] = { S: '' };
          }
        }
      }
    }

    return Items ? Items.map((item) => dbObjectToJson<C>(item) as C) : [];
  }

  async getByPk(partitionKey: string, projectionExpression?: string): Promise<C | undefined> {
    const pkey = this.columns[this.partitionKey];
    const { Item } = await dynamodb.send(new GetItemCommand({
      TableName: this.tableName,
      Key: {
        ...(pkey.type === 'String' ? {
          [this.partitionKey]: { S: partitionKey },
        } : {
          [this.partitionKey]: { N: partitionKey },
        }),
      },
      ...(projectionExpression ? { ProjectionExpression: projectionExpression } : null),
    }));

    // Index values cannot be empty string. Recover them here.
    if (Item) {
      for (const index of this.indexes) {
        if (!Item[index.partitionKey]) {
          Item[index.partitionKey] = { S: '' };
        }
      }
    }

    return dbObjectToJson<C>(Item);
  }

  async getByIndex(indexName: string, indexFieldName: string, indexKey: string, allAttributes?: boolean, projectionExpression?: string): Promise<C[]> {
    const { Items } = await dynamodb.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: '#F = :v1',
      ExpressionAttributeValues: { ':v1': { S: indexKey } },
      ExpressionAttributeNames: { '#F': indexFieldName },
      ...(projectionExpression ? {
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: projectionExpression,
      } : null),
      ...(allAttributes ? {
        Select: 'ALL_ATTRIBUTES',
      } : null),
    }));

    if (!Items || !Items.length) {
      return [];
    }

    // Index values cannot be empty string. Recover them here.
    for (const index of this.indexes) {
      for (const Item of Items) {
        if (!Item[index.partitionKey]) {
          Item[index.partitionKey] = { S: '' };
        }
      }
    }

    return Items ? Items.map((item) => dbObjectToJson<C>(item) as C) : [];
  }

  handlePatchInput(attributes: Partial<C>): {
    SetUpdateExpression: string,
    ExpressionAttributeNames: Record<string, string>,
    ExpressionAttributeValues: Record<string, AttributeValue>,
  } {
    let SetUpdateExpression = 'SET ';
    let ExpressionAttributeLabel = '#A';
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, AttributeValue> = {};

    for (const [key, value] of Object.entries(attributes)) {
      // This will throw if trying to update invalid attribute
      console.log(`Handling key <${key}> <${value}>`);
      const fieldType = TypeMap[this.columns[key].type];
      console.log({ fieldType });

      if (SetUpdateExpression.length > 4) {
        SetUpdateExpression += ',';
      }
      SetUpdateExpression += `${ExpressionAttributeLabel} = :${key}`;

      if (fieldType === 'L') {
        ExpressionAttributeValues[`:${key}`] = { L: jsonToDbListParse(value) };
      } else if (fieldType === 'M') {
        ExpressionAttributeValues[`:${key}`] = { M: jsonToDbObjectParse(value) };
      } else {
        ExpressionAttributeValues[`:${key}`] = { [fieldType]: value } as unknown as AttributeValue;
      }

      ExpressionAttributeNames[`${ExpressionAttributeLabel}`] = key;
      ExpressionAttributeLabel += 'A';
      console.log({ SetUpdateExpression, ExpressionAttributeNames, ExpressionAttributeLabel });
    }

    return {
      SetUpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };
  }

  async patchByPk(partitionKey: string, attributes: Partial<C>): Promise<C | undefined> {
    const pkey = this.columns[this.partitionKey];
    const { SetUpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = this.handlePatchInput(attributes);

    ExpressionAttributeNames['#K'] = this.partitionKey;

    const updatedItem = await dynamodb.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        ...(pkey.type === 'String' ? {
          [this.partitionKey]: { S: partitionKey },
        } : {
          [this.partitionKey]: { N: partitionKey },
        }),
      },
      UpdateExpression: `${SetUpdateExpression.length > 4 ? SetUpdateExpression : ''}`,
      ...(Object.keys(ExpressionAttributeNames).length ? { ExpressionAttributeNames } : undefined),
      ...(Object.keys(ExpressionAttributeValues).length ? { ExpressionAttributeValues } : undefined),
      ConditionExpression: 'attribute_exists(#K)',
      ReturnValues: ReturnValue.ALL_NEW,
    }));

    // Index values cannot be empty string. Recover them here.
    if (updatedItem.Attributes) {
      for (const index of this.indexes) {
        if (!updatedItem.Attributes[index.partitionKey]) {
          updatedItem.Attributes[index.partitionKey] = { S: '' };
        }
      }
    }

    return dbObjectToJson<C>(updatedItem.Attributes);
  }

  async increment(partitionKey: string, attribute: string, amount: number): Promise<number> {
    const pkey = this.columns[this.partitionKey];

    const updatedItem = await dynamodb.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        ...(pkey.type === 'String' ? {
          [this.partitionKey]: { S: partitionKey },
        } : {
          [this.partitionKey]: { N: partitionKey },
        }),
      },
      UpdateExpression: 'ADD #A :i',
      ExpressionAttributeNames: { '#A': attribute },
      ExpressionAttributeValues: { ':i': { N: `${amount}` } },
      ReturnValues: ReturnValue.ALL_NEW,
    }));

    return +((updatedItem.Attributes as Record<string, AttributeValue>)[attribute].N as string);
  }
}
