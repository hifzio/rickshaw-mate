"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchHubs, fetchRoutes } from "@/lib/rides";
import { log } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { HUBS, ROUTES } from "@/mock/landmarks";
import type { Landmark, RouteInfo } from "@/types";

interface HubsValue {
  /** Hubs that have at least one curated route leaving from them. */
  origins: Landmark[];
  find: (id: string) => Landmark | undefined;
  /** Only the destinations reachable from this origin (curated in `hub_routes`). */
  destinationsFor: (originId: string) => Landmark[];
  routeFor: (originId: string, destinationId: string) => RouteInfo | undefined;
  isValidRoute: (originId: string, destinationId: string) => boolean;
}

const HubsContext = createContext<HubsValue | null>(null);

/** Renders instantly with the bundled seed, then swaps in the live `hubs` + `hub_routes` tables. */
export function HubsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState({ hubs: HUBS, routes: ROUTES });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    Promise.all([fetchHubs(), fetchRoutes()])
      .then(([hubs, routes]) => {
        if (!alive) return;
        if (hubs.length && routes.length) {
          setData({ hubs, routes });
          log.success("database", `Database connected successfully: loaded ${hubs.length} hubs and ${routes.length} routes`);
        } else {
          log.warn(
            "database",
            "Connected, but the hubs/hub_routes tables are empty. Did you run all three SQL migrations in order? Using built-in fallback data.",
          );
        }
      })
      .catch((e: { code?: string; message?: string }) => {
        log.error(
          "database",
          `Could not reach the database: ${e.message ?? "unknown error"}. Check the URL/key in .env.local and that the SQL migrations were run. Using built-in fallback data.`,
        );
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<HubsValue>(() => {
    const byId = new Map(data.hubs.map((h) => [h.id, h]));
    const originIds = new Set(data.routes.map((r) => r.originId));
    const routeFor: HubsValue["routeFor"] = (o, d) =>
      data.routes.find((r) => r.originId === o && r.destinationId === d);
    return {
      origins: data.hubs.filter((h) => originIds.has(h.id)),
      find: (id) => byId.get(id),
      destinationsFor: (o) =>
        data.routes
          .filter((r) => r.originId === o)
          .map((r) => byId.get(r.destinationId))
          .filter((h): h is Landmark => Boolean(h)),
      routeFor,
      isValidRoute: (o, d) => Boolean(routeFor(o, d)),
    };
  }, [data]);

  return <HubsContext.Provider value={value}>{children}</HubsContext.Provider>;
}

export function useHubs(): HubsValue {
  const ctx = useContext(HubsContext);
  if (!ctx) throw new Error("useHubs must be used inside <HubsProvider>");
  return ctx;
}
