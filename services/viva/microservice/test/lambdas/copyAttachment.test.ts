import { copyAttachment } from '../../src/lambdas/copyAttachment';

import type { S3Record, Dependencies } from '../../src/lambdas/copyAttachment';
import { CasePersonRole } from '../../../types/caseItem';
import type { CasePerson, CaseItem } from '../../../types/caseItem';

const applicantPersonalNumber = 'applicantPersonalNumber';
const secondApplicantPersonalNumber = 'secondApplicantPersonalNumber';
const coApplicantPersonalNumber = 'coApplicantPersonalNumber';
const secondCoApplicantPersonalNumber = 'secondCoApplicantPersonalNumber';
const fileName = '1111111/22222/3333';
const secondFileName = '4444/55555/6666';

function createPerson(personalNumber: string, role: CasePersonRole): CasePerson {
  return {
    role,
    personalNumber,
    firstName: `firstName-${role}`,
    lastName: `lastName-${role}`,
  };
}

function createS3Record(key: string): S3Record {
  return {
    s3: {
      object: {
        key,
      },
    },
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    copyFile: () => Promise.resolve(),
    getLatestUpdatedCase: () =>
      Promise.resolve({
        persons: [
          createPerson(applicantPersonalNumber, CasePersonRole.Applicant),
          createPerson(coApplicantPersonalNumber, CasePersonRole.CoApplicant),
        ],
      }) as Promise<CaseItem>,
    ...partialDependencies,
  };
}

it('copies file to coapplicant bucket', async () => {
  const copyFileMock = jest.fn();

  const result = await copyAttachment(
    {
      Records: [createS3Record(`${applicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).toHaveBeenCalledTimes(1);
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${fileName}`,
    `${coApplicantPersonalNumber}/${fileName}`
  );
});

it('copies files to coapplicant bucket with multiple records', async () => {
  const copyFileMock = jest.fn();

  const result = await copyAttachment(
    {
      Records: [
        createS3Record(`${applicantPersonalNumber}/${fileName}`),
        createS3Record(`${applicantPersonalNumber}/${secondFileName}`),
      ],
    },
    createDependencies({
      copyFile: copyFileMock,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).toHaveBeenCalledTimes(2);
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${fileName}`,
    `${coApplicantPersonalNumber}/${fileName}`
  );
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${secondFileName}`,
    `${coApplicantPersonalNumber}/${secondFileName}`
  );
});

it('does not copy duplicate files', async () => {
  const copyFileMock = jest.fn();

  const result = await copyAttachment(
    {
      Records: [
        createS3Record(`${applicantPersonalNumber}/${fileName}`),
        createS3Record(`${applicantPersonalNumber}/${fileName}`),
      ],
    },
    createDependencies({
      copyFile: copyFileMock,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).toHaveBeenCalledTimes(1);
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${fileName}`,
    `${coApplicantPersonalNumber}/${fileName}`
  );
});

it('handles multiple applicants', async () => {
  const copyFileMock = jest.fn();
  const getLatestUpdatedCaseMock = jest
    .fn()
    .mockResolvedValueOnce({
      persons: [
        createPerson(applicantPersonalNumber, CasePersonRole.Applicant),
        createPerson(coApplicantPersonalNumber, CasePersonRole.CoApplicant),
      ],
    })
    .mockResolvedValueOnce({
      persons: [
        createPerson(secondApplicantPersonalNumber, CasePersonRole.Applicant),
        createPerson(secondCoApplicantPersonalNumber, CasePersonRole.CoApplicant),
      ],
    });

  const result = await copyAttachment(
    {
      Records: [
        createS3Record(`${applicantPersonalNumber}/${fileName}`),
        createS3Record(`${secondApplicantPersonalNumber}/${secondFileName}`),
      ],
    },
    createDependencies({
      copyFile: copyFileMock,
      getLatestUpdatedCase: getLatestUpdatedCaseMock,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).toHaveBeenCalledTimes(2);
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${fileName}`,
    `${coApplicantPersonalNumber}/${fileName}`
  );
  expect(copyFileMock).toHaveBeenCalledWith(
    `${secondApplicantPersonalNumber}/${secondFileName}`,
    `${secondCoApplicantPersonalNumber}/${secondFileName}`
  );
});

it('skips copying of file if coapplicant does not exist', async () => {
  const copyFileMock = jest.fn();

  const result = await copyAttachment(
    {
      Records: [createS3Record(`${applicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
      getLatestUpdatedCase: () =>
        Promise.resolve({
          persons: [createPerson(applicantPersonalNumber, CasePersonRole.Applicant)],
        }) as Promise<CaseItem>,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).not.toHaveBeenCalled();
});

it('skips copying of file if personal number is the same as s3 key and is coapplicant', async () => {
  const copyFileMock = jest.fn();

  const result = await copyAttachment(
    {
      Records: [createS3Record(`${coApplicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
      getLatestUpdatedCase: () =>
        Promise.resolve({
          persons: [createPerson(coApplicantPersonalNumber, CasePersonRole.CoApplicant)],
        }) as Promise<CaseItem>,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).not.toHaveBeenCalled();
});
