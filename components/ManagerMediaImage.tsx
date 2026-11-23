"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  kind: "club" | "competition";
  entityId: string;
  fallback: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export default function ManagerMediaImage({ kind, entityId, fallback, alt, sizes, className, priority }: Props) {
  const [src, setSrc] = useState(fallback);
  useEffect(() => {
    let cancelled = false;
    setSrc(fallback);
    if (!entityId) return;
    const params = new URLSearchParams({ kind, id: entityId });
    fetch(`/api/media?${params.toString()}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && typeof data?.imageUrl === "string" && data.imageUrl.startsWith("https://")) setSrc(data.imageUrl);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [kind, entityId, fallback]);
  return (
    <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} unoptimized
      onError={() => { if (src !== fallback) setSrc(fallback); }} />
  );
}
