import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createResponse } from '../lib/response';

export const health: APIGatewayProxyHandlerV2 = async () => {
  return createResponse(undefined, ['GET', 'OPTIONS']);
};
