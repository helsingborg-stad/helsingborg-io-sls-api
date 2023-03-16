import type { Contact } from '../../types/caseItem';

export interface ICaseContactsFactory {
  getContacts(): Promise<Contact[]>;
}
