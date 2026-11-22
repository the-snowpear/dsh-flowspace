import { useNow } from "../hooks/useNow.ts";
import { t } from "../i18n.ts";

export function FlowCountdown({ deadline }: { deadline: number }) {
  const now = useNow(1000);
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const time = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  return <small className="fs-human-countdown">{t("flow_view_remaining", { time })}</small>;
}
