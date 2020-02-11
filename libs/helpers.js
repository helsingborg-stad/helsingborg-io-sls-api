export const catchError = (promise) =>
  promise
    .then((response) => ({ ok: true, response }))
    .catch((error) => Promise.resolve({ ok: false, error }));
