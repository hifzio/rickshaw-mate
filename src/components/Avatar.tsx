/* eslint-disable @next/next/no-img-element */
import { initials } from "@/lib/i18n";

const GRADIENTS = [
  "from-indigo-500 to-indigo-800",
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-indigo-700",
  "from-fuchsia-500 to-indigo-700",
  "from-amber-500 to-rose-600",
  "from-cyan-500 to-blue-700",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface AvatarProps {
  name: string;
  photoUrl?: string;
  className?: string;
  textClassName?: string;
}

export function Avatar({
  name,
  photoUrl,
  className = "h-14 w-14 rounded-2xl",
  textClassName = "text-lg",
}: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${className} shrink-0 object-cover ring-1 ring-line/10`}
      />
    );
  }
  const gradient = GRADIENTS[hash(name) % GRADIENTS.length];
  return (
    <div
      aria-label={name}
      role="img"
      className={`${className} flex shrink-0 items-center justify-center bg-gradient-to-br ${gradient} font-bold text-white ring-1 ring-line/10 ${textClassName}`}
    >
      {initials(name)}
    </div>
  );
}
