import React from "react";

/**
 * AdSlot - 구글 애드몹 광고 자리 컴포넌트
 * type: "banner" | "native"
 * adUnitId: 실제 광고 유닛 ID (추후 연동 시 사용)
 */
export default function AdSlot({ type = "banner", adUnitId, className = "" }) {
  if (type === "banner") {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-xl overflow-hidden ${className}`}
        style={{ minHeight: 50, height: 50 }}
        data-ad-unit={adUnitId}
        data-ad-type="banner"
      >
        <span className="text-[10px] text-gray-300 font-medium tracking-wider uppercase select-none">
          Advertisement
        </span>
      </div>
    );
  }

  // native
  return (
    <div
      className={`w-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 90 }}
      data-ad-unit={adUnitId}
      data-ad-type="native"
    >
      <span className="text-[10px] text-gray-300 font-medium tracking-wider uppercase select-none">
        Advertisement
      </span>
    </div>
  );
}