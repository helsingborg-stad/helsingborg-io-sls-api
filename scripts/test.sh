cwd=$(pwd)

pushd ../

yarn test $cwd $@

popd
