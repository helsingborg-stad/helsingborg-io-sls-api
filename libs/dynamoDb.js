import AWS from './aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function call(action, params) {
  return await dynamoDb[action](
    {
      ...params,
    },
    (err, data) => {
      if (err) {
        return err;
      } else {
        return data;
      }
    }
  );
}
