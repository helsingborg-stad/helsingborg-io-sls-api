export interface PaginatedClient<TCommandOutputType> {
  send(command: unknown): Promise<TCommandOutputType>;
}

export interface CommandResult {
  NextToken?: string;
}

export async function executePaginated<TCommandOutputType extends CommandResult, TResultType>(
  client: PaginatedClient<TCommandOutputType>,
  makeCommand: (nextToken: string | undefined) => unknown,
  resultMapper: (response: TCommandOutputType) => TResultType
): Promise<TResultType[]> {
  let nextToken: string | undefined = undefined;
  const results: TResultType[] = [];
  do {
    const command = makeCommand(nextToken);
    const response = await client.send(command);
    const result = resultMapper(response);
    results.push(result);
    nextToken = response.NextToken;
  } while (nextToken);

  return results;
}
