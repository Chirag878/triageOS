export type CorsairProvider = "gmail" | "google_calendar";

export type CorsairConnectionStatus = {
  corsairAccountId: string | null;

  gmailConnected: boolean;
  gmailConnectionId: string | null;
  lastGmailSyncAt: string | null;

  calendarConnected: boolean;
  calendarConnectionId: string | null;
  lastCalendarSyncAt: string | null;
};

export type CorsairGmailMessage = {
  id: string;
  threadId: string | null;
  from: {
    email: string;
    name?: string | null;
  };
  to: Array<{
    email: string;
    name?: string | null;
  }>;
  cc?: Array<{
    email: string;
    name?: string | null;
  }>;
  subject: string;
  snippet: string | null;
  bodyPreview: string | null;
  receivedAt: string;
};

export type CorsairCalendarEventInput = {
  title: string;
  attendees: string[];
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  timezone: string;
  description?: string;
  location?: string;
  conferenceLinkRequested?: boolean;
};

export type CorsairCalendarEventResult = {
  eventId: string;
  htmlLink?: string | null;
  status?: string | null;
};

export type CorsairEmailDraftInput = {
  threadId: string;
  to: string[];
  subject: string;
  body: string;
};

export type CorsairEmailSendInput = CorsairEmailDraftInput;

export type CorsairActionResult<TData = unknown> = {
  success: boolean;
  provider: CorsairProvider;
  data?: TData;
  errorMessage?: string;
};