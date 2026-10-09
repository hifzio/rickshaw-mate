"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { Camera, ImagePlus, Loader2, MapPin, Timer, X } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { RouteSelector } from "@/components/RouteSelector";
import { useHubs } from "@/components/HubsProvider";
import { ProfileFields } from "@/components/ProfileFields";
import { normalizePhone } from "@/lib/phone";
import type { NewPostInput, Profile, RouteFilter } from "@/types";

interface PostRideSheetProps {
  /** Pre-filled route (may be empty: the user then picks it inside the sheet). */
  route: RouteFilter;
  initialProfile: Profile | null;
  onClose: () => void;
  /** Resolves true when the post was created (the parent then closes the sheet). */
  onSubmit: (input: NewPostInput) => Promise<boolean>;
}

export function PostRideSheet({ route, initialProfile, onClose, onSubmit }: PostRideSheetProps) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [photo, setPhoto] = useState<File>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { isValidRoute } = useHubs();
  const [postRoute, setPostRoute] = useState<RouteFilter>(route);
  const routeOk = isValidRoute(postRoute.originId, postRoute.destinationId);
  const nameOk = name.trim().length >= 2;
  const normalized = normalizePhone(phone);
  const photoOk = Boolean(photo);
  const canSubmit = note.trim().length >= 3 && !submitting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Free the preview blob when it is replaced or the sheet closes.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const acceptFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!canSubmit || !nameOk || !normalized || !photoOk || !routeOk) return;
    setSubmitting(true);
    const ok = await onSubmit({
      name: name.trim(),
      phone: normalized,
      note: note.trim(),
      photo,
      originId: postRoute.originId,
      destinationId: postRoute.destinationId,
    });
    if (!ok) setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70"
      />

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-title"
        className="relative flex max-h-[94dvh] w-full max-w-[430px] animate-sheet-up flex-col rounded-t-[28px] border-t border-indigo-400/30 bg-zinc-950 shadow-2xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-line/20" aria-hidden />

        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 id="post-title" className="text-xl font-extrabold text-fg">
            {t("postSheetTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-slate-300 transition active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-2">
          {/* Route: pre-filled when you came from a route, otherwise pick it here */}
          <div>
            <p className="mb-2 text-sm font-bold text-fg">{t("route")}</p>
            <RouteSelector route={postRoute} onChange={setPostRoute} className="" idPrefix="post" />
            {tried && !routeOk && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">
                {t("errRouteRequired")}
              </p>
            )}
          </div>

          {/* Standing spot */}
          <div>
            <label htmlFor="spot" className="mb-2 flex items-center gap-2 text-sm font-bold text-fg">
              <MapPin className="h-4 w-4 text-emerald-400" aria-hidden />
              {t("standingSpot")}
            </label>
            <textarea
              id="spot"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={140}
              placeholder={t("standingPlaceholder")}
              className="w-full resize-none rounded-2xl border border-line/10 bg-zinc-900 p-4 text-base text-fg placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            />
            {tried && note.trim().length < 3 ? (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">
                {t("errNote")}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">{t("standingHint")}</p>
            )}
          </div>

          <ProfileFields
            name={name}
            phone={phone}
            onName={setName}
            onPhone={setPhone}
            nameError={tried && !nameOk}
            phoneError={tried && !normalized}
          />

          {/* Photo */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-fg">
              <Camera className="h-4 w-4 text-emerald-400" aria-hidden />
              {t("photoLabel")}
            </p>
            <p className="-mt-1 mb-2 text-xs text-slate-400">{t("photoHelp")}</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={onFileChange}
              className="sr-only"
              tabIndex={-1}
            />

            {photoUrl ? (
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-zinc-900 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                <div className="flex flex-1 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-11 rounded-xl bg-navy-800 text-sm font-bold text-fg ring-1 ring-indigo-400/30 active:scale-95"
                  >
                    {t("photoChange")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(undefined);
                      setPhotoUrl(undefined);
                    }}
                    className="h-11 rounded-xl text-sm font-semibold text-slate-400 active:scale-95"
                  >
                    {t("photoRemove")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition active:scale-[0.99] ${
                  dragging
                    ? "border-emerald-400 bg-emerald-500/10"
                    : tried && !photoOk
                      ? "border-rose-400 bg-rose-500/10"
                      : "border-indigo-400/40 bg-zinc-900"
                }`}
              >
                <ImagePlus className="h-8 w-8 text-indigo-300" aria-hidden />
                <span className="text-base font-bold text-fg">{t("photoTake")}</span>
                <span className="text-xs text-slate-400">{t("photoDrop")}</span>
              </button>
            )}
            {tried && !photoOk && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">
                {t("photoRequired")}
              </p>
            )}
          </div>

          <p className="flex items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm font-medium text-amber-200 ring-1 ring-amber-400/25">
            <Timer className="h-4 w-4 shrink-0" aria-hidden />
            {t("expiryNotice")}
          </p>
        </div>

        <div className="border-t border-line/10 bg-zinc-950 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-500 text-lg font-extrabold text-ink shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                {t("saving")}
              </span>
            ) : (
              t("postCta")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
