/**
 * Fixed background wash — purple / pink / blue radial orbs, same recipe as the
 * marketing site. Purely decorative, never interactive.
 */
export function AmbientOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, #8B5CF6 0%, #6D28D9 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[380px] w-[380px] rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, #EC4899 0%, #BE185D 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 left-1/4 h-[440px] w-[440px] rounded-full opacity-20 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, #3B82F6 0%, #1D4ED8 50%, transparent 70%)",
        }}
      />
      {/* Faint grid so the black doesn't read as flat */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
