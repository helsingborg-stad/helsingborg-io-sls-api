# Helpful script to setup AWS environment variables for use with "Launch file"
# Reasoning: "Launch file" starts a new terminal session and thus does not use any existing aws-vault session
# Usage: first use aws-vault to enter the appropriate environment session, e.g. `aws-vault exec sandbox`
# Then run ./setup-debugging.sh
# See ./scripts/additional-envs.env for additional variables used by lambdas

if [ -z $AWS_VAULT ]; then
    echo "no vault detected - this script is intended to be run in an active aws-vault session"
    echo "run 'aws-vault exec sandbox' or similar first and try again"
    exit 1
else
    script_dir=$(dirname $0)
    env_path="$script_dir/../.env"
    additional_envs_path="$script_dir/additional-envs.env"

    echo "vault is $AWS_VAULT"
    echo "env path is $env_path"

    env | grep AWS >$env_path
    cat $additional_envs_path >>$env_path
fi
