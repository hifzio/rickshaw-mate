"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, WifiOff } from "lucide-react";
import { Feed } from "@/components/Feed";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { HistorySheet } from "@/components/HistorySheet";
import { LivePostBanner } from "@/components/LivePostBanner";
import { SignInSheet } from "@/components/SignInSheet";
import { UserProfileSheet } from "@/components/UserProfileSheet";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import { MatchedScreen } from "@/components/MatchedScreen";
import { PostRideSheet } from "@/components/PostRideSheet";
import { ProfileSheet } from "@/components/ProfileSheet";
import { RoutePrompt } from "@/components/RoutePrompt";
import { SetupNotice } from "@/components/SetupNotice";
import { Toast } from "@/components/Toast";
import { markDismissed, useMyMatch } from "@/hooks/useMyMatch";
import { useMyRides } from "@/hooks/useMyRides";
import { useProfile } from "@/hooks/useProfile";
import { useRides } from "@/hooks/useRides";
import { useServerClock } from "@/hooks/useServerClock";
import { cancelRide, claimRide, createRide, mapRide, RideError, uploadPhoto } from "@/lib/rides";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { EMPTY_ROUTE } from "@/mock/landmarks";
import type { HistoryItem, MatchInfo, NewPostInput, Profile, RidePost, RouteFilter } from "@/types";

export function RickshawApp() {
  return isSupabaseConfigured ? <LiveApp /> : <SetupNotice />;
}

const ROUTE_KEY = "rs:route";

const ERROR_KEYS: Record<string, string> = {
  invalid_phone: "errPhone",
  invalid_name: "errName",
  invalid_route: "errRoute",
  already_waiting: "errAlreadyWaiting",
  photo_required: "errPhotoRequired",
  not_authenticated: "errSignIn",
  sign_in_required: "errSignIn",
};

type PendingAuth = { type: "post" } | { type: "claim"; post: RidePost } | { type: "none" };

