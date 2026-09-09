type WebImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export default function WebImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = "(max-width: 720px) 92vw, 360px",
}: WebImageProps) {
  return (
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
}
