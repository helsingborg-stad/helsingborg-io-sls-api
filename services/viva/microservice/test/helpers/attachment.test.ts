import * as S3 from '../../src/libs/S3';
import attachment from '../../src/helpers/attachment';
import type { CaseFormAnswer } from '../../src/types/caseItem';

jest.mock('../../src/libs/S3');

it('return a list of attachment objects', async () => {
  jest
    .spyOn(S3.default, 'getFile')
    .mockResolvedValueOnce({
      id: '1',
      Body: 'Some body here0',
    })
    .mockResolvedValueOnce({
      id: '2',
      Body: 'Some body here1',
    })
    .mockResolvedValueOnce({
      id: '3',
      Body: 'Some body hereA0',
    });

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '123',
        tags: [],
      },
      value: [
        {
          uploadedId: '1234',
          deviceFileName: 'deviceFileName_0.png',
          mime: 'image/png',
          id: '1',
          index: 0,
          questionId: 'questionId_0',
          externalDisplayName: 'externalDisplayName_0.png',
        },
        {
          uploadedId: '4321',
          deviceFileName: 'deviceFileName_1.png',
          mime: 'image/png',
          id: '2',
          index: 1,
          questionId: 'questionId_1',
          externalDisplayName: 'externalDisplayName_1.png',
        },
      ],
    },
    {
      field: {
        id: '987',
        tags: ['viva', 'attachment', 'category', 'expenses'],
      },
      value: [
        {
          uploadedId: '7890',
          deviceFileName: 'deviceFileNameA_0.png',
          mime: 'image/png',
          id: '3',
          index: 0,
          questionId: 'questionIdA_0',
          externalDisplayName: 'externalDisplayNameA_0.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/1234',
      name: 'externalDisplayName_0.png',
      category: '',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/4321',
      name: 'externalDisplayName_1.png',
      category: '',
      fileBase64: 'Some body here1',
    },
    {
      id: '199492921234/7890',
      name: 'externalDisplayNameA_0.png',
      category: 'expenses',
      fileBase64: 'Some body hereA0',
    },
  ]);
});

it("return empty array when attachment file can't be retrived", async () => {
  jest.spyOn(S3.default, 'getFile').mockRejectedValueOnce({
    Body: 'BASE64 empty',
    id: '999',
  });

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '999',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: [
        {
          uploadedId: '666',
          deviceFileName: 'doNotExists.png',
          mime: 'image/jpg',
          id: '1',
          index: 0,
          questionId: 'doNotExistsId',
          externalDisplayName: 'doNotExists.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([]);
});

it('return empty array if answer value is of type string', async () => {
  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '99',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: 'String value, THIS IS NOT AN ATTACHMENT',
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([]);
});

it('return list of attachment where category is set to expenses', async () => {
  jest
    .spyOn(S3.default, 'getFile')
    .mockResolvedValueOnce({
      id: '0',
      Body: 'Some body here0',
    })
    .mockResolvedValueOnce({
      id: '1',
      Body: 'Some body here1',
    });

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '123',
        tags: ['viva', 'attachment', 'category', 'expenses'],
      },
      value: [
        {
          uploadedId: '3344',
          deviceFileName: 'deviceFileName_0.jpg',
          mime: 'image/jpg',
          id: '1',
          index: 0,
          questionId: 'questionId_0',
          externalDisplayName: 'externalDisplayName_0.jpg',
        },
        {
          uploadedId: '6611',
          deviceFileName: 'deviceFileName_1.jpg',
          mime: 'image/jpg',
          id: '2',
          index: 1,
          questionId: 'questionId_1',
          externalDisplayName: 'externalDisplayName_1.jpg',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/3344',
      name: 'externalDisplayName_0.jpg',
      category: 'expenses',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/6611',
      name: 'externalDisplayName_1.jpg',
      category: 'expenses',
      fileBase64: 'Some body here1',
    },
  ]);
});
