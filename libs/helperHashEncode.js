import Hashids from 'hashids';

/**
 * Helper function to hash encode personal number
 *
 * @param {number} number Personal number to be hashed
 * @param {string} hashSalt Hash security salt
 * @param {number} hashSaltLength Hash security salt length
 * @returns {string} Hashed personal number
 */
function encode(number, hashSalt, hashSaltLength) {
  typeof number === 'number' || (number = parseInt(number, 10));
  const hashids = new Hashids(hashSalt, hashSaltLength);
  const encodedNumber = hashids.encode(number);
  return encodedNumber;
}

const hash = {
  encode,
};

export default hash;
