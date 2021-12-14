#!/bin/zsh
DIR=${0:a:h}

# Remove S3 buckets
. ${DIR}/s3remove.sh

# Stacks to remove
STACKS=(
    "office-auth"
    "authorizer"
    "bankid-api"
    "bookables-api"
    "booking-api"
    "cases-ms"
    "cases-api"
    "forms-api"
    "html-pdf-ms"
    "navet-ms"
    "pdf-ms"
    "stream-eventbridge-ms"
    "timeslots-api"
    "users-api"
    "users-ms"
    "viva-ms"
)

# Perform removal
for STACK in "${STACKS[@]}"
do
    echo "Removing stack: ${STACK}"
    aws cloudformation delete-stack --stack-name ${STACK}
    aws cloudformation wait stack-delete-complete --stack-name ${STACK}
done
