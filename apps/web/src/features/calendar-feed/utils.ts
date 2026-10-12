import { customAlphabet } from "nanoid";
import type { IcsCalendarEventOptions } from "@/lib/utils/ics";
import type { CalendarFeedPoll } from "./types";

// Alphanumeric only: url safe with no linkifier edge cases. 32 chars is the
// floor documented on CalendarFeed.token.
export const generateCalendarFeedToken = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32,
);

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const joinParagraphs = (...parts: Array<string | null | undefined>) => {
  const text = parts.filter(Boolean).join("\n\n");
  return text.length > 0 ? text : undefined;
};

/**
 * The feed's events, one poll at a time:
 *
 * - open or closed (not yet scheduled): every option the user said yes or
 *   if need be to, as a TENTATIVE event that still blocks time (OPAQUE —
 *   TENTATIVE alone does not mark the slot busy in most clients);
 * - scheduled: only the final event, CONFIRMED;
 * - canceled, deleted, or scheduled with no live event: nothing.
 *
 * UIDs are stable per option and per poll, so a client refreshing the
 * subscription updates events in place and drops the ones that disappear —
 * which is how the losing options vanish once the poll is scheduled.
 */
export function toCalendarFeedEvents(
  polls: CalendarFeedPoll[],
  { pollUrl }: { pollUrl: (pollId: string) => string },
): IcsCalendarEventOptions[] {
  return polls.flatMap((poll): IcsCalendarEventOptions[] => {
    const url = pollUrl(poll.id);

    if (poll.status === "scheduled") {
      const event = poll.scheduledEvent;
      if (!event) {
        return [];
      }
      return [
        {
          uid: `${poll.id}.poll@rallly`,
          sequence: event.sequence,
          title: event.title,
          description: joinParagraphs(event.description, url),
          location: event.location ?? undefined,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          timeZone: event.timeZone ?? undefined,
          status: "CONFIRMED",
          transp: "OPAQUE",
          busyStatus: "BUSY",
        },
      ];
    }

    if (poll.status === "canceled") {
      return [];
    }

    return poll.options.map((option) => {
      const allDay = option.duration === 0;
      return {
        uid: `${option.id}.option@rallly`,
        title:
          option.vote === "ifNeedBe"
            ? `${poll.title} (if need be)`
            : `${poll.title} (tentative)`,
        description: joinParagraphs(
          "Tentative: this poll has not been scheduled yet.",
          poll.description,
          url,
        ),
        location: poll.location ?? undefined,
        start: option.startTime,
        end: new Date(
          option.startTime.getTime() +
            (allDay ? DAY_MS : option.duration * MINUTE_MS),
        ),
        allDay,
        timeZone: poll.timeZone ?? undefined,
        status: "TENTATIVE",
        transp: "OPAQUE",
        busyStatus: "TENTATIVE",
      };
    });
  });
}
