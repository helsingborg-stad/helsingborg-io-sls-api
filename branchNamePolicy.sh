#!/usr/bin/env bash
LC_ALL=C
RED='\033[0;31m'
NC='\033[0m' # No Color
local_branch="$(git rev-parse --abbrev-ref HEAD)"

valid_branch_regex="^(feat|fix|docs|perf|wip|test|ci|build|release|hotfix)\/[a-z0-9._-]+$"

message="${RED}Invalid Branch Name: ${NC}There is something wrong with your branch name. Branch names in this project must adhere to this contract: [type]/[unique-20-char-long-name]. Your commit will be rejected. You should rename your branch to a valid name and try again."
FEAT_DESC="feat: (Feature) A new feature."
FIX_DESC="fix: (Bug fix) A bug Fix."
HOTFIX_DESC="hotfix: A fix to patch production code."
DOCS_DESC="docs: (Documentation) Documentation only changes."
PERF_DESC="perf: (Code Refactoring) Code changes that improves performance."
WIP_DESC="wip: (Work In Progress) A code change that won't be finished soon."
TEST_DESC="test: (TESTS) Adding missing tests or correcting existing tests."
CI_DESC="ci: (Continuous Integrations) Changes to our CI configuration files and scripts (example scope: CircleCi)."
BUILD_DESC="build: (Builds) Changes that affect the build system or external dependencies (example scope: npm)."
RELEASE_DESC="release: (Release) Preparation of a new production release."

change_instructions="To change your branch name run: git branch -m [type]/[unique-20-char-long-name]"

if [[ ! $local_branch =~ $valid_branch_regex ]]
then
    echo ""
    echo "$message
    "
    echo "Use one of the following types:
    "
    echo "  $FEAT_DESC"
    echo "  $FIX_DESC"
    echo "  $HOTFIX_DESC"
    echo "  $PERF_DESC"
    echo "  $WIP_DESC"
    echo "  $TEST_DESC"
    echo "  $CI_DESC"
    echo "  $BUILD_DESC"
    echo "  $RELEASE_DESC"
    echo ""
    echo "$change_instructions"
    echo ""
    exit 1
fi

exit 0
