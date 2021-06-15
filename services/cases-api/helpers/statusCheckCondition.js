function isOngoing({ answers, people }) {
  return answers && isEncrypted(answers) && hasNoOneSigned(people);
}

function isSignaturePending({ answers, people }) {
  return answers && isEncrypted(answers) && hasSomeOneSigned(people);
}

function isSignatureCompleted({ answers, people }) {
  return answers && isEncrypted(answers) && hasEveryOneSigned(people);
}

function isSubmitted({ answers, people }) {
  return answers && !isEncrypted(answers) && hasEveryOneSigned(people);
}

function hasEveryOneSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === true);
}

function hasNoOneSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === false);
}

function hasSomeOneSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.some(person => person.hasSigned === true);
}

function selectPeopleWhoMustSign(people) {
  return people.filter(person => person?.hasSigned);
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
  },
};
