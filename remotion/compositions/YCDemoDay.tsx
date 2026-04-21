/**
 * YCDemoDay — 60s product video @ 30fps / 1920×1080
 *
 * VISUAL DESIGN: Dark-mode cinematic with 3D device shots, glass morphism,
 * film grain, colored glow accents, spring-out easing, and word-by-word reveals.
 * Inspired by Linear, Vercel, Arc Browser, and Apple product film language.
 *
 * Scene map
 * ─────────────────────────────────────────────────────────────
 *  0 – 150   OPENER    Full-bleed pink loading PNG → dark curtain
 *  150 – 300 HOOK      Dark bg, word-by-word headline reveal
 *  300 – 480 PROBLEM   Glass cards on dark bg, strikethrough
 *  480 –1110 DEMO      3D iPhone hero shot: Plan → Loading video → Results
 *  1110–1320 CITIES    Dark bg, glass city pills + explore phone
 *  1320–1560 TRACTION  Huge glowing counter numbers
 *  1560–1800 CTA       Brand pink return, clean logo lockup
 */

import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";

// ─── Brand palette (dark theme) ──────────────────────────────────────────────
const C = {
  pink:    "#FC94C5",
  blue:    "#17B9E6",
  violet:  "#9B8FD4",
  bg:      "#08080a",
  surface: "#111114",
  white:   "#FAFAFA",
  muted:   "rgba(255,255,255,0.48)",
  glass:   "rgba(255,255,255,0.05)",
  border:  "rgba(255,255,255,0.08)",
};
const serif = "'Rozha One', Georgia, serif";
const sans  = "'Poppins', system-ui, sans-serif";

// ─── Timing ──────────────────────────────────────────────────────────────────
const DUR = {
  opener: 150, hook: 150, problem: 180, demo: 630,
  cities: 210, traction: 240, cta: 240,
};
const S = {
  opener:   0,
  hook:     DUR.opener,
  problem:  DUR.opener + DUR.hook,
  demo:     DUR.opener + DUR.hook + DUR.problem,
  cities:   DUR.opener + DUR.hook + DUR.problem + DUR.demo,
  traction: DUR.opener + DUR.hook + DUR.problem + DUR.demo + DUR.cities,
  cta:      DUR.opener + DUR.hook + DUR.problem + DUR.demo + DUR.cities + DUR.traction,
}; // total = 1800 ✓

// ─── Premium easing (spring-out: fast start, soft landing) ───────────────────
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const fadeIn = (f: number, start: number, end: number) =>
  interpolate(f, [start, end], [0, 1], clamp);

const riseUp = (f: number, start: number, end: number, dist = 30) =>
  interpolate(f, [start, end], [dist, 0], { ...clamp, easing: ease });

const fadeOut = (f: number, dur: number, tail = 12) =>
  interpolate(f, [dur - tail, dur], [1, 0], clamp);

const sp = (f: number, delay = 0, damping = 14, stiffness = 110) =>
  spring({ frame: f - delay, fps: 30, config: { damping, stiffness, mass: 1 } });


// ─── Shared components ───────────────────────────────────────────────────────

/** Film grain overlay — fractal noise at 4.5% opacity */
const GrainOverlay: React.FC = () => (
  <>
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
    <AbsoluteFill style={{ filter: "url(#grain)", opacity: 0.045, mixBlendMode: "overlay", pointerEvents: "none" }} />
  </>
);

