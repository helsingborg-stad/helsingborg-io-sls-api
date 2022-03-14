import getMeetingHtmlBody from '../../src/helpers/getMeetingHtmlBody';

import { FormData } from '../../src/helpers/types';

const formDataMock = (): FormData => {
  return {
    firstname: {
      value: 'Test',
      name: 'Förnamn',
    },
    lastname: {
      value: 'Test',
      name: 'Efternamn',
    },
    email: {
      value: 'user@test.se',
      name: 'Email',
    },
    phone: {
      value: '123456',
      name: 'Telefon',
    },
    comment: {
      value: 'No comment',
      name: 'Övrigt',
    },
    remoteMeeting: {
      value: false,
      name: 'Jag vill ansluta digitalt',
    },
  };
};

describe('getMeetingHtmlBody', () => {
  it('generates html of formData', () => {
    const formData = formDataMock();
    formData.remoteMeeting.value = false;

    const html = getMeetingHtmlBody(formData);

    expect(html).toEqual(
      expect.stringContaining(
        '<p>Förnamn: Test</p><p>Efternamn: Test</p><p>Email: user@test.se</p><p>Telefon: 123456</p><p>Övrigt: No comment</p><p>Jag vill ansluta digitalt: Nej</p>'
      )
    );
  });

  it('generates a link if remoteMeetingLink exist', () => {
    const formData = formDataMock();
    formData.remoteMeeting.value = false;

    const html = getMeetingHtmlBody(formData, 'link.to.meeting');

    expect(html).toEqual(expect.stringContaining('href="link.to.meeting"'));
  });
});
