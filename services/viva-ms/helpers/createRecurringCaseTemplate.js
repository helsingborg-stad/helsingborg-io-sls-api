import {
  TAG_NAME,
  VIVA_POST_TYPE_COLLECTION,
  PERSON_ROLE,
  EMPTY_EXPENSE_POST,
  EMPTY_INCOME_POST,
} from './constans';
import formatPeriodDates, { formatTimestampToDate } from './formatPeriodDates';
import formHelpers from './formHelpers';

function mapApplicant(person, answers) {
  const personalInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'personalInfo');
  const personalInfo = personalInfoAnswers.reduce((accumulatedAnswer, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...accumulatedAnswer, [attribute]: answer.value };
  }, {});

  return {
    role: person.role,
    personalNumber: person.personalNumber,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: personalInfo.telephone,
    email: personalInfo.email,
    occupation: personalInfo.occupation,
  };
}

function mapCoApplicant(person, answers) {
  const partnerInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'partnerInfo');
  const partnerInfo = partnerInfoAnswers.reduce((accumulatedAnswer, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...accumulatedAnswer, [attribute]: answer.value };
  }, {});

  return {
    role: person.role,
    personalNumber: person.personalNumber,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: partnerInfo.partnerPhone,
    email: partnerInfo.partnerMail,
    occupation: partnerInfo.partnerOccupation,
  };
}

function createPersons(persons, answers) {
  const applicantPersons = persons.map(person => {
    if (person.role === PERSON_ROLE.applicant) {
      return mapApplicant(person, answers);
    }

    if (person.role === PERSON_ROLE.coApplicant) {
      return mapCoApplicant(person, answers);
    }

    return person;
  });

  return applicantPersons;
}

function createChildren(answers) {
  const childrenAnswers = formHelpers.filterByTags(answers, 'children');

  const childrenList = childrenAnswers.reduce((children, answer) => {
    const { tags } = answer.field;
    const group = formHelpers.getTagIfIncludes(tags, TAG_NAME.group);

    const index = children.findIndex(child => child.group === group);
    let child = children[index];

    const hasTagFirstName = tags.includes(TAG_NAME.firstName);
    const hasTagLastName = tags.includes(TAG_NAME.lastName);
    const hasTagPersonalNumber = tags.includes(TAG_NAME.personalNumber);
    const hasTagSchool = tags.includes(TAG_NAME.school);
    const hasTagHousing = tags.includes(TAG_NAME.housing);

    child = {
      ...(child ?? {}),
      ...(hasTagFirstName && { firstName: answer.value }),
      ...(hasTagLastName && { lastName: answer.value }),
      ...(hasTagPersonalNumber && { personalNumber: answer.value }),
      ...(hasTagSchool && { school: answer.value }),
      ...(hasTagHousing && { housing: answer.value }),
      group,
    };

    if (index >= 0) {
      children[index] = child;
    } else {
      children.push(child);
    }

    return children;
  }, []);

  return childrenList;
}

function createNotes(answers) {
  const notes = [];
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'otherMessage');
  if (filteredAnswers.length) {
    const [noteAnswer] = filteredAnswers;
    const note = {
      title: 'Meddelande från sökande',
      text: noteAnswer.value,
    };
    notes.push(note);
  }
  return notes;
}

function createHousingInfo(answers) {
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'housingInfo');

  const housingInfo = filteredAnswers.reduce((accumulatedAnswer, answer) => {
    // field id can be constructed like personInfo.personFirstName, personInfo.personLastName
    const fieldId = formHelpers.getSecondStringFromDotNotatedString(answer.field.id);
    return { ...accumulatedAnswer, [fieldId]: answer.value };
  }, {});

  return housingInfo;
}

