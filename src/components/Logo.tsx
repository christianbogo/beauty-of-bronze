export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const className =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className={`font-semibold tracking-wide ${className}`}>
      Beauty of Bronze
    </span>
  );
}

