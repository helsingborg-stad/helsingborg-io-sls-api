#!/bin/zsh
DIR=${0:a:h}

# Stacks to remove
SERVICES=(
  "services/viva/api"
  "services/viva/microservice"
  "services/users-ms"
  "services/users-api"
  "services/stream-eventbridge-ms"
  "services/navet-ms"
  "services/metrics-api"
  "services/html-pdf-ms"
  "services/forms-api"
  "services/cases-api"
  "services/case-ms"
  "services/bankid-api"
  "services/auth/token"
)

# Perform removal
for SERVICE in "${SERVICES[@]}"
do
  echo "Removing stack: ${SERVICE}"
  cd ${DIR}/../${SERVICE}
  sls remove
done

# Remove remaining S3 buckets
. ${DIR}/s3remove.sh
