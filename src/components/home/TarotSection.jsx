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
} from "lucide-react";
import { Sparkles, Palette, MessageCircle, Target, Clover } from "lucide-react";
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

// 950→800으로 올려서 배경 대비 확실히 밝게
const cardFrontColors = {
  work_efficiency:
    "from-purple-50 to-violet-50 border-purple-200 dark:from-purple-800/40 dark:to-violet-800/40 dark:border-purple-500/60",
  creativity:
    "from-fuchsia-50 to-purple-50 border-fuchsia-200 dark:from-fuchsia-800/40 dark:to-purple-800/40 dark:border-fuchsia-500/60",
  communication:
    "from-pink-50 to-rose-50 border-pink-200 dark:from-pink-800/40 dark:to-rose-800/40 dark:border-pink-500/60",
  focus:
    "from-blue-50 to-sky-50 border-blue-200 dark:from-blue-800/40 dark:to-sky-800/40 dark:border-blue-500/60",
  fortune:
    "from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-800/40 dark:to-yellow-800/40 dark:border-amber-500/60",
};

const iconColors = {
  work_efficiency: "text-purple-600 dark:text-purple-300",
  creativity: "text-fuchsia-600 dark:text-fuchsia-300",
  communication: "text-pink-600 dark:text-pink-300",
  focus: "text-blue-600 dark:text-blue-300",
  fortune: "text-amber-600 dark:text-amber-300",
};

const borderColors = {
  work_efficiency: "border-purple-400",
  creativity: "border-fuchsia-400",
  communication: "border-pink-400",
  focus: "border-blue-400",
  fortune: "border-amber-400",
};

function TarotDetailModal({ action, onClose, onAdd, added }) {
  const Icon = statIcons[action.stat_focus] || Sparkles;
  const backGradient =
    cardBackGradients[action.stat_focus] || "from-purple-400 to-indigo-500";
  const borderColor = borderColors[action.stat_focus] || "border-purple-400";

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-5 touch-none"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white dark:bg-[#2E3447] rounded-3xl w-full max-w-sm border-l-4 ${borderColor} overflow-hidden shadow-2xl`}
      >
        {/* 헤더 */}
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

        {/* 본문 */}
        <div className="p-6 space-y-5 bg-white dark:bg-[#2E3447]">
          <p className="text-xl font-black text-gray-800 dark:text-white leading-snug">
            {action.micro_action}
          </p>
          <div className="bg-gray-50 dark:bg-[#1A1F2E] rounded-2xl p-4 border border-gray-100 dark:border-[#424B63]">
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed break-keep">
              {action.how}
              {action.fortune && (
                <span className="block mt-2 text-purple-600 dark:text-purple-300 font-medium">
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
                ? "bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-300"
                : "bg-purple-500 dark:bg-purple-600 text-white shadow-lg"
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

function MiniTarotCard({ action, onAddToTodo, todos, onNext, onPrev }) {
  const [flipped, setFlipped] = useState(false);
  const [added, setAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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
    if (!isAlreadyAdded) onAddToTodo(action.micro_action);
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
              <div className="text-white/40 text-2xl font-serif select-none">
                ✦
              </div>
              <p className="text-white/70 text-[10px] font-semibold tracking-widest uppercase">
                열기
              </p>
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
                className={`w-5 h-5 rounded-md bg-white/70 dark:bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.5} />
              </div>
              <p className="text-[11px] font-black text-gray-800 dark:text-white leading-snug flex-1 line-clamp-4 overflow-hidden break-keep">
                {action.micro_action}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 dark:border-white/15 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(true);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/60 dark:bg-white/15 hover:bg-white dark:hover:bg-white/25 active:scale-90 transition-all"
              >
                <Maximize2
                  className="w-3.5 h-3.5 text-gray-500 dark:text-slate-300"
                  strokeWidth={1.5}
                />
              </button>
              <button
                onClick={handleAdd}
                disabled={isAlreadyAdded}
                className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all ${
                  added
                    ? "bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-300"
                    : "bg-purple-100 dark:bg-purple-700/50 text-purple-500 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-700/70"
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

function AdCard() {
  return (
    <div
      className="relative rounded-xl border border-dashed border-purple-300 dark:border-purple-600/60 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-800/30 dark:to-violet-800/30 flex flex-col items-center justify-center gap-2"
      style={{ height: "150px" }}
    >
      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-700/50 flex items-center justify-center">
        <Sparkles
          className="w-4 h-4 text-purple-400 dark:text-purple-300"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-[10px] font-semibold text-purple-300 dark:text-purple-400 uppercase tracking-widest">
        AD
      </p>
    </div>
  );
}

function InfiniteCardCarousel({ actions, onAddToTodo, todos }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showFullAd, setShowFullAd] = useState(false);
  const swipeCount = useRef(0);
  const storageKey = "tarotSwipeCount_" + getKSTDateString();

  useEffect(() => {
    const loadSwipeCount = async () => {
      const savedCount = await base44.storage.get(storageKey);
      swipeCount.current = parseInt(savedCount || "0", 10);
    };
    loadSwipeCount();
  }, [storageKey]);

  const items = [];
  let nextAdAt = Math.floor(Math.random() * 3) + 3;
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
                  {items[idx].type === "ad" ? (
                    <AdCard />
                  ) : (
                    <MiniTarotCard
                      action={items[idx].action}
                      onAddToTodo={onAddToTodo}
                      todos={todos}
                      onNext={goRight}
                      onPrev={goLeft}
                    />
                  )}
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

  const list = (actions || []).slice(0, 9);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
          행운 실천
        </h3>
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E3447] transition-colors"
        >
          {collapsed ? (
            <ChevronDown
              className="w-4 h-4 text-gray-400 dark:text-slate-400"
              strokeWidth={1.5}
            />
          ) : (
            <ChevronUp
              className="w-4 h-4 text-gray-400 dark:text-slate-400"
              strokeWidth={1.5}
            />
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
                    className="h-[150px] w-[120px] rounded-xl bg-gray-100 dark:bg-[#2E3447] animate-pulse"
                  />
                ))}
              </div>
            ) : list.length > 0 ? (
              <InfiniteCardCarousel
                actions={list}
                onAddToTodo={onAddToTodo}
                todos={todos}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
