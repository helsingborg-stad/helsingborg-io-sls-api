import type {
  CaseDetails,
  CaseForm,
  CaseItem,
  CasePerson,
  CaseStatus,
  Contact,
} from '../../types/caseItem';

export interface ICaseBuilder {
  setId(id: string): ICaseBuilder;
  setKeys(PK: string, SK: string): ICaseBuilder;
  setState(state: string): ICaseBuilder;
  setExpirationTime(expirationTime: number): ICaseBuilder;
  setCreatedAt(createdAt: number): ICaseBuilder;
  setUpdatedAt(updatedAt: number): ICaseBuilder;
  setStatus(status: CaseStatus): ICaseBuilder;
  setForms(forms: Record<string, CaseForm>): ICaseBuilder;
  setGSI1(GSI1?: string): ICaseBuilder;
  setGSI2PK(GSI2PK?: string): ICaseBuilder;
  setProvider(provider: string): ICaseBuilder;
  setPersons(persons: CasePerson[]): ICaseBuilder;
  setContacts(contacts: Contact[]): ICaseBuilder;
  setDetails(details: CaseDetails): ICaseBuilder;
  setCurrentFormId(currentFormId: string): ICaseBuilder;
  setPdf(pdf?: Buffer): ICaseBuilder;

  build(): CaseItem;
}

function isValid<T>(maybeValid: T | null | undefined): maybeValid is T {
  return maybeValid !== undefined && maybeValid !== null;
}

function checkPropValid<T, K extends keyof T>(instance: T, propKey: K): true {
  if (!isValid(instance[propKey])) {
    throw new Error(`Invalid property '${String(propKey)}' (is ${typeof instance[propKey]})`);
  }
  return true;
}

function validateCaseItem(caseItem: Partial<CaseItem>): caseItem is CaseItem {
  const validators: Record<
    keyof CaseItem,
    (instance: Partial<CaseItem>, key: keyof CaseItem) => boolean
  > = {
    id: checkPropValid,
    PK: checkPropValid,
    SK: checkPropValid,
    state: checkPropValid,
    expirationTime: checkPropValid,
    createdAt: checkPropValid,
    updatedAt: checkPropValid,
    status: checkPropValid,
    forms: checkPropValid,
    provider: checkPropValid,
    persons: checkPropValid,
    contacts: checkPropValid,
    details: checkPropValid,
    currentFormId: checkPropValid,
    GSI1: () => true,
    GSI2PK: () => true,
    pdf: () => true,
  };

  const invalidPropertyKeys = Object.entries(validators).reduce<string[]>(
    (acc, [propertyKey, validatorFunction]) => {
      try {
        validatorFunction(caseItem, propertyKey as keyof CaseItem);
      } catch (error) {
        return [...acc, propertyKey];
      }

      return acc;
    },
    []
  );

  if (invalidPropertyKeys.length > 0) {
    throw new Error(`Invalid properties of case item: ${invalidPropertyKeys.join(', ')}`);
  }

  return true;
}

export default class CaseBuilder implements ICaseBuilder {
  private caseItem: Partial<CaseItem>;

  constructor() {
    this.caseItem = {};
  }

  setId(id: string): ICaseBuilder {
    this.caseItem.id = id;
    return this;
  }

  setKeys(PK: string, SK: string): ICaseBuilder {
    this.caseItem.PK = PK;
    this.caseItem.SK = SK;
    return this;
  }

  setState(state: string): ICaseBuilder {
    this.caseItem.state = state;
    return this;
  }

  setExpirationTime(expirationTime: number): ICaseBuilder {
    this.caseItem.expirationTime = expirationTime;
    return this;
  }

  setCreatedAt(createdAt: number): ICaseBuilder {
    this.caseItem.createdAt = createdAt;
    return this;
  }

  setUpdatedAt(updatedAt: number): ICaseBuilder {
    this.caseItem.updatedAt = updatedAt;
    return this;
  }

  setStatus(status: CaseStatus): ICaseBuilder {
    this.caseItem.status = status;
    return this;
  }

  setForms(forms: Record<string, CaseForm>): ICaseBuilder {
    this.caseItem.forms = forms;
    return this;
  }

  setGSI1(GSI1?: string | undefined): ICaseBuilder {
    this.caseItem.GSI1 = GSI1;
    return this;
  }

  setGSI2PK(GSI2PK?: string | undefined): ICaseBuilder {
    this.caseItem.GSI2PK = GSI2PK;
    return this;
  }

  setProvider(provider: string): ICaseBuilder {
    this.caseItem.provider = provider;
    return this;
  }

  setPersons(persons: CasePerson[]): ICaseBuilder {
    this.caseItem.persons = persons;
    return this;
  }

  setContacts(contacts: Contact[]): ICaseBuilder {
    this.caseItem.contacts = contacts;
    return this;
  }

  setDetails(details: CaseDetails): ICaseBuilder {
    this.caseItem.details = details;
    return this;
  }

  setCurrentFormId(currentFormId: string): ICaseBuilder {
    this.caseItem.currentFormId = currentFormId;
    return this;
  }

  setPdf(pdf?: Buffer | undefined): ICaseBuilder {
    this.caseItem.pdf = pdf;
    return this;
  }

  build(): CaseItem {
    if (validateCaseItem(this.caseItem)) {
      return this.caseItem;
    }

    throw new Error('');
  }
}
