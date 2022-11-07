export enum VivaAttachmentCategory {
  Expenses = 'expenses',
  Incomes = 'incomes',
  Completion = 'completion',
  Unknown = '',
}

export interface VivaAttachment {
  id: string;
  name: string;
  category: VivaAttachmentCategory;
  fileBase64: string;
}
