"use client";

import { useState } from "react";

import type { EventType, EventView } from "@lavieco/shared/events";

import { DetailsForm } from "./details-form";
import { FormBuilder } from "./form-builder";
import { StatusPanel } from "./status-panel";
import { TicketTypesSection } from "./ticket-types-section";

/**
 * Two columns as in the "Thiết lập chương trình" reference: sections on the left,
 * status and checklist on the right. Unsaved details block status changes.
 */
export function EventEditor({
  event,
  types,
  canWrite,
}: {
  event: EventView;
  types: EventType[];
  canWrite: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {/* Forms keep their own state; submits read the latest `revision` from props. */}
        <DetailsForm event={event} types={types} canWrite={canWrite} onDirtyChange={setDirty} />
        <TicketTypesSection event={event} canWrite={canWrite} />
        <FormBuilder event={event} canWrite={canWrite} />
      </div>
      <div className="xl:sticky xl:top-8 xl:self-start">
        <StatusPanel event={event} canWrite={canWrite} dirty={dirty} />
      </div>
    </div>
  );
}
