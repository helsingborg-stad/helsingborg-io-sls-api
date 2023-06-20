import replacer from '../replacer';
import type { Contact } from '../../types/caseItem';
import type { ICaseContactsFactory } from './CaseContactsFactory';

const REPLACE_PATTERN = '#OFFICER_NAME';

export default async function administratorNameDecorator(
  contactFactory: ICaseContactsFactory,
  administratorName: string
): Promise<ICaseContactsFactory> {
  const contacts = await contactFactory.getContacts();

  const alteredContacts = contacts.reduce<Contact[]>((contacts, item) => {
    item.description = replacer({
      source: item.description,
      tagert: administratorName,
      pattern: REPLACE_PATTERN,
    });

    contacts.push(item);
    return contacts;
  }, []);

  return {
    getContacts: () => Promise.resolve(alteredContacts),
  };
}
