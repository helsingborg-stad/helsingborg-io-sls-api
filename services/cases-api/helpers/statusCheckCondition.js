function isOngoing({ answers, people }) {
  return answers && isEncrypted(answers) && hasNotAllSigned(people);
}

function isSignaturePending({ answers, people }) {
  return answers && isEncrypted(answers) && hasAnySigned(people);
}

function isSignatureCompleted({ answers, people }) {
  return answers && isEncrypted(answers) && hasAllSigned(people);
}

function isSubmitted({ answers, people }) {
  return answers && !isEncrypted(answers) && hasAllSigned(people);
}

function hasAllSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === true);
}

function hasNotAllSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === false);
}

function hasAnySigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.some(person => person.hasSigned === true);
}

function selectPeopleWhoMustSign(people) {
  return people.filter(person => Object.prototype.hasOwnProperty.call(person, 'hasSigned'));
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
