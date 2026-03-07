import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Moon } from "lucide-react";

export default function ModeCard({ data, onDismiss }) {
  const [visible, setVisible] = useState(true);

  if (!visible || !data) return null;

  const handleDismiss = () => {
    onDismiss?.();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative"
          >
            <button onClick={handleDismiss} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              {data.suggested_mode === "action" ? (
                <div className="p-2 rounded-xl bg-purple-100"><Zap className="w-4 h-4 text-purple-600" /></div>
              ) : (
                <div className="p-2 rounded-xl bg-indigo-100"><Moon className="w-4 h-4 text-indigo-600" /></div>
              )}
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">모드 추천</p>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">{data.card_title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{data.card_body}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}