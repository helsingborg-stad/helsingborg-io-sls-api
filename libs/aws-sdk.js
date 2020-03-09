/* eslint-disable no-undef */
import aws from 'aws-sdk';

const awsWrapped = process.env.IS_LOCAL ? aws : aws; // Can be something other productions stuff wrapped around aws

export default awsWrapped;
