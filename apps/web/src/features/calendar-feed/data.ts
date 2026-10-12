import "server-only";

import { prisma } from "@rallly/database";
import { parseLocation } from "@/features/location/data";
import { formatLocationText } from "@/features/location/utils";
import {
  CALENDAR_FEED_LOOKBACK_DAYS,
  CALENDAR_FEED_MAX_POLLS,
} from "./constants";
import type { CalendarFeedOption, CalendarFeedPoll } from "./types";

export function getCalendarFeedForUser(userId: string) {
  return prisma.calendarFeed.findUnique({
    where: { userId },
    select: { token: true, createdAt: true, lastAccessedAt: true },
  });
}

/**
 * Resolves a feed token to its owner. The token is the whole credential, so
 * a banned or deleted account's feed resolves to nothing rather than
 * continuing to publish its schedule.
 */
export function getCalendarFeedByToken(token: string) {
  return prisma.calendarFeed.findFirst({
    where: { token, user: { banned: false, deletedAt: null } },
    select: { id: true, userId: true },
  });
}

/**
 * The polls the user responded to, shaped for the feed. Scoped by the
 * participant's userId: a response made as a guest only shows up once the
 * guest's responses were merged into the account.
 */
export async function getCalendarFeedPolls(
  userId: string,
  { now }: { now: Date },
): Promise<CalendarFeedPoll[]> {
  const since = new Date(
    now.getTime() - CALENDAR_FEED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  const participants = await prisma.participant.findMany({
    where: {
      userId,
      poll: { deleted: false, status: { not: "canceled" } },
    },
    orderBy: { createdAt: "desc" },
    take: CALENDAR_FEED_MAX_POLLS,
    select: {
      votes: {
        where: {
          type: { in: ["yes", "ifNeedBe"] },
          option: { startTime: { gte: since } },
        },
        select: {
          type: true,
          option: { select: { id: true, startTime: true, duration: true } },
        },
      },
      poll: {
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          timeZone: true,
          status: true,
          scheduledEvent: {
            select: {
              id: true,
              uid: true,
              sequence: true,
              title: true,
              description: true,
              location: true,
              start: true,
              end: true,
              allDay: true,
              timeZone: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  // A user can hold more than one response in a poll (e.g. a guest response
  // merged into the account), so polls and votes are folded per poll.
  const polls = new Map<string, CalendarFeedPoll>();

  for (const { poll, votes } of participants) {
    let entry = polls.get(poll.id);

    if (!entry) {
      const event = poll.scheduledEvent;
      const isLiveEvent =
        event !== null &&
        event.deletedAt === null &&
        event.status !== "canceled" &&
        event.end >= since;
      const location =
        isLiveEvent && event
          ? parseLocation(event.location, { scheduledEventId: event.id })
          : null;

      entry = {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        location: poll.location,
        timeZone: poll.timeZone,
        status: poll.status,
        options: [],
        scheduledEvent:
          isLiveEvent && event
            ? {
                uid: event.uid,
                sequence: event.sequence,
                title: event.title,
                description: event.description,
                location: location ? formatLocationText(location) : null,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
                timeZone: event.timeZone,
              }
            : null,
      };
      polls.set(poll.id, entry);
    }

    for (const vote of votes) {
      if (vote.type === "no") {
        continue;
      }
      const existing = entry.options.find((o) => o.id === vote.option.id);
      if (existing) {
        if (vote.type === "yes") {
          existing.vote = "yes";
        }
        continue;
      }
      const option: CalendarFeedOption = { ...vote.option, vote: vote.type };
      entry.options.push(option);
    }
  }

  for (const poll of polls.values()) {
    poll.options.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  return [...polls.values()];
}
