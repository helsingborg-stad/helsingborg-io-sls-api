/* eslint-disable no-console */
import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

import config from '../config.js';
import rollback from './rollback.js';

const deployed = [];

/**
 * Deploy all services from list.
 * @param {array} files - List of files to services that should be deployed.
 * @return {void}
 */
const deployServices = files => {
  for (const file of files) {
    const directory = path.parse(file).dir;
    process.chdir(directory);
    try {
      // Run yarn install if package.json exists.
      if (fs.existsSync(`${directory}/package.json`)) {
        childProcess.execSync('yarn install', { stdio: 'inherit' });
      }
      childProcess.execSync(`${config.deployCommand}`, { stdio: 'inherit' });
    } catch (ex) {
      console.log('Error deploying, starting rollback!');
      console.log(ex);

      process.chdir(config.codeBuildPath);

      // Rollback all already deployed services.
      rollback(deployed);
      break;
    }
    // Save deployed services in reverse order for rollback purposes.
    deployed.unshift(directory);
    process.chdir(config.codeBuildPath);
  }
};

export default deployServices;
