import isDefined from '../helpers/isDefined';

import { FormData } from './types';

const parseFormDataValue = (value: string | boolean): string => {
  if (typeof value === 'string') {
    return value;
  }
  return value ? 'Ja' : 'Nej';
};

const formDataToHTML = (form: FormData) => {
  return Object.values(form)
    .filter(item => item.name)
    .reduce((prev, item) => prev + `<p>${item.name}: ${parseFormDataValue(item.value)}</p>`, '');
};

export default (formData: FormData, remoteMeetingLink?: string): string => {
  const remoteMeetingHtml = isDefined(remoteMeetingLink)
    ? `
      <div style="color:#252424; font-family:'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif">
          <div style="margin-top:24px; margin-bottom:20px">
            <span style="font-size:24px; color:#252424">Microsoft Teams-möte</span>
          </div>
          <div style="margin-bottom:20px">
            <div style="margin-top:0px; margin-bottom:0px; font-weight:bold">
              <span style="font-size:14px; color:#252424">Jobba på datorn eller mobilappen</span>
            </div>
            <a href="${remoteMeetingLink}"
              target="_blank" rel="noreferrer noopener"
              style="font-size:14px; font-family:'Segoe UI Semibold','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif; text-decoration:underline; color:#6264a7">
              Klicka här för att ansluta till mötet
            </a>
          </div>
        </div>
      `
    : '';

  return `
    <body>
      ${formDataToHTML(formData)}
      ${remoteMeetingHtml}
    </body>
    `;
};
