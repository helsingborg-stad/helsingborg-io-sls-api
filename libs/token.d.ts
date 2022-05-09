export interface Token {
  personalNumber: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Takes an http event with an jwt authorization header, and returns the decoded info from it. Does not check if the token is valid, that should be handled by an authorizer.
 * @param {*} httpEvent the event passed to the lambda
 */
export function decodeToken(httpEvent: any): Token;

export function signToken(jsonToSign: obj, secret: string, expiryDate: number): Promise<any>;

export function getExpireDate(expireTimeInMinutes: number, baseDate: date = Date.now()): number;

/**
 * Asynchronously verify given token using a secret or a public key to get a decoded JSON Web Token
 * @param {string} token a json web token
 * @param {string} secret the secret key to verify the signature in the JSON Web Token.
 */
export function verifyToken(token: string, secret: string): Promise<any>;
