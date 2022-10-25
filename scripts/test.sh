cwd=$(pwd)

pushd ../

if [ $# -eq 0 ]; then
    yarn test $cwd
else
    yarn test $@
fi

popd
