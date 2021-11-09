import { EventBridge } from 'aws-sdk/clients/eventbridge';

import log from '../../../libs/logs';

const eventBridge = new EventBridge({ apiVersion: '2015-10-07' });

/**
 * Lambda function takes DynamoDB stream events and
 * publishes them to an EventBridge Event Bus
 */
export const main = async (event, context) => {
  const eventsToPut = [];

  for (const record of event.Records) {
    log.info(
      `Event: ${record.eventName}/${record.eventID}`,
      context.awsRequestId,
      'service-stream-event-bridge-ms-001',
      JSON.stringify(record.dynamodb.NewImage)
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

  return 'OK';
};
