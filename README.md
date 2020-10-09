<!-- SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<p>
  <a href="https://github.com/helsingborg-stad/helsingborg-io-sls-api">
    <img src="images/logo.jpg" alt="Logo" width="300">
  </a>
</p>
<h3>API Platform Services</h3>
<p>
  Services that run on Helsingborgs stads API platform <a href="https://helsingborg.io/">helsingborg.io</a>
  <br />
  <a href="https://github.com/helsingborg-stad/helsingborg-io-sls-api/issues">Report Bug</a>
  ·
  <a href="https://github.com/helsingborg-stad/helsingborg-io-sls-api/issues">Request Feature</a>
</p>


## Table of Contents
- [Table of Contents](#table-of-contents)
- [About API Platform Services](#about-api-platform-services)
  - [An example](#an-example)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Do first](#do-first)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Services](#services)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)


## About API Platform Services
A service is what you might call a Serverless project. It has a single serverless.yml file driving it.


### An example

Our app has two API services, each has their own well defined business logic:

- forms-api service: Handles managing the forms data.
- cool-api service: Handles making cool suff.

```
/
  libs/
  services/
    forms-api/
    cool-api/
```

Why? Most of the code changes are going to happen in this repo. When your team is making rapid changes, you are likely to have many feature branches, bug fixes, and pull requests. A bonus with serverless is that you can spin up new environments at zero cost (you only pay for usage, not for provisioning resources).

For example, a team can have dozens of ephemeral stages such as: prod, staging, dev, feature-x, feature-y, feature-z, bugfix-x, bugfix-y, pr-128, pr-132, etc.

This ensures each change is tested on real infrastructure before being promoted to production.


### Built With

* [Serverless Framework](https://www.serverless.com/)
* [AWS](https://aws.amazon.com)


## Getting Started

To get a local copy up and running follow these simple steps.


### Do first

The services are dependent on the resources that are created in this [accompanying repo](https://github.com/helsingborg-stad/helsingborg-io-sls-resources).

### Prerequisites

- AWS CLI
- AWS Account
- AWS IAM user
- Homebrew (macOS)
- NodeJS
- NPM
- [Serverless Framework](https://serverless.com/)


### Installation


Clone repo
```sh
git clone git@github.com:helsingborg-stad/helsingborg-io-sls-api.git
```

Install shared npm packages
```sh
cd helsingborg-io-sls-api
npm install
```

## Services
Every service in this mono repo has its own documentation. Follow links below.

- [Bankid API](/services/bankid-api)
- [Cases API](/services/cases-api)
- [Forms API](/services/forms-api)
- [Navet MS](/services/navet-ms)
- [Token](/services/auth/token)
- [Users API](/services/users-api)
- [Users MS](/services/users-ms)
- [Viva MS](/services/viva-ms)



## Roadmap
This repo is part of a project called Mitt Helsingborg. See the [project backlog](https://share.clickup.com/l/h/6-33382576-1/763b706816dbf53) for a complete list of upcoming features, known issues and releases.



## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



## License

Distributed under the [MIT License][license-url].


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/helsingborg-stad/helsingborg-io-sls-api.svg?style=flat-square
[contributors-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/helsingborg-stad/helsingborg-io-sls-api.svg?style=flat-square
[forks-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/network/members
[stars-shield]: https://img.shields.io/github/stars/helsingborg-stad/helsingborg-io-sls-api.svg?style=flat-square
[stars-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/stargazers
[issues-shield]: https://img.shields.io/github/issues/helsingborg-stad/helsingborg-io-sls-api.svg?style=flat-square
[issues-url]: https://github.com/helsingborg-stad/helsingborg-io-sls-api/issues
[license-shield]: https://img.shields.io/github/license/helsingborg-stad/helsingborg-io-sls-api.svg?style=flat-square
[license-url]: https://raw.githubusercontent.com/helsingborg-stad/helsingborg-io-sls-api/master/LICENSE
[product-screenshot]: images/screenshot.png
