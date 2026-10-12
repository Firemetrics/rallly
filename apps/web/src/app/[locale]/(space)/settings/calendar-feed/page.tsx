import { absoluteUrl } from "@rallly/utils/absolute-url";
import type { Metadata } from "next";
import { Suspense } from "react";
import type { Params } from "@/app/[locale]/types";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionHeader,
  PageSectionTitle,
} from "@/components/page-layout";
import {
  SettingsPage,
  SettingsPageContent,
  SettingsPageDescription,
  SettingsPageHeader,
  SettingsPageTitle,
} from "@/components/settings-layout";
import { CalendarFeedSettings } from "@/features/calendar-feed/components/calendar-feed-settings";
import { loadCalendarFeed } from "@/features/calendar-feed/loaders";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";

async function CalendarFeedSection() {
  const feed = await loadCalendarFeed();

  return (
    <CalendarFeedSettings
      feedUrl={feed ? absoluteUrl(`/api/calendar/${feed.token}.ics`) : null}
      lastAccessedAt={feed?.lastAccessedAt ?? null}
    />
  );
}

export default function Page() {
  return (
    <SettingsPage>
      <SettingsPageHeader>
        <SettingsPageTitle>
          <Trans i18nKey="calendarFeed" defaults="Calendar feed" />
        </SettingsPageTitle>
        <SettingsPageDescription>
          <Trans
            i18nKey="calendarFeedDescription"
            defaults="Subscribe to the polls you respond to from your own calendar app"
          />
        </SettingsPageDescription>
      </SettingsPageHeader>
      <SettingsPageContent>
        <PageSection variant="card">
          <PageSectionHeader>
            <PageSectionTitle>
              <Trans
                i18nKey="calendarFeedSubscribe"
                defaults="Subscription URL"
              />
            </PageSectionTitle>
            <PageSectionDescription>
              <Trans
                i18nKey="calendarFeedSubscribeDescription"
                defaults="Every option you vote yes or if need be on appears as a tentative event. Once a poll is scheduled only the final time remains, and canceled polls disappear. Anyone with the URL can see these events, so keep it private."
              />
            </PageSectionDescription>
          </PageSectionHeader>
          <PageSectionContent>
            <Suspense fallback={null}>
              <CalendarFeedSection />
            </Suspense>
          </PageSectionContent>
        </PageSection>
      </SettingsPageContent>
    </SettingsPage>
  );
}

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const params = await props.params;
  const { t } = await getTranslation(params.locale);
  return {
    title: t("calendarFeed", { defaultValue: "Calendar feed" }),
  };
}
