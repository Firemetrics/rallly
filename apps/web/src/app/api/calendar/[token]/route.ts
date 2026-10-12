import { absoluteUrl } from "@rallly/utils/absolute-url";
import { after, NextResponse } from "next/server";
import {
  getCalendarFeedByToken,
  getCalendarFeedPolls,
} from "@/features/calendar-feed/data";
import { touchCalendarFeed } from "@/features/calendar-feed/mutations";
import { toCalendarFeedEvents } from "@/features/calendar-feed/utils";
import { createRatelimit } from "@/lib/rate-limit";
import { createIcsCalendar } from "@/lib/utils/ics";

type Context = { params: Promise<{ token: string }> };

// Calendar clients refresh a subscription every few minutes to hours; the
// budget is per feed so one chatty client cannot starve another.
const ratelimit = createRatelimit(120, "1 h");

/**
 * A user's personal iCalendar subscription feed. Calendar clients fetch it
 * with no session, so the token in the path is the only credential; it is
 * rotated or deleted from the settings page to revoke access. The `.ics`
 * suffix is optional and only there because some clients sniff the URL.
 */
export async function GET(_request: Request, { params }: Context) {
  const token = (await params).token.replace(/\.ics$/i, "");

  if (ratelimit) {
    const { success } = await ratelimit.limit(`api:calendar-feed:${token}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const feed = await getCalendarFeedByToken(token);

  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const now = new Date();
  const polls = await getCalendarFeedPolls(feed.userId, { now });

  const { error, value } = createIcsCalendar({
    name: "Rallly",
    events: toCalendarFeedEvents(polls, {
      pollUrl: (pollId) => absoluteUrl(`/invite/${pollId}`),
    }),
  });

  if (error || !value) {
    return NextResponse.json(
      { error: "Failed to generate calendar feed" },
      { status: 500 },
    );
  }

  after(() => touchCalendarFeed({ id: feed.id, now }));

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="rallly.ics"`,
      // The feed is personal and changes with every vote.
      "Cache-Control": "private, no-store",
    },
  });
}
