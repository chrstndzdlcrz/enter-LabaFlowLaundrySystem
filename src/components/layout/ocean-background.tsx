/**
 * Decorative laundry-themed background: translucent soap bubbles, soft water
 * waves and a very subtle linen weave. Everything here is inert and sits behind
 * the content, so bubbles can never be mistaken for a notification badge or
 * cover a control.
 */
const BUBBLES = [
  { size: 120, left: "4%", top: "12%", delay: "0s" },
  { size: 64, left: "18%", top: "62%", delay: "-4s" },
  { size: 180, left: "78%", top: "6%", delay: "-8s" },
  { size: 88, left: "88%", top: "48%", delay: "-2s" },
  { size: 46, left: "58%", top: "30%", delay: "-6s" },
  { size: 140, left: "38%", top: "82%", delay: "-10s" },
];

export function OceanBackground({ textured = true }: { textured?: boolean }) {
  return (
    <div className="ocean-bubbles" aria-hidden="true">
      <div className={textured ? "absolute inset-0 linen-texture" : "absolute inset-0"} />
      {BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className="ocean-bubble animate-bubble-rise"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: bubble.left,
            top: bubble.top,
            animationDelay: bubble.delay,
          }}
        />
      ))}
      <div className="wave-layer" />
      <div
        className="absolute inset-x-0 top-0 h-64 opacity-70"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, hsl(var(--primary-glow) / 0.18), transparent 70%)",
        }}
      />
    </div>
  );
}
