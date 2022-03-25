import jwt from 'jsonwebtoken';

/**
 * Takes an http event with an jwt authorization header, and returns the decoded info from it. Does not check if the token is valid, that should be handled by an authorizer.
 * @param {*} httpEvent the event passed to the lambda
 */
export function decodeToken(httpEvent) {
  const authorizationValue = httpEvent.headers.Authorization;

  const token = authorizationValue.includes('Bearer')
    ? authorizationValue.substr(authorizationValue.indexOf(' ') + 1)
    : authorizationValue;

  const decodedToken = jwt.decode(token);
  return decodedToken;
}

/**
 * Asynchronously sign a given payload into a JSON Web Token.
 * @param {obj} jsonToSign the payload of the json web token.
 * @param {string} secret the secret key to sign the JSON Web Token.
 * @param {number} expireTimeInSeconds the expire time for the token in seconds.
 */
export async function signToken(jsonToSign, secret, expireTimeInMinutes) {
  // Add expiration time to JWT token.
  // The format is in seconds since Jan 1, 1970, not milliseconds, to match the default iat format of JWT.
  jsonToSign.exp = parseInt(Date.now() / 1000) + expireTimeInMinutes * 60;

  const token = jwt.sign(jsonToSign, secret);
  return token;
}

/**
 * Asynchronously verify given token using a secret or a public key to get a decoded JSON Web Token
 * @param {string} token a json web token
 * @param {string} secret the secret key to verify the signature in the JSON Web Token.
 */
export async function verifyToken(token, secret) {
  return jwt.verify(token, secret, (error, decoded) => {
    if (error) {
      throw error;
    }
    return decoded;
  });
}

export function extractToken(authorizationToken) {
  if (!authorizationToken || authorizationToken === '') {
    throw Error('Invalid token provided');
  }
  return authorizationToken.includes('Bearer')
    ? authorizationToken.slice(authorizationToken.indexOf(' ') + 1)
    : authorizationToken;
}
