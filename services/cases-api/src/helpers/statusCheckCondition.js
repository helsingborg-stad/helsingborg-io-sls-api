import {
  ACTIVE_ONGOING,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SIGNATURE_COMPLETED,
  ACTIVE_SUBMITTED,
  ACTIVE_COMPLETION_ONGOING,
  ACTIVE_COMPLETION_SUBMITTED,
  ACTIVE_RANDOM_CHECK_ONGOING,
  ACTIVE_RANDOM_CHECK_SUBMITTED,
  COMPLETION_REQUIRED,
  RANDOM_CHECK_REQUIRED,
} from '../libs/constants';

function isSignaturePending({ answers, people }) {
  const isCoApplicantSignPending = !isCoApplicantSigned(people);
  return answers && isEncrypted(answers) && isApplicantSigned(people) && isCoApplicantSignPending;
}

function isSignatureCompleted({ answers, people }) {
  return answers && isEncrypted(answers) && everyApplicantSigned(people);
}

function isOngoing({ answers, people }) {
  return isAnswersEncryptedApplicantNotSigend({ answers, people });
}

function isSubmitted({ answers, people }) {
  const isAnswersDecrypted = !isEncrypted(answers);
  return isAnswersDecrypted && everyApplicantSigned(people);
}

function isCompletionOngoing({ answers, people, state }) {
  return (
    isAnswersEncryptedApplicantNotSigend({ answers, people }) && state.includes(COMPLETION_REQUIRED)
  );
}

function isCompletionSubmitted({ answers, state }) {
  const isAnswersDecrypted = !isEncrypted(answers);
  return isAnswersDecrypted && state.includes(COMPLETION_REQUIRED);
}

function isRandomCheckOngoing({ answers, people, state }) {
  return (
    isAnswersEncryptedApplicantNotSigend({ answers, people }) &&
    state.includes(RANDOM_CHECK_REQUIRED)
  );
}

function isRandomCheckSubmitted({ answers, state }) {
  const isAnswersDecrypted = !isEncrypted(answers);
  return isAnswersDecrypted && state.includes(RANDOM_CHECK_REQUIRED);
}

function isAnswersEncryptedApplicantNotSigend({ answers, people }) {
  return answers && isEncrypted(answers) && !isApplicantSigned(people);
}

function everyApplicantSigned(people) {
  return findApplicantRequiredForSigning(people).every(person => person.hasSigned === true);
}

function findApplicantRequiredForSigning(people) {
  return people.filter(person => Object.prototype.hasOwnProperty.call(person, 'hasSigned'));
}

function isApplicantSigned(people) {
  return people.some(person => person.role === 'applicant' && person.hasSigned === true);
}

function isCoApplicantSigned(people) {
  return people.every(person => person.role === 'coApplicant' && person.hasSigned === true);
}

function isEncrypted(answers) {
  if (Array.isArray(answers)) {
    // decrypted answers should allways be submitted as an flat array,
    // if they are we assume the value to be decrypted and return false.
    return false;
  }
  const keys = Object.keys(answers);
  return keys.length === 1 && keys.includes('encryptedAnswers');
}

export default function getStatusTypeOnCondition(conditionOption) {
  const statusCheckList = [
    {
      type: ACTIVE_SIGNATURE_PENDING,
      conditionFunction: isSignaturePending,
    },
    {
      type: ACTIVE_SIGNATURE_COMPLETED,
      conditionFunction: isSignatureCompleted,
    },
    {
      type: ACTIVE_ONGOING,
      conditionFunction: isOngoing,
    },
    {
      type: ACTIVE_SUBMITTED,
      conditionFunction: isSubmitted,
    },
    {
      type: ACTIVE_COMPLETION_ONGOING,
      conditionFunction: isCompletionOngoing,
    },
    {
      type: ACTIVE_COMPLETION_SUBMITTED,
      conditionFunction: isCompletionSubmitted,
    },
    {
      type: ACTIVE_RANDOM_CHECK_ONGOING,
      conditionFunction: isRandomCheckOngoing,
    },
    {
      type: ACTIVE_RANDOM_CHECK_SUBMITTED,
      conditionFunction: isRandomCheckSubmitted,
    },
  ];

  const statusType = statusCheckList.reduce((type, statusCheckItem) => {
    if (statusCheckItem.conditionFunction(conditionOption)) {
      return statusCheckItem.type;
    }
    return type;
  }, undefined);

  return statusType;
}