/** Scene wrapper — premium layered bg: dual animated glow, dot grid, vignette */
const SceneWrap: React.FC<{
  f: number;
  dur: number;
  glowColor?: string;
  glowPos?: string;
  glowColor2?: string;
  glowPos2?: string;
  children: React.ReactNode;
}> = ({
  f, dur,
  glowColor = C.blue, glowPos = "50% 40%",
  glowColor2 = C.pink, glowPos2 = "25% 75%",
  children,
}) => {
  const entryOp = fadeIn(f, 0, 15);
  const entryS  = interpolate(f, [0, 15], [1.02, 1.0], { ...clamp, easing: ease });
  const exitOp  = fadeOut(f, dur, 12);
  const exitS   = interpolate(f, [dur - 12, dur], [1.0, 0.98], clamp);
  const op = Math.min(entryOp, exitOp);
  const s  = f < 15 ? entryS : f > dur - 12 ? exitS : 1.0;

  // Gentle glow drift for life
  const driftX = Math.sin((f / 90) * Math.PI) * 3;
  const driftY = Math.cos((f / 70) * Math.PI) * 2;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {/* Primary glow — large soft bloom */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(1000px ellipse at ${glowPos}, ${glowColor}35 0%, ${glowColor}12 30%, transparent 60%)`,
          transform: `translate(${driftX}px, ${driftY}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Secondary glow — complementary bloom, opposite drift */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(800px ellipse at ${glowPos2}, ${glowColor2}28 0%, ${glowColor2}0a 35%, transparent 60%)`,
          transform: `translate(${-driftX}px, ${-driftY * 0.7}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Ambient surface wash */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, ${C.surface} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Dot grid (Linear-style) — masked to center for depth */}
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Thin horizon line — subtle depth cue */}
      <div
        style={{
          position: "absolute",
          top: "50%", left: "10%", right: "10%",
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)`,
          pointerEvents: "none",
        }}
      />

      {/* Edge vignette — focus and depth */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <AbsoluteFill style={{ opacity: op, transform: `scale(${s})`, transformOrigin: "center" }}>
        {children}
      </AbsoluteFill>

      <GrainOverlay />
    </AbsoluteFill>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// iPhone 17 Pro Mockup — dark titanium with edge highlight
// ═══════════════════════════════════════════════════════════════════════════════
const PHONE_W  = 290;
const PHONE_H  = 630;
const SCREEN_W = 270;
const SCREEN_H = Math.round(SCREEN_W * 2622 / 1206); // 587

const IPhoneMockup: React.FC<{ children: React.ReactNode; shadow?: boolean }> = ({
  children,
  shadow = true,
}) => {
  const hPad = (PHONE_W - SCREEN_W) / 2;
  const vPad = (PHONE_H - SCREEN_H) / 2;
  return (
    <div
      style={{
        width: PHONE_W, height: PHONE_H,
        background: "linear-gradient(180deg, #1e1e22 0%, #141416 100%)",
        borderRadius: 44,
        padding: `${vPad}px ${hPad}px`,
        boxShadow: shadow
          ? `0 60px 120px rgba(0,0,0,0.7),
             0 20px 50px rgba(0,0,0,0.5),
             inset 0 0.5px 0 rgba(255,255,255,0.12),
             inset 0 0 0 1px rgba(255,255,255,0.06)`
          : "none",
        position: "relative", flexShrink: 0,
      }}
    >
      {/* Side buttons */}
      <div style={{ position: "absolute", right: -3, top: 165, width: 3, height: 72, background: "#252528", borderRadius: "0 2px 2px 0" }} />
      <div style={{ position: "absolute", left: -3, top: 125, width: 3, height: 38, background: "#252528", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -3, top: 178, width: 3, height: 38, background: "#252528", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -3, top: 85,  width: 3, height: 24, background: "#252528", borderRadius: "2px 0 0 2px" }} />

      {/* Screen */}
      <div
        style={{
          width: SCREEN_W, height: SCREEN_H,
          borderRadius: 36, overflow: "hidden",
          background: "#000",
          position: "relative",
          boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 3D hero phone with perspective tilt, glow, floating animation, and reflection */
const PhoneHero: React.FC<{
  children: React.ReactNode;
  frame: number;
  tiltY?: number;
  glowColor1?: string;
  glowColor2?: string;
}> = ({ children, frame, tiltY = 8, glowColor1 = C.pink, glowColor2 = C.blue }) => {
  const float = Math.sin((frame / 50) * Math.PI) * 3;

  return (
    <div style={{ perspective: 1200, perspectiveOrigin: "50% 45%" }}>
      {/* Colored glow behind device */}
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: PHONE_W + 180, height: PHONE_H + 120,
          background: `radial-gradient(ellipse, ${glowColor1}20 0%, ${glowColor2}12 45%, transparent 70%)`,
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      {/* Phone with 3D tilt + float */}
      <div
        style={{
          transform: `rotateY(${tiltY}deg) rotateX(2deg) translateY(${float}px)`,
          transformStyle: "preserve-3d",
        }}
      >
        <IPhoneMockup>{children}</IPhoneMockup>
      </div>

      {/* Reflection bar — gradient below device suggesting floor reflection */}
      <div
        style={{
          width: PHONE_W * 0.85,
          height: 60,
          marginTop: 10,
          marginLeft: "auto", marginRight: "auto",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)",
          borderRadius: "0 0 24px 24px",
          filter: "blur(6px)",
          transform: `rotateY(${tiltY}deg)`,
        }}
      />
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 1 — OPENER
// Cinematic dark hero: 3D iPhone with explore screen, "PLAN" title, tagline
// ═══════════════════════════════════════════════════════════════════════════════
const OpenerScene: React.FC = () => {
  const f = useCurrentFrame();

  // ─── Animated gradient glow — orbits behind the phone ──────────────────
  const glowAngle = (f / DUR.opener) * 120; // slow rotation
  const glowX = 50 + Math.sin((f / 40) * Math.PI) * 8;
  const glowY = 48 + Math.cos((f / 55) * Math.PI) * 5;

  // ─── Phone entrance: rises from below with spring ─────────────────────
  const phoneSpring = sp(f, 6, 12, 65);
  const phoneY = interpolate(phoneSpring, [0, 1], [120, 0]);
  const phoneOp = fadeIn(f, 4, 22);
  const phoneScale = interpolate(phoneSpring, [0, 1], [0.92, 1.0]);

  // ─── "PLAN" title — large, dramatic, springs in from scale ────────────
  const titleSpring = sp(f, 18, 10, 80);
  const titleScale = interpolate(titleSpring, [0, 1], [0.6, 1.0]);
  const titleOp = fadeIn(f, 16, 32);

  // ─── Tagline fades up below title ─────────────────────────────────────
  const tagOp = fadeIn(f, 40, 58);
  const tagY = riseUp(f, 40, 58, 18);

  // ─── Gradient bar accent ──────────────────────────────────────────────
  const barW = interpolate(f, [50, 90], [0, 260], clamp);
  const barOp = fadeIn(f, 48, 62);

  // ─── Scene exit: everything scales down + fades ───────────────────────
  const exitOp = fadeOut(f, DUR.opener, 14);
  const exitScale = interpolate(f, [DUR.opener - 14, DUR.opener], [1.0, 0.96], clamp);

  // ─── Light streak particles ───────────────────────────────────────────
  const particles = [
    { x: 15, y: 20, size: 2, speed: 0.7, delay: 10 },
    { x: 82, y: 35, size: 1.5, speed: 0.5, delay: 20 },
    { x: 45, y: 80, size: 2.5, speed: 0.9, delay: 5 },
    { x: 70, y: 65, size: 1.8, speed: 0.6, delay: 15 },
    { x: 25, y: 55, size: 1.2, speed: 0.8, delay: 25 },
    { x: 90, y: 15, size: 2, speed: 0.4, delay: 30 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at ${glowX}% ${glowY}%, ${C.pink}16 0%, transparent 50%),
          radial-gradient(ellipse at ${100 - glowX}% ${100 - glowY}%, ${C.blue}12 0%, transparent 55%),
          radial-gradient(ellipse at 50% 50%, ${C.surface} 0%, ${C.bg} 100%)
        `,
        overflow: "hidden",
      }}
    >
      {/* Animated glow orb — large diffused light behind phone */}
      <div
        style={{
          position: "absolute",
          top: "42%", left: "50%",
          transform: `translate(-50%, -50%) rotate(${glowAngle}deg)`,
          width: 700, height: 700,
          background: `conic-gradient(from ${glowAngle}deg, ${C.pink}20, ${C.blue}18, ${C.violet}15, ${C.pink}20)`,
          borderRadius: "50%",
          filter: "blur(100px)",
          opacity: fadeIn(f, 0, 30),
          pointerEvents: "none",
        }}
      />

      {/* Floating light particles */}
      {particles.map((p, i) => {
        const pOp = fadeIn(f, p.delay, p.delay + 20) * fadeOut(f, DUR.opener, 20);
        const drift = Math.sin(((f - p.delay) / 80) * Math.PI) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y + drift * 0.3}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: i % 2 === 0 ? C.pink : C.blue,
              boxShadow: `0 0 ${p.size * 6}px ${p.size * 2}px ${i % 2 === 0 ? C.pink : C.blue}40`,
              opacity: pOp * 0.5,
              transform: `translateY(${drift}px)`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Main content — wrapped in exit animation */}
      <AbsoluteFill
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: exitOp,
          transform: `scale(${exitScale})`,
          transformOrigin: "center",
        }}
      >
        {/* "PLAN" title — above the phone */}
        <div
          style={{
            fontFamily: serif,
            fontSize: 110,
            letterSpacing: "0.18em",
            color: C.white,
            textShadow: `0 0 80px ${C.pink}50, 0 4px 30px rgba(0,0,0,0.4)`,
            marginBottom: 24,
            opacity: titleOp,
            transform: `scale(${titleScale})`,
            transformOrigin: "center bottom",
          }}
        >
          PLAN
        </div>

        {/* 3D iPhone hero — explore screen with Big Ben */}
        <div
          style={{
            opacity: phoneOp,
            transform: `translateY(${phoneY}px) scale(${phoneScale})`,
            transformOrigin: "center top",
          }}
        >
          <PhoneHero frame={f} tiltY={0} glowColor1={C.pink} glowColor2={C.blue}>
            <Img
              src={staticFile("img/iphone_explore_screen.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </PhoneHero>
        </div>

        {/* Tagline + gradient bar — below the phone reflection */}
        <div style={{ marginTop: -30, textAlign: "center", position: "relative", zIndex: 2 }}>
          {/* Gradient accent bar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, opacity: barOp }}>
            <div
              style={{
                width: barW, height: 2,
                background: `linear-gradient(90deg, transparent, ${C.pink}, ${C.blue}, transparent)`,
                borderRadius: 1,
              }}
            />
          </div>

          <div
            style={{
              fontFamily: sans, fontWeight: 400, fontSize: 22,
              color: C.muted, letterSpacing: "0.06em",
              opacity: tagOp,
              transform: `translateY(${tagY}px)`,
            }}
          >
            Your perfect day, planned by AI
          </div>
        </div>
      </AbsoluteFill>

      {/* Film grain */}
      <GrainOverlay />
    </AbsoluteFill>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 2 — HOOK (word-by-word headline reveal on dark)
// ═══════════════════════════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const f = useCurrentFrame();

  const line1 = "Planning the perfect day".split(" ");
  const line2Start = 28;
  const line2Words = ["used", "to", "take"];
  const hoursDelay = line2Start + line2Words.length * 4 + 6;
  const barOp  = fadeIn(f, hoursDelay + 10, hoursDelay + 30);
  const barW   = interpolate(f, [hoursDelay + 10, hoursDelay + 50], [0, 480], clamp);
  const subOp  = fadeIn(f, hoursDelay + 20, hoursDelay + 40);
  const subY   = riseUp(f, hoursDelay + 20, hoursDelay + 40, 20);

  return (
    <SceneWrap f={f} dur={DUR.hook} glowColor={C.blue} glowPos="50% 30%" glowColor2={C.violet} glowPos2="70% 70%">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 1300 }}>
          {/* Line 1: word-by-word */}
          <div style={{ lineHeight: 1.1, marginBottom: 8 }}>
            {line1.map((word, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: serif, fontSize: 92, color: C.white,
                  letterSpacing: "0.03em",
                  opacity:   fadeIn(f, 5 + i * 4, 14 + i * 4),
                  transform: `translateY(${riseUp(f, 5 + i * 4, 14 + i * 4, 24)}px)`,
                  marginRight: "0.3em",
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Line 2: word-by-word + accent "hours." */}
          <div style={{ lineHeight: 1.1 }}>
            {line2Words.map((word, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: serif, fontSize: 92, color: C.white,
                  letterSpacing: "0.03em",
                  opacity:   fadeIn(f, line2Start + i * 4, line2Start + 9 + i * 4),
                  transform: `translateY(${riseUp(f, line2Start + i * 4, line2Start + 9 + i * 4, 24)}px)`,
                  marginRight: "0.3em",
                }}
              >
                {word}
              </span>
            ))}
            <span
              style={{
                display: "inline-block",
                fontFamily: serif, fontSize: 92,
                letterSpacing: "0.03em",
                background: `linear-gradient(135deg, ${C.blue}, ${C.pink})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                opacity:   fadeIn(f, hoursDelay, hoursDelay + 12),
                transform: `translateY(${riseUp(f, hoursDelay, hoursDelay + 12, 24)}px) scale(${interpolate(sp(f, hoursDelay, 12), [0, 1], [0.9, 1.0])})`,
              }}
            >
              hours.
            </span>
          </div>

          {/* Gradient divider */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 44, opacity: barOp }}>
            <div style={{ width: barW, height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.pink})`, borderRadius: 2 }} />
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: sans, fontWeight: 500, fontSize: 32,
              color: C.muted, marginTop: 26,
              opacity: subOp,
              transform: `translateY(${subY}px)`,
            }}
          >
            We do it in seconds.
          </div>
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 3 — PROBLEM (glass cards on dark)
// ═══════════════════════════════════════════════════════════════════════════════
const painPoints = [
  { icon: "🗂", text: "Dozens of browser tabs, zero decisions" },
  { icon: "📍", text: "Tourist traps disguised as hidden gems" },
  { icon: "⏰", text: "Hours of research for a few hours of fun" },
];

