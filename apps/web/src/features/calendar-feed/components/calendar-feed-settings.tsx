"use client";

import { mutationOptions } from "@next-safe-action/adapter-tanstack-query";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialog,
} from "@rallly/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarSyncIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import React from "react";
import { useCopyToClipboard } from "react-use";
import { Trans, useTranslation } from "@/i18n/client";
import { RelativeTime } from "@/lib/datetime/relative-time";
import {
  disableCalendarFeedAction,
  enableCalendarFeedAction,
  rotateCalendarFeedTokenAction,
} from "../actions";

function FeedUrlRow({ feedUrl }: { feedUrl: string }) {
  const { t } = useTranslation();
  const [didCopy, setDidCopy] = React.useState(false);
  const [state, copyToClipboard] = useCopyToClipboard();

  React.useEffect(() => {
    if (state.error) {
      console.error(`Unable to copy value: ${state.error.message}`);
      return;
    }
    if (state.value) {
      setDidCopy(true);
    }
  }, [state]);

  React.useEffect(() => {
    if (!didCopy) return;
    const timer = setTimeout(() => setDidCopy(false), 1500);
    return () => clearTimeout(timer);
  }, [didCopy]);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-card-border bg-card text-muted-foreground"
      >
        <CalendarSyncIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">
          <Trans i18nKey="calendarFeedUrl" defaults="Feed URL" />
        </p>
        <p className="truncate text-muted-foreground text-xs">{feedUrl}</p>
      </div>
      <Button
        variant="ghost"
        className="shrink-0 text-primary"
        onClick={() => copyToClipboard(feedUrl)}
      >
        {didCopy ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <CopyIcon data-icon="inline-start" />
        )}
        {didCopy ? (
          <Trans i18nKey="copied" defaults="Copied" />
        ) : (
          <Trans i18nKey="copy" defaults="Copy" />
        )}
      </Button>
      <p className="sr-only" aria-live="polite">
        {didCopy
          ? t("calendarFeedUrlCopied", { defaultValue: "Feed URL copied" })
          : ""}
      </p>
    </div>
  );
}

export function CalendarFeedSettings({
  feedUrl,
  lastAccessedAt,
}: {
  feedUrl: string | null;
  lastAccessedAt: Date | null;
}) {
  const rotateDialog = useDialog();
  const disableDialog = useDialog();
  const enable = useMutation(mutationOptions(enableCalendarFeedAction));
  const rotate = useMutation(
    mutationOptions(rotateCalendarFeedTokenAction, {
      onSettled: () => rotateDialog.dismiss(),
    }),
  );
  const disable = useMutation(
    mutationOptions(disableCalendarFeedAction, {
      onSettled: () => disableDialog.dismiss(),
    }),
  );

  if (!feedUrl) {
    return (
      <Button loading={enable.isPending} onClick={() => enable.mutate()}>
        <CalendarSyncIcon data-icon="inline-start" />
        <Trans i18nKey="calendarFeedEnable" defaults="Create feed" />
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <FeedUrlRow feedUrl={feedUrl} />
      <p className="text-muted-foreground text-sm">
        {lastAccessedAt ? (
          <Trans
            i18nKey="calendarFeedLastAccessed"
            defaults="Last fetched by a calendar app <time />"
            components={{ time: <RelativeTime value={lastAccessedAt} /> }}
          />
        ) : (
          <Trans
            i18nKey="calendarFeedNeverAccessed"
            defaults="No calendar app has fetched this feed yet."
          />
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => rotateDialog.trigger()}>
          <RefreshCwIcon data-icon="inline-start" />
          <Trans i18nKey="calendarFeedRotate" defaults="Reset URL" />
        </Button>
        <Button variant="destructive" onClick={() => disableDialog.trigger()}>
          <TrashIcon data-icon="inline-start" />
          <Trans i18nKey="calendarFeedDisable" defaults="Delete feed" />
        </Button>
      </div>

      <Dialog {...rotateDialog.dialogProps}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="calendarFeedRotate" defaults="Reset URL" />
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="calendarFeedRotateConfirmation"
                defaults="The current URL stops working immediately. Calendars subscribed to it need the new URL."
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="primary"
              loading={rotate.isPending}
              onClick={() => rotate.mutate()}
            >
              <Trans i18nKey="calendarFeedRotate" defaults="Reset URL" />
            </Button>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" defaults="Cancel" />
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog {...disableDialog.dialogProps}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="calendarFeedDisable" defaults="Delete feed" />
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="calendarFeedDisableConfirmation"
                defaults="The feed URL stops working immediately and subscribed calendars stop updating."
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              loading={disable.isPending}
              onClick={() => disable.mutate()}
            >
              <Trans i18nKey="calendarFeedDisable" defaults="Delete feed" />
            </Button>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" defaults="Cancel" />
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
