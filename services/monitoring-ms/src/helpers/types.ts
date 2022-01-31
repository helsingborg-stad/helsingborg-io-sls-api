export interface Case {
  PK: string;
  SK: string;
  status: {
    type: string;
  };
  updatedAt: number;
  state: string;
}

export interface CaseResponse {
  Items: Case[];
}
export interface ValidatorData {
  testId: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
}

export interface ValidatorContext {
  getAge: (compare: number) => number;
}

export interface CaseValidatorContext extends ValidatorContext {
  getCases: () => Promise<CaseResponse>;
  log: (data: ValidatorData, userCase: Case) => void;
  getTests: () => Validator[];
}

export type Validator = (userCase: Case, context: ValidatorContext) => ValidatorData | undefined;
