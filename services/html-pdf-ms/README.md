<h1>HELSINGBORG IO SLS HTML TO PDF MICRO SERVICE</h1>

## Purpose

The purpose of this microservice is to generate pdf from html files.

## Requirements

Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

## Deployment

### Prerequistes

In order for this service to function correctly, you have to setup a couple of other resources from the helsingborg-io-resrouces repo.

- Deploy the pdf storage bucket from the helsingborg-io-sls-resources repo.

- Deploy the chrome-aws-lambda layer from the helsingborg-to-sls-resource repo. This is needed in order lambdas to access and use puppeteer.

Now you are all set to deploy this service.

### Deploy service

Deploy command:

```bash
$ sls deploy -v
```
