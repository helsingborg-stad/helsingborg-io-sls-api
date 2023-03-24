#!/usr/bin/env bash
set -e

CMD="yarn install"

$CMD
for SERVICE_PATH in $(find . -name "package.json" -path "*/services/*" -not -path "*/node_modules/*" -type f -exec dirname {} \;)
do
    pushd $SERVICE_PATH
    $CMD
    popd
done
