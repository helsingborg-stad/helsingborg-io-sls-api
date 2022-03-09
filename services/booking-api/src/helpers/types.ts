export interface TimeInterval {
  startTime: string;
  endTime: string;
}

export interface MSGraphTimeInterval {
  StartTime: string;
  EndTime: string;
}

export interface Attendee {
  Email?: string;
  Type: string;
  Status: string;
}

export interface BookingAttributes {
  BookingId: string;
  Attendees: Attendee[];
  Subject?: string;
  Body?: string | null;
  Location?: string;
  ReferenceCode?: string;
  StartTime?: string;
  EndTime?: string;
}

export interface BookingSearchResponse {
  data?: {
    data?: {
      attributes: BookingAttributes[];
    };
  };
}

export interface HistoricalAttendeesResponse {
  data?: {
    data?: {
      type: string;
      id: string;
      attributes: string[];
    };
  };
}

export interface BookingCreateResponse {
  data?: {
    data?: {
      attributes: Record<string, string>;
    };
  };
}

export interface BookingError {
  response: {
    status: number;
    statusText: string;
  };
}
export interface BookingRequest {
  organizationRequiredAttendees: string[];
  externalRequiredAttendees: string[];
  startTime: string;
  endTime: string;
  subject: string;
  body: string;
  optionalAttendees?: string[];
  referenceCode?: string;
  location?: string;
  remoteMeeting?: boolean;
}

export interface CreateBookingRequestBody {
  requiredAttendees: string[];
  startTime: string;
  endTime: string;
  optionalAttendees: string[];
  referenceCode: string;
  subject: string;
  location: string;
  body: string;
}

export interface SearchBookingRequestBody {
  startTime: string;
  endTime: string;
}

export interface HistoricalAttendeesRequestBody {
  startTime: string;
  endTime: string;
  referenceCode: string;
}

export interface CreateRemoteMeetingRequestBody {
  attendees: string[];
  subject?: string;
  startTime: string;
  endTime: string;
}

export interface CreateRemoteMeetingResponse {
  data?: {
    data?: {
      attributes: {
        Id: string;
        Subject: string;
        OnlineMeetingUrl: string;
      };
    };
  };
}

export interface GetHistoricalAttendeesAttributes {
  Email: string;
  JobTitle: string;
  Department: string;
  DisplayName: string;
}

export interface GetHistoricalAttendeesResponse {
  data?: {
    data?: {
      type: string;
      id: string;
      attributes: GetHistoricalAttendeesAttributes;
    };
  };
}

export type TimeSpanData = Record<string, MSGraphTimeInterval[]>;

export interface GetTimeSpansBody {
  emails: string[];
  startTime: string;
  endTime: string;
  meetingDurationMinutes: number;
}

export interface GetTimeSpansResponse {
  data?: {
    data?: {
      attributes?: TimeSpanData;
    };
  };
}
