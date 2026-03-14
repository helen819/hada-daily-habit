import React from "react";

export default function AdSlot({ type = "banner", adUnitId, className = "" }) {
  if (type === "banner") {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-50 dark:bg-[#2E3447] border border-dashed border-gray-200 dark:border-[#4A5270] rounded-xl overflow-hidden ${className}`}
        style={{ minHeight: 50, height: 50 }}
        data-ad-unit={adUnitId}
        data-ad-type="banner"
      >
        <span className="text-[10px] text-gray-300 dark:text-slate-400 font-medium tracking-wider uppercase select-none">
          Advertisement
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex items-center justify-center bg-gray-50 dark:bg-[#2E3447] border border-dashed border-gray-200 dark:border-[#4A5270] rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 90 }}
      data-ad-unit={adUnitId}
      data-ad-type="native"
    >
      <span className="text-[10px] text-gray-300 dark:text-slate-400 font-medium tracking-wider uppercase select-none">
        Advertisement
      </span>
    </div>
  );
}
