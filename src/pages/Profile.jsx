import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Star,
  Zap,
  Target,
  Package2,
  Trash2,
  AlertTriangle,
  Edit2,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatsRadar from "@/components/home/StatsRadar";
import AdSlot from "@/components/ads/AdSlot";
import { useNavigate } from "react-router-dom";
import { Preferences } from "@capacitor/preferences";
import { getFullDestinyData } from "@/components/services/calculator/destinyCalculator";

const EMOJI_MAP = {
  동전: "🪙",
  볼펜: "🖊️",
  돌: "🪨",
  반지: "💍",
  라벤더: "🌸",
  포스트잇: "📝",
  식물: "🌿",
  거울: "🪞",
  열쇠: "🗝️",
  컵: "☕",
  이어폰: "🎧",
  스티커: "🏷️",
  책: "📖",
  수첩: "📓",
  향: "🕯️",
};
const getEmoji = (name = "") => {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return "✨";
};

function CharmVault({ charms, onDelete }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
        행운 보관함 ({charms.length})
      </h3>
      {charms.length === 0 ? (
        <div className="text-center py-10">
          <Package2 className="w-8 h-8 text-gray-200 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-slate-400">
            모은 행운이 없습니다.
          </p>
          <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
            상점에서 첫 행운을 획득해보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {charms.map((charm, i) => (
              <motion.div
                key={charm.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#2E3447] rounded-2xl border border-gray-100 dark:border-[#424B63] p-4 relative shadow-sm"
              >
                <button
                  onClick={() => onDelete(charm.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
                <span className="text-3xl block mb-2">
                  {charm.emoji || getEmoji(charm.name)}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 pr-6">
                  {charm.name}
                </p>
                <p className="text-xs text-purple-500 dark:text-purple-300">
                  {charm.effect}
                </p>
                <p className="text-[10px] text-gray-300 dark:text-slate-500 mt-1">
                  {charm.obtained_date}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ResetConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="bg-white dark:bg-[#2E3447] rounded-3xl w-full max-w-sm p-6 border border-transparent dark:border-[#424B63] shadow-2xl"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            정말 초기화할까요?
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-300 leading-relaxed">
            모든 데이터(프로필, 일정, 할 일, 행운, 기록 등)가
            <br />
            <span className="font-bold text-red-500 dark:text-red-400 whitespace-nowrap">
              영구적으로 삭제
            </span>
            됩니다. 이 작업은 복구할 수 없습니다.
          </p>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-[#1A1F2E] text-gray-600 dark:text-slate-300 font-semibold text-sm"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm"
            >
              초기화
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showVault, setShowVault] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoal, setEditedGoal] = useState("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const { data: completedActions = [] } = useQuery({
    queryKey: ["completedActions"],
    queryFn: () => base44.entities.MicroAction.filter({ completed: true }),
  });
  const { data: charms = [] } = useQuery({
    queryKey: ["charms"],
    queryFn: () => base44.entities.CharmItem.list("-created_date"),
  });

  const deleteCharmMutation = useMutation({
    mutationFn: (id) => base44.entities.CharmItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["charms"] }),
  });
  const updateGoalMutation = useMutation({
    mutationFn: (newGoal) =>
      base44.entities.UserProfile.update(profile.id, { goal: newGoal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setIsEditingGoal(false);
    },
  });

  const profile = profiles?.[0];

  const handleEditGoal = () => {
    setEditedGoal(profile?.goal || "");
    setIsEditingGoal(true);
  };
  const handleSaveGoal = async () => {
    setIsSavingGoal(true);
    try {
      const updatedProfile = await updateGoalMutation.mutateAsync(editedGoal);

      // ── 목표 변경 시 destiny summary 재계산 후 저장 ──────
      try {
        const destinyData = getFullDestinyData({
          ...profile,
          goal: editedGoal,
        });
        await Preferences.set({
          key: "local-app_setting_destiny_summary",
          value: JSON.stringify(destinyData.summary_for_ai),
        });
      } catch (e) {
        console.error("destiny 재저장 실패:", e);
      }
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await base44.storage.clear();
      queryClient.clear();
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate("/Onboarding", { replace: true });
      window.location.reload();
    } catch (error) {
      console.error("초기화 중 오류 발생:", error);
      alert("초기화에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile) return null;

  const xpProgress = (profile.xp || 0) % 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <AnimatePresence>
        {showResetModal && (
          <ResetConfirmModal
            onConfirm={handleReset}
            onCancel={() => setShowResetModal(false)}
          />
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest mb-1">
          내 프로필
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {profile.full_name}
        </h1>

        {isEditingGoal ? (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={editedGoal}
              onChange={(e) => setEditedGoal(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-[#424B63] bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-400 dark:focus:border-purple-500"
              placeholder="목표 작성하기"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-[#1A1F2E] text-gray-600 dark:text-slate-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-[#262B3D] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveGoal}
                disabled={isSavingGoal}
                className="flex-1 py-2 rounded-lg bg-purple-500 dark:bg-purple-600 text-white text-xs font-semibold hover:bg-purple-600 dark:hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSavingGoal ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {profile.goal || "목표를 설정합니다"}
            </p>
            <button
              onClick={handleEditGoal}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E3447] transition-colors text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 space-y-4">
        {/* 레벨 카드 — 네온 아웃라인으로 변경 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-400 to-blue-400 dark:bg-transparent rounded-3xl p-6 text-white dark:text-purple-300 shadow-lg dark:border dark:border-purple-500/50 relative overflow-hidden shadow-lg"
        >
          {/* 다크모드 그라디언트 덮기 */}
          <div className="absolute inset-0 hidden dark:block rounded-3xl bg-[#121212]" />
          {/* 다크모드 네온 글로우 */}
          <div
            className="absolute inset-0 hidden dark:block rounded-3xl"
            style={{
              boxShadow:
                "inset 0 0 30px rgba(167,139,250,0.1), 0 0 30px rgba(167,139,250,0.15)",
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 dark:bg-purple-500/20 dark:border dark:border-purple-500/40 flex items-center justify-center">
                  <Star
                    className="w-6 h-6 text-white dark:text-purple-300"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                    레벨
                  </p>
                  <span className="text-4xl font-black dark:text-purple-200">
                    {profile.level || 1}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold opacity-95 dark:text-purple-300">
                {profile.xp || 0} XP
              </span>
            </div>
            <div className="h-3 bg-white/20 dark:bg-purple-900/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-yellow-200 dark:bg-purple-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs mt-3 font-medium opacity-90 dark:text-purple-300">
              다음 레벨까지 {100 - xpProgress} XP
            </p>
            <AdSlot
              type="banner"
              adUnitId="ca-app-pub-3940256099942544/6300978111"
              className="mt-4 bg-white/10 dark:bg-purple-500/10 border-white/20 dark:border-purple-500/30"
            />
          </div>
        </motion.div>

        {/* 스탯 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-4 text-center shadow-md">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-5 h-5 text-purple-500 dark:text-purple-300" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {completedActions.length}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-400 font-medium uppercase tracking-wider">
              완료한 액션
            </p>
          </div>
          <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-4 text-center shadow-md">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-orange-500 dark:text-orange-300" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {profile.level || 1}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-slate-400 font-medium uppercase tracking-wider">
              현재 레벨
            </p>
          </div>
          <button
            onClick={() => setShowVault((v) => !v)}
            className={`shadow-md rounded-3xl border p-4 text-center transition-all ${
              showVault
                ? "bg-purple-500 border-purple-500"
                : "bg-white dark:bg-[#2E3447] border-gray-100 dark:border-[#424B63]"
            }`}
          >
            <Package2
              className={`w-5 h-5 mx-auto mb-1 ${
                showVault
                  ? "text-white"
                  : "text-purple-500 dark:text-purple-300"
              }`}
            />
            <p
              className={`text-xl font-bold ${
                showVault ? "text-white" : "text-gray-900 dark:text-white"
              }`}
            >
              {charms.length}
            </p>
            <p
              className={`text-[10px] font-medium uppercase tracking-wider ${
                showVault
                  ? "text-white/80"
                  : "text-gray-400 dark:text-slate-400"
              }`}
            >
              행운 보관함
            </p>
          </button>
        </div>

        {/* 행운 보관함 */}
        <AnimatePresence>
          {showVault && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CharmVault
                charms={charms}
                onDelete={(id) => deleteCharmMutation.mutate(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Radar */}
        <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-6 shqadow-md">
          <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            오늘의 에너지
          </h3>
          <StatsRadar stats={profile.base_stats} />
        </div>

        {/* 특성 태그 */}
        {profile.traits && (
          <div className="space-y-3">
            {profile.traits.strengths?.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-teal-500 dark:text-teal-400 uppercase tracking-wider mb-2">
                  💪 강점
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.traits.strengths.map((s, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-teal-50 dark:bg-teal-800/30 text-teal-700 dark:text-teal-300 rounded-full text-sm font-medium border border-teal-100 dark:border-teal-700/50"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.traits.potentials?.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-2">
                  ✨ 잠재력
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.traits.potentials.map((p, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-purple-50 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-100 dark:border-purple-700/50"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.traits.weaknesses?.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-2">
                  🌱 성장 포인트
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.traits.weaknesses.map((w, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-orange-50 dark:bg-orange-800/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium border border-orange-100 dark:border-orange-700/50"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AdSlot
          type="banner"
          adUnitId="ca-app-pub-3940256099942544/6300978111"
        />

        {/* 초기화 버튼 */}
        <div className="pt-4 pb-2">
          <button
            onClick={() => setShowResetModal(true)}
            disabled={resetting}
            className="w-full py-3 rounded-2xl border-2 border-red-200 dark:border-red-800/60 text-red-400 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {resetting ? "초기화 중..." : "데이터 초기화"}
          </button>
          <p className="text-center text-[10px] text-gray-300 dark:text-slate-600 mt-2">
            모든 데이터가 삭제되고 처음부터 시작됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
