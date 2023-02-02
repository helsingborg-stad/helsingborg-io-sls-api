import { wrappers } from '../libs/lambdaWrapper';
import { createPdf } from '../helpers/createPdf';
import { savePdf } from '../helpers/savePdf';
import { getHtmlContent } from '../helpers/getHtmlContent';
import { sendSuccessEvent } from '../helpers/sendSuccessEvent';
import type { CaseKeys, SuccessEvent } from '../helpers/types';

export interface EventDetail {
  pdfStorageBucketKey: string;
  keys: CaseKeys;
}

export interface FunctionInput {
  detail: EventDetail;
}

export interface Dependencies {
  getHtmlContent: (storageKey: string) => Promise<string>;
  savePdf: (data: Buffer) => Promise<string>;
  createPdf: (html: string) => Promise<Buffer>;
  sendSuccessEvent: (params: SuccessEvent) => Promise<void>;
}

type FunctionResponse = Promise<boolean>;

export async function generate(input: FunctionInput, dependencies: Dependencies): FunctionResponse {
  const { pdfStorageBucketKey } = input.detail;

  const html = await dependencies.getHtmlContent(pdfStorageBucketKey);
  const pdfBuffer = await dependencies.createPdf(html);
  const pdfBucketKey = await dependencies.savePdf(pdfBuffer);

  if (pdfBucketKey) {
    await dependencies.sendSuccessEvent({
      keys: input.detail.keys,
      pdfStorageBucketKey: pdfBucketKey,
    });
  }

  return true;
}

export const main = wrappers.event.wrap(generate, {
  getHtmlContent,
  savePdf,
  createPdf,
  sendSuccessEvent,
});
