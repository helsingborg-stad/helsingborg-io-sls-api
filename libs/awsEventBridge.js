// import AWS from 'aws-sdk';
import Xray from 'aws-xray-sdk';
const AWS = Xray.captureAWS(require('aws-sdk'));

const eventBridge = new AWS.EventBridge();

/**
 *
 * @param {Object} Detail The detailed payload for the event.
 * @param {String} DetailType Free-form string used to decide what fields to expect in the event detail.
 * @param {String} Source The source of the event.
 */
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
