import "server-only";

import { cache } from "react";
import { loadUser } from "@/features/user/loaders";
import { getCalendarFeedForUser } from "./data";

export const loadCalendarFeed = cache(async () => {
  const user = await loadUser();
  return getCalendarFeedForUser(user.id);
});
