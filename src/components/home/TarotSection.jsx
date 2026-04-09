import React, { useState, useRef, useEffect, useMemo } from "react";
import AdModal from "@/components/shop/AdModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Maximize2,
  X,
  Clock,
} from "lucide-react";
import {
  Sparkles,
  Palette,
  MessageCircle,
  Target,
  Clover,
  Loader2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getKSTDateString } from "@/utils/date";

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
  work_efficiency:
    "from-violet-50 to-purple-50 border-violet-200 dark:from-violet-950/50 dark:to-purple-950/50 dark:border-violet-800/50",
  creativity:
    "from-fuchsia-50 to-purple-50 border-fuchsia-200 dark:from-fuchsia-950/50 dark:to-purple-950/50 dark:border-fuchsia-800/50",
  communication:
    "from-pink-50 to-rose-50 border-pink-200 dark:from-pink-950/50 dark:to-rose-950/50 dark:border-pink-800/50",
  focus:
    "from-sky-50 to-blue-50 border-sky-200 dark:from-sky-950/50 dark:to-blue-950/50 dark:border-sky-800/50",
  fortune:
    "from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/50 dark:to-yellow-950/50 dark:border-amber-800/50",
};

const iconColors = {
  work_efficiency: "text-violet-500 dark:text-violet-400",
  creativity: "text-fuchsia-500 dark:text-fuchsia-400",
  communication: "text-pink-500 dark:text-pink-400",
  focus: "text-sky-500 dark:text-sky-400",
  fortune: "text-amber-500 dark:text-amber-400",
};

const borderColors = {
  work_efficiency: "border-violet-300",
  creativity: "border-fuchsia-300",
  communication: "border-pink-300",
  focus: "border-sky-300",
  fortune: "border-amber-300",
};

const buttonColors = {
  work_efficiency:
    "bg-violet-200 hover:bg-violet-300 dark:bg-violet-800/60 dark:hover:bg-violet-700/60 text-violet-900 dark:text-violet-200",
  creativity:
    "bg-fuchsia-200 hover:bg-fuchsia-300 dark:bg-fuchsia-800/60 dark:hover:bg-fuchsia-700/60 text-fuchsia-900 dark:text-fuchsia-200",
  communication:
    "bg-pink-200 hover:bg-pink-300 dark:bg-pink-800/60 dark:hover:bg-pink-700/60 text-pink-900 dark:text-pink-200",
  focus:
    "bg-sky-200 hover:bg-sky-300 dark:bg-sky-800/60 dark:hover:bg-sky-700/60 text-sky-900 dark:text-sky-200",
  fortune:
    "bg-amber-200 hover:bg-amber-300 dark:bg-amber-800/60 dark:hover:bg-amber-700/60 text-amber-900 dark:text-amber-200",
};

const buttonAddedColors = {
  work_efficiency:
    "bg-violet-100 dark:bg-violet-900/40 text-violet-500 dark:text-violet-400",
  creativity:
    "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-500 dark:text-fuchsia-400",
  communication:
    "bg-pink-100 dark:bg-pink-900/40 text-pink-500 dark:text-pink-400",
  focus: "bg-sky-100 dark:bg-sky-900/40 text-sky-500 dark:text-sky-400",
  fortune:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400",
};

const buttonBgColors = {
  work_efficiency:
    "bg-violet-100 dark:bg-violet-900/40 text-violet-500 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60",
  creativity:
    "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-500 dark:text-fuchsia-300 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/60",
  communication:
    "bg-pink-100 dark:bg-pink-900/40 text-pink-500 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800/60",
  focus:
    "bg-sky-100 dark:bg-sky-900/40 text-sky-500 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/60",
  fortune:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60",
};

// ─── HH 숫자 → 표시용 시간대 라벨 변환 ─────────────────────────
// AI / DB / 알람은 모두 HH("09","14","21") 기준으로 저장
// 화면에서만 오전/오후/저녁/밤으로 변환하여 표시
function hhToTimeSlotLabel(raw) {
  if (!raw) return null;
  const h = parseInt(raw, 10);
  if (isNaN(h)) return null;
  if (h >= 6 && h < 12) return "오전";
  if (h >= 12 && h < 18) return "오후";
  if (h >= 18 && h < 21) return "저녁";
  if (h >= 21 && h < 22) return "밤";
  return null; // 범위 밖이면 뱃지 미표시
}

