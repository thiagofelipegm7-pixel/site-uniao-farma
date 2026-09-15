type BrandLogoProps = {
  src?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  src = "/icon-192.png",
  width = 52,
  height = 52,
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt="Logo da União Farma"
      width={width}
      height={height}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
    />
  );
}
