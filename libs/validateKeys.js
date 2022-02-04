// A helper function for validation of keys in an object

export function validateKeys(obj, keys) {
  for (const i in keys) {
    if (!Object.keys(obj).find(item => item === keys[i])) {
      return false;
    }
  }
  return true;
}
