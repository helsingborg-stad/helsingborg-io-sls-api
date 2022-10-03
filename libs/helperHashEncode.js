import Hashids from 'hashids';

function encode(value, hashSalt, hashSaltLength) {
  const valueToEncode = parseInt(value, 10);
  const hashids = new Hashids(hashSalt, hashSaltLength);
  return hashids.encode(valueToEncode);
}

const hash = {
  encode,
};

export default hash;
