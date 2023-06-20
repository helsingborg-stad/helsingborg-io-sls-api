import administratorNameDecorator from '../../../src/helpers/caseContacts/administratorNameDecorator';
import S3CaseContactsFactory from '../../../src/helpers/caseContacts/S3CaseContactsFactory';
import type { Dependencies } from '../../../src/helpers/caseContacts/S3CaseContactsFactory';

describe('administratorNameDecorator', () => {
  it('returns contacts with administrator name set by replace pattern', async () => {
    const expectedResult = [
      {
        name: 'Din socialsekreterare är',
        description: 'Admin Adminsson',
      },
      {
        name: 'Kontakt',
        description: 'Ring 1234',
      },
    ];

    const dependencies: Dependencies = {
      bucketName: 'bucketName',
      contactsFileKey: 'contacts.json',
      getFromS3: () =>
        Promise.resolve(
          '[{"name": "Din socialsekreterare är", "description": "#OFFICER_NAME"}, {"name": "Kontakt", "description": "Ring 1234"}]'
        ),
    };

    const contactsFactory = await administratorNameDecorator(
      new S3CaseContactsFactory(dependencies),
      'Admin Adminsson'
    );

    expect(await contactsFactory.getContacts()).toEqual(expectedResult);
  });
});
