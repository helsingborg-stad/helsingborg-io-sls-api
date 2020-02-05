import uuid from 'uuid';
import logger from '@financial-times/lambda-logger';

// POST
export const main = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const item = {
    id: uuid.v1(),
    createdAt: Date.now(),
    ...data,
  };

  logger.info(item);

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      id: item.id,
    }),
  };

  callback(null, response);
};
