import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import * as response from '../../../libs/response';
import * as dynamoDb from '../../../libs/dynamoDb';
import { objectWithoutProperties } from '../../../libs/objects';

// get users (GET)
export async function main(event) {
  const { formId } = event.pathParameters;
  const formPartitionKey = `FORM#${formId}`;
  const params = {
    TableName: config.forms.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': formPartitionKey,
      ':sk': formPartitionKey,
    },
  };

  const [error, queryResponse] = await to(getFormRequest(params));
  if (error) return response.failure(error);

  const formObj = formQueryToObj(queryResponse.Items);
  const { id, children: relationships, ...formAttributes } = formObj[formPartitionKey];
  const formdata = {
    id,
    attributes: {
      ...formAttributes,
    },
    relationships,
  };
  return response.success(200, cleanForm(formdata));
}

async function getFormRequest(params) {
  const [error, result] = await to(dynamoDb.call('query', params));
  if (error) throwError(error.statusCode);
  if (result.Count === 0) throwError(404);
  return result;
}

/**
 * Creates a nested object from a dynamoDB response;
 * @param {array} data
 */
function formQueryToObj(items) {
  const rootKey = '0';
  const nestedHashArray = items.map(i => i.SK.match(/[^#]+(#[^#]+)?/g));
  const obj = nestedHashArray.reduce((obj, hashArray) => {
    const [firstHash, secondHash] = [...hashArray.slice(-2)];

    /**
     * Map the hash key from the current hashArray to an object
     * If the hashArray only have one key we set the value of parent to rootKey
     */
    const hashMapping = {
      current: secondHash || firstHash,
      parent: secondHash ? firstHash : rootKey,
    };

    /**
     * Create an item by combining all the hashKeys in the hashArray
     * If the item exsists and have children add them to the item.
     */
    const itemSK = hashArray.join('#');
    let item = omitObjectKeys(findItemInQuery(items, 'SK', itemSK), ['SK', 'PK']);

    if (obj[hashMapping.current] && obj[hashMapping.current].children) {
      item = {
        ...item,
        children: obj[hashMapping.current].children,
      };
    }

    /**
     * Create an item by combining all the hashKeys in the hashArray
     * If the item exsists and have children add them to the item.
     */
    const newObj = {
      ...obj,
      [hashMapping.current]: item,
    };

    newObj[hashMapping.parent] = newObj[hashMapping.parent] || {};
    newObj[hashMapping.parent].children = newObj[hashMapping.parent].children || {};
    newObj[hashMapping.parent].children[hashMapping.current] = item;

    return newObj;
  }, {});

  return obj[rootKey].children;
}

function findItemInQuery(items, key, value) {
  return items.find(item => item[key] === value);
}

function omitObjectKeys(obj, keys) {
  return Object.keys(obj).reduce(
    (item, key) => {
      if (keys.indexOf(key) >= 0) {
        delete item[key];
      }
      return item;
    },
    { ...obj }
  );
}

function cleanQuestion(question) {
  return objectWithoutProperties(question, ['ITEM_TYPE', 'updatedAt', 'createdAt']);
}

function cleanStep(step) {
  const cleanedStep = objectWithoutProperties(step, [
    'ITEM_TYPE',
    'children',
    'updatedAt',
    'createdAt',
  ]);
  const questions = step.children;
  const questionList = [];
  if (questions && Object.keys(questions).length > 0) {
    for (const key of Object.keys(questions)) {
      questionList.push(cleanQuestion(questions[key]));
    }
  }
  cleanedStep.questions = questionList;
  return cleanedStep;
}
/**
 * Cleans the form data.
 * @param {*} formdata
 */
function cleanForm(formdata) {
  const cleanedForm = objectWithoutProperties(formdata, ['type', 'attributes', 'relationships']);
  const attr = objectWithoutProperties(formdata.attributes, ['ITEM_TYPE']);
  for (const k in attr) {
    cleanedForm[k] = attr[k];
  }
  const steps = [];
  if (formdata.relationships && Object.keys(formdata.relationships).length > 0) {
    for (const key in formdata.relationships) {
      steps.push(cleanStep(formdata.relationships[key]));
    }
  }
  cleanedForm.steps = steps;
  return cleanedForm;
}
