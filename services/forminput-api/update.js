// update (PUT)
export const main = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ body: 'UPDATED!' }),
  };

  callback(null, response);
};
