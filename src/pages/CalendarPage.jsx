import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import MiniCalendar from "@/components/calendar/MiniCalendar";
import AddScheduleModal from "@/components/calendar/AddScheduleModal";
import TodoColumns from "@/components/calendar/TodoColumns";
import AdSlot from "@/components/ads/AdSlot";
import SchedulePopup from "@/components/calendar/SchedulePopup";
import { getKSTDateString } from "@/utils/date";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = getKSTDateString();

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles?.[0];

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.ScheduleItem.list("-date"),
  });

  const { data: todos = [] } = useQuery({
    queryKey: ["todos"],
    queryFn: () => base44.entities.Todo.list("-created_date"),
  });

  const { data: happinessRecords = [] } = useQuery({
    queryKey: ["happinessRecords"],
    queryFn: () => base44.entities.HappinessRecord.list("-date"),
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const updated = await base44.entities.Todo.update(id, { completed });
      if (completed && profile) {
        const newXp = (profile.xp || 0) + 10;
        const newLevel = Math.floor(newXp / 100) + 1;
        await base44.entities.UserProfile.update(profile.id, { xp: newXp, level: newLevel });
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, completed }) =>
      base44.entities.ScheduleItem.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const markedDates = useMemo(
    () => [...new Set(schedules.map((s) => s.date))],
    [schedules],
  );

  const dateBadges = useMemo(() => {
    const map = {};
    happinessRecords.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add("heart");
    });
    const todosByDate = {};
    todos.forEach((t) => {
      const date = t.date || t.created_date?.split("T")[0];
      if (!date) return;
      if (!todosByDate[date]) todosByDate[date] = { total: 0, done: 0 };
      todosByDate[date].total++;
      if (t.completed) todosByDate[date].done++;
    });
    Object.entries(todosByDate).forEach(([date, { total, done }]) => {
      if (!map[date]) map[date] = new Set();
      const ratio = total > 0 ? done / total : 0;
      if (total >= 2 && ratio >= 0.7) map[date].add("fire");
      else if (total > 0 && ratio <= 0.2) map[date].add("rest");
    });
    const schedsByDate = {};
    schedules.forEach((s) => {
      if (!schedsByDate[s.date]) schedsByDate[s.date] = 0;
      schedsByDate[s.date]++;
    });
    Object.entries(schedsByDate).forEach(([date, count]) => {
      if (count >= 3) {
        if (!map[date]) map[date] = new Set();
        map[date].add("star");
      }
    });
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = [...set];
    });
    return result;
  }, [happinessRecords, todos, schedules]);

  const dateKeywords = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s.category || "personal");
    });
    return map;
  }, [schedules]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduleItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const CATEGORY_COLORS = {
    work: "bg-blue-400",
    health: "bg-green-400",
    personal: "bg-purple-400",
    social: "bg-pink-400",
  };

  const selectedSchedules = useMemo(
    () => selectedDate ? schedules.filter((s) => s.date === selectedDate) : [],
    [schedules, selectedDate],
  );

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduleItem.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) =>
      base44.entities.ScheduleItem.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const handleMonthChange = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const handleDateSelect = (date) => {
    const hasSchedule = markedDates.includes(date);
    const hasBadge = dateBadges?.[date]?.length > 0;
    if (hasSchedule || hasBadge) {
      setSelectedDate((prev) => (prev === date ? null : date));
    } else {
      setSelectedDate(null);
    }
  };

  const showPopup =
    selectedDate &&
    (selectedSchedules.length > 0 || dateBadges?.[selectedDate]?.length > 0);

  // 할 일 목록: 선택된 날짜 기준, 없으면 오늘
  const displayDate = selectedDate || today;

  const displayTodos = useMemo(
    () => todos.filter((t) => {
      const date = t.date || t.created_date?.split("T")[0];
      return date === displayDate;
    }),
    [todos, displayDate],
  );

  const displaySchedules = useMemo(
    () => schedules.filter((s) => s.date === displayDate),
    [schedules, displayDate],
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <AddScheduleModal
        visible={showAdd}
        defaultDate={today}
        onClose={() => setShowAdd(false)}
        onAdd={(data) => addMutation.mutate(data)}
      />

      {showPopup && (
        <SchedulePopup
          date={selectedDate}
          schedules={selectedSchedules}
          badges={dateBadges?.[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onToggle={(s, completed) => toggleMutation.mutate({ id: s.id, completed })}
          onDelete={(id) => {
            if (window.confirm("이 일정을 삭제하시겠습니까?")) {
              deleteMutation.mutate(id);
            }
          }}
        />
      )}

      {/* 헤더 */}
      <div className="px-5 pt-8 pb-4 flex items-start justify-between">
        <div className="flex-1 mr-3">
          <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">
            HADA
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">캘린더</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            날짜를 누르면 일정을 확인합니다.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="mt-8 w-10 h-10 bg-blue-500 dark:bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 dark:hover:bg-blue-400 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* 캘린더 */}
        <MiniCalendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          markedDates={markedDates}
          dateKeywords={dateKeywords}
          categoryColors={CATEGORY_COLORS}
          dateBadges={dateBadges}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
        />

        {/* 광고 */}
        <AdSlot type="native" adUnitId="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" />

        {/* 할 일 + 일정 목록 */}
        <div className="bg-white dark:bg-[#2E3447] rounded-3xl border border-gray-100 dark:border-[#424B63] p-4 shadow-md">
          <p className="text-sm font-bold text-gray-700 dark:text-white mb-3">
            {selectedDate && selectedDate !== today
              ? `${selectedDate.slice(5).replace("-", "월 ")}일 할 일`
              : "오늘 할 일"}
          </p>
          <TodoColumns
            todos={displayTodos}
            schedules={displaySchedules}
            onToggle={(todo) =>
              toggleTodoMutation.mutate({ id: todo.id, completed: !todo.completed })
            }
            onToggleSchedule={(schedule) =>
              toggleScheduleMutation.mutate({ id: schedule.id, completed: !schedule.completed })
            }
          />
        </div>
      </div>
    </div>
  );
}
