const COMPLETION_REQUIRED = 'COMPLETION_REQUIRED';
const RANDOM_CHECK_REQUIRED = 'RANDOM_CHECK_REQUIRED';

function isOngoing({ answers, people }) {
  return answers && isEncrypted(answers) && !hasApplicantSigned(people);
}

function isSignaturePending({ answers, people }) {
  return (
    answers && isEncrypted(answers) && hasApplicantSigned(people) && !hasCoApplicantsSigned(people)
  );
}

function isSignatureCompleted({ answers, people }) {
  return answers && isEncrypted(answers) && hasAllSigned(people);
}

function isSubmitted({ answers, people }) {
  return answers && !isEncrypted(answers) && hasAllSigned(people);
}

function isCompletionOngoing({ answers, people, state }) {
  return isOngoing({ answers, people }) && state?.includes(COMPLETION_REQUIRED);
}

function isCompletionSubmitted({ answers, people, state }) {
  return isSubmitted({ answers, people }) && state?.includes(COMPLETION_REQUIRED);
}

function isRandomCheckOngoing({ answers, people, state }) {
  return isOngoing({ answers, people }) && state?.includes(RANDOM_CHECK_REQUIRED);
}

function isRandomCheckSubmitted({ answers, people, state }) {
  return isSubmitted({ answers, people }) && state?.includes(RANDOM_CHECK_REQUIRED);
}

function hasAllSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === true);
}

function selectPeopleWhoMustSign(people) {
  return people.filter(person => Object.prototype.hasOwnProperty.call(person, 'hasSigned'));
}

function hasApplicantSigned(people) {
  return people.some(person => person.role === 'applicant' && person.hasSigned === true);
}

function hasCoApplicantsSigned(people) {
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

export default {
  condition: {
    isOngoing,
    isSubmitted,
    isSignatureCompleted,
    isSignaturePending,
    isCompletionOngoing,
    isCompletionSubmitted,
    isRandomCheckOngoing,
    isRandomCheckSubmitted,
  },
};
