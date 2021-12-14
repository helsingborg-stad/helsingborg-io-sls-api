#!/bin/zsh
DIR=${0:a:h}

BUCKETS=(`aws s3 ls | cut -f3 -d' '`)

for BUCKET in $BUCKETS
do
    echo "Removing bucket: ${BUCKET}"
    aws s3 rm s3://${BUCKET} --recursive
    aws s3 rb s3://${BUCKET}
done