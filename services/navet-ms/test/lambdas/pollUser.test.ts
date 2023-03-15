import { pollUser } from '../../src/lambdas/pollUser';
import { getNavetPersonPost } from '../../src/helpers/navet';
import type { Input, Dependencies } from '../../src/lambdas/pollUser';
import type { CaseUser } from '../../src/helpers/types';

interface NavetParamsAddress {
  street: string | null;
  postalCode: string | null;
  city: string | null;
}

interface NavetParams {
  address: NavetParamsAddress | null;
}

const firstName = 'Petronella';
const lastName = 'Malteskog';
const personalNumber = '198602102389';
const city = 'Stockholm';
const postalCode = '12345';
const street = 'Kungsgatan 1';

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

function createNavetXmlResponse(params: NavetParams): string {
  const { address } = params;
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
                            address &&
                            `
                            <Adresser>
                                <Folkbokforingsadress>
                                    <Utdelningsadress2>${address.street}</Utdelningsadress2>
                                    <PostNr>${address.postalCode}</PostNr>
                                    <Postort>${address.city}</Postort>
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

function createDependencies(dependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    getParsedNavetPersonPost: getNavetPersonPost,
    requestNavetUserXml: () =>
      Promise.resolve(
        createNavetXmlResponse({
          address: {
            city,
            postalCode,
            street,
          },
        })
      ),
    triggerEvent: () => Promise.resolve(),
    ...dependencies,
  };
}

function createInput(params: Partial<Input> = {}): Input {
  return {
    detail: {
      user: mockUser,
    },
    ...params,
  };
}

it('successfully fetches a navet user', async () => {
  const eventMock = jest.fn();

  const result = await pollUser(
    createInput(),
    createDependencies({
      triggerEvent: eventMock,
    })
  );

  expect(result).toBe(true);
  expect(eventMock).toHaveBeenCalledWith(
    { user: mockUser },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});

it('successfully fetches a navet user without address', async () => {
  const eventMock = jest.fn();

  const result = await pollUser(
    createInput(),
    createDependencies({
      requestNavetUserXml: () =>
        Promise.resolve(
          createNavetXmlResponse({
            address: null,
          })
        ),
      triggerEvent: eventMock,
    })
  );

  expect(result).toBe(true);
  expect(eventMock).toHaveBeenCalledWith(
    {
      user: {
        ...mockUser,
        address: {
          city: null,
          postalCode: null,
          street: null,
        },
      },
    },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
});
