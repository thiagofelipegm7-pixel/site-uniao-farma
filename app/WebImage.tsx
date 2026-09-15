type WebImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

function webpCandidate(src: string) {
  if (/\.webp($|\?)/i.test(src) || /\.svg($|\?)/i.test(src)) return null;
  return src.replace(/\.(jpe?g|png)($|\?)/i, ".webp$2");
}

export default function WebImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = "(max-width: 720px) 92vw, 360px",
}: WebImageProps) {
  const webp = webpCandidate(src);
  const img = (
    <img
      className={className}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
    />
  );

  if (!webp || webp === src) return img;

  return (
    <picture>
      <source srcSet={webp} type="image/webp" sizes={sizes} />
      {img}
    </picture>
  );
}
