import * as ics from "ics";

const productId = "-//Rallly//EN";

export interface CreateIcsEventOptions {
  uid: string;
  sequence?: number;
  start: Date;
  end: Date;
  allDay: boolean;
  timeZone?: string;
  title: string;
  description?: string;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    partstat?: ics.ParticipationStatus;
  }>;
  method?: "request" | "publish" | "cancel";
  status?: ics.EventStatus;
  /** Whether the event blocks free/busy time. Clients default to OPAQUE. */
  transp?: "OPAQUE" | "TRANSPARENT";
  /** Outlook's free/busy hint (X-MICROSOFT-CDO-BUSYSTATUS). */
  busyStatus?: "FREE" | "BUSY" | "TENTATIVE" | "OOF";
}

export type IcsCalendarEventOptions = Omit<CreateIcsEventOptions, "method">;

function toIcsEventAttributes({
  uid,
  start,
  end,
  allDay,
  timeZone,
  sequence = 0,
  title,
  description,
  location,
  organizer,
  attendees,
  status = "CONFIRMED",
  transp,
  busyStatus,
}: IcsCalendarEventOptions): ics.EventAttributes {
  return {
    uid,
    productId,
    sequence,
    title,
    description,
    location,
    organizer,
    attendees,
    status,
    transp,
    busyStatus,
    startInputType: timeZone ? "utc" : "local",
    startOutputType: timeZone ? "utc" : "local",
    ...(allDay
      ? {
          start: [
            start.getUTCFullYear(),
            start.getUTCMonth() + 1,
            start.getUTCDate(),
          ],
          end: [end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()],
        }
      : {
          start: [
            start.getUTCFullYear(),
            start.getUTCMonth() + 1,
            start.getUTCDate(),
            start.getUTCHours(),
            start.getUTCMinutes(),
          ],
          end: [
            end.getUTCFullYear(),
            end.getUTCMonth() + 1,
            end.getUTCDate(),
            end.getUTCHours(),
            end.getUTCMinutes(),
          ],
        }),
  };
}

/**
 * Creates an ICS event with proper date/time handling
 * Handles all-day events, timezone conversions, and floating time automatically
 */
export function createIcsEvent({
  method = "request",
  ...options
}: CreateIcsEventOptions): {
  error?: Error;
  value?: string;
} {
  return ics.createEvent({
    ...toIcsEventAttributes(options),
    method,
  });
}

/**
 * Creates a published calendar holding many events, for subscription feeds.
 * Each event keeps its own date handling, so all-day, zoned and floating
 * events can share one calendar.
 */
export function createIcsCalendar({
  name,
  events,
}: {
  name: string;
  events: IcsCalendarEventOptions[];
}): {
  error?: Error;
  value?: string;
} {
  const { error, value } = ics.createEvents(events.map(toIcsEventAttributes), {
    productId,
    method: "PUBLISH",
    calName: name,
  });
  return { error: error ?? undefined, value };
}
