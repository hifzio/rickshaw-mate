"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { useHubs } from "@/components/HubsProvider";
import type { Landmark, RouteFilter } from "@/types";

interface SelectProps {
  id: string;
  label: string;
  value: string;
  options: Landmark[];
  placeholder: string;
  dot: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}

function LandmarkSelect({ id, label, value, options, placeholder, dot, disabled, onChange }: SelectProps) {
  const { lang } = useLang();
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        {label}
        {disabled && <Lock className="h-3 w-3" aria-hidden />}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`h-14 w-full appearance-none rounded-2xl border border-line/10 pb-1 pl-4 pr-11 pt-5 text-base font-semibold outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40 disabled:cursor-not-allowed disabled:border-line/5 disabled:bg-zinc-900/50 disabled:text-slate-500 ${
          value ? "bg-zinc-900 text-fg" : "bg-zinc-900 text-slate-400"
        }`}
      >
        <option value="" disabled className="bg-zinc-900 text-slate-400">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-zinc-900 text-fg">
            {o.name[lang]}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
          disabled ? "text-slate-600" : "text-indigo-300"
        }`}
        aria-hidden
      />
    </div>
  );
}

interface RouteSelectorProps {
  route: RouteFilter;
  onChange: (route: RouteFilter) => void;
}

export function RouteSelector({ route, onChange }: RouteSelectorProps) {
  const { t } = useLang();
  const { origins, destinationsFor } = useHubs();
  const locked = !route.originId;
  const destinations = destinationsFor(route.originId);

  // "To" is strictly dependent on "From": locked until a pickup point is chosen, and it
  // only lists destinations reachable from it. Changing origin keeps the destination only
  // if it is still reachable, otherwise it resets so the user must pick a valid one.
  const changeOrigin = (originId: string) => {
    const keep = destinationsFor(originId).some((d) => d.id === route.destinationId);
    onChange({ originId, destinationId: keep ? route.destinationId : "" });
  };

  return (
    <div className="grid grid-cols-1 gap-2 px-4 pb-3">
      <LandmarkSelect
        id="route-origin"
        label={t("from")}
        value={route.originId}
        options={origins}
        placeholder={t("selectPickup")}
        dot="bg-emerald-400"
        onChange={changeOrigin}
      />
      <LandmarkSelect
        id="route-destination"
        label={t("to")}
        value={route.destinationId}
        options={destinations}
        placeholder={locked ? t("selectPickupFirst") : t("selectDestination")}
        dot="bg-indigo-400"
        disabled={locked}
        onChange={(destinationId) => onChange({ ...route, destinationId })}
      />
    </div>
  );
}
