"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { Feed } from "@/components/Feed";
import { Header } from "@/components/Header";
import { HomeScreen } from "@/components/HomeScreen";
import { useAuth } from "@/components/AuthProvider";
import { RidesScreen } from "@/components/RidesScreen";
import { LivePostBanner } from "@/components/LivePostBanner";
import { SignInSheet } from "@/components/SignInSheet";
import { UserProfileSheet } from "@/components/UserProfileSheet";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import { MatchedScreen } from "@/components/MatchedScreen";
import { PostRideSheet } from "@/components/PostRideSheet";
import { ProfileSheet } from "@/components/ProfileSheet";
import { PullToRefresh } from "@/components/PullToRefresh";
import { RouteBar } from "@/components/RouteBar";
import { SetupNotice } from "@/components/SetupNotice";
import { Toast } from "@/components/Toast";
import { markDismissed, useActiveMatch } from "@/hooks/useActiveMatch";
import { useLiveRoutes } from "@/hooks/useLiveRoutes";
import { useMyRides } from "@/hooks/useMyRides";
import { useProfile } from "@/hooks/useProfile";
import { useRides } from "@/hooks/useRides";
import { useServerClock } from "@/hooks/useServerClock";
import {
  cancelMatch,
  cancelRide,
  claimRide,
  completeRide,
  createRide,
  mapRide,
  RideError,
  uploadPhoto,
} from "@/lib/rides";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { EMPTY_ROUTE } from "@/mock/landmarks";
import type { HistoryItem, NewPostInput, Profile, RidePost, RouteFilter } from "@/types";

const noopSubscribe = () => () => {};

/**
 * `false` on the server and during hydration, `true` afterwards, without a hydration mismatch.
 * The live app needs browser-only state (saved route, language, session), so until then we
 * show a static shell of identical size. Afterwards the first real render already has the
 * right route and language: no prompt → skeleton → cards flicker.
 */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function RickshawApp() {
  const mounted = useMounted();
  if (!isSupabaseConfigured) return <SetupNotice />;
  return mounted ? <LiveApp /> : <AppShell />;
}

/** Route from a shared link (?from=&to=). Otherwise we land on the Home overview. */
function readInitialRoute(isValidRoute: (o: string, d: string) => boolean): RouteFilter {
  try {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    if (from && to && isValidRoute(from, to)) return { originId: from, destinationId: to };
  } catch {
    /* ignore */
  }
  return EMPTY_ROUTE;
}

/** The last route this device looked at, offered as a shortcut on Home. */
function readRecentRoute(isValidRoute: (o: string, d: string) => boolean): RouteFilter | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ROUTE_KEY) ?? "null") as RouteFilter | null;
    if (saved && isValidRoute(saved.originId, saved.destinationId)) return saved;
  } catch {
    /* storage unavailable */
  }
  return null;
}

const ROUTE_KEY = "rs:route";

const ERROR_KEYS: Record<string, string> = {
  invalid_phone: "errPhone",
  invalid_name: "errName",
  invalid_route: "errRoute",
  already_waiting: "errAlreadyWaiting",
  already_matched: "errAlreadyMatched",
  photo_required: "errPhotoRequired",
  not_authenticated: "errSignIn",
  sign_in_required: "errSignIn",
};

type PendingAuth = { type: "post" } | { type: "claim"; post: RidePost } | { type: "rides" } | { type: "none" };

