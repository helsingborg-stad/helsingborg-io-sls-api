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
function diff(lastCommmitHashFile) {
  const servicesPath = `${config.codeBuildPath}/${config.servicesPath}`;

  let gitDiff = [];

  // Check if any earlier deployed commit sha is stored and get diff fies or return all services if missing.
  if (fs.existsSync(lastCommmitHashFile)) {
    try {
      const lastCommmitHash = fs.readFileSync(lastCommmitHashFile, 'utf8').trim();

      // Return empty file list if last deploy is on the same commit hash as the current one.
      if (process.env.CODEBUILD_RESOLVED_SOURCE_VERSION === lastCommmitHash) {
        return [];
      }

      gitDiff = childProcess.execSync(
        `git diff ${lastCommmitHash} ${process.env.CODEBUILD_RESOLVED_SOURCE_VERSION} --name-only`
      );

      // Convert git diff output to array.
      gitDiff = gitDiff.toString().match(/.+/g);
    } catch (_ex) {
      // git commit SHA is missing, could be deleted! Deploy everything!
      return getAllSlsFiles();
    }
  } else {
    return getAllSlsFiles();
  }

  const servicesDiff = [];
  for (const file of gitDiff) {
    // If something changed in libs folder we deploy all services.
    if (file.indexOf(config.libsPath) === 0) {
      return getAllSlsFiles();
    }

    // If something changed in services folders, add the path to it to services path list.
    if (file.indexOf(config.servicesPath) === 0) {
      servicesDiff.push(file);
    }
  }

  // Backtrack the path to find the serverless file to get the dirnames of services we want to deploy.
  const files = [];
  servicesDiff.forEach(serviceDiff => {
    let diffPath = serviceDiff;
    while (diffPath !== '.') {
      const serviceFile = `${config.codeBuildPath}/${diffPath}/serverless.yml`;
      if (fs.existsSync(serviceFile) && !files.includes(serviceFile)) {
        files.push(serviceFile);
        break;
      }
      diffPath = path.dirname(diffPath);
    }
  });

  return files;
}

function getAllSlsFiles() {
  const servicesPath = `${config.codeBuildPath}/${config.servicesPath}`;
  return glob.sync(`${servicesPath}/**/serverless.yml`, { ignore: '**/node_modules/**' });
}

export default diff;
