import { pollUser, Input, Dependencies } from '../../src/lambdas/pollUser';

import { getNavetPersonPost } from '../../src/helpers/navet';

import type { CaseUser } from '../../src/helpers/types';

const firstName = 'MockUser';
const lastName = 'MockUsersson';
const personalNumber = '199601011234';
const city = 'Mock Town';
const postalCode = '12345';
const street = 'Mock street 1337';

const mockUser: CaseUser = {
  firstName,
  lastName,
  civilStatus: 'OG',
  personalNumber,
  address: {
    city,
    postalCode,
    street,
  },
};

interface MakeNavetXmlInput {
  adress: {
    street: string;
    postalCode: string;
    city: string;
  };
}
function makeNavetXmlResponse(input: Partial<MakeNavetXmlInput> = {}) {
  const { adress = mockUser.address } = input;
  return `
  <?xml version='1.0' encoding='UTF-8'?>
  <S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
      <S:Body>
          <ns0:PersonpostXMLResponse xmlns:ns1="http://www.skatteverket.se/folkbokforing/na/personpostXML/v2" xmlns:ns0="http://xmls.skatteverket.se/se/skatteverket/folkbokforing/na/epersondata/V1">
              <ns0:Folkbokforingsposter>
                  <Folkbokforingspost>
                      <Personpost>
                          <PersonId>
                              <PersonNr>${personalNumber}</PersonNr>
                          </PersonId>
                          <Fodelsedatum>${personalNumber.slice(0, -4)}</Fodelsedatum>
                          <Namn>
                              <Fornamn>${firstName}</Fornamn>
                              <Efternamn>${lastName}</Efternamn>
                          </Namn>
                          ${
                            Object.keys(adress).length > 0 &&
                            `
                            <Adresser>
                                <Folkbokforingsadress>
                                    <Utdelningsadress2>${adress.street}</Utdelningsadress2>
                                    <PostNr>${adress.postalCode}</PostNr>
                                    <Postort>${adress.city}</Postort>
                                </Folkbokforingsadress>
                            </Adresser>
                            `
                          }
                          <Civilstand>
                              <CivilstandKod>OG</CivilstandKod>
                          </Civilstand>
                      </Personpost>
                  </Folkbokforingspost>
              </ns0:Folkbokforingsposter>
          </ns0:PersonpostXMLResponse>
      </S:Body>
  </S:Envelope>
  `;
}

function makeDependencies(dependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    getParsedNavetPersonPost: getNavetPersonPost,
    requestNavetUserXml: () => Promise.resolve(makeNavetXmlResponse()),
    putSuccessEvent: () => Promise.resolve(),
    ...dependencies,
  };
}

function makeInput(): Input {
  return {
    detail: {
      user: mockUser,
    },
  };
}

it('successfully fetches a navet user', async () => {
  const putSuccessEventMock = jest.fn();

  const result = await pollUser(
    makeInput(),
    makeDependencies({
      putSuccessEvent: putSuccessEventMock,
    })
  );

  expect(result).toBe(true);
  expect(putSuccessEventMock).toHaveBeenCalledWith(
    mockUser,
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});

it('successfully fetches a navet user without adress', async () => {
  const putSuccessEventMock = jest.fn();

  const navetUserXmlWithoutAdress = makeNavetXmlResponse({
    adress: {},
  } as MakeNavetXmlInput);

  const result = await pollUser(
    makeInput(),
    makeDependencies({
      putSuccessEvent: putSuccessEventMock,
      requestNavetUserXml: () => Promise.resolve(navetUserXmlWithoutAdress),
    })
  );

  expect(result).toBe(true);
  expect(putSuccessEventMock).toHaveBeenCalledWith(
    {
      ...mockUser,
      address: {
        city: undefined,
        postalCode: undefined,
        street: undefined,
      },
    },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});
