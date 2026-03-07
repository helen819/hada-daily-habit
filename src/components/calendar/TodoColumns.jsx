import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

function TodoCard({ todo, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-gray-100 p-3 shadow-sm transition-opacity ${
        todo.completed ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(todo)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            todo.completed
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-green-400"
          }`}
        >
          {todo.completed && <Check className="w-3 h-3 text-green-500" />}
        </button>
        <p
          className="text-sm text-gray-800 flex-1 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {todo.title}
        </p>
        {todo.micro_step && (
          <button onClick={() => setExpanded((v) => !v)}>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
            )}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && todo.micro_step && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-purple-500 mt-2 pl-7 leading-relaxed"
          >
            💡 {todo.micro_step}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TodoColumns({ todos, onToggle }) {
  const [activeTab, setActiveTab] = useState("active");
  const active = (todos || []).filter((t) => !t.completed);
  const done = (todos || []).filter((t) => t.completed);
  const list = activeTab === "active" ? active : done;

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "active"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-400"
          }`}
        >
          진행 중 {active.length > 0 && <span className="ml-1 text-purple-400">{active.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("done")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "done"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-400"
          }`}
        >
          완료 {done.length > 0 && <span className="ml-1 text-green-400">{done.length}</span>}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-4">
            {activeTab === "active" ? "진행 중인 할 일이 없어요" : "완료한 할 일이 없어요"}
          </p>
        ) : (
          <AnimatePresence>
            {list.map((t) => (
              <TodoCard key={t.id} todo={t} onToggle={onToggle} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}