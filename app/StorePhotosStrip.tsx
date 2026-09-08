"use client";

import { useState } from "react";
import { STORE_PHOTOS, type StorePhoto } from "./store-photos";

function PhotoCard({ photo, index, eager }: { photo: StorePhoto; index: number; eager?: boolean }) {
  const [src, setSrc] = useState(photo.src);
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`store-photo${failed ? " store-photo-fallback" : ""}`} role="listitem">
      {!failed ? (
        <img
          src={src}
          alt={photo.alt}
          width="800"
          height="520"
          sizes="(max-width: 860px) 72vw, 340px"
          decoding="async"
          loading={eager || index < 2 ? "eager" : "lazy"}
          onError={() => {
            if (src.includes(".webp")) {
              setSrc(src.replace(".webp", ".jpg"));
              return;
            }
            if (src.includes(".svg")) {
              setSrc(src.replace(".svg", ".jpg"));
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <div className="store-photo-missing" aria-hidden="true" />
      )}
      <figcaption>
        <strong>{photo.kind}</strong>
        <span>{photo.unit}</span>
      </figcaption>
    </figure>
  );
}

export default function StorePhotosStrip({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const photos = className?.includes("hero") ? STORE_PHOTOS.slice(0, 3) : STORE_PHOTOS;

  return (
    <div className={className ?? "store-photos"} role="list" aria-label={label ?? "Fotos da loja, identificadas por unidade"}>
      {photos.map((photo, index) => (
        <PhotoCard key={`${photo.caption}-${index}`} photo={photo} index={index} eager={className?.includes("hero")} />
      ))}
    </div>
  );
}
