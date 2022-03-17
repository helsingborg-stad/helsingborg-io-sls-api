export interface BankIdSSMParams {
  bucketName: string;
  passphrase: string;
  caName: string;
  pfxName: string;
  apiUrl: string;
}

export interface BankIdError {
  response: {
    status: number;
    data?: {
      details: string;
    };
  };
}