function createAssets(answers) {
  const commonFilterTags = ['amount', 'assets'];
  const categories = [
    {
      title: 'Bil',
      filterTags: ['bil', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Motorcykel',
      filterTags: ['motorcykel', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Hus',
      filterTags: ['hus', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Bostadsrätt',
      filterTags: ['lagenhet', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Övriga fordon',
      filterTags: ['other', 'vehicle', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Övriga tillgångar',
      filterTags: ['other', 'asset', ...commonFilterTags],
      value: '',
    },
  ];

  const assets = categories.map(category => {
    const [answer] = formHelpers.filterByTags(answers, category.filterTags);
    if (answer) {
      return {
        type: 'asset',
        title: category.title,
        value: answer.value,
        currency: 'kr',
      };
    }
    return undefined;
  });

  return assets;
}

function getVivaPostType(tags) {
  const vivaPostType = tags.reduce((type, tag) => VIVA_POST_TYPE_COLLECTION[tag] ?? type, '');
  return vivaPostType;
}

function createFinancialPosts({ answers, filterTags = [], initialPost = {} }) {
  const filteredAnswers = formHelpers.filterByTags(answers, filterTags);

  return filteredAnswers.reduce((posts, answer) => {
    const { tags } = answer.field;
    const group = formHelpers.getTagIfIncludes(tags, TAG_NAME.group);

    const index = posts.findIndex(post => post.group === group);
    let post = posts[index];

    const vivaPostType = getVivaPostType(tags);
    const hasAppliesToTag = tags.includes(TAG_NAME.appliesto);
    const hasAmountTag = tags.includes(TAG_NAME.amount);
    const hasDescriptionTag = tags.includes(TAG_NAME.description);
    const hasDateTag = tags.includes(TAG_NAME.date);

    post = {
      ...(post ?? initialPost),
      ...(hasAppliesToTag && { belongsTo: answer.value }),
      ...(hasAmountTag && { value: answer.value }),
      ...(hasDescriptionTag && { description: answer.value }),
      ...(hasDateTag && { date: formatTimestampToDate(answer.value) }),
      ...(group && { group }),
      ...(vivaPostType && { title: vivaPostType }),
    };

    if (index >= 0) {
      posts[index] = post;
      return posts;
    } else {
      return [...posts, post];
    }
  }, []);
}

function getFinancialPosts({ answers, initialPost, tagFilters }) {
  const posts = tagFilters.reduce((incomes, filter) => {
    const newIncomes = createFinancialPosts({ answers, filterTags: filter.tags, initialPost });
    return [...incomes, ...newIncomes];
  }, []);
  return posts;
}

function getApplicantsIncomes(answers) {
  const params = {
    answers,
    initialPost: EMPTY_INCOME_POST,
    tagFilters: [
      {
        tags: ['incomes', 'lon'],
      },
      {
        tags: ['incomes', 'other'],
      },
      {
        tags: ['incomes', 'foreignPension'],
      },
      {
        tags: ['incomes', 'loan'],
      },
      {
        tags: ['incomes', 'swish'],
      },
    ],
  };

  return getFinancialPosts(params);
}

function getResidentIncomes(answers) {
  const params = {
    answers,
    initialPost: EMPTY_INCOME_POST,
    tagFilters: [
      {
        tags: ['incomes', 'resident'],
      },
    ],
  };

  return getFinancialPosts(params);
}

function getApplicantsExpenses(answers) {
  const params = {
    answers,
    initialPost: EMPTY_EXPENSE_POST,
    tagFilters: [
      {
        tags: ['expenses', 'annat'],
      },
      {
        tags: ['expenses', 'tandvard'],
      },
      {
        tags: ['expenses', 'annantandvard'],
      },
      {
        tags: ['expenses', 'akuttandvard'],
      },
      {
        tags: ['expenses', 'reskostnad'],
      },
      {
        tags: ['expenses', 'akassa'],
      },
      {
        tags: ['expenses', 'lakarvard'],
      },
      {
        tags: ['expenses', 'medicin'],
      },
    ],
  };

  return getFinancialPosts(params);
}

function getHousingExpenses(answers) {
  const params = {
    answers,
    initialPost: {
      ...EMPTY_EXPENSE_POST,
      belongsTo: 'HOUSING',
    },
    tagFilters: [
      {
        tags: ['expenses', 'el'],
      },
      {
        tags: ['expenses', 'bredband'],
      },
      {
        tags: ['expenses', 'hemforsakring'],
      },
      {
        tags: ['expenses', 'boende'],
      },
    ],
  };

  return getFinancialPosts(params);
}

function getFinancials(answers) {
  const redsidentIncomes = getResidentIncomes(answers);
  const applicantsIncomes = getApplicantsIncomes(answers);
  const housingExpenses = getHousingExpenses(answers);
  const applicantsExpenses = getApplicantsExpenses(answers);

  return {
    incomes: {
      applicant: applicantsIncomes.filter(income => income.belongsTo === 'APPLICANT'),
      coApplicant: applicantsIncomes.filter(income => income.belongsTo === 'COAPPLICANT'),
      resident: redsidentIncomes,
    },
    expenses: {
      applicant: applicantsExpenses.filter(expense => expense.belongsTo === 'APPLICANT'),
      coApplicant: applicantsExpenses.filter(expense => expense.belongsTo === 'COAPPLICANT'),
      housing: housingExpenses,
    },
  };
}

export default function createRecurringCaseTemplate(caseItem, recurringFormId) {
  const recurringForm = caseItem.forms[recurringFormId];
  const period = formatPeriodDates(caseItem.details.period);
  const financials = getFinancials(recurringForm.answers);
  const persons = createPersons(caseItem.persons, recurringForm.answers);
  const children = createChildren(recurringForm.answers);
  const housing = createHousingInfo(recurringForm.answers);
  const notes = createNotes(recurringForm.answers);
  const assets = createAssets(recurringForm.answers);

  return {
    assets,
    notes,
    period,
    persons,
    children,
    housing,
    financials,
  };
}
