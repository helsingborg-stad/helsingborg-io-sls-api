import type { APIGatewayEvent, Context } from 'aws-lambda';
import { wrappers } from './lambdaWrapper';
import log from './logs';
import jwt from 'jsonwebtoken';

type EVENT_LAMBDA_RETURN_TYPE = Promise<boolean>;
type REST_LAMBDA_RETURN_TYPE = Promise<string>;
type REST_JSON_LAMBDA_RETURN_TYPE = Promise<Record<string, unknown>>;

const mockTokenPersonalNumber = '197001011234';
const testInput = {
  top: 'Lorem ipsum',
  nested: {
    inner: 'Dolar sitem',
  },
};

const testDependencies = {
  testFunc() {
    return 'Hello';
  },
};

const MOCK_LAMBDA_RETURN_OBJECT = {
  top: 'Lorem ipsum',
  nested: {
    inner: 'Dolar sitem',
  },
};

describe('lambda wrappers', () => {
  beforeAll(() => {
    jest.spyOn(log, 'writeLog').mockImplementation();
  });

  describe('event', () => {
    it('passes correct data to lambda', async () => {
      const mockLambda = jest.fn<EVENT_LAMBDA_RETURN_TYPE, []>();
      const func = wrappers.event.wrap(mockLambda, testDependencies);

      await func(testInput, {} as Context);

      expect(mockLambda).toHaveBeenCalledTimes(1);
      expect(mockLambda).toHaveBeenCalledWith(testInput, testDependencies);
    });

    it('returns bool', async () => {
      async function mockLambda() {
        return true;
      }
      const func = wrappers.event.wrap(mockLambda, testDependencies);

      const result = await func(testInput, {} as Context);

      expect(result).toBe(true);
    });

    it('throws on error', async () => {
      async function mockLambda(): Promise<boolean> {
        throw new Error('oops');
      }
      const func = wrappers.event.wrap(mockLambda, testDependencies);
      async function invoke() {
        await func(testInput, {} as Context);
      }

      await expect(invoke()).rejects.toThrow();
    });
  });

  describe('rest (raw)', () => {
    it('passes correct data to lambda', async () => {
      const mockLambda = jest.fn<REST_LAMBDA_RETURN_TYPE, []>();
      const mockEvent: APIGatewayEvent = {
        queryStringParameters: {
          myVar: 'hello',
        },
        body: JSON.stringify({
          myVar: 'goodbye',
          nested: {
            myVar: 'galaxy',
          },
        }),
      } as unknown as APIGatewayEvent;
      const expected = {
        myVar: 'hello',
        nested: {
          myVar: 'galaxy',
        },
      };

      const wrapFunc = wrappers.restRaw.wrap(mockLambda, testDependencies);
      await wrapFunc(mockEvent, {} as Context);

      expect(mockLambda).toHaveBeenCalledTimes(1);
      expect(mockLambda).toHaveBeenCalledWith(expected, testDependencies);
    });

    test.each([
      [
        'correct rest output format',
        {
          statusCode: expect.any(Number),
          body: 'hello',
        },
      ],
      [
        'text/plain as Content-Type',
        {
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        },
      ],
      [
        '200',
        {
          statusCode: 200,
        },
      ],
    ])('(on success) returns %s', async (_, expectedObject) => {
      const mockLambda = jest.fn<REST_LAMBDA_RETURN_TYPE, []>().mockResolvedValue('hello');

      const wrapFunc = wrappers.restRaw.wrap(mockLambda, { s: '' });
      const result = await wrapFunc({} as APIGatewayEvent, {} as Context);

      expect(result).toEqual(expect.objectContaining(expectedObject));
    });

    test.each([
      [
        'json api response',
        {
          body: JSON.stringify({
            jsonapi: {
              version: '1.0',
            },
            data: {
              status: '500',
              code: 500,
              title: 'Error',
              detail: 'hello',
              message: 'hello',
            },
          }),
        },
      ],
      [
        'application/json as Content-Type',
        {
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        },
      ],
      [
        '500',
        {
          statusCode: 500,
        },
      ],
    ])('(on error) returns %s', async (_, expectedObject) => {
      const mockLambda = jest
        .fn<REST_LAMBDA_RETURN_TYPE, []>()
        .mockRejectedValue(new Error('hello'));

      const wrapFunc = wrappers.restRaw.wrap(mockLambda, {});
      const result = await wrapFunc({} as APIGatewayEvent, {} as Context);

      expect(result).toEqual(expect.objectContaining(expectedObject));
    });
  });

  describe('rest (json)', () => {
    it('passes correct data to lambda', async () => {
      const mockLambda = jest.fn<REST_JSON_LAMBDA_RETURN_TYPE, []>();
      const mockEvent: APIGatewayEvent = {
        queryStringParameters: {
          myVar: 'hello',
        },
        headers: {
          Authorization: jwt.sign({ personalNumber: mockTokenPersonalNumber }, 'secret'),
        },
        body: JSON.stringify({
          myVar: 'goodbye',
          nested: {
            myVar: 'galaxy',
          },
        }),
      } as unknown as APIGatewayEvent;
      const expected = {
        myVar: 'hello',
        nested: {
          myVar: 'galaxy',
        },
        personalNumber: mockTokenPersonalNumber,
      };

      const wrapFunc = wrappers.restJSON.wrap(mockLambda, testDependencies);
      await wrapFunc(mockEvent, {} as Context);

      expect(mockLambda).toHaveBeenCalledTimes(1);
      expect(mockLambda).toHaveBeenCalledWith(expected, testDependencies);
    });

    it('excludes authorization token if not exists', async () => {
      const mockLambda = jest.fn<REST_JSON_LAMBDA_RETURN_TYPE, []>();
      const mockEvent: APIGatewayEvent = {
        queryStringParameters: {
          myVar: 'hello',
        },
        body: JSON.stringify({
          myVar: 'goodbye',
          nested: {
            myVar: 'galaxy',
          },
        }),
      } as unknown as APIGatewayEvent;
      const expected = {
        myVar: 'hello',
        nested: {
          myVar: 'galaxy',
        },
      };

      const wrapFunc = wrappers.restJSON.wrap(mockLambda, testDependencies);
      await wrapFunc(mockEvent, {} as Context);

      expect(mockLambda).toHaveBeenCalledTimes(1);
      expect(mockLambda).toHaveBeenCalledWith(expected, testDependencies);
    });

    test.each([
      [
        'correct rest output format',
        {
          statusCode: expect.any(Number),
          body: JSON.stringify({
            jsonapi: {
              version: '1.0',
            },
            data: MOCK_LAMBDA_RETURN_OBJECT,
          }),
        },
      ],
      [
        'application/json as Content-Type',
        {
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        },
      ],
      [
        '200',
        {
          statusCode: 200,
        },
      ],
    ])('(on success) returns %s', async (_, expectedObject) => {
      const mockLambda = jest
        .fn<REST_JSON_LAMBDA_RETURN_TYPE, []>()
        .mockResolvedValue(MOCK_LAMBDA_RETURN_OBJECT);

      const wrapFunc = wrappers.restJSON.wrap(mockLambda, {});
      const result = await wrapFunc({} as APIGatewayEvent, {} as Context);

      expect(result).toEqual(expect.objectContaining(expectedObject));
    });

    test.each([
      [
        'json api response',
        {
          body: JSON.stringify({
            jsonapi: {
              version: '1.0',
            },
            data: {
              status: '500',
              code: 500,
              title: 'Error',
              detail: 'hello',
              message: 'hello',
            },
          }),
        },
      ],
      [
        'application/json as Content-Type',
        {
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        },
      ],
      [
        '500',
        {
          statusCode: 500,
        },
      ],
    ])('(on error) returns %s', async (_, expectedObject) => {
      const mockLambda = jest
        .fn<REST_JSON_LAMBDA_RETURN_TYPE, []>()
        .mockRejectedValue(new Error('hello'));

      const wrapFunc = wrappers.restJSON.wrap(mockLambda, {});
      const result = await wrapFunc({} as APIGatewayEvent, {} as Context);

      expect(result).toEqual(expect.objectContaining(expectedObject));
    });
  });
});
