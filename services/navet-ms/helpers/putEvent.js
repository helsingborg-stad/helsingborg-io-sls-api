import AWS from 'aws-sdk';

const eventBridge = new AWS.EventBridge();

export function putEvent(Detail, DetailType, Source) {
  const params = {
    Entries: [
      {
        Detail: JSON.stringify(Detail),
        DetailType,
        Source,
      },
    ],
  };

  return eventBridge.putEvents(params).promise();
}
