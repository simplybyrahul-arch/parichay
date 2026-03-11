import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  href = "/",
  width = 180,
  height = 52,
  className = "",
  priority = false,
}: BrandLogoProps) {
  const logo = (
    <Image
      src="/logo.png"
      alt="ShotcutCrew"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );

  if (!href) {
    return logo;
  }

  return (
    <Link href={href} aria-label="ShotcutCrew home">
      {logo}
    </Link>
  );
}
