import { compressImage } from "@/lib/compressImage";
import { kb, log, short } from "@/lib/logger";
import { getSupabase } from "@/lib/supabaseClient";
import type {
  ClaimResult,
  HistoryItem,
  Landmark,
  PublicProfile,
  RideContact,
  RidePost,
  RideRow,
  RouteInfo,
} from "@/types";

const BUCKET = "commuter-photos";

/** Server errors arrive as `error.message === '<code>'` (see the RPCs in the migration). */
export class RideError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const fail = (e: { message?: string }): never => {
  throw new RideError(e.message ?? "unknown");
};

export function mapRide(row: RideRow, uid: string | null): RidePost {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.user_name,
    verified: row.is_verified,
    note: row.standing_note,
    originId: row.origin_id,
    destinationId: row.destination_id,
    photoUrl: row.photo_url ?? undefined,
    postedAt: new Date(row.created_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
    isOwn: row.owner_id === uid,
  };
}

const uniqueName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export async function uploadPhoto(uid: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  log.info("photo", `Compressed ${kb(file.size)} → ${kb(blob.size)} (${blob.type})`);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/${uniqueName()}.${ext}`; // folder must equal auth.uid() (storage RLS)
  const sb = getSupabase();
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "86400",
    upsert: false,
  });
  if (error) {
    log.error("photo", `Upload failed: ${error.message}`);
    fail(error);
  }
  log.success("photo", `Uploaded to storage bucket "${BUCKET}"`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchHubs(): Promise<Landmark[]> {
  const { data, error } = await getSupabase()
    .from("hubs")
    .select("id,name_en,name_bn")
    .eq("is_active", true)
    .order("sort_order");
  if (error) fail(error);
  return ((data ?? []) as { id: string; name_en: string; name_bn: string }[]).map((r) => ({
    id: r.id,
    name: { en: r.name_en, bn: r.name_bn },
  }));
}

export async function fetchRoutes(): Promise<RouteInfo[]> {
  const { data, error } = await getSupabase()
    .from("hub_routes")
    .select("origin_id,destination_id,est_fare_min,est_fare_max")
    .eq("is_active", true);
  if (error) fail(error);
  return ((data ?? []) as {
    origin_id: string;
    destination_id: string;
    est_fare_min: number;
    est_fare_max: number;
  }[]).map((r) => ({
    originId: r.origin_id,
    destinationId: r.destination_id,
    fareMin: r.est_fare_min,
    fareMax: r.est_fare_max,
  }));
}

/** Active feed for a route. The DB applies `status = 'waiting' AND expires_at > now()`. */
export async function fetchWaitingRides(originId: string, destinationId: string): Promise<RideRow[]> {
  const { data, error } = await getSupabase().rpc("get_active_rides", {
    p_origin_id: originId,
    p_destination_id: destinationId,
  });
  if (error) fail(error);
  return (data ?? []) as RideRow[];
}

/** The caller's newest ride from the last hour, if any. */
export async function fetchMyLatestRide(uid: string): Promise<RideRow | null> {
  const { data, error } = await getSupabase()
    .from("ride_requests")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) fail(error);
  return ((data ?? [])[0] as RideRow | undefined) ?? null;
}

export async function fetchContact(rideId: string): Promise<RideContact | null> {
  const { data, error } = await getSupabase()
    .from("ride_contacts")
    .select("*")
    .eq("ride_id", rideId)
    .maybeSingle();
  if (error) fail(error);
  return (data as RideContact | null) ?? null;
}

/** Everything the user posted or joined, newest first (RLS lets people read their own rides at any age). */
export async function fetchMyHistory(uid: string): Promise<HistoryItem[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ride_requests")
    .select("*")
    .or(`owner_id.eq.${uid},matched_with.eq.${uid}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) fail(error);
  const rows = (data ?? []) as RideRow[];

  // Names of the people who joined my posts live in ride_contacts (visible to both riders).
  const ownedMatched = rows.filter((r) => r.owner_id === uid && r.status === "matched").map((r) => r.id);
  const claimers = new Map<string, string | null>();
  if (ownedMatched.length) {
    const { data: contacts } = await sb
      .from("ride_contacts")
      .select("ride_id,claimer_name")
      .in("ride_id", ownedMatched);
    for (const c of (contacts ?? []) as Pick<RideContact, "ride_id" | "claimer_name">[]) {
      claimers.set(c.ride_id, c.claimer_name);
    }
  }

  return rows.map((r): HistoryItem => {
    const mine = r.owner_id === uid;
    return {
      id: r.id,
      role: mine ? "owner" : "claimer",
      status: r.status,
      originId: r.origin_id,
      destinationId: r.destination_id,
      note: r.standing_note,
      photoUrl: r.photo_url ?? undefined,
      createdAt: new Date(r.created_at).getTime(),
      expiresAt: new Date(r.expires_at).getTime(),
      partnerId: mine ? r.matched_with : r.owner_id,
      partnerName: mine ? (claimers.get(r.id) ?? null) : r.user_name,
    };
  });
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await getSupabase().rpc("get_public_profile", { p_user_id: userId });
  if (error) fail(error);
  return (data as PublicProfile | null) ?? null;
}

export async function createRide(args: {
  name: string;
  phone: string;
  note: string;
  originId: string;
  destinationId: string;
  photoUrl?: string;
}): Promise<RideRow> {
  const { data, error } = await getSupabase().rpc("create_ride", {
    p_user_name: args.name,
    p_user_phone: args.phone,
    p_standing_note: args.note,
    p_origin_id: args.originId,
    p_destination_id: args.destinationId,
    p_photo_url: args.photoUrl ?? null,
  });
  if (error) {
    log.error("post", `Post rejected by the database: ${error.message}`);
    fail(error);
  }
  log.success("post", `Ride posted (id ${short((data as RideRow).id)}), it expires in 15 minutes`);
  return data as RideRow;
}

export async function claimRide(rideId: string, name: string, phone: string): Promise<ClaimResult> {
  const { data, error } = await getSupabase().rpc("claim_ride", {
    p_ride_id: rideId,
    p_claimer_name: name,
    p_claimer_phone: phone,
  });
  if (error) {
    log.error("claim", `Claim failed: ${error.message}`);
    fail(error);
  }
  const result = data as ClaimResult;
  if (result.ok) log.success("claim", `Matched! You claimed ride ${short(rideId)}`);
  else log.warn("claim", `Could not claim ride ${short(rideId)}: ${result.reason}`);
  return result;
}

export async function cancelRide(rideId: string): Promise<void> {
  const { error } = await getSupabase().rpc("cancel_ride", { p_ride_id: rideId });
  if (error) fail(error);
  log.info("post", `Ride ${short(rideId)} removed by you`);
}

/** Milliseconds to add to Date.now() to get server time. */
export async function fetchServerOffset(): Promise<number> {
  const t0 = Date.now();
  const { data, error } = await getSupabase().rpc("server_time");
  if (error || !data) {
    log.warn("clock", "Could not read server time, using the phone clock");
    return 0;
  }
  const t1 = Date.now();
  const offset = new Date(data as string).getTime() - (t0 + t1) / 2;
  log.info("clock", `Phone clock is ${Math.round(offset / 1000)}s off from the server, corrected`);
  return offset;
}
