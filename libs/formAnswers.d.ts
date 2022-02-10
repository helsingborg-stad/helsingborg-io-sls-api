/* eslint-disable @typescript-eslint/no-explicit-any */
export function getFormFieldsWithLoadPreviousAttribute(form: any): any[];
export function formatAnswer(
  id: any,
  tags: any,
  value: any
): {
  field: {
    id: any;
    tags: any;
  };
  value: any;
};
export function mergeAnswers(previousAnswers: any, newAnswers: any): any[];
export function populateFormWithPreviousCaseAnswers(
  forms: any,
  applicants: any,
  formTemplates: any,
  previousForms: any
): Record<string, never>;
