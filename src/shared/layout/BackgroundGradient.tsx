"use client";

import { memo } from "react";
import clsx from "clsx";

type BackgroundGradientProps = {
  className?: string;
  highlights?: boolean;
  glass?: boolean;
  stops?: [string, string, string, string];
};

function BackgroundGradient({
  className,
  highlights = true,
  glass = true,
  stops = ["#ced7dc", "#eaebed", "#f6efec", "#f8e7e0"],
}: BackgroundGradientProps) {
  const [c1, c2, c3, c4] = stops;

  return (
    <div className={clsx("fixed -inset-2 -z-10 pointer-events-none", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${c1} 0%, ${c2} 33%, ${c3} 66%, ${c4} 100%)`,
        }}
      />
      {highlights && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(620px_320px_at_18%_15%,rgba(111,145,232,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_85%_82%,rgba(151,170,214,0.12),transparent_62%)]" />
        </>
      )}
      {glass && <div className="absolute inset-0 bg-white/8" />}
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}

export default memo(BackgroundGradient);
