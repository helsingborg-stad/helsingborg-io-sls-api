/* eslint-disable no-console */
import yaml from 'js-yaml';
import fs from 'fs';
import jsonpath from 'jsonpath';

import { CLOUDFORMATION_SCHEMA } from 'js-yaml-cloudformation-schema';

/**
 * Sorting callback function for import/export sorting.
 * @param {array} firstService - First service compare data.
 * @param {array} secondService - Second service compare data.
 * @return {int} - Sort order int.
 */
const sortDeploys = (firstService, secondService) => {
  if (firstService.imports.length === 0) {
    return -1;
  }

  if (secondService.imports.length === 0) {
    return 1;
  }

  for (const importIndex in firstService.imports) {
    const fnImport = firstService.exports[importIndex];
    if (secondService.imports.includes(fnImport)) {
      return -1;
    }
  }

  for (const importIndex in secondService.imports) {
    const fnImport = secondService.exports[importIndex];
    if (firstService.imports.includes(fnImport)) {
      return 1;
    }
  }

  return 0;
};

/**
 * Based on export and imports in serverless templates, sort the list to get exports before any import.
 * @param {array} files - List of paths to services files.
 * @return {array} - Sorted list with exports first.
 */
const sortFiles = files => {
  // Collect all import and exports in the serverless files.
  const services = files.map(file => {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(data, { schema: CLOUDFORMATION_SCHEMA });
      const imports = jsonpath.query(doc, '$..["Fn::ImportValue"]');
      imports.concat(jsonpath.query(doc, '$..["!ImportValue"]'));
      return {
        file,
        imports: imports,
        exports: jsonpath.query(doc, '$.resources.Outputs.*.Export.Name'),
      };
    } catch (e) {
      console.log(e);
    }
  });

  // Sort services according to import and exports.
  services.sort(sortDeploys);

  // Get the files and skip the sorting data for return.
  return services.map(service => service.file);
};

export default sortFiles;
