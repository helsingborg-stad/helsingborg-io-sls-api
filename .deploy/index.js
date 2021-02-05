/* eslint-disable no-console */
import diff from './helpers/diff.js';
import deployOrder from './helpers/deployOrder.js';
import deployServices from './helpers/deployServices.js';

// Require a file path argument to where last deployed commit sha is located.
if (process.argv[2] !== undefined) {
  const diffResult = diff(process.argv[2]);
  if (diffResult.length > 0) {
    deployServices(deployOrder(diffResult));
  } else {
    console.log('Nothing to deploy!');
  }
} else {
  console.log('Missing commit sha file argument!');
}
