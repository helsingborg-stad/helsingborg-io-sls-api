export const to = (promise) =>
  promise
    .then(response => ({ ok: true, response }))
    .catch(error => Promise.resolve({ ok: false, error }));
