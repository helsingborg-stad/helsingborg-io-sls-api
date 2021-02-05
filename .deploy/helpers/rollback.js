/* eslint-disable no-console */
import childProcess from 'child_process';
import process from 'process';

import config from '../config.js';

/**
 * Rollback to previous deployed versions.
 * @param {array} deployedServices - List of deployed services to rollback.
 * @return {void}
 */
export default deployedServices => {
  const regex = /Serverless: Timestamp: (\d+)/gs;
  if (deployedServices.length === 0) {
    console.log('Nothing to rollback!');
  }

  for (const deployedService of deployedServices) {
    let output = '';
    process.chdir(deployedService);

    // List previous deployed versions of this service with deploy list command.
    console.log(`Started rollback in: ${deployedService}`);
    try {
      output = childProcess.execSync(`${config.listCommand}`).toString();
    } catch (_error) {
      console.log('Error listing deployed releases!');
      process.exit(1);
    }

    // Fetch timestamps from previous deploys by fancy regex.
    let match = regex.exec(output);

    const timestamps = [];
    while (match) {
      timestamps.push(match[1]);
      match = regex.exec(output);
    }

    // Check if there is any previous deploys.
    if (timestamps.length >= 2) {
      // Get second to last deploy timestamp to rollback as the last is the one we just deployed.
      const timestamp = timestamps[timestamps.length - 2];

      try {
        childProcess.execSync(`${config.rollbackCommand} ${timestamp}`, { stdio: 'inherit' });
      } catch (_error) {
        console.log(_error);
        console.log(`Error rollback to timestamp: ${timestamp} in: ${deployedService}`);
        // Stop the build!
        process.exit(1);
      }
    } else {
      console.log('Nothing to rollback!');
      // Egde case when only one archived deploy exists.
      // Will skip the delete to save us from removing prod stacks. Stack needs to be manually removed or redeployed.
    }
    process.chdir(config.codeBuildPath);
  }
  // Stop the build!
  process.exit(1);
};
