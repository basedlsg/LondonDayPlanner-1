import React from "react";
import { Composition } from "remotion";
import { YCDemoDay } from "./compositions/YCDemoDay";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Primary: YC Demo Day pitch video (60s, 16:9) ── */}
      <Composition
        id="YCDemoDay"
        component={YCDemoDay}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
