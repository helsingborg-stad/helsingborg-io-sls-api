export const handler = async (event: any = {}): Promise<any> => {
  const response = JSON.stringify(event, null, 2);
  return response;
};
