import Hashids from 'hashids';

function encode(value, hashSalt, hashSaltLength) {
  let valueToEncode = value;
  if (typeof valueToEncode !== 'number') {
    valueToEncode = parseInt(valueToEncode, 10);
  }

  const hashids = new Hashids(hashSalt, hashSaltLength);
  return hashids.encode(valueToEncode);
}

const hash = {
  encode,
};

export default hash;