// ─── 시간대 라벨별 뱃지 색상 ──────────────────────────────────
const timeSlotBadgeColors = {
  오전: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  오후: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  저녁: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  밤: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
};

function TarotDetailModal({ action, onClose, onAdd, added }) {
  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient =
    cardBackGradients[action.stat_focus] || "from-purple-400 to-indigo-500";
  const borderColor = borderColors[action.stat_focus] || "border-violet-300";
  const buttonColor =
    buttonColors[action.stat_focus] ||
    "bg-violet-200 hover:bg-violet-300 dark:bg-violet-800/60 text-violet-900 dark:text-violet-200";
  const buttonAddedColor =
    buttonAddedColors[action.stat_focus] ||
    "bg-violet-100 dark:bg-violet-900/40 text-violet-500 dark:text-violet-400";

  const timeSlot = hhToTimeSlotLabel(action.recommended_time);
  const timeBadgeStyle = timeSlot ? timeSlotBadgeColors[timeSlot] : null;

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 touch-none"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm border-l-4 ${borderColor} overflow-hidden shadow-2xl`}
      >
        {/* 헤더 */}
        <div
          className={`bg-gradient-to-r ${backGradient} p-5 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white/90 text-xs font-semibold uppercase tracking-widest">
                {action.keyword}
              </p>
              {timeSlot && timeBadgeStyle && (
                <span className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${timeBadgeStyle}`}>
                  <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                  {timeSlot} 추천
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" strokeWidth={1.5} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5 bg-white dark:bg-gray-900">
          <p className="text-xl font-black text-gray-800 dark:text-gray-100 leading-snug">
            {action.micro_action}
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-keep">
              {action.how}
              {action.fortune && (
                <span className="block mt-2 text-violet-500 dark:text-violet-400 font-medium">
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
            className={`w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
              added ? buttonAddedColor : buttonColor
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {added ? "할일에 추가됨" : "할일 목록에 추가"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MiniTarotCard({
  action,
  onAddToTodo,
  todos,
  onNext,
  onPrev,
  canFlip,
  onViewed,
}) {
  const [flipped, setFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const buttonBg =
    buttonBgColors[action.stat_focus] ||
    "bg-violet-100 dark:bg-violet-900/40 text-violet-500";

  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient =
    cardBackGradients[action.stat_focus] || "from-purple-400 to-indigo-500";
  const frontColors =
    cardFrontColors[action.stat_focus] ||
    "from-gray-50 to-gray-50 border-gray-200";
  const iconColor = iconColors[action.stat_focus] || "text-gray-500";

  const isAlreadyAdded = useMemo(() => {
    return todos?.some((todo) => todo.title === action.micro_action);
  }, [todos, action.micro_action]);

  const handleAdd = (e) => {
    e?.stopPropagation();
    if (!isAlreadyAdded) {
      onAddToTodo(action);
      setAdded(true);
    }
  };

  const handleFlip = async () => {
    if (!canFlip || flipped) return;
    setFlipped(true);
    if (!action.viewed) {
      await base44.entities.GoalAction.update(action.id, { viewed: true });
      onViewed?.();
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
            added={isAlreadyAdded}
            onNext={onNext}
            onPrev={onPrev}
          />
        )}
      </AnimatePresence>

      <div
        className={`relative cursor-pointer transition-opacity ${added ? "opacity-40" : ""}`}
        style={{ perspective: "800px", height: "150px" }}
        onClick={handleFlip}
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
          {/* 닫힌 상태 */}
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
              {canFlip ? (
                <>
                  <div className="text-white/40 text-2xl font-serif select-none">✦</div>
                  <p className="text-white/70 text-[10px] font-semibold tracking-widest uppercase">
                    열기
                  </p>
                </>
              ) : (
                <>
                  <div className="text-white/30 text-2xl font-serif select-none">✦</div>
                  <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">
                    준비중
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 열린 상태 */}
          <div
            className={`absolute inset-0 rounded-xl border bg-gradient-to-br ${frontColors} p-3`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div className="flex items-start gap-1.5 flex-1 min-h-0 overflow-hidden">
              <div
                className={`w-5 h-5 rounded-md bg-white/70 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.5} />
              </div>
              <p className="text-[11px] font-black text-gray-800 dark:text-gray-100 leading-snug flex-1 line-clamp-3 overflow-hidden break-keep">
                {action.micro_action}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 dark:border-white/10 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 active:scale-90 transition-all"
              >
                <Maximize2
                  className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
                  strokeWidth={1.5}
                />
              </button>
              <button
                onClick={handleAdd}
                disabled={isAlreadyAdded}
                className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${
                  isAlreadyAdded ? "opacity-50 cursor-not-allowed" : buttonBg
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

function InfiniteCardCarousel({
  actions,
  onAddToTodo,
  todos,
  canFlip,
  onViewed,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showFullAd, setShowFullAd] = useState(false);
  const swipeCount = useRef(0);
  const storageKey = "tarotSwipeCount_" + getKSTDateString();

  useEffect(() => {
    setDirection(0);
    setCurrentIndex(0);
  }, [actions.length]);

  useEffect(() => {
    const loadSwipeCount = async () => {
      const savedCount = await base44.storage.get(storageKey);
      swipeCount.current = parseInt(savedCount || "0", 10);
    };
    loadSwipeCount();
  }, [storageKey]);

  const items = actions.map((action) => ({ type: "card", action }));
  const total = items.length;
  const containerRef = useRef(null);
  const touchStartX = useRef(null);
  const isAnimating = useRef(false);

  const checkAndShowAd = async () => {
    swipeCount.current += 1;
    await base44.storage.set(storageKey, String(swipeCount.current));
    if (swipeCount.current % 10 === 0) setShowFullAd(true);
  };

  const goLeft = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    checkAndShowAd();
    setTimeout(() => { isAnimating.current = false; }, 350);
  };

  const goRight = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
    checkAndShowAd();
    setTimeout(() => { isAnimating.current = false; }, 350);
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
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-pointer z-10"
          onClick={handleAreaClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ overflow: "hidden" }}
        >
          <AnimatePresence initial={false} custom={direction}>
            {getVisible().map(({ idx, offset }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);
              return (
                <motion.div
                  key={idx}
                  custom={direction}
                  initial={
                    isCenter
                      ? { x: direction * 130, opacity: 0.3, scale: 0.85 }
                      : false
                  }
                  animate={{
                    x: offset * 95,
                    scale: isCenter ? 1 : 1 - absOffset * 0.1,
                    opacity: isCenter ? 1 : 1 - absOffset * 0.3,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                    mass: 0.8,
                  }}
                  style={{
                    position: "absolute",
                    width: 120,
                    zIndex: 10 - absOffset,
                    pointerEvents: isCenter ? "auto" : "none",
                  }}
                >
                  <MiniTarotCard
                    action={items[idx].action}
                    onAddToTodo={onAddToTodo}
                    todos={todos}
                    onNext={goRight}
                    onPrev={goLeft}
                    canFlip={canFlip}
                    onViewed={onViewed}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </React.Fragment>
  );
}

export default function TarotSection({
  actions,
  onAddToTodo,
  todos,
  isLoading,
  canFlip,
  onViewed,
}) {
  const today = getKSTDateString();
  const storageKey = `tarotCollapsed_${today}`;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const loadCollapsedState = async () => {
      const savedState = await base44.storage.get(storageKey);
      setCollapsed(savedState === "true");
    };
    loadCollapsedState();
  }, [storageKey]);

  const handleToggle = async () => {
    const newState = !collapsed;
    setCollapsed(newState);
    await base44.storage.set(storageKey, String(newState));
  };

  const list = useMemo(() => {
    return [...(actions || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 9);
  }, [actions]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <p className="text-[12px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest">
            오늘의 행운 실천 카드
          </p>
        </div>
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
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
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]" />
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  카드 생성 중...
                </p>
              </div>
            ) : list.length > 0 ? (
              <InfiniteCardCarousel
                actions={list}
                onAddToTodo={onAddToTodo}
                todos={todos}
                canFlip={canFlip}
                onViewed={onViewed}
              />
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-600">
                아직 생성된 카드가 없어요
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
