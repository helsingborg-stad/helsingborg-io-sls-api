# Useful when testing locally to automatically re-execute on save
# usage: ./runNodemon services/someService/src/lambdas/someLambda.ts

nodemon -r dotenv/config --ext ts,hbs $1
