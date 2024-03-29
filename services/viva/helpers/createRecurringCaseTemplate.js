import {
  TAG_NAME,
  VIVA_POST_TYPE_COLLECTION,
  PERSON_ROLE,
  EMPTY_EXPENSE_POST,
  EMPTY_INCOME_POST,
} from './constants';
import formatPeriodDates from './formatPeriodDates';
import { toDateString } from '../helpers/caseTemplate/shared';
import * as formHelpers from './formHelpers';
import { encode } from 'html-entities';

function formatAnswerValue(answer) {
  const color = formHelpers.getTagIfIncludes(answer.field.tags, 'changed') ? 'red' : 'black';
  return `<span class="${color}">${encode(answer.value)}</span>`;
}

function mapApplicant(person, answers) {
  const personalInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'personalInfo');
  const personalInfo = personalInfoAnswers.reduce((accumulatedAnswer, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...accumulatedAnswer, [attribute]: formatAnswerValue(answer) };
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
    return { ...accumulatedAnswer, [attribute]: formatAnswerValue(answer) };
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
  const applicantPersons = persons.reduce((persons, person) => {
    if (person.role === PERSON_ROLE.applicant) {
      return [...persons, mapApplicant(person, answers)];
    }

    if (person.role === PERSON_ROLE.coApplicant) {
      return [...persons, mapCoApplicant(person, answers)];
    }

    return persons;
  }, []);

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
    const formattedValue = formatAnswerValue(answer);

    child = {
      ...(child ?? {}),
      ...(hasTagFirstName && { firstName: formattedValue }),
      ...(hasTagLastName && { lastName: formattedValue }),
      ...(hasTagPersonalNumber && { personalNumber: formattedValue }),
      ...(hasTagSchool && { school: formattedValue }),
      ...(hasTagHousing && { housing: formattedValue }),
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
  const noteAnswers = formHelpers.filterByTags(answers, ['notes', 'note']);
  const notes = noteAnswers.map(answer => ({
    title: 'Meddelande från sökande',
    // \u00A0 is the unicode for a zero-width space.
    text: answer.value?.replace(/\u00A0/g, ' '),
  }));
  return notes;
}

function createHousingInfo(answers) {
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'housingInfo');

  const housingInfo = filteredAnswers.reduce((accumulatedAnswer, answer) => {
    // field id can be constructed like personInfo.personFirstName, personInfo.personLastName
    const fieldId = formHelpers.getAttributeFromDotNotation(answer.field.id, 1);
    return { ...accumulatedAnswer, [fieldId]: formatAnswerValue(answer) };
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
      title: 'Övriga fordon',
      filterTags: ['other', 'vehicle', ...commonFilterTags],
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
    const hasFromAddressTag = tags.includes(TAG_NAME.fromAddress);
    const hasFromToTag = tags.includes(TAG_NAME.toAddress);

    post = {
      ...(post ?? initialPost),
      ...(hasAppliesToTag && { belongsTo: answer.value }),
      ...(hasAmountTag && { value: answer.value }),
      ...(hasDescriptionTag && { description: answer.value }),
      ...(hasDateTag && { date: toDateString(answer.value) }),
      ...(group && { group }),
      ...(vivaPostType && { title: vivaPostType }),
      ...(hasFromAddressTag && { fromAddress: answer.value }),
      ...(hasFromToTag && { toAddress: answer.value }),
    };

    if (index >= 0) {
      posts[index] = post;
      return posts;
    }

    return [...posts, post];
  }, []);
}

function getFinancialPosts({ answers, initialPost, tagFilters }) {
  const posts = tagFilters.reduce((incomes, filter) => {
    const newIncomes = createFinancialPosts({
      answers,
      filterTags: filter.tags,
      initialPost,
    });
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
        tags: ['incomes', 'swish'],
      },
      {
        tags: ['incomes', 'loan'],
      },
      {
        tags: ['incomes', 'foreignPension'],
      },
      {
        tags: ['incomes', 'other'],
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
        tags: ['expenses', 'akassa'],
      },
      {
        tags: ['expenses', 'lakarvard'],
      },
      {
        tags: ['expenses', 'medicin'],
      },
      {
        tags: ['expenses', 'reskostnad'],
      },
      {
        tags: ['expenses', 'akuttandvard'],
      },
      {
        tags: ['expenses', 'tandvard'],
      },
      {
        tags: ['expenses', 'annantandvard'],
      },
      {
        tags: ['expenses', 'annat'],
      },
      {
        tags: ['expenses', 'barnomsorg'],
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
        tags: ['expenses', 'boende'],
      },
      {
        tags: ['expenses', 'el'],
      },
      {
        tags: ['expenses', 'hemforsakring'],
      },
      {
        tags: ['expenses', 'bredband'],
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
      coApplicant: applicantsIncomes.filter(
        income => income.belongsTo === 'COAPPLICANT' && income.value !== ''
      ),
      resident: redsidentIncomes,
    },
    expenses: {
      applicant: applicantsExpenses.filter(expense => expense.belongsTo === 'APPLICANT'),
      coApplicant: applicantsExpenses.filter(
        expense => expense.belongsTo === 'COAPPLICANT' && expense.value !== ''
      ),
      children: applicantsExpenses.filter(expense => expense.belongsTo === 'CHILDREN'),
      housing: housingExpenses,
    },
  };
}

export default function createRecurringCaseTemplate(caseItem, answers) {
  const period = formatPeriodDates(caseItem.details?.period);
  const financials = getFinancials(answers);
  const persons = createPersons(caseItem.persons, answers);
  const children = createChildren(answers);
  const housing = createHousingInfo(answers);
  const notes = createNotes(answers);
  const assets = createAssets(answers);

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
