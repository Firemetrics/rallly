import { createIcsCalendar } from "@/lib/utils/ics";
import type { CalendarFeedPoll } from "./types";
import { generateCalendarFeedToken, toCalendarFeedEvents } from "./utils";

const pollUrl = (pollId: string) => `https://rallly.test/invite/${pollId}`;

const basePoll: CalendarFeedPoll = {
  id: "poll1",
  title: "Team offsite",
  description: null,
  location: "Room 1",
  timeZone: "Europe/Berlin",
  status: "open",
  options: [
    {
      id: "opt1",
      startTime: new Date("2026-11-02T09:00:00Z"),
      duration: 60,
      vote: "yes",
    },
    {
      id: "opt2",
      startTime: new Date("2026-11-03T09:00:00Z"),
      duration: 60,
      vote: "ifNeedBe",
    },
  ],
  scheduledEvent: null,
};

const toIcs = (polls: CalendarFeedPoll[]) => {
  const { error, value } = createIcsCalendar({
    name: "Rallly",
    events: toCalendarFeedEvents(polls, { pollUrl }),
  });
  expect(error).toBeFalsy();
  return value ?? "";
};

describe("toCalendarFeedEvents", () => {
  it("lists every voted option of an open poll as a tentative busy event", () => {
    const events = toCalendarFeedEvents([basePoll], { pollUrl });

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.uid)).toEqual([
      "opt1.option@rallly",
      "opt2.option@rallly",
    ]);
    for (const event of events) {
      expect(event.status).toBe("TENTATIVE");
      expect(event.transp).toBe("OPAQUE");
      expect(event.description).toContain(pollUrl("poll1"));
    }
    expect(events[0]?.title).toBe("Team offsite (tentative)");
    expect(events[1]?.title).toBe("Team offsite (if need be)");
    expect(events[0]?.end).toEqual(new Date("2026-11-02T10:00:00Z"));
  });

  it("treats a closed but unscheduled poll as still tentative", () => {
    const events = toCalendarFeedEvents([{ ...basePoll, status: "closed" }], {
      pollUrl,
    });
    expect(events).toHaveLength(2);
  });

  it("keeps only the final event once the poll is scheduled", () => {
    const events = toCalendarFeedEvents(
      [
        {
          ...basePoll,
          status: "scheduled",
          scheduledEvent: {
            uid: "event-uid",
            sequence: 2,
            title: "Team offsite",
            description: "Agenda",
            location: "Room 2",
            start: new Date("2026-11-02T09:00:00Z"),
            end: new Date("2026-11-02T10:00:00Z"),
            allDay: false,
            timeZone: "Europe/Berlin",
          },
        },
      ],
      { pollUrl },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      uid: "poll1.poll@rallly",
      sequence: 2,
      status: "CONFIRMED",
      transp: "OPAQUE",
      location: "Room 2",
    });
  });

  it("drops scheduled polls whose event is gone and canceled polls", () => {
    expect(
      toCalendarFeedEvents(
        [
          { ...basePoll, status: "scheduled", scheduledEvent: null },
          { ...basePoll, id: "poll2", status: "canceled" },
        ],
        { pollUrl },
      ),
    ).toEqual([]);
  });

  it("emits all-day options as date-only events spanning one day", () => {
    const ics = toIcs([
      {
        ...basePoll,
        timeZone: null,
        options: [
          {
            id: "opt3",
            startTime: new Date("2026-11-05T00:00:00Z"),
            duration: 0,
            vote: "yes",
          },
        ],
      },
    ]);

    expect(ics).toContain("DTSTART;VALUE=DATE:20261105");
    expect(ics).toContain("DTEND;VALUE=DATE:20261106");
  });

  it("renders a subscribable calendar with UTC times for zoned polls", () => {
    const ics = toIcs([basePoll]);

    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("X-WR-CALNAME:Rallly");
    expect(ics).toContain("UID:opt1.option@rallly");
    expect(ics).toContain("DTSTART:20261102T090000Z");
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics).toContain("TRANSP:OPAQUE");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("renders an empty calendar when there is nothing to show", () => {
    const ics = toIcs([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("generateCalendarFeedToken", () => {
  it("mints 32 url safe characters", () => {
    expect(generateCalendarFeedToken()).toMatch(/^[0-9A-Za-z]{32}$/);
  });
});
