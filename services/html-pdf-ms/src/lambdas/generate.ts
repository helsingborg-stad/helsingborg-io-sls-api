import to from 'await-to-js';
import log from '../libs/logs';
import { wrappers } from '../libs/lambdaWrapper';
import { createPdf } from '../helpers/createPdf';
import { savePdf } from '../helpers/savePdf';
import { getHtmlContent } from '../helpers/getHtmlContent';
import { sendSuccessEvent } from '../helpers/sendSuccessEvent';
import { TraceException } from '../helpers/TraceException';
import type { SQSEvent, Context } from 'aws-lambda';
import type { CaseKeys, SuccessEvent } from '../helpers/types';

export interface LambdaDetail {
  readonly pdfStorageBucketKey: string;
  readonly keys: CaseKeys;
  readonly messageId: string;
}

export interface LambdaRequest {
  readonly detail: LambdaDetail;
}

export interface Dependencies {
  getHtmlContent: (storageKey: string) => Promise<string>;
  savePdf: (data: Buffer) => Promise<string>;
  createPdf: (html: string) => Promise<Buffer>;
  sendSuccessEvent: (params: SuccessEvent) => Promise<void>;
  requestId: string;
}

function createCaseId(keys: CaseKeys) {
  return keys.SK.split('CASE#')[1];
}

export async function generate(input: LambdaRequest, dependencies: Dependencies): Promise<boolean> {
  const { pdfStorageBucketKey, keys, messageId } = input.detail;

  const caseId = createCaseId(keys);
  const html = await dependencies.getHtmlContent(pdfStorageBucketKey);

  const [createPdfError, pdfBuffer] = await to<Buffer | undefined, Error | null>(
    dependencies.createPdf(html)
  );

  if (createPdfError) {
    throw new TraceException('Failed to create PDF. Will retry.', dependencies.requestId, {
      messageId,
      caseId,
      createPdfError,
    });
  }

  const pdfBucketKey = pdfBuffer ? await dependencies.savePdf(pdfBuffer) : pdfBuffer;

  if (pdfBucketKey) {
    await dependencies.sendSuccessEvent({
      keys,
      pdfStorageBucketKey: pdfBucketKey,
    });
  }

  log.writeInfo('Record processed SUCCESSFULLY', { messageId, caseId });

  return true;
}

export function main(event: SQSEvent, context: Context): Promise<boolean> {
  const [record] = event.Records;
  const { messageId, attributes, body } = record;
  const { ApproximateReceiveCount: receiveCount, ApproximateFirstReceiveTimestamp: firstReceived } =
    attributes;
  const { awsRequestId: requestId } = context;

  const lambdaRequest = JSON.parse(body) as LambdaRequest;
  const keys = lambdaRequest.detail.keys;

  log.writeInfo('Processing record', {
    messageId,
    receiveCount,
    firstReceived,
    caseId: createCaseId(keys),
  });

  return wrappers.event.wrap(generate, {
    createPdf,
    savePdf,
    getHtmlContent,
    sendSuccessEvent,
    requestId,
  })(
    {
      detail: {
        ...lambdaRequest.detail,
        messageId,
      },
    },
    context
  );
}