function LiveApp() {
  const { t, lang } = useLang();
  const { uid, displayName } = useAuth();
  const now = useServerClock();
  const { profile, setProfile } = useProfile();

  const { isValidRoute, find } = useHubs();
  const [route, setRoute] = useState<RouteFilter>(() => readInitialRoute(isValidRoute));
  const routeReady = isValidRoute(route.originId, route.destinationId);
  const [recent] = useState<RouteFilter | null>(() => readRecentRoute(isValidRoute));

  // If the live route table no longer allows the selection, clear the destination.
  useEffect(() => {
    if (route.destinationId && !isValidRoute(route.originId, route.destinationId)) {
      setRoute((r) => ({ ...r, destinationId: "" }));
    }
  }, [route, isValidRoute]);

  // Keep the address bar shareable: /?from=<hub>&to=<hub>.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (routeReady) {
      url.searchParams.set("from", route.originId);
      url.searchParams.set("to", route.destinationId);
    } else {
      url.searchParams.delete("from");
      url.searchParams.delete("to");
    }
    window.history.replaceState(window.history.state, "", url);
  }, [route, routeReady]);

  useEffect(() => {
    if (!routeReady) return;
    try {
      localStorage.setItem(ROUTE_KEY, JSON.stringify(route));
    } catch {
      /* storage unavailable */
    }
  }, [route, routeReady]);
  const { rides, loading, error: feedError, addRide, removeRide, refresh: refreshFeed } = useRides(route, routeReady);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  // Bottom-bar tabs share one page: switching swaps the content in place (no overlay).
  const [tab, setTab] = useState<"find" | "rides">("find");
  const [profileView, setProfileView] = useState<{ id: string; name: string; photoUrl?: string } | null>(null);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const [pendingClaim, setPendingClaim] = useState<RidePost | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2800);
  }, []);

  const errorText = useCallback(
    (e: unknown) => t(e instanceof RideError ? (ERROR_KEYS[e.code] ?? "errGeneric") : "errGeneric"),
    [t],
  );

  const { items: myRides, loading: historyLoading, refresh: refreshMyRides } = useMyRides(uid);
  // Both riders see the match screen until it is completed or cancelled (live + restored on reload).
  const { match, setMatch, recheck: recheckMatch } = useActiveMatch(uid, () => void refreshMyRides());
  const liveRoutes = useLiveRoutes(true);

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

  const shareRoute = useCallback(async () => {
    const url = `${window.location.origin}/?from=${route.originId}&to=${route.destinationId}`;
    const text = `${t("appName")}: ${find(route.originId)?.name[lang]} → ${find(route.destinationId)?.name[lang]}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("appName"), text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t("linkCopied"));
      }
    } catch {
      /* the user dismissed the share sheet */
    }
  }, [route, find, lang, t, showToast]);

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
          originId: input.originId,
          destinationId: input.destinationId,
          photoUrl,
        });
        setProfile({ name: input.name, phone: input.phone });
        // Land on the route you just posted to, so you see your post and everyone else on it.
        setRoute({ originId: input.originId, destinationId: input.destinationId });
        if ((window.history.state as { tab?: string } | null)?.tab === "rides") window.history.replaceState(null, "");
        setTab("find");
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
    [uid, addRide, refreshMyRides, setProfile, showToast, t, errorText],
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
            status: "active",
            endedBy: null,
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
    [removeRide, refreshMyRides, setMatch, showToast, t, errorText],
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

  const endMatch = useCallback(
    async (kind: "complete" | "cancel") => {
      if (!match || matchBusy) return;
      setMatchBusy(true);
      try {
        const res = await (kind === "complete" ? completeRide(match.rideId) : cancelMatch(match.rideId));
        if (res.ok) {
          setMatch({ ...match, status: kind === "complete" ? "completed" : "cancelled", endedBy: "me" });
        } else if (res.reason === "already_completed" || res.reason === "already_cancelled") {
          void recheckMatch(); // the partner ended it first: show how
        } else {
          showToast(t("errMatchEnd"));
        }
        void refreshMyRides();
      } catch (e) {
        showToast(errorText(e));
      } finally {
        setMatchBusy(false);
      }
    },
    [match, matchBusy, setMatch, recheckMatch, refreshMyRides, showToast, t, errorText],
  );

  const closeMatch = useCallback(() => {
    if (match) markDismissed(match.rideId);
    setMatch(null);
    void refreshMyRides();
    showToast(t("dismissedToast"));
  }, [match, setMatch, refreshMyRides, showToast, t]);

  // The phone's back button should leave "My rides" and return to Find, like a native app.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      setTab((e.state as { tab?: string } | null)?.tab === "rides" ? "rides" : "find");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const showFind = useCallback(() => {
    if ((window.history.state as { tab?: string } | null)?.tab === "rides") window.history.back();
    else setTab("find");
    window.scrollTo({ top: 0 });
  }, []);

  const openRoute = useCallback(
    (originId: string, destinationId: string) => {
      setRoute({ originId, destinationId });
      showFind();
    },
    [showFind],
  );
  const goHome = useCallback(() => {
    setRoute(EMPTY_ROUTE);
    showFind();
  }, [showFind]);

  const openRides = useCallback(() => {
    if (!uid) {
      requireSignIn({ type: "rides" });
      return;
    }
    void refreshMyRides();
    if (tab !== "rides") window.history.pushState({ tab: "rides" }, "");
    setTab("rides");
    window.scrollTo({ top: 0 });
  }, [uid, tab, requireSignIn, refreshMyRides]);

  const openMyProfile = useCallback(() => {
    if (uid) setProfileView({ id: uid, name: displayName || profile?.name || "" });
  }, [uid, displayName, profile]);

  /** Centre button: post, or (if you already have a live post) jump to it. */
  const onNavPost = useCallback(() => {
    if (myLive) openRoute(myLive.originId, myLive.destinationId);
    else openSheet();
  }, [myLive, openRoute, openSheet]);

  // Continue the interrupted action as soon as the account is ready.
  useEffect(() => {
    if (!uid || !pendingAuth) return;
    setSignInOpen(false);
    setPendingAuth(null);
    showToast(t("signedInToast"));
    if (pendingAuth.type === "post") setSheetOpen(true);
    else if (pendingAuth.type === "claim") handleShare(pendingAuth.post);
    else if (pendingAuth.type === "rides") openRides();
  }, [uid, pendingAuth, handleShare, openRides, showToast, t]);

  const ready = now !== null && !loading;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-zinc-950 shadow-2xl shadow-black">
      <Header
        onHome={goHome}
        onSignIn={() => requireSignIn({ type: "none" })}
        onProfile={openMyProfile}
        onHistory={openRides}
      />

      {tab === "find" && myLive && now !== null && (
        <LivePostBanner item={myLive} now={now} busy={busyId === myLive.id} onRemove={handleRemoveItem} />
      )}

      {tab === "rides" ? (
        <PullToRefresh onRefresh={() => refreshMyRides()}>
          <RidesScreen
            items={myRides}
            loading={historyLoading}
            now={now ?? 0}
            onViewProfile={(id, name) => setProfileView({ id, name })}
            onFind={goHome}
          />
        </PullToRefresh>
      ) : routeReady ? (
        <>
          <RouteBar route={route} onBack={goHome} onShare={() => void shareRoute()} />

          {feedError && (
            <p
              role="alert"
              className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-400/25"
            >
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
              {t("errFeed")}
            </p>
          )}

          <PullToRefresh onRefresh={() => Promise.all([refreshFeed(), refreshMyRides()])}>
            {!ready ? (
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
          </PullToRefresh>
        </>
      ) : (
        <PullToRefresh onRefresh={() => Promise.all([liveRoutes.refresh(), refreshMyRides()])}>
          <HomeScreen
            liveRoutes={liveRoutes.routes}
            liveLoaded={liveRoutes.loaded && now !== null}
            liveError={liveRoutes.error}
            onRetryLive={() => void liveRoutes.refresh()}
            now={now ?? 0}
            recent={recent}
            onOpenRoute={openRoute}
            onPost={openSheet}
          />
        </PullToRefresh>
      )}

      <BottomNav
        active={tab}
        hasLivePost={Boolean(myLive)}
        onFind={tab === "rides" ? showFind : goHome}
        onPost={onNavPost}
        onRides={openRides}
      />

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
      {match && (
        <MatchedScreen
          match={match}
          busy={matchBusy}
          onComplete={() => void endMatch("complete")}
          onCancel={() => void endMatch("cancel")}
          onClose={closeMatch}
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
