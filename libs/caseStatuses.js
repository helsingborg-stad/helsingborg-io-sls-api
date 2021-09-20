export const statusTypes = {
  NOT_STARTED: 'notStarted',
  ACTIVE_ONGOING: 'active:ongoing',
  ACTIVE_SIGNATURE_COMPLETED: 'active:signature:completed',
  ACTIVE_SIGNATURE_PENDING: 'active:signature:pending',
  ACTIVE_SUBMITTED: 'active:submitted',
  ACTIVE_PROCESSING: 'active:processing',
  CLOSED: 'closed',
  NOT_STARTED_VIVA: 'notStarted:viva',
  ACTIVE_COMPLETION_REQUIRED_VIVA: 'active:completionRequired:viva',
  CLOSED_APPROVED_VIVA: 'closed:approved:viva',
  CLOSED_PARTIALLY_APPROVED_VIVA: 'closed:partiallyApproved:viva',
  CLOSED_REJECTED_VIVA: 'closed:rejected:viva',
  CLOSED_COMPLETION_REJECTED_VIVA: 'closed:completionRejected:viva',
};

const statuses = [
  {
    type: statusTypes.NOT_STARTED,
    name: 'Ej påbörjad',
    description: 'Ansökan är ej påbörjad.',
  },
  {
    type: statusTypes.ACTIVE_ONGOING,
    name: 'Pågående',
    description:
      'Du har påbörjat en ansökan. Du kan öppna din ansökan och fortsätta där du slutade.',
  },
  {
    type: statusTypes.ACTIVE_SIGNATURE_COMPLETED,
    name: 'Signerad',
    description: 'Ansökan är signerad',
  },
  {
    type: statusTypes.ACTIVE_SIGNATURE_PENDING,
    name: 'Väntar på signering',
    description:
      'Väntar på signering. När båda har signerat med BankID skickas ansökan in för bedömning',
  },
  {
    type: statusTypes.ACTIVE_SUBMITTED,
    name: 'Inskickad',
    description: 'Ansökan är inskickad.',
  },
  {
    type: statusTypes.ACTIVE_PROCESSING,
    name: 'Ansökan behandlas',
    description: 'Ditt ärende är mottaget och bearbetas.',
  },
  {
    type: statusTypes.CLOSED,
    name: 'Avslutat',
    description: 'Ditt ärende är avslutat.',
  },
  /**
   * Service: Ekonomiskt bistånd
   */
  {
    type: statusTypes.NOT_STARTED_VIVA,
    name: 'Öppen',
    description: 'Ansökan är öppen. Du kan nu söka ekonomiskt bistånd för perioden.',
  },
  {
    type: statusTypes.ACTIVE_COMPLETION_REQUIRED_VIVA,
    name: 'Stickprovskontroll',
    description:
      'Du måste komplettera din ansökan med bilder som visar dina utgifter och inkomster. Vi behöver din komplettering inom 4 dagar för att kunna betala ut pengar för perioden.',
  },
  {
    type: statusTypes.CLOSED_APPROVED_VIVA,
    name: 'Godkänd',
    description: 'Din ansökan är godkänd. Pengarna sätts in på ditt konto.',
  },
  {
    type: statusTypes.CLOSED_PARTIALLY_APPROVED_VIVA,
    name: 'Delvis godkänd',
    description:
      'Delar av din ansökan är godkänd, men några av de utgifter du sökt för får du inte bistånd för. Pengarna för godkända utgifter sätts in på ditt konto.',
  },
  {
    type: statusTypes.CLOSED_REJECTED_VIVA,
    name: 'Avslagen',
    description:
      'Din ansökan är inte godkänd och du kommer inte att få någon utbetalning. Vill du överklaga beslutet lämnar du en skriftlig motivering med e-post eller brev till din handläggare.',
  },
  {
    type: statusTypes.CLOSED_COMPLETION_REJECTED_VIVA,
    name: 'Avslagen',
    description:
      'Din ansökan är inte godkänd eftersom vi saknar stickprov för perioden. Därför kan vi inte gå vidare och godkänna din ansökan.',
  },
];

export const getStatusByType = type => statuses.find(status => status.type === type);

export default statuses;
