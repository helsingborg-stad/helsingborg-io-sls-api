import { SQSEvent, Context } from 'aws-lambda';

import { TraceException } from './TraceException';

export function validateSQSEvent(event: SQSEvent, context: Context) {
  if (event.Records.length !== 1) {
    throw new TraceException(
      `Lambda received (${event.Records.length}) but expected only one.`,
      context.awsRequestId
    );
  }
}
