import type { Landmark, RouteInfo } from "@/types";

/**
 * Offline / first-paint fallback only. The live data comes from the `hubs` and `hub_routes`
 * tables (see HubsProvider) and mirrors supabase/migrations/20261008020000_corridor_v2.sql.
 */
const hub = (id: string, en: string, bn: string): Landmark => ({ id, name: { en, bn } });

export const HUBS: Landmark[] = [
  hub("rampura-bridge", "Rampura Bridge", "রামপুরা ব্রিজ"),
  hub("aftab-nagar-gate", "Aftab Nagar Main Gate", "আফতাব নগর মেইন গেট"),
  hub("banasree-gate", "Banasree Main Gate (Block B)", "বনশ্রী মেইন গেট (ব্লক বি)"),
  hub("meradia-bazar", "Meradia Bazar Mor", "মেরাদিয়া বাজার মোড়"),
  hub("ewu-gate", "East West University Gate", "ইস্ট ওয়েস্ট ইউনিভার্সিটি গেট"),
  hub("gulshan-1", "Gulshan-1 Circle", "গুলশান-১ সার্কেল"),
  hub("badda-link-road", "Badda Link Road", "বাড্ডা লিংক রোড"),
  hub("merul-badda", "Merul Badda", "মেরুল বাড্ডা"),
  hub("mohakhali-wireless", "Mohakhali Wireless", "মহাখালী ওয়্যারলেস"),
  hub("tejgaon-link-road", "Tejgaon Link Road", "তেজগাঁও লিংক রোড"),
  hub("malibagh-railgate", "Malibagh Railgate", "মালিবাগ রেলগেট"),
];

const r = (originId: string, destinationId: string, fareMin: number, fareMax: number): RouteInfo => ({
  originId,
  destinationId,
  fareMin,
  fareMax,
});

/** Per-person fare estimates in BDT (placeholders). */
export const ROUTES: RouteInfo[] = [
  r("rampura-bridge", "gulshan-1", 40, 60),
  r("rampura-bridge", "badda-link-road", 20, 35),
  r("rampura-bridge", "mohakhali-wireless", 30, 50),
  r("rampura-bridge", "tejgaon-link-road", 30, 45),
  r("aftab-nagar-gate", "rampura-bridge", 15, 25),
  r("aftab-nagar-gate", "merul-badda", 15, 25),
  r("aftab-nagar-gate", "gulshan-1", 25, 40),
  r("banasree-gate", "rampura-bridge", 15, 25),
  r("banasree-gate", "malibagh-railgate", 20, 35),
  r("banasree-gate", "merul-badda", 20, 30),
  r("meradia-bazar", "banasree-gate", 10, 20),
  r("meradia-bazar", "rampura-bridge", 20, 30),
  r("meradia-bazar", "aftab-nagar-gate", 20, 30),
  r("ewu-gate", "rampura-bridge", 10, 20),
  r("ewu-gate", "meradia-bazar", 15, 25),
  r("ewu-gate", "aftab-nagar-gate", 10, 20),
];

/** Nothing selected: the destination stays locked until a pickup point is chosen. */
export const EMPTY_ROUTE = { originId: "", destinationId: "" };
