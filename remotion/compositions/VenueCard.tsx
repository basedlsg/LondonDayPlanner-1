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

export const VenueCard: React.FC<{
  venueName: string;
  category: string;
  rating: number;
}> = ({ venueName, category, rating }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: { damping: 12 } });
  const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);
  const cardOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Rating stars stagger
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  // Badge slide in
  const badgeX = interpolate(frame, [25, 45], [-100, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Rating counter
  const ratingOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #f8fbff, #fef7fb)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      {/* Glass card */}
      <div
        style={{
          width: 800,
          padding: 64,
          background:
            "linear-gradient(135deg, rgba(23,185,230,0.12), rgba(252,148,197,0.08))",
          backdropFilter: "blur(15px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: `0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)`,
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
        }}
      >
        {/* Category badge */}
        <div
          style={{
            display: "inline-block",
            background: BRAND.blue,
            color: BRAND.white,
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            fontSize: 16,
            padding: "6px 20px",
            borderRadius: 20,
            marginBottom: 24,
            transform: `translateX(${badgeX}px)`,
          }}
        >
          {category}
        </div>

        {/* Venue name */}
        <h2
          style={{
            fontFamily: "Rozha One, serif",
            fontSize: 56,
            color: BRAND.black,
            letterSpacing: "0.08em",
            margin: "0 0 24px 0",
            lineHeight: 1.2,
          }}
        >
          {venueName}
        </h2>

        {/* Rating */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: ratingOpacity,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background:
                    i < fullStars
                      ? BRAND.pink
                      : i === fullStars && hasHalf
                        ? `linear-gradient(90deg, ${BRAND.pink} 50%, rgba(28,28,28,0.1) 50%)`
                        : "rgba(28,28,28,0.1)",
                  transform: `scale(${interpolate(
                    frame,
                    [45 + i * 5, 55 + i * 5],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )})`,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              fontSize: 28,
              color: "rgba(28,28,28,0.6)",
            }}
          >
            {rating}
          </span>
        </div>
      </div>

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 48,
          fontFamily: "Rozha One, serif",
          fontSize: 18,
          color: "rgba(28,28,28,0.2)",
          letterSpacing: "0.12em",
        }}
      >
        Plan Your Perfect Day
      </div>
    </AbsoluteFill>
  );
};
