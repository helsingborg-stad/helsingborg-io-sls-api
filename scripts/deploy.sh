#!/bin/zsh
DIR=${0:a:h}

# Check node version
NODE=`node -v | cut -b2-3`

if [ 14 -gt `expr "${NODE}"` ]
then
    echo "Node v14 or higher is required to run this script"
    exit 1
fi

# Get logged on identity
ACCOUNT_ID=`aws sts get-caller-identity`

if [ $? != 0 ]
then
    echo "FAILED to get identity. Login to your AWS Account prior to running this script"
    exit 1
fi

# Extract account id
ACCOUNT_ID=`echo ${ACCOUNT_ID} | grep "Account" | cut -f4 -d\"`

# Create deployment bucket
aws s3 ls s3://deployment-${ACCOUNT_ID} >/dev/null 2>&1

if [ $? -ne 0 ]
then
    aws s3 mb s3://deployment-${ACCOUNT_ID}
fi

# Run deployments
for SERVICE in $(find "${DIR}/../services" -name "serverless.yml" -not -path "*/node_modules/*" -type f -exec dirname {} \;)
do
    cd ${SERVICE}
    sls deploy
    if [ $? != 0 ]
    then
        echo "FAILED SLS deploy"
        exit 1
    fi
done

# Cleanup deployment bucket
aws s3 rm s3://deployment-${ACCOUNT_ID} --recursive

# Restore directory
cd ${DIR}

