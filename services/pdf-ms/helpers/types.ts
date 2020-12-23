import { Color } from 'pdf-lib';

export type Font = 'helvetica' | 'timesRoman' | 'courier';

export interface TextObject {
  page?: number;
  x: number;
  y: number;
  fontSize?: number;
  font?: Font;
  color?: Color;
  text: string;
}

export interface TemplateData {
  numberOfPages: number;
  defaultFontSize: number;
  defaultFont?: Font;
  date?: string;

  textObjects: TextObject[];
}

export interface CaseData {
  id: string;
  formId: string;
  PK: string;
  SK: string;
  status: 'ongoing' | 'submitted';
  provider: string;
  expirationTime: string;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, any>;
  details?: Record<string, any>;
  pdf?: string | Buffer;
  pdfGenerated?: boolean;
}
export const formTypes = ['EKB-new', 'EKB-recurring'];
export type FormType = 'EKB-new' | 'EKB-recurring';
