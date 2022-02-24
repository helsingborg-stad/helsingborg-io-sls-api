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

export interface BookingBody {
  requiredAttendees?: string[];
  startTime?: string;
  endTime?: string;
  optionalAttendees?: string[];
  subject?: string;
  location?: string;
  referenceCode?: string;
  body?: string;
}

export type TimeSpanData = Record<string, MSGraphTimeInterval[]>;

export interface GetTimeSpansResponse {
  data: {
    data: {
      attributes: TimeSpanData;
    };
  };
}
