export function getFriendlyQueueName(queueUrl: string): string {
  const parts = queueUrl.split('/');
  return parts[parts.length - 1] ?? queueUrl;
}
