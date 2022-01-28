import testHtmlExpired from '../src/validators/htmlStateExpired';

it('Should return undefined if test succeeds. (status not lingering for more than 2 hours)', async () => {
  const result = testHtmlExpired(
    {
      PK: '####',
      SK: '####',
      status: {
        type: 'active:completionRequired:viva',
      },
      state: 'CASE_HTML_GENERATED',
      updatedAt: 1641293973095,
    },
    {
      getAge: () => 7199999,
    }
  );
  expect(result).toBeUndefined();
});

it('Should return error if status has not updated within 2 hours ', async () => {
  const result = testHtmlExpired(
    {
      PK: '####',
      SK: '####',
      status: {
        type: 'active:completionRequired:viva',
      },
      state: 'CASE_HTML_GENERATED',
      updatedAt: 1641293973095,
    },
    {
      getAge: () => 7200001,
    }
  );
  expect(result).toBeDefined();
});
