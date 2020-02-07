// list (GET)
export const main = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ data: 'LIST' }),
  };

  callback(null, response);
};
