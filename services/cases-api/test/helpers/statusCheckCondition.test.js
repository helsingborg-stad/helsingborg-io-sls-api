import getStatusTypeOnCondition from '../../src/helpers/statusCheckCondition';
import {
  // status type
  ACTIVE_ONGOING,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SUBMITTED,
  ACTIVE_COMPLETION_REQUIRED,
  ACTIVE_COMPLETION_ONGOING,
  ACTIVE_COMPLETION_SUBMITTED,
  ACTIVE_RANDOM_CHECK_REQUIRED,
  ACTIVE_RANDOM_CHECK_ONGOING,
  ACTIVE_RANDOM_CHECK_SUBMITTED,

  // state
  COMPLETION_REQUIRED,
  RANDOM_CHECK_REQUIRED,
} from '../../../../libs/constants';

const ANYTHING = 'ANYTHING';

const encryptedAnswers = {
  encryptedAnswers: 'ENCRYPTED_STUFF',
};

const decryptedAnswers = [{}];

const peopleApplicantNotSigned = [
  {
    role: 'applicant',
    hasSigned: false,
  },
];

const peopleAllApplicantsNotSigned = [
  {
    role: 'applicant',
    hasSigned: false,
  },
  {
    role: 'coApplicant',
    hasSigned: false,
  },
];

const peopleApplicantSigned = [
  {
    role: 'applicant',
    hasSigned: true,
  },
];

const peopleAllApplicantsSigned = [
  {
    role: 'applicant',
    hasSigned: true,
  },
  {
    role: 'coApplicant',
    hasSigned: true,
  },
];

const peopleApplicantNotSignedCoApplicantSigned = [
  {
    role: 'applicant',
    hasSigned: false,
  },
  {
    role: 'coApplicant',
    hasSigned: true,
  },
];

const peopleApplicantSignedCoApplicantNotSigned = [
  {
    role: 'applicant',
    hasSigned: true,
  },
  {
    role: 'coApplicant',
    hasSigned: false,
  },
];

