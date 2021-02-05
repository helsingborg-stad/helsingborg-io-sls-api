/* eslint-disable no-console */
import yaml from 'js-yaml';
import fs from 'fs';
import jsonpath from 'jsonpath';

import { CLOUDFORMATION_SCHEMA } from 'js-yaml-cloudformation-schema';

/**
 * Based on export and imports in serverless templates, sort the list to get exports before any import.
 * @param {array} files - List of paths to services files.
 * @return {array} - Sorted list with exports first.
 */
export default files => {
  const services = [];
  // Collect all import and exports in the serverless files.
  files.forEach(file => {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(data, { schema: CLOUDFORMATION_SCHEMA });
      const imports = jsonpath.query(doc, '$..["Fn::ImportValue"]');
      imports.concat(jsonpath.query(doc, '$..["!ImportValue"]'));
      services.push({
        file,
        imports: imports,
        exports: jsonpath.query(doc, '$.resources.Outputs.*.Export.Name'),
      });
    } catch (e) {
      console.log(e);
    }
  });

  // Sort services according to import and exports.
  services.sort(sortDeploys);

  const sortedFiles = [];
  services.forEach(service => {
    sortedFiles.push(service.file);
  });
  return sortedFiles;
};

/**
 * Sorting callback function for import/export sorting.
 * @param {string} first - First compare string
 * @param {string} second - Second compare string
 * @return {int} - Sort order int.
 */
const sortDeploys = (first, second) => {
  if (first.imports.length === 0) {
    return -1;
  }

  if (second.imports.length === 0) {
    return 1;
  }

  for (const importIndex in first.imports) {
    const fnImport = first.exports[importIndex];
    if (second.imports.includes(fnImport)) {
      return -1;
    }
  }

  for (const importIndex in second.imports) {
    const fnImport = second.exports[importIndex];
    if (first.imports.includes(fnImport)) {
      return 1;
    }
  }

  return 0;
};
