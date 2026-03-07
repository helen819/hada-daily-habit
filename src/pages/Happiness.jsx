import React, { useState } from "react";
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

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["happinessRecords"],
    queryFn: () => base44.entities.HappinessRecord.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HappinessRecord.create(data),
    onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["happinessRecords"] });
    setShowFireworks(true);
    setTimeout(() => setShowFireworks(false), 1200);
    },
  });

  const generateSummary = async () => {
    if (records.length < 3) return;
    setSummaryLoading(true);
    const texts = records.slice(0, 10).map((r) => r.text);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `너는 사용자의 '행복 기록'을 모아서 한 줄로 요약하는 엔진이다.
최근 기록들: ${JSON.stringify(texts)}
항상 '지금도 충분히 잘하고 있다'는 메시지를 담아라. 비교/경쟁 느낌 금지.`,
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
    if (records.length >= 3 && !summary) {
      generateSummary();
    }
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/20 to-white pb-24">
      <FireworksEffect visible={showFireworks} />
      {/* Poster */}
      <AnimatePresence>
        {showPoster && (
          <HappinessPoster records={records} onClose={() => setShowPoster(false)} />
        )}
      </AnimatePresence>

      {/* Ad Modal */}
      <AdModal visible={showAd} onClose={() => { setShowAd(false); setShowPoster(true); }} />

      {/* 배너 광고 - 헤더 위 */}
      <div className="px-5 pt-5">
        <AdSlot type="banner" adUnitId="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" />
      </div>

      <div className="px-5 pt-4 pb-4">
        <div>
          <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mb-1">행복 기록</p>
          <h1 className="text-2xl font-bold text-gray-900">마음의 기록 💕</h1>
          <p className="text-sm text-gray-500 mt-1">매일 모으는 나만의 행복 기록</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-3xl p-5 shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-pink-500" />
              </div>
              <p className="text-xs font-bold text-pink-500 uppercase tracking-wider">요약</p>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">{summary.header_text}</p>
            <p className="text-xs text-gray-500">{summary.encouragement}</p>
          </motion.div>
        )}
        {summaryLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-pink-400 mr-2" />
            <span className="text-sm text-gray-400">요약 생성 중...</span>
          </div>
        )}

        {/* Input */}
         <HappinessInput onSubmit={(data) => createMutation.mutate(data)} isSubmitting={createMutation.isPending} />

        {/* 저장된 행복 카드 목록 (최근 3개) */}
        {records.length > 0 && (
          <div className="space-y-3">
            {records.slice(0, 3).map((record, i) => (
              <HappinessCard key={record.id} record={record} index={i} />
            ))}
          </div>
        )}

        {/* 행복 뽑아 보기 */}
         {records.length > 0 && (
           <motion.button
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             onClick={() => setShowAd(true)}
             className="w-full bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-200 rounded-3xl px-6 py-4 flex flex-col items-center gap-3 hover:shadow-lg transition-shadow"
           >
             <div className="text-5xl">✨</div>
             <div>
               <p className="text-sm font-bold text-pink-700">행복 보관함</p>
               <p className="text-xs text-pink-600">행복 기록 뽑아 보기</p>
             </div>
           </motion.button>
         )}
      </div>
    </div>
  );
}