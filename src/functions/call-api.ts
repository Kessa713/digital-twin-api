import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import axios, { AxiosError } from 'axios';
import UAParser from 'ua-parser-js';
import { createResponse, createErrorResponse } from '../lib/response';
import { ThrowableError } from '../lib/error';
import { validateKey } from '../lib/validate-key';
import APILogs from '../db/api-logs';

const { OPENAI_API_KEY } = process.env;

const ORG = {
  BCF: 'org-AzStsk2SFciFruIs62Yg3vc2',
  ALGOMO: 'org-g6jQ8VPy55iVg2CcGHdcx5wl',
};

export const callApi: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event?.body) {
      throw new ThrowableError(400, 'Request body is empty');
    }

    const ua = event?.headers?.['user-agent'] ? new UAParser(event.headers['user-agent']) : null;

    const { topic, token } = JSON.parse(event.body);

    if (!token) {
      console.error(`Invalid token [${token}]`);
      throw new ThrowableError(401, 'Unauthorized');
    }
    if (!topic || topic.length > 1024) {
      console.error(`Invalid topic [${topic}]`);
      throw new ThrowableError(400, 'Invalid topic parameter');
    }

    const [valid, usesRemaining] = await validateKey(token);
    if (!valid) {
      throw new ThrowableError(403, 'Forbidden');
    }
    if (usesRemaining < 1) {
      throw new ThrowableError(400, 'Out of uses');
    }

    const prompt = `Create an engaging and friendly post between 500 to 1500 characters discussing "${topic}". Surround bold text in html strong tags.`;

    const apiCallStartTime = Date.now();
    const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Create an engaging and friendly post between 500 to 1500 characters discussing "${topic}". Surround bold text in html strong tags.`,
      }],
      temperature: 0.8,
      frequency_penalty: 1,
    }, {
      headers: {
        'OpenAI-Organization': ORG.BCF,
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    const apiCallEndTime = Date.now();
    console.dir(data, { depth: null });

    const resultContent = data.choices?.[0]?.message?.content;

    await APILogs.create({
      attributes: {
        key: token,
        datetime: new Date().toISOString(),
        ...(event?.headers?.['x-forwarded-for'] ? {
          ip: event?.headers?.['x-forwarded-for'] as string,
        } : null),
        ...(ua ? {
          browser: `${ua.getOS().name} ${ua.getOS().version} - ${ua.getBrowser().name} ${ua.getBrowser().version}`,
          device: `${ua.getCPU().architecture} - ${ua.getDevice().vendor} ${ua.getDevice().model} ${ua.getDevice().type}`,
        } : null),
        prompt,
        fullResponse: JSON.stringify(data),
        resultContent,
        responseMs: apiCallEndTime - apiCallStartTime,
        usagePromptTokens: data?.usage?.prompt_tokens ?? -1,
        usageCompletionTokens: data?.usage?.completion_tokens ?? -1,
      },
    });

    if (resultContent) {
      return createResponse({ result: resultContent }, ['POST', 'OPTIONS']);
    }
    throw new ThrowableError(500, 'Error. Please try again');
  } catch (error: unknown) {
    console.error(error instanceof AxiosError ? (error?.response?.data ?? error.message) : String(error).toString());
    if (error instanceof ThrowableError) {
      return createErrorResponse(error.status, error.message, ['POST', 'OPTIONS']);
    }
    return createErrorResponse(500, 'Unknown error', ['POST', 'OPTIONS']);
  }
};
