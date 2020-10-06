<h1> HELSINGBORG IO SLS VIVA MICRO SERVICE</h1>

## Purpose

The purpose of Viva Micro Serivce is to provide the data flow between the aws and viva api adapter.

## Description

When a case changes status from ongoing to submitted, the microservice responds and sends a request to the adapter, which in turn creates a case in Viva.

## Requirements

Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### Installation

```bash
$ npm install
```

### Run Local

```bash
$ sls offline
```

### Deploy and Run on AWS

Deploy command:

```bash
$ sls deploy -v
```

When you deploy the service, serverless will output the generated url in the terminal that the service can be accessed from.
