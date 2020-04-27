// A helper  function for validation of keys in an object

export function validateKeys(obj, keys) {
  for (const key in keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, keys[key])) {
      return false;
    }
  }

  return true;
}
