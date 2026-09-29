import React, { useState } from "react";

interface ChryselysLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon-only" | "badge" | "light";
  showTagline?: boolean;
}

export const ChryselysLogo: React.FC<ChryselysLogoProps> = ({
  className = "",
  size = "md",
  variant = "full",
  showTagline = true,
}) => {
  const [imageError, setImageError] = useState(false);

  const dimensionMap = {
    xs: { icon: 26, textTitle: "text-xs", textSub: "text-[8px]" },
    sm: { icon: 34, textTitle: "text-sm", textSub: "text-[9px]" },
    md: { icon: 44, textTitle: "text-base", textSub: "text-[10px]" },
    lg: { icon: 58, textTitle: "text-xl", textSub: "text-xs" },
    xl: { icon: 84, textTitle: "text-2xl", textSub: "text-sm" },
  };

  const { icon, textTitle, textSub } = dimensionMap[size] || dimensionMap.md;

  const MosaicEmblem = () => {
    if (!imageError) {
      return (
        <img
          src="/chryselys-logo.jpg"
          alt="Chryselys Logo"
          className="rounded-full object-cover shrink-0 select-none shadow-2xs"
          style={{ width: icon, height: icon }}
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 select-none"
        aria-label="Chryselys Mosaic Logo"
      >
        <rect width="200" height="200" rx="100" fill="#FFFFFF" />

        <g transform="translate(100, 100)">
          {[-120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const r = 50;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            const colors = ["#C58237", "#1E3B54", "#DDA15E", "#2B4D6F", "#B07D46", "#CBB093"];
            const color = colors[i % colors.length];
            return (
              <rect
                key={`b1-${i}`}
                x={-4}
                y={-2.5}
                width={8}
                height={5}
                rx={1}
                fill={color}
                transform={`translate(${x}, ${y}) rotate(${deg + 90})`}
              />
            );
          })}

          {[-130, -112, -94, -76, -58, -40, -22, -4, 14, 32, 50, 68, 86, 104, 122, 140, 158, 176, 194, 212, 230].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const r = 58;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            const colors = ["#1F3851", "#C58237", "#D49557", "#2D4C69", "#E0B98A", "#1F3851"];
            const color = colors[i % colors.length];
            return (
              <rect
                key={`b2-${i}`}
                x={-4.5}
                y={-3}
                width={9}
                height={5.5}
                rx={1}
                fill={color}
                transform={`translate(${x}, ${y}) rotate(${deg + 90})`}
              />
            );
          })}

          {[-140, -120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const r = 67;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            const colors = ["#D08838", "#2B4D6E", "#E5C4A3", "#C58237", "#1E3B54", "#DFBCA0"];
            const color = colors[i % colors.length];
            return (
              <rect
                key={`b3-${i}`}
                x={-5}
                y={-3}
                width={10}
                height={6}
                rx={1}
                fill={color}
                transform={`translate(${x}, ${y}) rotate(${deg + 90})`}
              />
            );
          })}

          {[-150, -135, -120, -105, -90, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const r = 78 + (i % 3) * 4;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            const colors = ["#C58237", "#2B4D6E", "#E8CBB0", "#1E3B54", "#D89547"];
            const color = colors[i % colors.length];
            return (
              <circle
                key={`b4-${i}`}
                cx={x}
                cy={y}
                r={i % 2 === 0 ? 2.5 : 1.8}
                fill={color}
                opacity={0.85}
              />
            );
          })}

          <text
            x="0"
            y="-2"
            textAnchor="middle"
            fontFamily="'Cinzel', 'Georgia', 'Times New Roman', serif"
            fontSize="14"
            fontWeight="700"
            fill="#C58237"
            letterSpacing="0.16em"
          >
            CHRYSELYS
          </text>
          <text
            x="0"
            y="11"
            textAnchor="middle"
            fontFamily="'Georgia', 'Times New Roman', serif"
            fontSize="6.5"
            fontWeight="600"
            fill="#0A425C"
            letterSpacing="0.04em"
          >
            Data. Impacts. Lives
          </text>
        </g>
      </svg>
    );
  };

  if (variant === "badge" || variant === "icon-only") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <MosaicEmblem />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <MosaicEmblem />

      <div className="flex flex-col justify-center">
        <span
          className={`font-serif font-bold uppercase leading-none tracking-wider ${textTitle} ${
            variant === "light" ? "text-amber-400" : "text-[#C58237]"
          }`}
          style={{
            fontFamily: "'Cinzel', Georgia, 'Times New Roman', serif",
            letterSpacing: "0.14em",
          }}
        >
          CHRYSELYS
        </span>

        {showTagline && (
          <span
            className={`font-serif font-medium mt-0.5 leading-tight ${textSub} ${
              variant === "light" ? "text-slate-200" : "text-[#0A425C]"
            }`}
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.04em",
            }}
          >
            Data. Impacts. Lives
          </span>
        )}
      </div>
    </div>
  );
};
