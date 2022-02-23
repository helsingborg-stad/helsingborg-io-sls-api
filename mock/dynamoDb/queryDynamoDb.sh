#!/usr/bin/env bash

aws dynamodb scan \
  --table-name prod-cases \
  --projection-expression "PK, id, #status.#type, details.workflowId, details.period, #state" \
  --filter-expression "#state = :state" \
  --expression-attribute-names file://expression-attributes-names.json \
  --expression-attribute-values file://expression-attributes-values.json

exit 0
