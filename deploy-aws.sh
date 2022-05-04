#!/usr/bin/env bash

# DESCRIPTION
# Run this script to execute 'yarn install' & 'sls deploy' in dirs with serverless.yml file

if [[ ! -d "./services" ]]; then
    echo "Could not find ./services directory, try running the script again from the project root."
    exit 1
fi

echo "Proceed to bulk deploy cloud services n' sh*t to AWS? 🚀 [y/n]: "
read INPUT_CONFIRMATION

if [[ "$INPUT_CONFIRMATION" != "y" ]]; then
    echo 'Bye'
    exit 1
fi

echo "Run yarn install in each directory? [y/n]: "
read INPUT_YARN_INSTALL

if [[ "$INPUT_YARN_INSTALL" != "n" ]]; then
    echo $(yarn install)
fi

for SERVICE_PATH in $(find . -name "serverless.yml" -not -path "*/node_modules/*" -type f -exec dirname {} \;); do
    pushd $SERVICE_PATH
    if [[ -f "$SERVICE_PATH/package.json" && "$INPUT_YARN_INSTALL" != "n" ]]; then
        yarn install
    fi
    sls deploy
    popd
done
