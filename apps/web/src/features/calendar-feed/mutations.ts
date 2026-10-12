import "server-only";

import { prisma } from "@rallly/database";
import { generateCalendarFeedToken } from "./utils";

/** Creates the user's feed, or returns the existing one unchanged. */
export async function enableCalendarFeed({ userId }: { userId: string }) {
  return prisma.calendarFeed.upsert({
    where: { userId },
    create: { userId, token: generateCalendarFeedToken() },
    update: {},
    select: { token: true },
  });
}

/**
 * Replaces the feed token. Subscriptions using the old URL stop resolving
 * at once, which is how a leaked feed URL is revoked.
 */
export async function rotateCalendarFeedToken({ userId }: { userId: string }) {
  return prisma.calendarFeed.update({
    where: { userId },
    data: { token: generateCalendarFeedToken(), lastAccessedAt: null },
    select: { token: true },
  });
}

export async function disableCalendarFeed({ userId }: { userId: string }) {
  await prisma.calendarFeed.deleteMany({ where: { userId } });
}

/**
 * Records that a calendar client fetched the feed, so the settings page can
 * show whether a subscription is live. Throttled to one write an hour per
 * feed: clients poll often and the value only needs to be approximate.
 */
export async function touchCalendarFeed({
  id,
  now,
}: {
  id: string;
  now: Date;
}) {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  await prisma.calendarFeed.updateMany({
    where: {
      id,
      OR: [{ lastAccessedAt: null }, { lastAccessedAt: { lt: hourAgo } }],
    },
    data: { lastAccessedAt: now },
  });
}
