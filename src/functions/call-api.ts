import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import axios from 'axios';
import { createResponse, createErrorResponse } from '../lib/response';
import { ThrowableError } from '../lib/error';

const { OPENAI_API_KEY } = process.env;
const VALID_TOKENS = (process.env.TOKENS ?? '').split(',');

export const callApi: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event?.body) {
      throw new ThrowableError(400, 'Request body is empty');
    }

    const { topic, token } = JSON.parse(event.body);

    if (!token) {
      throw new ThrowableError(401, 'Unauthorized');
    }
    if (!topic || topic.length > 70) {
      throw new ThrowableError(400, 'Invalid topic parameter');
    }
    if (!(VALID_TOKENS.includes(token))) {
      throw new ThrowableError(403, 'Forbidden');
    }

    console.time('Calling API');
    const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Create an engaging and friendly post between 1000 to 2500 characters discussing "${topic}". Surround bold text in html strong tags.`,
      }],
      temperature: 0.8,
      frequency_penalty: 1,
    }, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    console.timeEnd('Calling API');

    console.dir({ data }, { depth: null });

    if (data.choices?.[0]?.message?.content) {
      return createResponse({ result: data.choices[0].message.content }, ['POST', 'OPTIONS']);
    }
    throw new ThrowableError(500, 'Error. Please try again');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error).toString());
    if (error instanceof ThrowableError) {
      return createErrorResponse(error.status, error.message, ['POST', 'OPTIONS']);
    }
    return createErrorResponse(500, 'Unknown error', ['POST', 'OPTIONS']);
  }
};
