import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import MiniCalendar from "@/components/calendar/MiniCalendar";
import AddScheduleModal from "@/components/calendar/AddScheduleModal";
import MicroActionSheet from "@/components/calendar/MicroActionSheet";
import TodoColumns from "@/components/calendar/TodoColumns";
import AdSlot from "@/components/ads/AdSlot";
import SchedulePopup from "@/components/calendar/SchedulePopup";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [monthlyFortune, setMonthlyFortune] = useState(null);

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
    mutationFn: ({ id, completed }) =>
      base44.entities.Todo.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const markedDates = useMemo(
    () => [...new Set(schedules.map((s) => s.date))],
    [schedules],
  );

  // 날짜별 뱃지 계산: heart(행복기록), rest(할일적음), fire(할일완료), star(일정많음)
  const dateBadges = useMemo(() => {
    const map = {};

    // 행복 기록 있는 날 → heart
    happinessRecords.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = new Set();
      map[r.date].add("heart");
    });

    // 날짜별 todo 분석
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
      if (total >= 2 && ratio >= 0.7) map[date].add("fire"); // 많이 완료
      else if (total > 0 && ratio <= 0.2) map[date].add("rest"); // 거의 못함
    });

    // 일정 많은 날 → star
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

    // Set → Array
    const result = {};
    Object.entries(map).forEach(([date, set]) => {
      result[date] = [...set];
    });
    return result;
  }, [happinessRecords, todos, schedules]);

  // 기존 dot 호환용
  const dateKeywords = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s.category || "personal");
    });
    return map;
  }, [schedules]);

  // 🔥 1. 삭제 Mutation 추가
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduleItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      // 만약 팝업에 표시할 일정이 하나도 없게 되면 팝업 닫기 (선택 사항)
    },
  });

  const CATEGORY_COLORS = {
    work: "bg-blue-400",
    health: "bg-green-400",
    personal: "bg-purple-400",
    social: "bg-pink-400",
  };

  useEffect(() => {
    if (!profile) return;
    const key = `monthlyFortune_${year}_${month + 1}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setMonthlyFortune(cached);
      return;
    }
    base44.integrations.Core.InvokeLLM({
      prompt: `너는 HADA 운세 엔진이다. 사용자 정보를 바탕으로 ${year}년 ${
        month + 1
      }월의 월간 운세를 한 문장(30자 이내)으로만 답하라.
사용자: ${profile.full_name}, 목표: ${profile.goal}
base_stats: ${JSON.stringify(profile.base_stats)}
반드시 긍정적이고 간결하게, 이모지 1개 포함.`,
      response_json_schema: {
        type: "object",
        properties: { fortune: { type: "string" } },
      },
    }).then((res) => {
      if (res?.fortune) {
        setMonthlyFortune(res.fortune);
        sessionStorage.setItem(key, res.fortune);
      }
    });
  }, [profile, year, month]);

  const selectedSchedules = useMemo(
    () =>
      selectedDate ? schedules.filter((s) => s.date === selectedDate) : [],
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

  const saveMicroAction = async (schedule, microAction) => {
    await base44.entities.ScheduleItem.update(schedule.id, {
      micro_action: microAction,
    });
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
    setActiveSchedule(null);
  };

  const handleMonthChange = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/20 to-white pb-24">
      <AddScheduleModal
        visible={showAdd}
        defaultDate={today}
        onClose={() => setShowAdd(false)}
        onAdd={(data) => addMutation.mutate(data)}
      />

      {activeSchedule && (
        <MicroActionSheet
          schedule={activeSchedule}
          profile={profile}
          onClose={() => setActiveSchedule(null)}
          onSave={saveMicroAction}
        />
      )}

      {showPopup && (
        <SchedulePopup
          date={selectedDate}
          schedules={selectedSchedules}
          badges={dateBadges?.[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onToggle={(s, completed) =>
            toggleMutation.mutate({ id: s.id, completed })
          }
          onMicroAction={(s) => setActiveSchedule(s)}
          // 🔥 2. 삭제 핸들러 전달
          onDelete={(id) => {
            if (window.confirm("이 일정을 삭제하시겠습니까?")) {
              deleteMutation.mutate(id);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-start justify-between">
        <div className="flex-1 mr-3">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">
            HADA
          </p>
          <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
          {monthlyFortune ? (
            <p className="text-xs text-blue-600 font-semibold mt-1 leading-relaxed">
              {monthlyFortune}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              날짜를 누르면 일정을 확인합니다.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="mt-8 w-10 h-10 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Mini Calendar */}
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

        {/* 네이티브 광고 - 캘린더 하단 */}
        <AdSlot
          type="native"
          adUnitId="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
        />

        {/* Todo columns */}
        <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-md">
          <p className="text-sm font-bold text-gray-700 mb-3">할 일 목록</p>
          <TodoColumns
            todos={todos}
            onToggle={(todo) =>
              toggleTodoMutation.mutate({
                id: todo.id,
                completed: !todo.completed,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
