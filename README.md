# Serverless Framework (AWS)

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

## Requirements

- AWS CLI
- AWS Account
- AWS IAM user
- Homebrew (macOS)
- NodeJS
- NPM
- Serverless Framework

### AWS CLI (Homebrew on macOS)

```
brew install awscli
```

### Create an AWS Account

- Follow [this](https://serverless-stack.com/chapters/create-an-iam-user.html) guide

### Create an AWS IAM User

- Follow [this](https://serverless-stack.com/chapters/create-an-aws-account.html) guide

**Take a note of the Access key ID and Secret access key.**

### Add your access key for the IAM User to AWS CLI

Simply run the following with your Secret Key ID and your Access Key.

It should look something like this:

- **Access key ID:** AKIAIOSFODNN7EXAMPLE
- **Secret access key:** wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

You can leave the **Default region** name and **Default output** format the way they are.

```
aws configure
```

### Serverless Framework (NPM)

```
npm install serverless -g
```

### API Platform

```
git clone https://github.com/helsingborg/helsingborg-io-sls-api
cd helsingborg-io-sls-api
npm install
cd services/<service-name>
npm install
```

## Local workflow

```
sls offline
```

## Deploy

```
sls deploy
```
