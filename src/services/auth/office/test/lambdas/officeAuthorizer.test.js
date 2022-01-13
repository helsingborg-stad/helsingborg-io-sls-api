import jwt from 'jsonwebtoken';
import axios from 'axios';

import { main } from '../../lambdas/officeAuthorizer';

jest.mock('jsonwebtoken');
jest.mock('axios');

const mockEvent = {
    Authorization: 'mockJWT',
};

process.env.executeResourceArns = 'mockArn';

let consoleSpy;
let mockDecodedToken;
let mockJWKKeys;

beforeEach(() => {
    jest.resetAllMocks();
    consoleSpy = jest.spyOn(console, 'error');

    mockDecodedToken = {
        header: {
            kid: 'kid_1',
            alg: 'RS256',
            typ: 'JWT',
        },
        payload: {
            tid: '2',
        },
    };

    mockJWKKeys = {
        keys: [
            {
                kty: 'RSA',
                use: 'sig',
                kid: 'kid_1',
                x5t: 'x5t_1',
                n: 'n_key_1',
                e: 'e_key_1',
                x5c: ['x5c_1'],
            },
            {
                kty: 'RSA',
                use: 'sig',
                kid: 'kid_2',
                x5t: 'x5t_2',
                n: 'n_key_2',
                e: 'e_key_2',
                x5c: ['x5c_1'],
            },
        ],
    };
});

it('returns an IAM policy if JWT token is valid', async () => {
    expect.assertions(1);

    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockJWKKeys });
    const expectedResult = {
        policyDocument: {
            Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: 'mockArn' }],
            Version: '2012-10-17',
        },
        principalId: 'officeUser',
    };

    const result = await main(mockEvent);

    expect(result).toEqual(expectedResult);
});

it('throws if JWT is invalid or malformed', async () => {
    expect.assertions(3);

    await expect(main({ Authorization: 'fakeJWT' })).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Malformed JWT');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});

it('throws if JWT has wrong algorithm', async () => {
    expect.assertions(3);

    mockDecodedToken.header.alg = 'wrongAlg';
    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);

    await expect(main(mockEvent)).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Wrong algorithm found in JWT');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});

it('throws if JWKS could not be fetched', async () => {
    expect.assertions(3);

    const mockAxiosError = 'error';
    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    jest.spyOn(axios, 'get').mockRejectedValueOnce(mockAxiosError);

    await expect(main(mockEvent)).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Could not fetch JWKs: ', mockAxiosError);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});

it('throws if no valid signing keys could be found', async () => {
    expect.assertions(3);

    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { keys: [] } });

    await expect(main(mockEvent)).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('No valid signing keys found');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});

it('throws if no valid signing key with matching kid where found', async () => {
    expect.assertions(3);

    mockJWKKeys.keys[0].kid = 'wrongKid';
    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockJWKKeys });

    await expect(main(mockEvent)).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('No signing key with matching "kid" where found');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});

it('throws if jwt fails to verify the JWT', async () => {
    expect.assertions(3);

    const verifyError = 'verifyError';
    jest.spyOn(jwt, 'decode').mockReturnValueOnce(mockDecodedToken);
    jest.spyOn(jwt, 'verify').mockImplementationOnce((_, __, cb) => cb(verifyError));
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockJWKKeys });

    await expect(main(mockEvent)).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to verify JWT: ', verifyError);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
});
