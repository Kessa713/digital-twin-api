/* eslint-disable @typescript-eslint/no-unused-vars,no-unused-expressions */
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import { expect } from 'chai';
import * as handler from '../src/handler';

const callback = () => { throw new Error('Handlers should not use callback'); };

describe('Healthcheck', () => {
  it('simple success', async () => {
    const event = { body: 'Test Body' } as APIGatewayProxyEventV2;
    const context = {} as Context;

    const response = await handler.health(event, context, callback) as APIGatewayProxyStructuredResultV2;
    expect(response).to.not.be.undefined;
    expect(response.statusCode).to.equal(204);
    expect(response.body).to.be.undefined;
  });
});

describe('API Check', () => {
  it('generate content', async () => {
    const event = {
      body: JSON.stringify({
        token: 'dmKJq7B8VFVVGX7iSyzrAdQwMXvIacbY',
        topic: 'Impact of AI on Marketing and Advertising',
      }),
    } as APIGatewayProxyEventV2;
    const context = {} as Context;

    const response = await handler.callApi(event, context, callback) as APIGatewayProxyStructuredResultV2;
    expect(response).to.not.be.undefined;

    expect(response.statusCode).to.equal(200);
    expect(response.body).to.not.be.undefined;
    if (response.body !== undefined) {
      const parsedBody = JSON.parse(response.body);
      expect(parsedBody).to.have.property('result');
    }
  }).timeout(60000);
});
