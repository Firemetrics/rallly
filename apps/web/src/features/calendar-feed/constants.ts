/**
 * How far back the feed reaches. Calendar clients drop events that vanish
 * from a subscription, so a short tail keeps recent history visible without
 * the feed growing with every poll the user ever answered.
 */
export const CALENDAR_FEED_LOOKBACK_DAYS = 30;

/** Upper bound on polls per feed request; a feed is not an archive. */
export const CALENDAR_FEED_MAX_POLLS = 500;
