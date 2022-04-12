export class TraceException extends Error {
  private level: string;
  private requestId: string;
  private customData: Record<string, unknown> | undefined;

  constructor(message: string, requestId: string, customData?: Record<string, unknown>) {
    super(message);
    this.level = 'error';
    this.requestId = requestId;
    this.customData = customData;
  }
}
