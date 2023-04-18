import type { PaginatedClient, CommandResult } from '../awsHelper';
import { executePaginated } from '../awsHelper';

describe('AWS Helpers', () => {
  const mockClient: PaginatedClient<CommandResult> = {
    send: jest.fn().mockImplementation(command => {
      if (command === 'page1') {
        return Promise.resolve({ NextToken: 'page2' });
      }
      if (command === 'page2') {
        return Promise.resolve({ NextToken: 'page3' });
      }
      if (command === 'page3') {
        return Promise.resolve({});
      }
      throw new Error(`Unexpected command: ${command}`);
    }),
  };

  function makeCommand(nextToken: string | undefined) {
    return nextToken ?? 'page1';
  }

  describe('executePaginated', () => {
    it('calls the client with the initial command and then with subsequent NextTokens', async () => {
      const resultMapper = jest.fn().mockReturnValue('result');
      await executePaginated(mockClient, makeCommand, resultMapper);
      expect(mockClient.send).toHaveBeenCalledTimes(3);
      expect(mockClient.send).toHaveBeenCalledWith('page1');
      expect(mockClient.send).toHaveBeenCalledWith('page2');
      expect(mockClient.send).toHaveBeenCalledWith('page3');
    });

    it('maps the client responses using the resultMapper', async () => {
      const resultMapper = jest.fn().mockImplementation(response => `result-${response.NextToken}`);
      const results = await executePaginated(mockClient, makeCommand, resultMapper);
      expect(resultMapper).toHaveBeenCalledTimes(3);
      expect(resultMapper).toHaveBeenCalledWith({ NextToken: 'page2' });
      expect(resultMapper).toHaveBeenCalledWith({ NextToken: 'page3' });
      expect(resultMapper).toHaveBeenCalledWith({});
      expect(results).toEqual(['result-page2', 'result-page3', 'result-undefined']);
    });
  });
});
