type WebImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export default function WebImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = "(max-width: 720px) 92vw, 360px",
  srcSet,
  onError,
}: WebImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      srcSet={srcSet}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      onError={onError}
    />
  );
}
