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

export async function signToken(jsonToSign, secret, expireDate) {
  return jwt.sign(
    {
      exp: expireDate,
      ...jsonToSign,
    },
    secret
  );
}
export function getExpireDate(expireTimeInMinutes, baseDate = Date.now()) {
  return parseInt(baseDate / 1000) + expireTimeInMinutes * 60;
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
