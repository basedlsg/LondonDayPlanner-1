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

export const CityHighlight: React.FC<{
  cityName: string;
  accentColor: string;
}> = ({ cityName, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 10 } });
  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Animated accent bar
  const barWidth = interpolate(frame, [20, 60], [0, 300], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Stats entrance
  const statsOpacity = interpolate(frame, [70, 95], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: BRAND.white,
        opacity: fadeOut,
      }}
    >
      {/* Top gradient accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 400,
          background: `linear-gradient(180deg, ${accentColor}20 0%, transparent 100%)`,
        }}
      />

      {/* City name */}
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `scale(${titleSpring})`,
        }}
      >
        <h1
          style={{
            fontFamily: "Rozha One, serif",
            fontSize: 120,
            color: BRAND.black,
            letterSpacing: "0.08em",
            margin: 0,
          }}
        >
          {cityName}
        </h1>
      </div>

      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 780,
          left: "50%",
          transform: "translateX(-50%)",
          width: barWidth,
          height: 4,
          background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.pink})`,
          borderRadius: 2,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 820,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: subtitleOpacity,
        }}
      >
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 32,
            color: "rgba(28,28,28,0.7)",
          }}
        >
          Your AI-curated day awaits
        </p>
      </div>

      {/* Stats row */}
      <div
        style={{
          position: "absolute",
          top: 1200,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-around",
          opacity: statsOpacity,
        }}
      >
        {[
          { value: "500+", label: "Venues" },
          { value: "11", label: "Cities" },
          { value: "∞", label: "Itineraries" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "Rozha One, serif",
                fontSize: 64,
                color: i === 1 ? BRAND.pink : BRAND.blue,
                transform: `translateY(${interpolate(
                  frame,
                  [75 + i * 10, 95 + i * 10],
                  [20, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}px)`,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 600,
                fontSize: 24,
                color: "rgba(28,28,28,0.5)",
                marginTop: 8,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom brand */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Rozha One, serif",
            fontSize: 28,
            color: "rgba(28,28,28,0.3)",
            letterSpacing: "0.12em",
          }}
        >
          Plan Your Perfect Day
        </div>
      </div>
    </AbsoluteFill>
  );
};
