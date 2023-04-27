type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'OPTIONS';

type Response = {
  statusCode: 200 | 204;
  headers: { [key: string]: string };
  body?: string;
}

type ErrorResponse = {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

export function createResponse(body?: Record<string, unknown>, allowedMethods: Method[] = ['GET', 'OPTIONS']):Response {
  return {
    statusCode: body ? 200 : 204,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods.join(','),
    },
    ...(body && { body: JSON.stringify(body) }),
  };
}

export function createErrorResponse(statusCode: number, message: string, allowedMethods: Method[] = ['GET', 'OPTIONS']):ErrorResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods.join(','),
    },
    body: JSON.stringify({ message }),
  };
}
