export const to = (promise) =>
  promise
    .then(response => ({ ok: true, result: response }))
    .catch(error => Promise.resolve({ ok: false, result: error }));