const ProblemScene: React.FC = () => {
  const f = useCurrentFrame();
  const titleOp = fadeIn(f, 0, 18);
  const titleY  = riseUp(f, 0, 18, 28);

  return (
    <SceneWrap f={f} dur={DUR.problem} glowColor={C.pink} glowPos="50% 85%" glowColor2={C.violet} glowPos2="70% 20%">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 900 }}>
          <div
            style={{
              fontFamily: serif, fontSize: 58, color: C.white,
              letterSpacing: "0.04em", marginBottom: 48,
              opacity: titleOp, transform: `translateY(${titleY}px)`,
            }}
          >
            Sound familiar?
          </div>

          {painPoints.map((pt, i) => {
            const d  = 14 + i * 22;
            const op = fadeIn(f, d, d + 16);
            const y  = riseUp(f, d, d + 16, 28);
            const stk = interpolate(sp(f, d + 35, 22), [0, 1], [0, 100], clamp);

            return (
              <div
                key={i}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:         24,
                  marginBottom: 20,
                  padding:     "20px 28px",
                  background:  C.glass,
                  border:      `1px solid ${C.border}`,
                  borderRadius: 18,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  opacity: op,
                  transform: `translateY(${y}px)`,
                }}
              >
                <div
                  style={{
                    width: 52, height: 52,
                    background: `linear-gradient(135deg, ${C.pink}18, ${C.blue}12)`,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}
                >
                  {pt.icon}
                </div>
                <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 30, color: C.white, position: "relative" }}>
                  {pt.text}
                  <div
                    style={{
                      position: "absolute", top: "50%", left: 0,
                      height: 2.5, width: `${stk}%`,
                      background: `linear-gradient(90deg, ${C.pink}, ${C.blue})`,
                      borderRadius: 2, marginTop: -1,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 4 — DEMO  (3D hero phone shot)
// ═══════════════════════════════════════════════════════════════════════════════
const FORM_DUR  = 210;
const LOAD_DUR  = 150;
const RES_START = FORM_DUR + LOAD_DUR;

const contextCopy = [
  { title: "Tell us your vibe.",         sub: "City, date, and what you're feeling.\nThat's all we need." },
  { title: "AI does the heavy lifting.", sub: "Gemini searches and curates your\nperfect day in real time." },
  { title: "Your itinerary, ready.",     sub: "Tap any venue, get directions,\nor export to your calendar." },
];

const PlanScreen: React.FC<{ localFrame: number }> = ({ localFrame }) => (
  <Img
    src={staticFile("img/iphone_plan_screen.png")}
    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: fadeIn(localFrame, 0, 15) }}
  />
);

const LoadingScreen: React.FC<{ localFrame: number }> = ({ localFrame }) => (
  <div style={{ width: "100%", height: "100%", overflow: "hidden", opacity: fadeIn(localFrame, 0, 12) }}>
    <Video
      src={staticFile("iphone_loading_clip.mp4")}
      startFrom={60}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);

const ResultsScreen: React.FC<{ localFrame: number }> = ({ localFrame }) => (
  <Img
    src={staticFile("img/iphone_results_screen.png")}
    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: fadeIn(localFrame, 0, 15) }}
  />
);

