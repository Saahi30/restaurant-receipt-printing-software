type Props = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 40, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Mahankal Food Park"
      width={size}
      height={size}
      className={`rounded-xl object-cover shrink-0 ${className}`}
    />
  );
}
