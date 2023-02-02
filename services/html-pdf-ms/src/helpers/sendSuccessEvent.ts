import { putEvent } from '../libs/awsEventBridge';
import type { SuccessEvent } from './types';

export function sendSuccessEvent(params: SuccessEvent): Promise<void> {
  return putEvent(params, 'PdfMsGenerateSuccess', 'pdfMs.generate');
}
