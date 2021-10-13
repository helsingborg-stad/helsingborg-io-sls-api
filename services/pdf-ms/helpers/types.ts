import { Color } from 'pdf-lib';

// PDF

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

// USER

export interface User {
  uuid: string;
  personalNumber: number;
  adress: Record<string, any>;
  civilStatus: string;
  email: string;
  firstName: string;
  lastName: string;
}

// CASE

export interface Status {
  type: string;
  name: string;
  description: string;
}

export interface Answer {
  field: {
    id: string;
    tags: string[];
  };
  value: string;
}

export interface Form {
  currentPosition?: Record<string, any>;
  answers: Answer[];
}

export interface Case {
  id?: string;
  PK?: string;
  SK?: string;
  status?: Status;
  provider?: string;
  expirationTime?: string;
  createdAt?: number;
  updatedAt?: number;
  currentFormId?: string;
  forms?: Record<string, Form>;
  details?: Record<string, any>;
  pdf?: string | Buffer;
  pdfGenerated?: string;
  state?: string;
}

export const formTypes = ['EKB-new', 'EKB-recurring'];
export type FormType = 'EKB-new' | 'EKB-recurring';
