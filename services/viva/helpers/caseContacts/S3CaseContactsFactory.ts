import type { Contact } from '../../types/caseItem';
import type { ICaseContactsFactory } from './CaseContactsFactory';

export interface Dependencies {
  bucketName: string;
  contactsFileKey: string;
  getFromS3(bucket: string, key: string): Promise<string>;
}

export default class S3CaseContactsFactory implements ICaseContactsFactory {
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    this.dependencies = dependencies;
  }

  async getContacts(): Promise<Contact[]> {
    const contents = await this.dependencies.getFromS3(
      this.dependencies.bucketName,
      this.dependencies.contactsFileKey
    );
    return JSON.parse(contents);
  }
}
