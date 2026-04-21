import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BRAND = {
  blue: "#17B9E6",
  pink: "#FC94C5",
  black: "#1C1C1C",
  white: "#FFFFFF",
};

export const ProductDemo: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo entrance spring
  const logoScale = spring({ frame, fps, config: { damping: 12 } });

  // Title slide up
  const titleY = interpolate(frame, [15, 45], [60, 0], {
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [15, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline fade in
  const taglineOpacity = interpolate(frame, [50, 75], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Glass card entrance
  const cardProgress = spring({
    frame: frame - 90,
    fps,
    config: { damping: 14 },
  });
  const cardScale = interpolate(cardProgress, [0, 1], [0.8, 1]);
  const cardOpacity = interpolate(frame, [90, 110], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // CTA pulse
  const ctaOpacity = interpolate(frame, [200, 220], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${BRAND.white} 0%, #f0f9ff 50%, #fdf2f8 100%)`,
        opacity: fadeOut,
      }}
    >
      {/* Subtle background pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(23,185,230,0.06) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(252,148,197,0.06) 0%, transparent 50%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
        }}
      >
        <div
          style={{
            fontFamily: "Rozha One, serif",
            fontSize: 48,
            color: BRAND.black,
            letterSpacing: "0.12em",
          }}
        >
          Plan Your Perfect Day
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}
      >
        <h1
          style={{
            fontFamily: "Rozha One, serif",
            fontSize: 72,
            color: BRAND.black,
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: taglineOpacity,
        }}
      >
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: BRAND.blue,
            letterSpacing: "0.01em",
          }}
        >
          AI-powered itineraries for the world's greatest cities
        </p>
      </div>

      {/* Glass Card Demo */}
      <div
        style={{
          position: "absolute",
          top: 420,
          left: "50%",
          transform: `translateX(-50%) scale(${cardScale})`,
          opacity: cardOpacity,
          width: 800,
          padding: 48,
          background:
            "linear-gradient(135deg, rgba(23,185,230,0.15), rgba(252,148,197,0.1))",
          backdropFilter: "blur(15px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.3)",
          boxShadow: `0 6px 18px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)`,
        }}
      >
        <div
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 20,
            color: BRAND.black,
            marginBottom: 16,
          }}
        >
          Your London Afternoon
        </div>
        {["Borough Market — Street food & artisan stalls", "Tate Modern — World-class modern art", "Sky Garden — Panoramic city views"].map(
          (item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 0",
                borderBottom:
                  i < 2 ? "1px solid rgba(28,28,28,0.08)" : "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 18,
                color: "rgba(28,28,28,0.8)",
                opacity: interpolate(
                  frame,
                  [120 + i * 15, 140 + i * 15],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
                transform: `translateX(${interpolate(
                  frame,
                  [120 + i * 15, 140 + i * 15],
                  [30, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}px)`,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? BRAND.blue : BRAND.pink,
                  flexShrink: 0,
                }}
              />
              {item}
            </div>
          )
        )}
      </div>

      {/* CTA */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            background: BRAND.blue,
            color: BRAND.white,
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 24,
            padding: "16px 48px",
            borderRadius: 8,
            letterSpacing: "0.01em",
          }}
        >
          Start Planning →
        </div>
      </div>
    </AbsoluteFill>
  );
};
