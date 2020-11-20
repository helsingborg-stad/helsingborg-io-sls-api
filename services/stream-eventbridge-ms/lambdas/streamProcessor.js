import AWS from 'aws-sdk';

const eventBridge = new AWS.EventBridge();

/**
 * Lambda function takes DynamoDB stream events and
 * publishes them to an EventBridge Event Bus
 */
export const main = async (event) => {
  const eventsToPut = [];

  for (const record of event.Records) {
    console.log(`Event: ${record.eventName}/${record.eventID}`);

    const [tableArn] = record.eventSourceARN.split('/stream');

    eventsToPut.push({
      Time: record.dynamodb.ApproximateCreationDateTime,
      Source: 'my-service.database',
      Resources: [tableArn],
      DetailType: record.eventName,
      Detail: JSON.stringify(record),
      EventBusName: 'default',
    });
  }

  await eventBridge.putEvents({ Entries: eventsToPut }).promise();

  return 'OK';
};
