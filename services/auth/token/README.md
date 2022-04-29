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

## Lambda Authorizer

```mermaid
sequenceDiagram
    autonumber
    participant Frontend
    participant Gateway as API Gateway
    participant Authorizer as Lambda Authorizer
    participant Secrets as AWS SecretManager
    participant Lambda

    Frontend->>+Gateway: {Authorization header}
    Gateway->>+Authorizer: {accessToken}
    Authorizer->>+Secrets: Get secret key for verifying access token
    Secrets-->>-Authorizer: {Secret key}
    Authorizer->>Authorizer: {VerifyToken: accessToken/Secret key}
  alt accessToken is valid
    Authorizer-->>Gateway: {IAMPolicy}
    Gateway->>Lambda: {Execute function}
    Lambda-->>Frontend: {Function result}
  else accessToken is NOT valid
    Authorizer-->>-Gateway: {IAMPolicy}
    Gateway->>Frontend: {HTTP status 4xx}
  end
```

## API

### Generate token

```mermaid
sequenceDiagram
    autonumber
    participant Frontend
    participant Lambda
    participant Secrets as AWS SecretManager
    participant JWT

    Frontend->>+Lambda: {grant_type, refresh_token, code}
    Lambda->>+Secrets: Authorization code or refresh secret
    Secrets-->>-Lambda: {Secret key}
    Lambda->>+JWT: Decode token {Secret key, Authorization code or refresh token}
    JWT-->>-Lambda: {PersonalNumber}
    Lambda->>+Secrets: Get secret key for generating access token
      Secrets-->>-Lambda: {Secret key}
    Lambda->>JWT: Sign token {Secret key, personalNumber, expiryTime}
    JWT-->>Lambda: {accessToken}
    Lambda->>+Secrets: Get secret key for generating refresh token
    Secrets-->>-Lambda: {Secret key}
    Lambda->>JWT: Sign token {Secret key, personalNumber, expiryTime}
    JWT-->>Lambda: {refreshToken}
    Lambda-->>-Frontend: {accessToken, refreshToken}

```

#### Request type

`POST`

#### Endpoint

`/auth/token`

#### JSON payload

```json
{
  "grant_type": "authorization_code",
  "code": "<authorizationCode"
}
or
{
  "grant_type": "refresh_token",
  "refresh_token": "<refreshToken>",
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
      "accessToken": "<accessToken>",
      "refreshToken": "<refreshToken>"
    }
  }
}
```

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[issues-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/issues
[license-url]: https://raw.githubusercontent.com/helsingborg-stad/helsingborg-io-sls-api/master/LICENSE
