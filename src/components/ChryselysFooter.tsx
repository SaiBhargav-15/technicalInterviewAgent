import React from "react";
import { ChryselysLogo } from "./ChryselysLogo";

interface ChryselysFooterProps {
  className?: string;
}

export const ChryselysFooter: React.FC<ChryselysFooterProps> = ({ className = "" }) => {
  return (
    <footer
      id="chryselys-global-footer"
      className={`w-full bg-white border-t border-slate-200/80 py-4 px-4 lg:px-8 mt-auto shadow-2xs select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
        {/* Left: Chryselys Logo and Copyright */}
        <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center sm:justify-start">
          <ChryselysLogo size="sm" />
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-[11px] md:text-xs text-slate-500 font-normal">
            Copyright © 2026 Chryselys All rights reserved.
          </span>
        </div>

        {/* Right: Official domain & contact email matching the attachment */}
        <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-500 font-medium">
          <a
            href="https://www.chryselys.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#003B54] transition-colors"
          >
            www.chryselys.com
          </a>
          <span className="text-slate-300">|</span>
          <a
            href="mailto:info@chryselys.com"
            className="hover:text-[#D9822B] transition-colors"
          >
            info@chryselys.com
          </a>
        </div>
      </div>
    </footer>
  );
};
