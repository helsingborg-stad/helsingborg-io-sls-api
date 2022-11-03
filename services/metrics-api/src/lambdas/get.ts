import { collectFromAll, ekbMetricsCollector } from '../helpers/collectors';
import { getMetricFormatter } from '../helpers/formats';
import { wrappers } from '../libs/lambdaWrapper';

import type { ValidFormat } from '../helpers/formats';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

interface GetMetricsRequest {
  format: ValidFormat;
}

async function getMetrics({ format }: GetMetricsRequest): Promise<string> {
  const formatter = getMetricFormatter(format);
  const metrics = await collectFromAll([ekbMetricsCollector]);
  return formatter.formatMultiple(metrics);
}

export const main = wrappers.restRaw.wrap(getMetrics, {});

(async () => {
  const res = await main(
    {
      queryStringParameters: {
        format: 'asdf',
      },
    } as unknown as APIGatewayProxyEvent,
    {} as Context
  );
  console.log('res', res);
})();
