# Serverless

POC - Using Serverless Framework with AWS

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