function LiveApp() {
  const { t } = useLang();
  const { uid, displayName } = useAuth();
  const now = useServerClock();
  const { profile, setProfile } = useProfile();

  const [route, setRoute] = useState<RouteFilter>(EMPTY_ROUTE);
  const { isValidRoute } = useHubs();
  const routeReady = isValidRoute(route.originId, route.destinationId);

  // Restore the last route used on this device (saves two taps at the junction).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ROUTE_KEY) ?? "null") as RouteFilter | null;
      if (saved && isValidRoute(saved.originId, saved.destinationId)) setRoute(saved);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the live route table no longer allows the selection, clear the destination.
  useEffect(() => {
    if (route.destinationId && !isValidRoute(route.originId, route.destinationId)) {
      setRoute((r) => ({ ...r, destinationId: "" }));
    }
  }, [route, isValidRoute]);

  useEffect(() => {
    if (!routeReady) return;
    try {
      localStorage.setItem(ROUTE_KEY, JSON.stringify(route));
    } catch {
      /* storage unavailable */
    }
  }, [route, routeReady]);
  const { rides, loading, error: feedError, addRide, removeRide } = useRides(route, routeReady);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileView, setProfileView] = useState<{ id: string; name: string; photoUrl?: string } | null>(null);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const [pendingClaim, setPendingClaim] = useState<RidePost | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2800);
  }, []);

  const errorText = useCallback(
    (e: unknown) => t(e instanceof RideError ? (ERROR_KEYS[e.code] ?? "errGeneric") : "errGeneric"),
    [t],
  );

  // The person who was waiting learns about the match here (via Realtime).
  const { items: myRides, loading: historyLoading, refresh: refreshMyRides } = useMyRides(uid);
  useMyMatch(
    uid,
    (info) => setMatch((cur) => cur ?? info),
    () => void refreshMyRides(),
  );

  // One live post at a time: if I have one (on any route), posting again is blocked.
  const myLive = useMemo(
    () =>
      now === null
        ? null
        : (myRides.find((r) => r.role === "owner" && r.status === "waiting" && r.expiresAt > now) ?? null),
    [myRides, now],
  );

  // Hide anything past its expiry even before the server-side sweeper flips the status.
  const posts = useMemo(
    () =>
      now === null
        ? []
        : rides.filter((r) => new Date(r.expires_at).getTime() > now).map((r) => mapRide(r, uid)),
    [rides, now, uid],
  );

  // Browsing is public; posting / claiming needs an account. Remember what the user was
  // doing so we can continue right after sign-in (email code flow; Google reloads the page).
  const requireSignIn = useCallback((intent: PendingAuth) => {
    setPendingAuth(intent);
    setSignInOpen(true);
  }, []);
  const closeSignIn = useCallback(() => {
    setSignInOpen(false);
    setPendingAuth(null);
  }, []);

  const openSheet = useCallback(() => {
    if (!uid) requireSignIn({ type: "post" });
    else if (myLive) showToast(t("errAlreadyWaiting"));
    else setSheetOpen(true);
  }, [uid, myLive, requireSignIn, showToast, t]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleSubmit = useCallback(
    async (input: NewPostInput): Promise<boolean> => {
      if (!uid) return false;
      if (!input.photo) {
        showToast(t("errPhotoRequired"));
        return false;
      }
      try {
        let photoUrl: string;
        try {
          photoUrl = await uploadPhoto(uid, input.photo);
        } catch {
          showToast(t("errUpload")); // a post without its photo is useless, so don't create it
          return false;
        }
        const row = await createRide({
          name: input.name,
          phone: input.phone,
          note: input.note,
          originId: route.originId,
          destinationId: route.destinationId,
          photoUrl,
        });
        setProfile({ name: input.name, phone: input.phone });
        addRide(row);
        void refreshMyRides();
        setSheetOpen(false);
        showToast(t("postedToast"));
        return true;
      } catch (e) {
        showToast(errorText(e));
        return false;
      }
    },
    [uid, route, addRide, refreshMyRides, setProfile, showToast, t, errorText],
  );

  const claim = useCallback(
    async (post: RidePost, who: Profile) => {
      setBusyId(post.id);
      try {
        const res = await claimRide(post.id, who.name, who.phone);
        if (res.ok) {
          removeRide(post.id);
          void refreshMyRides();
          setMatch({
            rideId: res.ride.id,
            role: "claimer",
            partnerId: res.ride.owner_id,
            partnerName: res.ride.user_name,
            partnerPhone: res.owner_phone,
            partnerPhotoUrl: res.ride.photo_url ?? undefined,
            partnerVerified: res.ride.is_verified,
            note: res.ride.standing_note,
            originId: res.ride.origin_id,
            destinationId: res.ride.destination_id,
          });
        } else {
          // Lost the race (or it expired): drop the stale card and say why.
          removeRide(post.id);
          showToast(
            t(
              res.reason === "already_taken"
                ? "errTaken"
                : res.reason === "own_ride"
                  ? "errOwn"
                  : "errUnavailable",
            ),
          );
        }
      } catch (e) {
        showToast(errorText(e));
      } finally {
        setBusyId(null);
      }
    },
    [removeRide, refreshMyRides, showToast, t, errorText],
  );

  const handleShare = useCallback(
    (post: RidePost) => {
      if (busyId) return;
      if (!uid) {
        requireSignIn({ type: "claim", post });
        return;
      }
      if (profile) void claim(post, profile);
      else setPendingClaim(post);
    },
    [busyId, uid, profile, claim, requireSignIn],
  );

  const handleProfileSaved = useCallback(
    (p: Profile) => {
      const post = pendingClaim;
      setProfile(p);
      setPendingClaim(null);
      if (post) void claim(post, p);
    },
    [pendingClaim, setProfile, claim],
  );

  const handleRemove = useCallback(
    async (post: { id: string }) => {
      setBusyId(post.id);
      try {
        await cancelRide(post.id);
        removeRide(post.id);
        void refreshMyRides();
        showToast(t("removedToast"));
      } catch (e) {
        showToast(errorText(e));
      } finally {
        setBusyId(null);
      }
    },
    [removeRide, refreshMyRides, showToast, t, errorText],
  );

  const handleRemoveItem = useCallback(
    (item: HistoryItem) => {
      void handleRemove(item);
    },
    [handleRemove],
  );

  const viewPostProfile = useCallback(
    (post: RidePost) => setProfileView({ id: post.ownerId, name: post.name, photoUrl: post.photoUrl }),
    [],
  );

  const handleDismiss = useCallback(() => {
    if (match) markDismissed(match.rideId);
    setMatch(null);
    void refreshMyRides();
    showToast(t("dismissedToast"));
  }, [match, refreshMyRides, showToast, t]);

  // Continue the interrupted action as soon as the account is ready.
  useEffect(() => {
    if (!uid || !pendingAuth) return;
    setSignInOpen(false);
    setPendingAuth(null);
    showToast(t("signedInToast"));
    if (pendingAuth.type === "post") setSheetOpen(true);
    else if (pendingAuth.type === "claim") handleShare(pendingAuth.post);
  }, [uid, pendingAuth, handleShare, showToast, t]);

  const ready = now !== null && !loading;
  const showFeed = routeReady && ready;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-zinc-950 shadow-2xl shadow-black">
      <Header
        route={route}
        onRouteChange={setRoute}
        onSignIn={() => requireSignIn({ type: "none" })}
        onHistory={() => {
          void refreshMyRides();
          setHistoryOpen(true);
        }}
      />

      {myLive && now !== null && (
        <LivePostBanner item={myLive} now={now} busy={busyId === myLive.id} onRemove={handleRemoveItem} />
      )}

      {feedError && (
        <p
          role="alert"
          className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-400/25"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          {t("errFeed")}
        </p>
      )}

      {!routeReady ? (
        <RoutePrompt hasOrigin={Boolean(route.originId)} />
      ) : !ready ? (
        <FeedSkeleton />
      ) : (
        <Feed
          posts={posts}
          now={now}
          busyId={busyId}
          onShare={handleShare}
          onRemove={handleRemove}
          onViewProfile={viewPostProfile}
          onPost={openSheet}
        />
      )}

      {/* Floating "I'm Waiting Here" — only when the feed has cards (empty state has its own CTA). */}
      {showFeed && posts.length > 0 && !myLive && !sheetOpen && !signInOpen && !match && !pendingClaim && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
          <button
            type="button"
            onClick={openSheet}
            className="pointer-events-auto flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-lg font-extrabold text-white shadow-xl shadow-indigo-900/50 ring-1 ring-indigo-300/30 transition active:scale-[0.98] active:bg-indigo-500"
          >
            <Plus className="h-6 w-6" strokeWidth={3} aria-hidden />
            {t("imWaiting")}
          </button>
        </div>
      )}

      {sheetOpen && (
        <PostRideSheet
          route={route}
          initialProfile={profile ?? (displayName ? { name: displayName, phone: "" } : null)}
          onClose={closeSheet}
          onSubmit={handleSubmit}
        />
      )}
      {pendingClaim && (
        <ProfileSheet
          initialName={displayName}
          onClose={() => setPendingClaim(null)}
          onSave={handleProfileSaved}
        />
      )}
      {signInOpen && <SignInSheet onClose={closeSignIn} />}
      {historyOpen && (
        <HistorySheet
          items={myRides}
          loading={historyLoading}
          now={now ?? 0}
          onClose={() => setHistoryOpen(false)}
          onViewProfile={(id, name) => setProfileView({ id, name })}
        />
      )}
      {match && (
        <MatchedScreen
          match={match}
          onDismiss={handleDismiss}
          onViewProfile={(id, name, photoUrl) => setProfileView({ id, name, photoUrl })}
        />
      )}
      {profileView && (
        <UserProfileSheet
          userId={profileView.id}
          fallbackName={profileView.name}
          fallbackPhotoUrl={profileView.photoUrl}
          onClose={() => setProfileView(null)}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3.5 px-4 pt-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-56 animate-pulse rounded-3xl bg-zinc-900" />
      ))}
    </div>
  );
}
