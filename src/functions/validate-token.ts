import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../lib/response';
import { ThrowableError } from '../lib/error';

const VALID_TOKENS = (process.env.TOKENS ?? '').split(',');

export const validateToken: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event?.body) {
      throw new ThrowableError(400, 'Request body is empty');
    }

    const { token } = JSON.parse(event.body);

    return createResponse({ valid: token && VALID_TOKENS.includes(token) }, ['POST', 'OPTIONS']);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error).toString());
    if (error instanceof ThrowableError) {
      return createErrorResponse(error.status, error.message, ['POST', 'OPTIONS']);
    }
    return createErrorResponse(500, 'Unknown error', ['POST', 'OPTIONS']);
  }
};
