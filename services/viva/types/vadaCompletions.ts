export interface VadaWorkflowCompletions {
  readonly requested: VadaWorkflowCompletionsRequested[] | [];
  readonly description: string | null;
  readonly receivedDate: string | null;
  readonly dueDate: number | null;
  readonly attachmentUploaded: string[] | [];
  readonly isCompleted: boolean;
  readonly isRandomCheck: boolean;
  readonly isAttachmentPending: boolean;
  readonly isDueDateExpired: boolean;
}

export interface VadaWorkflowCompletionsRequested {
  readonly description: string;
  readonly received: boolean;
}
