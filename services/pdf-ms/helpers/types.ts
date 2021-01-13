import { Color } from 'pdf-lib';

export type Font = 'helvetica' | 'timesRoman' | 'courier';
export interface TextNode {
  pageIndex?: number;
  x: number;
  y: number;
  text: string;
  maxWidthInChars?: number;
  fontSize?: number;
  font?: Font;
  color?: Color;
  valueId?: string;
}

export interface Template {
  numberOfPages: number;
  defaultFontSize: number;
  defaultFont?: Font;
  date?: string;
  texts: TextNode[];
}

export interface AnswerObject {
  field: {
    id: string;
    tags: string[];
  };
  value: string;
}
export interface Case {
  id: string;
  formId: string;
  PK: string;
  SK: string;
  status: 'ongoing' | 'submitted';
  provider: string;
  expirationTime: string;
  createdAt: number;
  updatedAt: number;
  answers: Record<string, any>;
  details?: Record<string, any>;
  pdf?: string | Buffer;
  pdfGenerated?: boolean;
}
export const formTypes = ['EKB-new', 'EKB-recurring'];
export type FormType = 'EKB-new' | 'EKB-recurring';
