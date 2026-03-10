import React, { useState, useRef, useCallback, useEffect } from "react";
import AdSlot from "@/components/ads/AdSlot";
import AdModal from "@/components/shop/AdModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Sparkles, Palette, MessageCircle, Target, Clover } from "lucide-react";
import { base44 } from "@/api/base44Client"; // 추가

const statIcons = {
  work_efficiency: Target,
  creativity: Palette,
  communication: MessageCircle,
  focus: Sparkles,
  fortune: Clover,
};

const cardBackGradients = {
  work_efficiency: "from-purple-400 to-violet-500",
  creativity: "from-fuchsia-400 to-purple-500",
  communication: "from-pink-400 to-rose-500",
  focus: "from-blue-400 to-sky-500",
  fortune: "from-amber-400 to-yellow-500",
};

const cardFrontColors = {
  work_efficiency: "from-purple-50 to-violet-50 border-purple-200",
  creativity: "from-fuchsia-50 to-purple-50 border-fuchsia-200",
  communication: "from-pink-50 to-rose-50 border-pink-200",
  focus: "from-blue-50 to-sky-50 border-blue-200",
  fortune: "from-amber-50 to-yellow-50 border-amber-200",
};

const iconColors = {
  work_efficiency: "text-purple-600",
  creativity: "text-fuchsia-600",
  communication: "text-pink-600",
  focus: "text-blue-600",
  fortune: "text-amber-600",
};

const borderColors = {
  work_efficiency: "border-purple-400",
  creativity: "border-fuchsia-400",
  communication: "border-pink-400",
  focus: "border-blue-400",
  fortune: "border-amber-400",
};

