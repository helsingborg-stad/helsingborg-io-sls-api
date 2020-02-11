// delete (DELETE)
export const main = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ body: 'DELETED!', id: event.body.id }),
  };

  callback(null, response);
};
