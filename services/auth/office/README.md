# Helsingborg IO SLS - Office Authorizer Service


## Table of Contents
- [Table of Contents](#table-of-contents)
- [About Token](#about-office-authorizer)
- [Getting Started](#getting-started)
  - [Do first](#do-first)
  - [Run local](#run-local)
  - [Deploy](#deploy-and-run-on-aws)


## About Office Authorizer

The Office Authorizer service purpose is to provide an authorization method for Microsoft Office users that is authenticated with
Azure AD.


## Getting Started


### Do first
Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)


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

