import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TodoSection({ todos, onAdd, onToggle, onConvert, isConverting }) {
  const [newTodo, setNewTodo] = useState("");

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    onAdd(newTodo.trim());
    setNewTodo("");
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">할 일</h3>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="새로운 할 일..."
          className="rounded-xl bg-gray-50 border-gray-200 text-sm"
        />
        <Button onClick={handleAdd} size="icon" className="rounded-xl bg-purple-500 hover:bg-purple-600 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence>
          {todos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3"
            >
              <button
                onClick={() => onToggle(todo)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  todo.completed ? "bg-green-100 border-green-400" : "border-gray-300"
                }`}
              >
                {todo.completed && <Check className="w-3 h-3 text-green-600" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${todo.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {todo.title}
                </p>
                {todo.micro_step && (
                  <p className="text-xs text-purple-500 mt-0.5">💡 {todo.micro_step}</p>
                )}
              </div>
              {!todo.micro_step && !todo.completed && (
                <button
                  onClick={() => onConvert(todo)}
                  disabled={isConverting}
                  className="text-purple-400 hover:text-purple-600 transition-colors"
                >
                  {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}