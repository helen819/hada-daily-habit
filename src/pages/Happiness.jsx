import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import HappinessInput from "@/components/happiness/HappinessInput";
import HappinessCard from "@/components/happiness/HappinessCard";
import HappinessPoster from "@/components/happiness/HappinessPoster";
import FireworksEffect from "@/components/happiness/FireworksEffect";
import AdModal from "@/components/shop/AdModal";
import AdSlot from "@/components/ads/AdSlot";

export default function Happiness() {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [fullRecords, setFullRecords] = useState([]);
  const [isFetchingFull, setIsFetchingFull] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["happinessRecords"],
    queryFn: () => base44.entities.HappinessRecord.list("-created_at", 10),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HappinessRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["happinessRecords"] });
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 1200);
    },
  });

  const handleOpenStorage = async () => {
    setShowAd(true);
    setIsFetchingFull(true);
    try {
      const allData = await base44.entities.HappinessRecord.list("created_at");
      setFullRecords(allData);
    } catch (error) {
      console.error("전체 기록 조회 실패:", error);
    } finally {
      setIsFetchingFull(false);
    }
  };

  const generateSummary = async () => {
    if (records.length < 3) return;
    setSummaryLoading(true);
    const texts = records.slice(0, 10).map((r) => r.text);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 사용자의 '행복 기록을 모아서'
              따뜻하게 요약하는 엔진이다.

              최근 기록 ${texts.length}개:
              ${JSON.stringify(texts)}

              [작성 규칙]
              - header_text: 25자 이내. 감정 담은 제목형 문구.
                줄바꿈 금지.
              - encouragement: 50자 이내.
                '지금도 충분히 잘하고 있다' 메시지 필수.
                줄바꿈 금지. 비교·경쟁 표현 금지.
              - 기록에 없는 내용 추측 금지.`,
      response_json_schema: {
        type: "object",
        properties: {
          header_text: { type: "string" },
          encouragement: { type: "string" },
        },
      },
    });
    setSummary(res);
    setSummaryLoading(false);
  };

  React.useEffect(() => {
    if (records.length >= 3 && !summary) generateSummary();
  }, [records, summary]);

  const latestRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
  }, [records]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <FireworksEffect visible={showFireworks} />

      <AnimatePresence>
        {showPoster && (
          <HappinessPoster
            records={fullRecords}
            onClose={() => setShowPoster(false)}
          />
        )}
      </AnimatePresence>

      <AdModal
        visible={showAd}
        onClose={() => {
          setShowAd(false);
          setShowPoster(true);
        }}
      />

      {/* 배너 광고 */}
      <div className="px-5 pt-5">
        <AdSlot
          type="banner"
          adUnitId="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
        />
      </div>

      {/* 헤더 */}
      <div className="px-5 pt-4 pb-4">
        <p className="text-xs font-semibold text-pink-500 dark:text-pink-400 uppercase tracking-widest mb-1">
          행복 기록
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          마음의 기록 💕
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          매일 모으는 나만의 행복 기록
        </p>
      </div>

      <div className="px-5 space-y-5">
        {/* 요약 카드 */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#2E3447] border border-gray-100 dark:border-[#424B63] rounded-3xl p-5 shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-800/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-300" />
              </div>
              <p className="text-xs font-bold text-pink-500 dark:text-pink-300 uppercase tracking-wider">
                요약
              </p>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-white mb-1">
              {summary.header_text}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {summary.encouragement}
            </p>
          </motion.div>
        )}

        {/* 요약 로딩 */}
        {summaryLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-pink-400 dark:text-pink-300 mr-2" />
            <span className="text-sm text-gray-400 dark:text-slate-400">
              요약 생성 중...
            </span>
          </div>
        )}
        {/* 입력 */}
        <HappinessInput
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
        />

        {/* 최근 카드 목록 */}
        {records.length > 0 && (
          <div className="space-y-3">
            {latestRecords.map((record, i) => (
              <HappinessCard key={record.id} record={record} index={i} />
            ))}
          </div>
        )}

        {/* 행복 보관함 버튼 */}
        {records.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleOpenStorage}
            className="w-full bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-950/40 dark:to-rose-950/40 border border-pink-200 dark:border-pink-900/50 rounded-3xl px-6 py-4 flex flex-col items-center gap-3 hover:shadow-lg dark:hover:shadow-none transition-shadow"
          >
            <div className="text-5xl">✨</div>
            <div>
              <p className="text-sm font-bold text-pink-700 dark:text-pink-400">
                행복 보관함
              </p>
              <p className="text-xs text-pink-600 dark:text-pink-500">
                행복 기록 모아 보기
              </p>
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
}
