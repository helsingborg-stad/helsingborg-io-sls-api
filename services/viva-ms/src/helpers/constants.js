export const VIVA_POST_TYPE_COLLECTION = {
  lon: 'Lön',
  aldreforsorjningsstod: 'Äldreförsörjningsstöd',
  underhallsbidrag: 'Underhållsstöd',
  annan: 'Övrig inkomst',
  barnpension: 'Efterlevandepension',
  boende: 'Hyra',
  hemforsakring: 'Hemförsäkring',
  bredband: 'Bredband',
  el: 'El',
  reskostnad: 'Reskostnad',
  akassa: 'A-kassa och fackavgift',
  barnomsorg: 'Barnomsorg',
  barnomsorgsskuld: 'Barnomsorg skuld',
  medicin: 'Medicinkostnader',
  lakarvard: 'Sjukvård',
  akuttandvard: 'Akut tandvård',
  tandvard: 'Tandvård',
  annantandvard: 'Annan tandvård',
  bostadslan: 'Bostadslån',
  hyresskuld: 'Skuld hyra',
  fackskuld: 'Skuld a-kassa/fackavgift',
  elskuld: 'Skuld el',
  fastighetsdrift: 'Drift kostnad',
  annat: 'Övrig utgift',
};

export const TAG_NAME = {
  appliesto: 'appliesto',
  amount: 'amount',
  description: 'description',
  date: 'date',
  group: 'group',
  school: 'school',
  housing: 'housing',
  firstName: 'firstName',
  lastName: 'lastName',
  personalNumber: 'personalNumber',
};

export const PERSON_ROLE = {
  applicant: 'applicant',
  coApplicant: 'coApplicant',
  children: 'children',
};

export const EMPTY_INCOME_POST = {
  type: 'income',
  group: '',
  belongsTo: 'APPLICANT',
  title: '',
  description: '',
  date: '',
  value: '',
  currency: 'kr',
};

export const EMPTY_EXPENSE_POST = {
  type: 'expense',
  group: '',
  belongsTo: 'APPLICANT',
  title: '',
  description: '',
  date: '',
  value: '',
  currency: 'kr',
};

export const VIVA_STATUS_NEW_APPLICATION_OPEN = 1;
export const VIVA_STATUS_APPLICATION_PERIOD_OPEN = 1;
export const VIVA_STATUS_COMPLETION = 64;
export const VIVA_STATUS_CASE_EXISTS = 128;
export const VIVA_STATUS_WEB_APPLICATION_ACTIVE = 256;
export const VIVA_STATUS_WEB_APPLICATION_ALLOWED = 512;
