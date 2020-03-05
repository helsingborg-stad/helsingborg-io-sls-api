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

**Do this first**
The services are dependent on the resources that are created in this [accompanying repo](https://github.com/helsingborg-stad/helsingborg-io-sls-resources).

- AWS Account
- AWS IAM user
- Homebrew (macOS)
- NodeJS
- NPM
- [Serverless Framework](https://serverless.com/)

### AWS CLI (Homebrew on macOS)

```
brew install awscli
```

### Create an AWS Account (Personal)

- [Create an AWS account here](https://portal.aws.amazon.com/billing/signup#/start)

Ask your supervisor for credit card number

### Create an AWS IAM User

- Follow [this](https://serverless-stack.com/chapters/create-an-iam-user.html) guide

**Take a note of the Access key ID and Secret access key.**

### Add your access key for the IAM User to AWS CLI

It should look something like this:

- **Access key ID:** AKIAIOSFODNN7EXAMPLE
- **Secret access key:** wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

You can leave the **Default region** name and **Default output** format the way they are.

Simply run the following with your Secret Key ID and your Access Key.

```
aws configure
```

### Serverless Framework

The Serverless Framework helps you develop and deploy your AWS Lambda functions, along with the AWS infrastructure resources they require. It's a CLI that offers structure, automation and best practices out-of-the-box, allowing you to focus on building sophisticated, event-driven, serverless architectures, comprised of Functions and Events.

The Serverless Framework is different from other application frameworks because:

- It manages your code as well as your infrastructure
- It supports multiple languages (Node.js, Python, Java, and more)

```
npm install serverless -g
```

# API Services

### Clone the Serverless API repo

```
git clone git@github.com:helsingborg-stad/helsingborg-io-sls-api.git
cd helsingborg-io-sls-api
npm install
```

Run this to deploy to your AWS account.

### BankId

```
cd services/bankid-api
npm install
sls deploy
```

### Watson

```
cd services/watson-api
npm install
sls deploy
```

### How to run the service on your local development environment

Emulate AWS λ and API Gateway locally when developing your Serverless project

```
cd services/<service-name>
sls offline
```
