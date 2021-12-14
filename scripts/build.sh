#!/bin/zsh
DIR=${0:a:h}

# Check node version
NODE=`node -v | cut -b2-3`

if [ 14 -gt `expr "${NODE}"` ]
then
    echo "Node v14 or higher is required to run this script"
    exit 1
fi

# Check yarn availability
which yarn

if [ 0 -ne $? ]
then
    echo "Yarn needs to be installed to run this script"
    exit 1
fi

vared -p "Enter your GITHUB access token to access private packages: " -c GITHUB_TOKEN

if [ ! -z ${GITHUB_TOKEN} ]
then
    echo "@helsingborg-stad:registry=https://npm.pkg.github.com" >${DIR}/../.npmrc
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}"  >>${DIR}/../.npmrc

    echo "\"@helsingborg-stad:registry\" \"https://npm.pkg.github.com\"" >${DIR}/../.yarnrc
    echo "registry \"https://registry.yarnpkg.com\"" >>${DIR}/../.yarnrc
fi

cd ${DIR}/../
yarn install --force

if [ $? != 0 ]
then
    echo "FAILED Yarn install. Did you forget to add GitToken?"
    exit 1
fi

for SERVICE in $(find "${DIR}/../services" -name "package.json" -not -path "*/node_modules/*" -type f -exec dirname {} \;)
do
    cd ${SERVICE}
    # Remove node modules
    if [ -d ./node_modules ]
    then
        echo "Removing node_modules directory"
        rm -fr ./node_modules
    fi

    # Perform install
    yarn install --force
    if [ $? != 0 ]
    then
        echo "FAILED Yarn install"
        exit 1
    fi

    # Run Audit (Ignores dev-dependencies)
    yarn audit --groups dependencies

    if [ $? != 0 ]
    then
        echo "FAILED Yarn Audit"
        exit 1
    fi
done

cd ${DIR}

