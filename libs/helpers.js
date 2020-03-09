export const to = promise =>
  promise.then(response => [true, response]).catch(error => Promise.resolve([false, error]));