// 상세 모달
function TarotDetailModal({ action, onClose, onAdd, added, onNext, onPrev }) {
  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient =
    cardBackGradients[action.stat_focus] || "from-purple-400 to-indigo-500";
  const borderColor = borderColors[action.stat_focus] || "border-purple-400";
  const progress = 65;

  // TarotDetailModal 컴포넌트 내부
  useEffect(() => {
    // 모달이 열릴 때 클래스 추가
    document.body.classList.add("modal-open");
    return () => {
      // 모달이닫힐 때 클래스 제거
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 touch-none"
      onClick={onClose}
      onScroll={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white rounded-3xl w-full max-w-sm shadow-2xl border-l-4 ${borderColor} overflow-hidden`}
      >
        {/* 상단 헤더 영역 */}
        <div
          className={`bg-gradient-to-r ${backGradient} p-5 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              {action.keyword}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* 3. 본문 영역: 배경색이 투명하지 않도록 다시 한번 bg-white 확인 */}
        <div className="p-6 space-y-5 bg-white">
          <p className="text-xl font-black text-gray-800 leading-snug">
            {action.micro_action}
          </p>

          {/* 진행도 바 영역 */}
          {/* <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500">오늘 진행도</p>
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                65%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
                style={{ width: `65%` }}
              />
            </div>
          </div> */}

          {/* 설명 텍스트 영역 */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed break-keep">
              {action.how}
              {action.fortune && (
                <span className="block mt-2 text-purple-600 font-medium">
                  ✨ {action.fortune}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              onAdd();
              onClose();
            }}
            disabled={added}
            className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              added
                ? "bg-green-100 text-green-600"
                : "bg-purple-500 text-white shadow-lg shadow-purple-100"
            }`}
          >
            {added ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {added ? "할일에 추가됨" : "할일 목록에 추가"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MiniTarotCard({ action, onAddToTodo, onNext, onPrev }) {
  const [flipped, setFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // 🔥 focus 값이 없거나 잘못되었을 때를 대비해 "focus"를 기본값으로 사용
  const focusKey =
    action.stat_focus && statIcons[action.stat_focus]
      ? action.stat_focus
      : "focus";

  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient =
    cardBackGradients[action.stat_focus] || "from-purple-400 to-indigo-500";
  const frontColors =
    cardFrontColors[action.stat_focus] ||
    "from-gray-50 to-gray-50 border-gray-200";
  const iconColor = iconColors[action.stat_focus] || "text-gray-500";

  const handleAdd = (e) => {
    e?.stopPropagation();
    if (!added) {
      onAddToTodo(action.micro_action);
      setAdded(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showDetail && (
          <TarotDetailModal
            action={action}
            onClose={() => setShowDetail(false)}
            onAdd={handleAdd}
            added={added}
            onNext={onNext}
            onPrev={onPrev}
          />
        )}
      </AnimatePresence>

      <div
        className={`relative cursor-pointer transition-opacity ${
          added ? "opacity-40 pointer-events-none" : ""
        }`}
        style={{ perspective: "800px", height: "150px" }}
        onClick={() => !flipped && !added && setFlipped(true)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{
            transformStyle: "preserve-3d",
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Back (앞면 - 닫힌 상태) */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div
              className={`w-full h-full bg-gradient-to-br ${backGradient} flex flex-col items-center justify-center gap-1`}
            >
              <div className="text-white/40 text-2xl font-serif select-none">
                ✦
              </div>
              <p className="text-white/70 text-[10px] font-semibold tracking-widest uppercase">
                열기
              </p>
            </div>
          </div>

          {/* Front (뒤집혔을 때 - 미션만 표시) */}
          <div
            className={`absolute inset-0 rounded-xl border bg-gradient-to-br ${frontColors} p-3`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex", // Flex 적용
              flexDirection: "column", // 세로 정렬
              height: "100%", // 높이 100%
            }}
          >
            {/* 상단: 아이콘 + 텍스트 영역 (가변 높이 확보) */}
            <div className="flex items-start gap-1.5 flex-1 min-h-0 overflow-hidden">
              <div
                className={`w-5 h-5 rounded-md bg-white/70 flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.5} />
              </div>
              {/* line-clamp-4: 최대 4줄까지만 보여주고 나머지는 ... 처리 */}
              <p className="text-[11px] font-black text-gray-800 leading-snug flex-1 line-clamp-4 overflow-hidden break-keep">
                {action.micro_action}
              </p>
            </div>

            {/* 하단: 버튼 영역 (카드 하단에 고정) */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/60 hover:bg-white active:scale-90 transition-all"
              >
                <Maximize2
                  className="w-3.5 h-3.5 text-gray-500"
                  strokeWidth={1.5}
                />
              </button>
              <button
                onClick={handleAdd}
                className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${
                  added
                    ? "bg-green-100 text-green-600"
                    : "bg-purple-100 text-purple-500 hover:bg-purple-200"
                }`}
              >
                {added ? (
                  <Check className="w-3 h-3" strokeWidth={1.5} />
                ) : (
                  <Plus className="w-3 h-3" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// 광고 카드 (카드와 동일한 크기)
function AdCard() {
  return (
    <div
      className="relative rounded-xl border border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 flex flex-col items-center justify-center gap-2"
      style={{ height: "150px" }}
    >
      <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-purple-400" strokeWidth={1.5} />
      </div>
      <p className="text-[10px] font-semibold text-purple-300 uppercase tracking-widest">
        AD
      </p>
    </div>
  );
}

// 무한 순환 카드 캐러셀
function InfiniteCardCarousel({ actions, onAddToTodo }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1: left, 1: right
  const [showFullAd, setShowFullAd] = useState(false);
  const swipeCount = useRef(0);
  const storageKey =
    "tarotSwipeCount_" + new Date().toISOString().split("T")[0];

  // [수정] 오늘의 누적 스와이프 횟수 복원 (Preferences 사용)
  useEffect(() => {
    const loadSwipeCount = async () => {
      const savedCount = await base44.storage.get(storageKey);
      swipeCount.current = parseInt(savedCount || "0", 10);
    };
    loadSwipeCount();
  }, [storageKey]);
  // 3~5장마다 랜덤하게 광고 1개 삽입
  const items = [];
  let nextAdAt = Math.floor(Math.random() * 3) + 3; // 3~5
  actions.forEach((action, i) => {
    items.push({ type: "card", action });
    if (i + 1 === nextAdAt) {
      items.push({ type: "ad" });
      nextAdAt += Math.floor(Math.random() * 3) + 3;
    }
  });

  const total = items.length;
  const containerRef = useRef(null);
  const touchStartX = useRef(null);
  const isAnimating = useRef(false);

  // [수정] 스와이프 횟수 저장 및 광고 체크
  const checkAndShowAd = async () => {
    swipeCount.current += 1;
    // Preferences에 저장
    await base44.storage.set(storageKey, String(swipeCount.current));

    if (swipeCount.current % 10 === 0) {
      setShowFullAd(true);
    }
  };

  const goLeft = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    checkAndShowAd();
    setTimeout(() => {
      isAnimating.current = false;
    }, 350);
  };

  const goRight = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
    checkAndShowAd();
    setTimeout(() => {
      isAnimating.current = false;
    }, 350);
  };

  const handleAreaClick = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) goLeft();
    else goRight();
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) diff > 0 ? goRight() : goLeft();
    touchStartX.current = null;
  };

  // 현재 + 앞뒤 2장씩 보이도록 슬라이딩 윈도우
  const getVisible = () => {
    const cards = [];
    for (let offset = -2; offset <= 2; offset++) {
      const idx = (currentIndex + offset + total) % total;
      cards.push({ idx, offset });
    }
    return cards;
  };

  return (
    <React.Fragment>
      <AdModal
        visible={showFullAd}
        onClose={() => setShowFullAd(false)}
        closeLabel="계속 보기 ✨"
      />
      <div className="relative" style={{ height: 175 }}>
        {/* 좌/우 클릭 영역 */}
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-pointer z-10"
          onClick={handleAreaClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        {/* 카드들 */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ overflow: "hidden" }}
        >
          <AnimatePresence initial={false} custom={direction}>
            {getVisible().map(({ idx, offset }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);
              const xPos = offset * 95;
              const scale = isCenter ? 1 : 1 - absOffset * 0.1;
              const opacity = isCenter ? 1 : 1 - absOffset * 0.3;
              const zIndex = 10 - absOffset;

              return (
                <motion.div
                  key={idx}
                  custom={direction}
                  initial={
                    isCenter
                      ? { x: direction * 130, opacity: 0.3, scale: 0.85 }
                      : false
                  }
                  animate={{ x: xPos, scale, opacity }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                    mass: 0.8,
                  }}
                  style={{
                    position: "absolute",
                    width: 120,
                    zIndex,
                    pointerEvents: isCenter ? "auto" : "none",
                  }}
                >
                  {items[idx].type === "ad" ? (
                    <AdCard />
                  ) : (
                    <MiniTarotCard
                      action={items[idx].action}
                      onAddToTodo={onAddToTodo}
                      onNext={goRight}
                      onPrev={goLeft}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 좌우 화살표 힌트 */}
        {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none pl-0.5">
          <ChevronLeft className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none pr-0.5">
          <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
        </div> */}

        {/* 인디케이터 */}
        {/* <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-0.5 pointer-events-none z-20">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? item.type === "ad"
                    ? "w-3 h-1.5 bg-purple-200"
                    : "w-3 h-1.5 bg-purple-400"
                  : "w-1.5 h-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div> */}
      </div>
    </React.Fragment>
  );
}

export default function TarotSection({
  actions,
  onAddToTodo,
  isLoading,
  userGoal,
}) {
  const today = new Date().toISOString().split("T")[0];
  const storageKey = `tarotCollapsed_${today}`;

  // [수정] 초기 상태를 비동기로 불러와야 하므로 useEffect 사용
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const loadCollapsedState = async () => {
      const savedState = await base44.storage.get(storageKey);
      setCollapsed(savedState === "true");
    };
    loadCollapsedState();
  }, [storageKey]);

  // [수정] 토글 시 저장 로직
  const handleToggle = async () => {
    const newState = !collapsed;
    setCollapsed(newState);
    await base44.storage.set(storageKey, String(newState));
  };

  const list = (actions || []).slice(0, 9);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          행운 실천
        </h3>
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="flex gap-2 justify-center py-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[150px] w-[120px] rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            ) : list.length > 0 ? (
              <InfiniteCardCarousel actions={list} onAddToTodo={onAddToTodo} />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
