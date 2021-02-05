/* eslint-disable no-console */
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import childProcess from 'child_process';

import config from '../config.js';

/**
 * Diff with previous deploy commit SHA from cached file and figure out what services to deploy.
 * @param {string} lastCommmitHashFile - File path to file that contains previous successful build commit SHA.
 * @return {array} - List of services path to deploy.
 */
export default lastCommmitHashFile => {
  const servicesPath = `${config.codeBuildPath}/${config.servicesPath}`;

  let diff;
  // Check if any earlier deployed commit sha is stored or get all services if missing.
  if (fs.existsSync(lastCommmitHashFile)) {
    const lastCommmitHash = fs.readFileSync(lastCommmitHashFile, 'utf8').trim();
    try {
      diff = childProcess.execSync(
        `git diff ${lastCommmitHash} ${process.env.CODEBUILD_RESOLVED_SOURCE_VERSION} --name-only`
      );
    } catch (_error) {
      console.log(_error);
      console.log('Something went wrong in git diff!');
      process.exit(1);
    }
    // Convert git diff output to array.
    diff = diff.toString().match(/.+/g);
  } else {
    return glob.sync(`${servicesPath}/**/serverless.yml`);
  }
  const servicesDiff = [];
  for (const file of diff) {
    // If something changed in libs folder we deploy all services.
    if (file.indexOf(config.libsPath) === 0) {
      return glob.sync(`${servicesPath}/**/serverless.yml`);
    }
    // If something changed in services folders, add the path to it to services path list.
    if (file.indexOf(config.servicesPath) === 0) {
      servicesDiff.push(file);
    }
  }

  // Backtrack the path to find the serverless file to get the dirnames of services we want to deploy.
  const files = [];
  servicesDiff.forEach(diff => {
    let diffPath = diff;
    while (diffPath !== '.') {
      const serviceFile = `${config.codeBuildPath}/${diffPath}/serverless.yml`;
      if (fs.existsSync(serviceFile)) {
        if (!files.includes(serviceFile)) {
          files.push(serviceFile);
          break;
        }
      }
      diffPath = path.dirname(diffPath);
    }
  });

  return files;
};
