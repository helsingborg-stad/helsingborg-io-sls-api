<!-- HEADS UP! To avoid retyping too much info. Do a search and replace with your text editor for the following:
helsingborg-io-sls-api, Token -->

# Helsingborg IO SLS - Token Service


## Table of Contents
- [Token](#Token)
  - [Table of Contents](#table-of-contents)
  - [About Token](#about-token)
  - [Getting Started](#getting-started)
    - [Do first](#do-first)
    - [Run local](#run-local)
    - [Deploy](#deploy-and-run-on-aws)
  - [API](#api)



## About Office Authorizer

The Office Authorizer service purpose is to provide an authorization method for Microsoft Office users that us authenticated with
Azure AD.

## Getting Started


### Do first
Read the global requierments for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)


### Run Local

```bash
$ sls offline
```

When you deploy the service, Serverless will output the generated url in the terminal that the service can be accessed from.

### Deploy and run on AWS

Deploy command:

```bash
$ sls deploy
```

When you deploy the service, Serverless will output the generated url in the terminal that the service can be accessed from.

