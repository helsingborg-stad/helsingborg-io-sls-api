/* eslint-disable no-console */
import { exit, argv } from 'process';

import diff from './helpers/diff.js';
import deployOrder from './helpers/deployOrder.js';
import deployServices from './helpers/deployServices.js';

// Require a file path argument to where last deployed commit sha is located.

const lastDeployedCommitSha = argv[2];
if (!lastDeployedCommitSha) {
  console.log('Missing commit sha file argument!');
  exit(1);
}

const diffResult = diff(lastDeployedCommitSha);

if (!diffResult) {
  console.log('Nothing to deploy!');
  exit(0);
}

deployServices(deployOrder(diffResult));
exit(0);
