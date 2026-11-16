import { FiSmartphone } from "react-icons/fi";

import type { PushSettings } from "@lavieco/shared/identity";

import { TEXT } from "../constants/text";
import { PushDeviceCard } from "./push-device-card";
import { PushTopicsForm } from "./push-topics-form";

const DATE = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** `/notifications`: staff alerts by Web Push for the signed-in staff member (ADR-0027). */
export function NotificationsPage({ settings }: { settings: PushSettings }) {
  const t = TEXT.vi;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl text-deep-blue">{t.title}</h1>
        <p className="mt-1 text-[15px] text-charcoal/70">{t.lead}</p>
      </header>

      <PushDeviceCard available={settings.available} vapidPublicKey={settings.vapidPublicKey} />

      {settings.allowedTopics.length > 0 ? (
        <PushTopicsForm allowedTopics={settings.allowedTopics} topics={settings.topics} />
      ) : null}

      <section className="rounded-3xl border border-hairline bg-white p-5">
        <h2 className="font-display text-xl text-deep-blue">{t.devices.heading}</h2>
        {settings.devices.length === 0 ? (
          <p className="mt-2 text-[14px] text-charcoal/65">{t.devices.none}</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {settings.devices.map((device) => (
              <li key={device.createdAt} className="flex items-center gap-3 py-3 text-[14.5px]">
                <FiSmartphone aria-hidden="true" size={16} className="text-deep-blue/60" />
                <span className="text-deep-blue">{device.deviceLabel || t.devices.unknown}</span>
                <span className="ml-auto text-[12.5px] text-charcoal/60">
                  {t.devices.since(DATE.format(new Date(device.createdAt)))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