const testContitionList = [
  // ongoing
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantNotSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_ONGOING,
    description: `Encrypted answers, applicant NOT signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleAllApplicantsNotSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_ONGOING,
    description: `Encrypted answers, all applicants NOT signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantNotSignedCoApplicantSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_ONGOING,
    description: `Encrypted answers, applicant NOT signed, coApplicant signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantNotSigned,
      statusType: ACTIVE_COMPLETION_REQUIRED,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_ONGOING,
    description: `Encrypted answers, applicant NOT signed, state is ${COMPLETION_REQUIRED}, must result in status type: ${ACTIVE_COMPLETION_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleAllApplicantsNotSigned,
      statusType: ACTIVE_COMPLETION_REQUIRED,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_ONGOING,
    description: `Encrypted answers, all applicants NOT signed, state is ${COMPLETION_REQUIRED}, must result in status type: ${ACTIVE_COMPLETION_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleAllApplicantsNotSigned,
      statusType: ACTIVE_COMPLETION_ONGOING,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_ONGOING,
    description: `Encrypted answers, all applicants NOT signed, state is ${COMPLETION_REQUIRED}, and statusType is ${ACTIVE_COMPLETION_ONGOING}, must result in status type: ${ACTIVE_COMPLETION_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantNotSigned,
      statusType: ACTIVE_RANDOM_CHECK_REQUIRED,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_ONGOING,
    description: `Encrypted answers, applicant NOT signed, state is ${RANDOM_CHECK_REQUIRED}, must result in status type: ${ACTIVE_RANDOM_CHECK_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantNotSigned,
      statusType: ACTIVE_RANDOM_CHECK_ONGOING,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_ONGOING,
    description: `Encrypted answers, applicant NOT signed, state is ${RANDOM_CHECK_REQUIRED}, and statusType is ${ACTIVE_RANDOM_CHECK_ONGOING}, must result in status type: ${ACTIVE_RANDOM_CHECK_ONGOING}`,
  },
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleAllApplicantsNotSigned,
      statusType: ACTIVE_RANDOM_CHECK_REQUIRED,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_ONGOING,
    description: `Encrypted answers, all applicants NOT signed, state is ${RANDOM_CHECK_REQUIRED}, must result in status type: ${ACTIVE_RANDOM_CHECK_ONGOING}`,
  },

  // submitted
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleApplicantSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_SUBMITTED,
    description: `Decrypted answers, applicant signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleAllApplicantsSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_SUBMITTED,
    description: `Decrypted answers, all applicants signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleApplicantSigned,
      statusType: ACTIVE_COMPLETION_REQUIRED,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_SUBMITTED,
    description: `Decrypted answers, applicant signed, state is ${COMPLETION_REQUIRED}, must result in status type: ${ACTIVE_COMPLETION_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleApplicantSigned,
      statusType: ACTIVE_COMPLETION_ONGOING,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_SUBMITTED,
    description: `\tdecrypted answers\n\tapplicant signed\n\tstate is ${ACTIVE_COMPLETION_ONGOING}\n\tstatusType is ${ACTIVE_COMPLETION_ONGOING}\n\texpect status type: ${ACTIVE_COMPLETION_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleAllApplicantsSigned,
      statusType: ACTIVE_COMPLETION_REQUIRED,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_SUBMITTED,
    description: `Decrypted answers, all applicants signed, state is ${COMPLETION_REQUIRED}, must result in status type: ${ACTIVE_COMPLETION_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleApplicantSigned,
      statusType: ACTIVE_RANDOM_CHECK_REQUIRED,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_SUBMITTED,
    description: `Decrypted answers, applicant signed, state is ${RANDOM_CHECK_REQUIRED}, must result in status type: ${ACTIVE_RANDOM_CHECK_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleApplicantSigned,
      statusType: ACTIVE_RANDOM_CHECK_ONGOING,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_SUBMITTED,
    description: `\tdecrypted answers\n\tapplicant signed\n\tstate is ${RANDOM_CHECK_REQUIRED}\n\tstatusType is ${ACTIVE_RANDOM_CHECK_ONGOING}\n\texpect status type ${ACTIVE_RANDOM_CHECK_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: decryptedAnswers,
      people: peopleAllApplicantsSigned,
      statusType: ACTIVE_RANDOM_CHECK_REQUIRED,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_SUBMITTED,
    description: `Decrypted answers, all applicants signed, state is ${RANDOM_CHECK_REQUIRED}, must result in status type: ${ACTIVE_RANDOM_CHECK_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: [],
      people: peopleApplicantNotSigned,
      statusType: ANYTHING,
      state: RANDOM_CHECK_REQUIRED,
    },
    expectedResult: ACTIVE_RANDOM_CHECK_SUBMITTED,
    description: `\tempty form\n\tstate is ${RANDOM_CHECK_REQUIRED}\n\tstatusType is ${ANYTHING}\n\texpect status type ${ACTIVE_RANDOM_CHECK_SUBMITTED}`,
  },
  {
    conditionOption: {
      answers: [],
      people: peopleApplicantNotSigned,
      statusType: ANYTHING,
      state: COMPLETION_REQUIRED,
    },
    expectedResult: ACTIVE_COMPLETION_SUBMITTED,
    description: `\tempty form\n\tstate is ${COMPLETION_REQUIRED}\n\tstatusType is ${ANYTHING}\n\texpect status type ${ACTIVE_COMPLETION_SUBMITTED}`,
  },

  // signature
  {
    conditionOption: {
      answers: encryptedAnswers,
      people: peopleApplicantSignedCoApplicantNotSigned,
      state: ANYTHING,
    },
    expectedResult: ACTIVE_SIGNATURE_PENDING,
    description: `Encrypted answers, applicant signed, coapplicant NOT signed, state is ${ANYTHING}, must result in status type: ${ACTIVE_SIGNATURE_PENDING}`,
  },
];

test.each(testContitionList)('$description', ({ conditionOption, expectedResult }) => {
  const result = getStatusTypeOnCondition(conditionOption);

  expect(result).toBe(expectedResult);
});
