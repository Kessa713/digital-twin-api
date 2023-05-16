import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../lib/response';
import { ThrowableError } from '../lib/error';
import { validateKey } from '../lib/validate-key';

export const validateToken: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event?.body) {
      throw new ThrowableError(400, 'Request body is empty');
    }

    const { token } = JSON.parse(event.body);

    if (!token) {
      throw new ThrowableError(400, 'Token is missing');
    }

    const [valid, usesRemaining] = await validateKey(token);

    return createResponse({ valid, usesRemaining }, ['POST', 'OPTIONS']);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error).toString());
    if (error instanceof ThrowableError) {
      return createErrorResponse(error.status, error.message, ['POST', 'OPTIONS']);
    }
    return createErrorResponse(500, 'Unknown error', ['POST', 'OPTIONS']);
  }
};
