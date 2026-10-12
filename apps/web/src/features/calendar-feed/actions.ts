"use server";

import { refresh } from "next/cache";
import { track } from "@/lib/posthog";
import { authActionClient } from "@/lib/safe-action/server";
import {
  disableCalendarFeed,
  enableCalendarFeed,
  rotateCalendarFeedToken,
} from "./mutations";

export const enableCalendarFeedAction = authActionClient
  .metadata({ actionName: "enable_calendar_feed" })
  .action(async ({ ctx }) => {
    await enableCalendarFeed({ userId: ctx.user.id });
    track(ctx.user, { event: "calendar_feed:feed_enable" });
    refresh();
  });

export const rotateCalendarFeedTokenAction = authActionClient
  .metadata({ actionName: "rotate_calendar_feed_token" })
  .action(async ({ ctx }) => {
    await rotateCalendarFeedToken({ userId: ctx.user.id });
    track(ctx.user, { event: "calendar_feed:token_rotate" });
    refresh();
  });

export const disableCalendarFeedAction = authActionClient
  .metadata({ actionName: "disable_calendar_feed" })
  .action(async ({ ctx }) => {
    await disableCalendarFeed({ userId: ctx.user.id });
    track(ctx.user, { event: "calendar_feed:feed_disable" });
    refresh();
  });
