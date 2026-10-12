import type { VoteType } from "@/features/poll/constants";

export type CalendarFeedOption = {
  id: string;
  startTime: Date;
  /** Minutes; 0 marks an all-day option stored as UTC midnight. */
  duration: number;
  /** The user's strongest vote across their responses: yes beats ifNeedBe. */
  vote: Exclude<VoteType, "no">;
};

export type CalendarFeedScheduledEvent = {
  uid: string;
  sequence: number;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  timeZone: string | null;
};

export type CalendarFeedPoll = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  timeZone: string | null;
  status: "open" | "closed" | "scheduled" | "canceled";
  options: CalendarFeedOption[];
  /** Present only while the poll's event is live (not canceled or deleted). */
  scheduledEvent: CalendarFeedScheduledEvent | null;
};
