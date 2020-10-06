# API Platform - Serverless Framework - AWS

## The concept

- Service

A service is what you might call a Serverless project. It has a single serverless.yml file driving it.

- Application

An application or app is a collection of multiple services.

### An example

Our app has two API services, each has their own well defined business logic:

- forminput-api service: Handles managing the form data.
- cool-api service: Handles making cool suff.

```
/
  libs/
  services/
    forminput-api/
    cool-api/
```

Why? Most of the code changes are going to happen in this repo. When your team is making rapid changes, you are likely to have many feature branches, bug fixes, and pull requests. A bonus with serverless is that you can spin up new environments at zero cost (you only pay for usage, not for provisioning resources).

For example, a team can have dozens of ephemeral stages such as: prod, staging, dev, feature-x, feature-y, feature-z, bugfix-x, bugfix-y, pr-128, pr-132, etc.

This ensures each change is tested on real infrastructure before being promoted to production.

# Setup

**Do first**

The services are dependent on the resources that are created in this [accompanying repo](https://github.com/helsingborg-stad/helsingborg-io-sls-resources).

## Requirements

- AWS CLI
- AWS Account
- AWS IAM user
- Homebrew (macOS)
- NodeJS
- NPM
- [Serverless Framework](https://serverless.com/)

## Usage

### Clone repo

```
git clone git@github.com:helsingborg-stad/helsingborg-io-sls-api.git
```

Install shared npm packages

```
cd helsingborg-io-sls-api
npm install
```

## Services

[BankId](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/bankid-api)

[Cases](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/cases-api)

[Forms](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/forms-api)

[Navet Microservice](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/navet-ms)

[Users](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/user-api)

[User Microservice](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/user-ms)

[Viva Microservice](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/viva-ms)

[Token](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/auth/token)

[Watson](https://github.com/helsingborg-stad/helsingborg-io-sls-api/tree/dev/services/watson-api)