const DemoScene: React.FC = () => {
  const f = useCurrentFrame();

  const showLoading = f >= FORM_DUR;
  const showResults = f >= RES_START;
  const ctxIdx      = showResults ? 2 : showLoading ? 1 : 0;
  const ctx         = contextCopy[ctxIdx];
  const ctxBase     = showResults ? RES_START : showLoading ? FORM_DUR : 0;

  // Phone entrance
  const phoneSpring = sp(f, 5, 14, 70);
  const phoneY      = interpolate(phoneSpring, [0, 1], [90, 0]);
  const phoneOp     = fadeIn(f, 3, 20);

  // Text
  const labelOp = fadeIn(f, 8, 26);
  const ctxOp   = fadeIn(f, ctxBase + 2, ctxBase + 20);
  const ctxY    = riseUp(f, ctxBase + 2, ctxBase + 20, 22);

  return (
    <SceneWrap f={f} dur={DUR.demo} glowColor={C.pink} glowPos="65% 50%" glowColor2={C.blue} glowPos2="20% 65%">
      {/* Secondary blue glow on left */}
      <div
        style={{
          position: "absolute", left: -100, top: "30%",
          width: 600, height: 400,
          background: `radial-gradient(ellipse, ${C.blue}0a 0%, transparent 70%)`,
          filter: "blur(60px)", pointerEvents: "none",
        }}
      />

      {/* Left copy — absolutely positioned, vertically centered */}
      <div
        style={{
          position: "absolute",
          left: 140, top: "50%",
          transform: "translateY(-50%)",
          maxWidth: 700,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: sans, fontWeight: 600, fontSize: 14,
            color: C.blue, letterSpacing: "0.14em", textTransform: "uppercase",
            marginBottom: 24, opacity: labelOp,
          }}
        >
          Plan Your Perfect Day
        </div>

        <div
          style={{
            fontFamily: serif, fontSize: 62, color: C.white,
            letterSpacing: "0.03em", lineHeight: 1.1,
            marginBottom: 20,
            opacity: ctxOp, transform: `translateY(${ctxY}px)`,
          }}
        >
          {ctx.title}
        </div>

        <div
          style={{
            fontFamily: sans, fontWeight: 400, fontSize: 24,
            color: C.muted, lineHeight: 1.7,
            whiteSpace: "pre-line",
            opacity: ctxOp, transform: `translateY(${ctxY}px)`,
          }}
        >
          {ctx.sub}
        </div>

        {/* Step indicators — glass pills */}
        <div style={{ display: "flex", gap: 10, marginTop: 40 }}>
          {["Tell us", "AI plans", "You explore"].map((s, i) => {
            const active = ctxIdx === i;
            return (
              <div
                key={s}
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: active
                    ? `linear-gradient(135deg, ${C.blue}, ${C.pink})`
                    : C.glass,
                  border: active ? "none" : `1px solid ${C.border}`,
                  fontFamily: sans, fontWeight: 600, fontSize: 13,
                  color: active ? C.white : C.muted,
                  opacity: fadeIn(f, 24 + i * 8, 38 + i * 8),
                  boxShadow: active ? `0 4px 20px ${C.blue}40` : "none",
                }}
              >
                {s}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — 3D iPhone hero shot, absolutely centered */}
      <div
        style={{
          position: "absolute",
          right: 120, top: "50%",
          transform: `translateY(calc(-50% + ${phoneY}px))`,
          opacity: phoneOp,
        }}
      >
        <PhoneHero frame={f} tiltY={-10}>
          {!showLoading && !showResults && <PlanScreen    localFrame={f} />}
          {showLoading  && !showResults && <LoadingScreen localFrame={f - FORM_DUR} />}
          {showResults                  && <ResultsScreen localFrame={f - RES_START} />}
        </PhoneHero>
      </div>
    </SceneWrap>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 5 — CITIES (glass city pills + explore phone)
// ═══════════════════════════════════════════════════════════════════════════════
const cityList = [
  { name: "London",    flag: "🇬🇧" }, { name: "New York",  flag: "🗽" },
  { name: "Paris",     flag: "🇫🇷" }, { name: "Tokyo",     flag: "🇯🇵" },
  { name: "Rome",      flag: "🇮🇹" }, { name: "Barcelona", flag: "🇪🇸" },
  { name: "Sydney",    flag: "🇦🇺" }, { name: "Dubai",     flag: "🇦🇪" },
  { name: "Singapore", flag: "🇸🇬" }, { name: "Istanbul",  flag: "🇹🇷" },
  { name: "Hong Kong", flag: "🇭🇰" },
];

const CitiesScene: React.FC = () => {
  const f = useCurrentFrame();
  const titleOp = fadeIn(f, 0, 20);
  const titleY  = riseUp(f, 0, 20, 32);

  const phoneSpring = sp(f, 22, 14, 80);
  const phoneX      = interpolate(phoneSpring, [0, 1], [140, 0]);
  const phoneOp     = fadeIn(f, 20, 40);

  return (
    <SceneWrap f={f} dur={DUR.cities} glowColor={C.blue} glowPos="50% 50%" glowColor2={C.violet} glowPos2="75% 30%">
      {/* Left — title + city pills, vertically centered */}
      <div
        style={{
          position: "absolute",
          left: 120, top: "50%",
          transform: `translateY(-50%)`,
          maxWidth: 780,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: serif, fontSize: 68, color: C.white,
            letterSpacing: "0.04em", lineHeight: 1.1,
            marginBottom: 12,
            opacity: titleOp, transform: `translateY(${titleY}px)`,
          }}
        >
          11 cities.{"\n"}
          <span style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Infinite days.
          </span>
        </div>

        <div
          style={{
            fontFamily: sans, fontWeight: 400, fontSize: 20,
            color: C.muted, marginBottom: 40,
            opacity: fadeIn(f, 14, 32),
          }}
        >
          More destinations launching soon
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 780 }}>
          {cityList.map((city, i) => {
            const s = sp(f, 24 + i * 7, 14, 120);
            const active = i === 0;
            return (
              <div
                key={city.name}
                style={{
                  padding:      "10px 20px",
                  background:   active ? `linear-gradient(135deg, ${C.blue}, ${C.pink})` : C.glass,
                  border:       active ? "none" : `1px solid ${C.border}`,
                  borderRadius: 40,
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  transform:    `scale(${s})`,
                  boxShadow:    active ? `0 4px 20px ${C.blue}35` : "none",
                }}
              >
                <span style={{ fontSize: 16 }}>{city.flag}</span>
                <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 15, color: active ? C.white : "rgba(255,255,255,0.75)" }}>
                  {city.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — 3D explore phone, vertically centered */}
      <div
        style={{
          position: "absolute",
          right: 100, top: "50%",
          transform: `translateY(-50%) translateX(${phoneX}px)`,
          opacity: phoneOp,
        }}
      >
        <PhoneHero frame={f} tiltY={10} glowColor1={C.blue} glowColor2={C.violet}>
          <Img
            src={staticFile("img/iphone_explore_screen.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </PhoneHero>
      </div>
    </SceneWrap>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 6 — TRACTION (glowing counters)
// ═══════════════════════════════════════════════════════════════════════════════
const tStats = [
  { end: 4.8, suffix: "★", label: "App Store Rating", color: C.pink,   decimals: 1 },
  { end: 11,  suffix: "",  label: "Cities Worldwide",  color: C.blue,   decimals: 0 },
  { end: 500, suffix: "+", label: "Venues Per City",   color: C.violet, decimals: 0 },
];

const TractionScene: React.FC = () => {
  const f = useCurrentFrame();

  return (
    <SceneWrap f={f} dur={DUR.traction} glowColor={C.violet} glowPos="50% 50%" glowColor2={C.blue} glowPos2="30% 70%">
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: sans, fontWeight: 600, fontSize: 16,
            color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase",
            marginBottom: 60, opacity: fadeIn(f, 0, 18),
          }}
        >
          Why travelers choose Plan
        </div>

        <div style={{ display: "flex", gap: 110, alignItems: "flex-end" }}>
          {tStats.map((st, i) => {
            const d   = 14 + i * 22;
            const sv  = sp(f, d, 12, 48);
            const raw = interpolate(sv, [0, 1], [0, st.end]);
            const num = st.decimals > 0 ? raw.toFixed(st.decimals) : Math.round(raw);

            // Scale pulse when counter "lands" — overshoot then settle
            const landFrame = d + 28;
            const pulse = f > landFrame
              ? 1 + 0.03 * Math.exp(-(f - landFrame) / 5) * Math.cos((f - landFrame) * 0.9)
              : interpolate(sv, [0, 1], [0.5, 1.0]);

            return (
              <div key={i} style={{ textAlign: "center", transform: `scale(${pulse})` }}>
                <div
                  style={{
                    fontFamily: serif, fontSize: 130,
                    letterSpacing: "-0.02em", lineHeight: 1,
                    background: `linear-gradient(180deg, ${st.color}, ${st.color}88)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: `drop-shadow(0 0 30px ${st.color}30)`,
                  }}
                >
                  {num}{st.suffix}
                </div>
                <div
                  style={{
                    fontFamily: sans, fontWeight: 500, fontSize: 19,
                    color: C.muted, marginTop: 12,
                    opacity: fadeIn(f, d + 18, d + 34),
                  }}
                >
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// SCENE 7 — CTA (return to brand pink — emotional bookend)
// ═══════════════════════════════════════════════════════════════════════════════
const CTAScene: React.FC = () => {
  const f = useCurrentFrame();

  // Pink panel rises from bottom
  const pinkY = interpolate(f, [0, 35], [1080, 0], { ...clamp, easing: ease });

  const contentOp = fadeIn(f, 40, 62);
  const contentY  = riseUp(f, 40, 62, 30);
  const logoS     = sp(f, 48, 10);
  const urlOp     = fadeIn(f, 90, 110);
  const barW      = interpolate(f, [90, DUR.cta - 20], [0, 400], clamp);

  // Venue phone floats in
  const phoneSpring = sp(f, 75, 12, 90);
  const phoneY      = interpolate(phoneSpring, [0, 1], [120, 0]);
  const phoneOp     = fadeIn(f, 72, 95);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(160deg, #f7a0c8 0%, ${C.pink} 35%, #e47aad 70%, #c96fa0 100%)`,
          transform: `translateY(${pinkY}px)`,
          overflow: "hidden",
        }}
      >
        {/* Ambient light blobs — soft depth without noisy text */}
        <div
          style={{
            position: "absolute", top: "-20%", left: "-10%",
            width: "60%", height: "70%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)",
            filter: "blur(60px)", pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-10%", right: "-10%",
            width: "50%", height: "60%",
            background: `radial-gradient(ellipse, ${C.blue}15 0%, transparent 70%)`,
            filter: "blur(80px)", pointerEvents: "none",
          }}
        />

        {/* Main content */}
        <AbsoluteFill
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            opacity: contentOp, transform: `translateY(${contentY}px)`,
          }}
        >
          {/* App icon */}
          <div
            style={{
              width: 80, height: 140,
              background: "rgba(0,0,0,0.85)",
              borderRadius: 60,
              border: "7px solid rgba(255,255,255,0.2)",
              marginBottom: 28,
              transform: `scale(${logoS})`,
              overflow: "hidden",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ width: 36, height: 60, background: C.pink, borderRadius: "50% 50% 0 0", marginBottom: -2 }} />
          </div>

          <div
            style={{
              fontFamily: serif, fontSize: 140, color: C.white,
              letterSpacing: "0.1em", lineHeight: 1,
              textShadow: "0 8px 60px rgba(0,0,0,0.15)",
            }}
          >
            PLAN
          </div>

          <div
            style={{
              fontFamily: sans, fontWeight: 500, fontSize: 24,
              color: "rgba(255,255,255,0.8)",
              marginTop: 20, letterSpacing: "0.04em",
              opacity: urlOp,
            }}
          >
            planyourperfectday.app
          </div>

          {/* Progress bar */}
          <div
            style={{
              marginTop: 24, width: 400, height: 3,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 2, overflow: "hidden", opacity: urlOp,
            }}
          >
            <div
              style={{
                height: "100%", width: barW, borderRadius: 2,
                background: `linear-gradient(90deg, ${C.blue}, rgba(255,255,255,0.8))`,
              }}
            />
          </div>
        </AbsoluteFill>

        {/* iPhone venue screen — bottom-right */}
        <div
          style={{
            position: "absolute", bottom: 50, right: 70,
            transform: `translateY(${phoneY}px) scale(0.7)`,
            transformOrigin: "bottom right",
            opacity: phoneOp,
          }}
        >
          <IPhoneMockup>
            <Img
              src={staticFile("img/iphone_venue_screen.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          </IPhoneMockup>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// ROOT COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════
export const YCDemoDay: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sequence from={S.opener}   durationInFrames={DUR.opener}>   <OpenerScene />   </Sequence>
    <Sequence from={S.hook}     durationInFrames={DUR.hook}>     <HookScene />     </Sequence>
    <Sequence from={S.problem}  durationInFrames={DUR.problem}>  <ProblemScene />  </Sequence>
    <Sequence from={S.demo}     durationInFrames={DUR.demo}>     <DemoScene />     </Sequence>
    <Sequence from={S.cities}   durationInFrames={DUR.cities}>   <CitiesScene />   </Sequence>
    <Sequence from={S.traction} durationInFrames={DUR.traction}> <TractionScene /> </Sequence>
    <Sequence from={S.cta}      durationInFrames={DUR.cta}>      <CTAScene />      </Sequence>
  </AbsoluteFill>
);
