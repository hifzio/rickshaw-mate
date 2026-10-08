export type Lang = "en" | "bn";

export interface Bilingual {
  en: string;
  bn: string;
}

export interface Landmark {
  id: string;
  name: Bilingual;
}

/** A curated, reachable Origin → Destination pair with the estimated PER-PERSON shared fare (BDT). */
export interface RouteInfo {
  originId: string;
  destinationId: string;
  fareMin: number;
  fareMax: number;
}

export type RideStatus = "waiting" | "matched" | "expired" | "cancelled";

/** Row shape of `public.ride_requests`. */
export interface RideRow {
  id: string;
  owner_id: string;
  user_name: string;
  photo_url: string | null;
  standing_note: string;
  origin_id: string;
  destination_id: string;
  status: RideStatus;
  matched_with: string | null;
  matched_at: string | null;
  is_verified: boolean;
  created_at: string;
  expires_at: string;
}

/** Row shape of `public.ride_contacts` (visible only to the two riders). */
export interface RideContact {
  ride_id: string;
  owner_phone: string;
  claimer_name: string | null;
  claimer_phone: string | null;
}

export type ClaimFailure = "not_found" | "own_ride" | "already_taken" | "unavailable";

export type ClaimResult =
  | { ok: true; ride: RideRow; owner_phone: string }
  | { ok: false; reason: ClaimFailure };

/** UI model of a waiting commuter. */
export interface RidePost {
  id: string;
  ownerId: string;
  name: string;
  verified: boolean;
  /** Exact standing spot + what the person is wearing. */
  note: string;
  originId: string;
  destinationId: string;
  photoUrl?: string;
  /** Epoch ms (server time). */
  postedAt: number;
  /** Epoch ms (server time). */
  expiresAt: number;
  isOwn: boolean;
}

/** Empty strings mean "not chosen yet". */
export interface RouteFilter {
  originId: string;
  destinationId: string;
}

export interface Profile {
  name: string;
  phone: string;
}

export interface NewPostInput extends Profile {
  note: string;
  photo?: File;
}

/** Everything the matched screen needs, for either side of the match. */
export interface MatchInfo {
  rideId: string;
  /** "claimer" accepted someone's post; "owner" is the person who was waiting. */
  role: "claimer" | "owner";
  partnerId: string | null;
  partnerName: string;
  partnerPhone: string;
  partnerPhotoUrl?: string;
  partnerVerified: boolean;
  /** The meeting spot (always the waiting person's standing note). */
  note: string;
  originId: string;
  destinationId: string;
}

/** One row of "My rides": something the user posted or joined. */
export interface HistoryItem {
  id: string;
  role: "owner" | "claimer";
  status: RideStatus;
  originId: string;
  destinationId: string;
  note: string;
  photoUrl?: string;
  createdAt: number;
  expiresAt: number;
  /** The other person, once matched. */
  partnerId: string | null;
  partnerName: string | null;
}

/** Output of the `get_public_profile` RPC. Deliberately has no phone or email. */
export interface PublicProfile {
  id: string;
  name: string | null;
  photo_url: string | null;
  member_since: string;
  shares_completed: number;
  rides_posted: number;
  verified: boolean;
}
