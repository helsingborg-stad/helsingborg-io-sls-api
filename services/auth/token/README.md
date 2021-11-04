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



## About Token

The Token Service purpose is to provide an authorization method for other services in this monorepo.
It also serves as a REST API endpoint that generates tokens.


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
$ sls deploy -v
```

When you deploy the service, Serverless will output the generated url in the terminal that the service can be accessed from.



## API

### Get token

#### Request type

`POST`

#### Endpoint

`/auth/token`

#### JSON payload

```json
  {
    "personalNumber": "203010101010",
  }
```

#### Excpected response

```json
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "authorizationToken",
    "attributes": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJ7hr9hbE51bWJlciI6IjE5NTgwOTI2Mjc0MyIsImV4cCI6MTYwMjIjd98g0MywiaWF0IjoxNjAyMjUyOTQzfQ.5HoVANFvzL0vnsved783aRIjVXngpA_EAh-_GHH4WmI"
    }
  }
}
```



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[issues-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/issues
[license-url]: https://raw.githubusercontent.com/helsingborg-stad/helsingborg-io-sls-api/master/LICENSE
