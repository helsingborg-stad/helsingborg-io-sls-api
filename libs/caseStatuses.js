import {
  NOT_STARTED,
  ACTIVE_ONGOING,
  ACTIVE_SIGNATURE_COMPLETED,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SUBMITTED,
  ACTIVE_PROCESSING,
  CLOSED,
  NOT_STARTED_VIVA,
  ACTIVE_COMPLETION_REQUIRED_VIVA,
  ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
  CLOSED_APPROVED_VIVA,
  CLOSED_PARTIALLY_APPROVED_VIVA,
  CLOSED_REJECTED_VIVA,
  CLOSED_COMPLETION_REJECTED_VIVA,
} from './constants';

const statuses = [
  {
    type: NOT_STARTED,
    name: 'Ej påbörjad',
    description: 'Ansökan är ej påbörjad.',
  },
  {
    type: ACTIVE_ONGOING,
    name: 'Pågående',
    description:
      'Du har påbörjat en ansökan. Du kan öppna din ansökan och fortsätta där du slutade.',
  },
  {
    type: ACTIVE_SIGNATURE_COMPLETED,
    name: 'Signerad',
    description: 'Ansökan är signerad',
  },
  {
    type: ACTIVE_SIGNATURE_PENDING,
    name: 'Väntar på signering',
    description:
      'Väntar på signering. När båda har signerat med BankID skickas ansökan in för bedömning',
  },
  {
    type: ACTIVE_SUBMITTED,
    name: 'Inskickad',
    description: 'Ansökan är inskickad.',
  },
  {
    type: ACTIVE_PROCESSING,
    name: 'Ansökan behandlas',
    description: 'Ditt ärende är mottaget och bearbetas.',
  },
  {
    type: CLOSED,
    name: 'Avslutat',
    description: 'Ditt ärende är avslutat.',
  },
  /**
   * Service: Ekonomiskt bistånd
   */
  {
    type: NOT_STARTED_VIVA,
    name: 'Öppen',
    description: 'Ansökan är öppen. Du kan nu söka ekonomiskt bistånd för perioden.',
  },
  {
    type: ACTIVE_COMPLETION_REQUIRED_VIVA,
    name: 'Ansökan behöver kompletteras',
    description:
      'Du har skickat in en ansökan för #MONTH_NAME. För att vi ska kunna behandla din ansökan finns det uppgifter som du behöver komplettera.\n\nKomplettering ska ha skickats in till oss senast #COMPLETION_DUEDATE.',
  },
  {
    type: ACTIVE_RANDOM_CHECK_REQUIRED_VIVA,
    name: 'Stickprovskontroll',
    description:
      'Du måste komplettera din ansökan med bilder som visar dina utgifter och inkomster. Vi behöver din komplettering inom 4 dagar för att kunna betala ut pengar för perioden.',
  },
  {
    type: CLOSED_APPROVED_VIVA,
    name: 'Godkänd',
    description: 'Din ansökan är godkänd. Pengarna sätts in på ditt konto.',
  },
  {
    type: CLOSED_PARTIALLY_APPROVED_VIVA,
    name: 'Delvis godkänd',
    description:
      'Delar av din ansökan är godkänd, men några av de utgifter du sökt för får du inte bistånd för. Pengarna för godkända utgifter sätts in på ditt konto.',
  },
  {
    type: CLOSED_REJECTED_VIVA,
    name: 'Avslagen',
    description:
      'Din ansökan är inte godkänd och du kommer inte att få någon utbetalning. Vill du överklaga beslutet lämnar du en skriftlig motivering med e-post eller brev till din handläggare.',
  },
  {
    type: CLOSED_COMPLETION_REJECTED_VIVA,
    name: 'Avslagen',
    description:
      'Din ansökan är inte godkänd eftersom vi saknar stickprov för perioden. Därför kan vi inte gå vidare och godkänna din ansökan.',
  },
];

export const getStatusByType = type => statuses.find(status => status.type === type);

export default statuses;
