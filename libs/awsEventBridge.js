import AWS from 'aws-sdk';
import Xray from 'aws-xray-sdk';

const XrayEnhancedAWS = Xray.captureAWS(AWS);
const eventBridge = new XrayEnhancedAWS.EventBridge();

function putEventRequest(Detail, DetailType, Source) {
  const params = {
    Entries: [
      {
        Detail: JSON.stringify(Detail),
        DetailType,
        Source,
        Time: new Date(),
      },
    ],
  };

  return eventBridge.putEvents(params).promise();
}

function addXrayMetadata(DetailType, Source) {
  const segment = Xray.getSegment();
  const subSegment = segment.addNewSubsegment('PutEventsMetadata');

  subSegment.addMetadata('DetailType', DetailType);
  subSegment.addMetadata('Source', Source);

  subSegment.close();
}

/**
 *
 * @param {Object} Detail The detailed payload for the event.
 * @param {String} DetailType Free-form string used to decide what fields to expect in the event detail.
 * @param {String} Source The source of the event.
 */
export function putEvent(Detail, DetailType, Source) {
  addXrayMetadata(DetailType, Source);

  return putEventRequest(Detail, DetailType, Source);
}
