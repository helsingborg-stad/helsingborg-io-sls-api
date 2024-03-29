import AWS from 'aws-sdk';

import log from '../libs/logs';

const eventBridge = new AWS.EventBridge();

export async function main(event, context) {
  const eventsToPut = [];

  for (const record of event.Records) {
    log.info(
      `Event: ${record.eventName}/${record.eventID}`,
      context.awsRequestId,
      'service-stream-event-bridge-ms-001'
    );

    const [tableArn] = record.eventSourceARN.split('/stream');

    eventsToPut.push({
      Time: record.dynamodb.ApproximateCreationDateTime,
      Source: 'cases.database',
      Resources: [tableArn],
      DetailType: record.eventName,
      Detail: JSON.stringify(record),
      EventBusName: 'default',
    });
  }

  await eventBridge.putEvents({ Entries: eventsToPut }).promise();

  return true;
}
