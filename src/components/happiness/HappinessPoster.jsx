import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const CARD_THEMES = [
  {
    accent: "#8b5cf6",
    darkAccent: "#c4b5fd",
    pageBg: "#faf8ff",
    darkPageBg: "#1a1040",
    lineBg: "#ede9fe",
    darkLineBg: "#2e1a6b",
  },
  {
    accent: "#f43f5e",
    darkAccent: "#fda4af",
    pageBg: "#fff8f9",
    darkPageBg: "#2a0a15",
    lineBg: "#ffe4e6",
    darkLineBg: "#5c1a28",
  },
  {
    accent: "#f59e0b",
    darkAccent: "#fcd34d",
    pageBg: "#fffdf5",
    darkPageBg: "#251800",
    lineBg: "#fef3c7",
    darkLineBg: "#6b3800",
  },
  {
    accent: "#14b8a6",
    darkAccent: "#5eead4",
    pageBg: "#f5fffe",
    darkPageBg: "#001a18",
    lineBg: "#ccfbf1",
    darkLineBg: "#0f3d36",
  },
  {
    accent: "#6366f1",
    darkAccent: "#a5b4fc",
    pageBg: "#f8f8ff",
    darkPageBg: "#12103a",
    lineBg: "#e0e7ff",
    darkLineBg: "#252060",
  },
];

// ─────────────────────────────────────────────
// ⚠️ 테스트 데이터 — 배포 전 아래 블록 전체 삭제
// ─────────────────────────────────────────────
const TEST_RECORDS = [
  {
    id: "test-01",
    date: "2024-01-08",
    emoji: "🥰",
    text: "오늘 오전에 오랜만에 혼자 카페에 가서 따뜻한 라떼를 한 잔 마셨다. 창가 자리에 앉아 밖을 내다보니 사람들이 저마다의 발걸음으로 지나쳐 갔다. 누군가는 바쁘게 전화를 받으며 걷고, 누군가는 강아지와 함께 천천히 산책하고 있었다. 그 풍경을 아무 생각 없이 바라보는 것만으로도 마음이 따뜻해졌다. 요즘 너무 바쁘게 살았던 것 같은데, 이런 작은 쉼이 이렇게 소중한 줄 몰랐다. 커피 한 잔의 여유가 오늘 하루를 버티게 해준 것 같아서 고마웠다.",
    created_at: "2024-01-08T09:30:00Z",
  },
  {
    id: "test-02",
    date: "2024-01-15",
    emoji: "🥰",
    text: "저녁에 오랜 친구에게서 갑자기 전화가 왔다. 딱히 용건이 있는 건 아니고, 그냥 목소리가 듣고 싶었다고 했다. 우리는 한 시간 넘게 아무 의미 없는 이야기를 했다. 요즘 뭐 먹었는지, 어떤 드라마가 재밌는지, 예전에 같이 갔던 여행지 이야기. 전화를 끊고 나서 괜히 눈물이 날 것 같았다. 바쁘다는 핑계로 연락을 못 했는데, 그 친구가 먼저 손을 내밀어 줘서 참 다행이라는 생각이 들었다. 사람의 목소리가 이렇게 위로가 되는구나.",
    created_at: "2024-01-15T21:15:00Z",
  },
  {
    id: "test-03",
    date: "2024-02-03",
    emoji: "🥰",
    text: "오늘은 퇴근하면서 일부러 돌아서 공원을 지나왔다. 2월인데도 날이 포근해서 사람들이 꽤 나와 있었다. 벤치에 앉아있는 할머니 두 분이 서로 손을 잡고 이야기를 나누는 모습을 봤는데, 그게 왜인지 모르게 오래 눈에 밟혔다. 저렇게 오래된 우정이나 사랑을 가진 사람들은 세상이 어떻게 보일까. 나도 나이가 들어서도 저런 사람이 곁에 있었으면 좋겠다는 생각을 했다. 집에 오는 길이 유독 길게 느껴졌지만, 그 덕에 많은 것을 생각할 수 있었다.",
    created_at: "2024-02-03T18:40:00Z",
  },
  {
    id: "test-04",
    date: "2024-02-14",
    emoji: "🥰",
    text: "발렌타인데이라서 특별히 뭔가를 하려던 건 아니었는데, 퇴근길에 편의점에서 초콜릿을 하나 집어들었다. 그냥 나한테 주는 선물이라 생각하면서. 집에 와서 따뜻한 차를 끓이고 초콜릿을 하나씩 천천히 먹으면서 좋아하는 음악을 들었다. 누군가와 나눠 먹지 않아도, 오늘 이 순간이 충분히 달콤하다는 걸 알았다. 스스로를 아끼는 방법을 조금씩 배워가는 것 같아서 기분이 좋았다. 내가 나를 좋아해주는 것도 꽤 중요한 일이라는 걸 오늘 다시 느꼈다.",
    created_at: "2024-02-14T20:00:00Z",
  },
  {
    id: "test-05",
    date: "2024-03-05",
    emoji: "🥰",
    text: "베란다에 심어둔 작은 화분에서 새싹이 올라왔다. 겨우내 죽은 줄 알았는데 이렇게 살아있었다니. 아침에 물을 주려고 들여다봤다가 발견했을 때의 그 기분이란. 손가락 한 마디도 안 되는 작은 초록색 싹이었는데, 그게 그렇게 반가울 수가 없었다. 살아있다는 건 이런 거구나 싶었다. 아무도 안 봐주고, 물도 자주 못 줬는데 혼자서 꿋꿋이 살아남은 것이다. 오늘 하루 내내 그 새싹 생각이 났다. 나도 저 싹처럼 어떤 환경에서도 잘 자랄 수 있을 것 같다는 이상한 자신감이 생겼다.",
    created_at: "2024-03-05T08:00:00Z",
  },
  {
    id: "test-06",
    date: "2024-03-22",
    emoji: "🥰",
    text: "오랫동안 듣지 않았던 오래된 플레이리스트를 틀었다. 대학교 때 만들어뒀던 건데 첫 곡이 나오자마자 그때 기억이 쏟아졌다. 좁은 자취방, 과제하면서 들었던 노래들, 같이 밤새워 공부하던 친구들 얼굴. 어떤 노래에서는 웃음이 났고, 어떤 노래에서는 괜히 코끝이 찡했다. 음악이 이렇게 기억을 담아두는 그릇이 된다는 게 신기했다. 그 시절로 돌아가고 싶다기보다는, 그때의 나도 지금의 나도 모두 다 괜찮은 사람이라는 게 느껴졌다. 음악 하나가 하루를 완전히 다른 색으로 물들여 놓았다.",
    created_at: "2024-03-22T22:30:00Z",
  },
  {
    id: "test-07",
    date: "2024-04-10",
    emoji: "🥰",
    text: "점심시간에 동료랑 회사 근처 골목을 걷다가 작은 꽃집을 발견했다. 화분 하나에 튤립이 가득 피어있어서 멈춰서 사진을 찍었다. 꽃집 사장님이 활짝 웃으면서 예쁘죠? 라고 하셔서 같이 한참 꽃 이야기를 했다. 어떤 꽃이 이달에 예쁜지, 키우기 쉬운 화분은 뭔지. 원래는 점심을 빨리 먹고 돌아가려 했는데 그 짧은 대화가 너무 즐거워서 시간 가는 줄도 몰랐다. 낯선 사람과의 짧은 연결이 이렇게 기분 좋을 수 있다는 걸 새삼 느꼈다. 결국 작은 화분 하나 사들고 왔다.",
    created_at: "2024-04-10T12:45:00Z",
  },
  {
    id: "test-08",
    date: "2024-04-28",
    emoji: "🥰",
    text: "오늘 집에서 처음으로 직접 라멘을 만들었다. 유튜브 영상 보고 따라 한 건데 생각보다 훨씬 오래 걸렸다. 국물 우리는 데 두 시간, 면 삶고 토핑 준비하는 데 또 한 시간. 결국 저녁 아홉 시가 다 돼서야 먹었다. 한 입 먹는 순간 '이게 내가 만든 거야?' 싶을 정도로 맛있었다. 완벽하진 않았지만 내가 정성을 들인 음식이라는 게 느껴져서인지 더 맛있게 느껴졌다. 혼자 먹으면서 괜히 뿌듯해서 엄마한테 사진 보냈더니 '언제 해줄 거야?'라는 답장이 왔다. 그것도 기분 좋았다.",
    created_at: "2024-04-28T21:00:00Z",
  },
  {
    id: "test-09",
    date: "2024-05-12",
    emoji: "🥰",
    text: "주말 오전에 아무 계획 없이 집을 나섰다. 버스 탈 때도 목적지 없이 그냥 앞에 오는 버스에 탔다. 종점까지 갔더니 처음 가보는 동네였다. 재래시장이 있어서 들어갔는데, 할머니들이 직접 만든 나물이며 떡이며 가득했다. 순대 한 줄 사서 길 걷다 먹으면서, 이렇게 목적 없이 돌아다니는 것도 참 좋다는 생각을 했다. 늘 어딘가를 향해 달려가는 느낌이었는데, 오늘만큼은 방향도 목적도 없이 그냥 존재할 수 있었다. 저녁 무렵 집에 돌아오면서 괜히 어깨가 가벼워진 것 같았다.",
    created_at: "2024-05-12T10:00:00Z",
  },
  {
    id: "test-10",
    date: "2024-05-30",
    emoji: "🥰",
    text: "오랫동안 책상 서랍에 넣어뒀던 책을 꺼냈다. 작년에 샀는데 첫 페이지도 못 넘긴 책이었다. 오늘은 이상하게 읽히더라. 한 시간, 두 시간, 어느새 세 시간이 지나있었다. 그 책 속에 이런 문장이 있었다. '당신이 지금 이 자리에 있다는 것 자체가 기적이다.' 평소라면 그냥 지나쳤을 문장인데, 오늘따라 그 말이 가슴 깊이 박혔다. 내가 지금 여기 살아서 숨 쉬고 책을 읽고 있다는 것. 그 당연한 것들이 사실은 당연하지 않을 수도 있다는 것. 책 한 권이 이렇게 하루를 바꿔놓기도 한다.",
    created_at: "2024-05-30T15:00:00Z",
  },
  {
    id: "test-11",
    date: "2024-06-18",
    emoji: "🥰",
    text: "오늘 비가 올 것 같아서 우산을 챙겼는데 결국 한 방울도 안 왔다. 퇴근길에 하늘이 오묘하게 보라빛이었다. 그냥 지나쳤을 텐데, 같이 걷던 동료가 '저 하늘 봐' 라고 해서 같이 멈춰서 바라봤다. 5초쯤 됐을까. 그냥 하늘을 같이 바라봤다. 아무 말도 안 해도 이상하지 않았다. 그 동료와는 사실 그렇게 친하지 않은데, 그 순간만큼은 뭔가 연결된 느낌이었다. 아름다운 것 앞에서 함께 멈추는 것, 그게 또 하나의 연결 방식이구나 싶었다. 오늘 그 보라빛 하늘은 오래 기억할 것 같다.",
    created_at: "2024-06-18T18:20:00Z",
  },
  {
    id: "test-12",
    date: "2024-07-04",
    emoji: "🥰",
    text: "수영을 처음 배우기 시작했다. 어릴 때부터 물이 무서웠는데, 서른이 넘어서야 용기를 냈다. 첫날 강사님이 물 위에 그냥 누워보라고 했다. 몸에 힘을 빼라고. 처음엔 발버둥치다가, 조금씩 힘을 빼니까 정말로 몸이 떴다. 물에 뜬다는 게 이런 거구나. 힘을 주면 가라앉고 힘을 빼면 떠오른다는 게, 뭔가 인생 같다는 생각도 들었다. 거창한 의미를 붙이고 싶어서가 아니라, 그냥 자연스럽게 그런 느낌이 왔다. 오늘 배운 건 발차기 하나뿐이지만, 새로운 걸 시작하는 설렘이 오래간만이라 좋았다.",
    created_at: "2024-07-04T19:00:00Z",
  },
  {
    id: "test-13",
    date: "2024-08-15",
    emoji: "🥰",
    text: "광복절이라 쉬는 날이었다. 아무것도 안 하고 싶어서 하루 종일 집에 있었다. 에어컨 틀고 아이스크림 먹으면서 예전에 보다 만 드라마를 마저 봤다. 밥도 배달시켜 먹고, 낮잠도 두 번이나 잤다. 저녁 무렵 창문을 열었더니 바람이 살짝 들어왔다. 여름이 조금씩 물러가려는 느낌이랄까. 그 바람을 맞으면서 오늘 아무것도 안 한 것이 전혀 아깝지 않다는 생각이 들었다. 쉬는 것도 잘 쉬어야 한다는 말이 이제야 이해가 됐다. 오늘은 완벽하게 아무것도 안 한, 완벽한 하루였다.",
    created_at: "2024-08-15T17:30:00Z",
  },
  {
    id: "test-14",
    date: "2024-09-09",
    emoji: "🥰",
    text: "가을이 오고 있다. 아침에 나섰을 때 공기가 달랐다. 여름 내내 끈적하고 무거웠던 공기가 어느새 차고 청명해졌다. 그 변화를 온몸으로 느끼면서 걷는 게 좋았다. 계절이 바뀌는 순간을 정확히 포착한 것 같아서. 이파리들은 아직 초록인데 공기만 먼저 바뀌는 그 타이밍. 자연은 늘 그 순서대로 움직이는구나. 나는 요즘 자꾸 순서를 뒤집으려 하고, 빨리 다음 단계로 가려고 조급해하는 것 같은데, 오늘 아침 공기가 그냥 때가 되면 된다고 말해주는 것 같았다. 산책을 더 오래 했다.",
    created_at: "2024-09-09T07:45:00Z",
  },
  {
    id: "test-15",
    date: "2024-10-02",
    emoji: "🥰",
    text: "부모님 집에 다녀왔다. 특별한 이유가 있는 건 아니고, 그냥 오랜만에 가고 싶어서. 아버지는 마침 마당 청소를 하고 계셨고, 어머니는 부엌에서 뭔가를 끓이고 있었다. 집에 들어서자마자 그 냄새가 났다. 어릴 때부터 맡아온 그 집 특유의 냄새. 따뜻하고 묵직하고 오래된 냄새. 저녁을 먹으면서 별 이야기를 안 해도 편했다. 오히려 말이 없어도 편한 사람들이 곁에 있다는 게 얼마나 큰 행복인지. 돌아오는 버스 안에서 창에 이마를 기대고 그 생각만 했다. 자주 가야겠다.",
    created_at: "2024-10-02T19:00:00Z",
  },
  {
    id: "test-16",
    date: "2024-11-11",
    emoji: "🥰",
    text: "오늘 유독 힘든 하루였는데, 저녁에 혼자 핫초코를 끓였다. 마시멜로도 띄우고. 소파에 앉아서 그걸 호호 불면서 마시는데, 나쁜 일들이 그렇게 중요하지 않게 느껴지기 시작했다. 따뜻한 것을 손에 쥐고 있다는 것 자체가 어떤 위로가 되는 것 같다. 오늘 있었던 일들을 굳이 분석하지 않기로 했다. 그냥 이 따뜻함에 집중하기로 했다. 마시멜로가 다 녹아 없어질 때쯤 기분이 조금 나아졌다. 별것 아닌 것 같지만 별것이었다. 오늘의 행복은 핫초코 한 잔이었다.",
    created_at: "2024-11-11T21:00:00Z",
  },
  {
    id: "test-17",
    date: "2024-12-24",
    emoji: "🥰",
    text: "크리스마스 이브에 혼자 야경을 보러 나갔다. 사람들이 다들 누군가와 함께인 것 같아 보여서 처음엔 살짝 외로웠다. 그런데 걷다 보니까, 나처럼 혼자인 사람들도 꽤 있었다. 이어폰 끼고 걷는 사람, 사진 찍는 사람, 벤치에 앉아 커피 마시는 사람. 우리는 서로 말을 안 했지만, 같은 밤을 함께 지나고 있었다. 반짝이는 조명들 아래에서 한참을 서 있었다. 추웠는데 따뜻한 느낌이 났다. 이 밤을 기억할 것 같다. 혼자였지만 외롭지 않았던 크리스마스 이브.",
    created_at: "2024-12-24T20:30:00Z",
  },
  {
    id: "test-18",
    date: "2025-01-01",
    emoji: "🥰",
    text: "새해 첫날 일출을 보러 갔다. 새벽 다섯 시에 알람을 맞추고, 반쯤 졸면서 버스를 탔다. 언덕 위에 올라갔을 때 이미 사람들이 꽤 있었다. 다들 같은 방향을 바라보고 있었다. 해가 떠오르는 순간, 누군가 박수를 쳤고 다들 따라서 쳤다. 나도 쳤다. 처음 보는 사람들과 같이 박수를 치는 경험이 이상하게 감동적이었다. 지평선 너머로 번지는 주홍빛을 보면서, 올해는 어떤 일이 있어도 이 빛을 기억하자고 혼자 생각했다. 추위도 잠도 다 잊게 만드는 아침이었다. 좋은 한 해가 될 것 같다.",
    created_at: "2025-01-01T06:45:00Z",
  },
  {
    id: "test-19",
    date: "2025-02-14",
    emoji: "🥰",
    text: "오늘 오랫동안 연락이 끊겼던 친구에게 먼저 메시지를 보냈다. 보내기 버튼을 누르기까지 한 시간은 걸린 것 같다. '잘 지내?' 라는 단 두 글자. 그런데 1분도 안 돼서 답장이 왔다. '응! 너는?' 뭔가 가슴이 먹먹해졌다. 그 사람도 기다리고 있었던 거 아닐까. 우리는 그날 저녁 두 시간 동안 카카오톡으로 못 다한 이야기를 다 했다. 왜 연락이 끊겼는지도 모르겠고, 왜 다시 이어졌는지도 잘 모르겠다. 그냥 이렇게 다시 연결됐다는 것 자체가 기뻤다. 먼저 손 내미는 용기, 오늘은 그게 참 잘한 일이었다.",
    created_at: "2025-02-14T22:00:00Z",
  },
  {
    id: "test-20",
    date: "2025-03-21",
    emoji: "🥰",
    text: "벚꽃이 피었다. 출근길에 갑자기 핑크빛 터널 같은 길이 나타났다. 작년에도 이 길을 지나쳤을 텐데, 올해는 유독 더 아름다워 보였다. 발걸음을 늦추고 하나하나 바라봤다. 꽃잎 하나가 떨어지는 것도 보였다. 벚꽃이 이렇게 짧게 피고 진다는 게, 그래서 더 아름다운 건지도 모르겠다는 생각을 했다. 영원하지 않기 때문에 소중한 것들. 지금 이 순간을 잘 담아두고 싶어서 사진을 찍었는데, 사진보다는 실제가 훨씬 아름다웠다. 그래도 찍었다. 오늘 아침은 특별히 더 살아있는 느낌이었다.",
    created_at: "2025-03-21T08:15:00Z",
  },
];
// ⚠️ 테스트 데이터 끝
// ─────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return { top: "", bottom: "" };
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    top: `${year}년 ${Number(month)}월 ${Number(day)}일`,
    bottom: `${weekdays[d.getDay()]}요일`,
  };
}

function CardFace({ record, index, total, accent, pageBg, lineBg, isDark }) {
  const dateFormatted = formatDate(record?.date);
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: pageBg,
        boxShadow: isDark
          ? `0 0 40px ${accent}18, 0 24px 48px rgba(0,0,0,0.5), 4px 0 0 ${lineBg} inset`
          : `0 20px 50px ${accent}18, 0 4px 20px rgba(0,0,0,0.08), 4px 0 0 ${lineBg} inset`,
        border: `1px solid ${isDark ? accent + "25" : accent + "30"}`,
      }}
    >
      {/* 헤더 */}
      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0"
        style={{ borderBottom: `1.5px solid ${lineBg}` }}
      >
        <div>
          <p
            className="text-[11px] font-black tracking-widest"
            style={{ color: accent }}
          >
            {dateFormatted.top}
          </p>
          <p
            className="text-[10px] font-semibold mt-0.5"
            style={{ color: accent + "99" }}
          >
            {dateFormatted.bottom}
          </p>
        </div>
        <span className="text-xl leading-none mt-0.5">
          {record?.emoji || "✨"}
        </span>
      </div>

      {/* 본문 — 세로 스크롤만 허용, 가로 스와이프는 부모로 위임 */}
      <div
        className="flex-1 px-6 py-5 min-h-0"
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",          // ← 세로 스크롤만 네이티브 처리
        }}
      >
        <div className="relative">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "32px",
                borderBottom: `1px solid ${isDark ? "#ffffff07" : "#00000007"}`,
              }}
            />
          ))}
          <p
            className="absolute inset-0 font-medium leading-8 whitespace-pre-wrap"
            style={{
              color: isDark ? "#e2e8f0" : "#1e293b",
              fontSize: "15px",
              paddingTop: "4px",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
              pointerEvents: "none",
            }}
          >
            {record?.text}
          </p>
        </div>
      </div>

      {/* 푸터 */}
      <div
        className="px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderTop: `1px solid ${lineBg}` }}
      >
        <p className="text-[10px] font-bold" style={{ color: accent + "60" }}>
          HADA · 행복 보관함
        </p>
        <p className="text-[10px] font-bold" style={{ color: accent + "60" }}>
          {index + 1} / {total}
        </p>
      </div>
    </div>
  );
}

export default function HappinessPoster({ records, onClose }) {
  const isDark = useIsDark();

  // ⚠️ 배포 전 삭제: TEST_RECORDS 병합
  const allRecords = useMemo(() => [...records, ...TEST_RECORDS], [records]);

  // 날짜 오름차순 (index 0 = 가장 오래된)
  const sorted = useMemo(
    () =>
      [...allRecords].sort((a, b) => {
        const dc = (a.date || "").localeCompare(b.date || "");
        if (dc !== 0) return dc;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }),
    [allRecords],
  );

  const total = sorted.length;
  const [index, setIndex] = useState(() => Math.max(0, total - 1));
  const [direction, setDirection] = useState(0);
  // 연속 플립 중인지 여부 — transition duration 조정용
  const [isBurst, setIsBurst] = useState(false);

  useEffect(() => {
    setIndex(Math.max(0, total - 1));
  }, [total]);

  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // ── 연/월 picker ──
  const currentDate = sorted[index]?.date || "";
  const currentYear = currentDate.slice(0, 4);
  const currentMonth = currentDate.slice(5, 7);

  const availableYears = useMemo(() => {
    const ys = new Set(sorted.map((r) => r.date?.slice(0, 4)).filter(Boolean));
    return [...ys].sort();
  }, [sorted]);

  const availableMonths = useMemo(() => {
    const ms = new Set(
      sorted
        .filter((r) => r.date?.startsWith(currentYear))
        .map((r) => r.date?.slice(5, 7))
        .filter(Boolean),
    );
    return [...ms].sort();
  }, [sorted, currentYear]);

  // ── RAF 기반 연속 플립 ──
  const rafRef = useRef(null);
  const burstRef = useRef({ remaining: 0, dir: 0, intervalMs: 0, lastTime: 0 });
  const burstTimerRef = useRef(null);

  const cancelBurst = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    setIsBurst(false);
  }, []);

  const runBurst = useCallback(() => {
    const s = burstRef.current;
    if (s.remaining <= 0) {
      rafRef.current = null;
      // 마지막 카드 전환 후 잠깐 뒤 isBurst 해제
      burstTimerRef.current = setTimeout(() => setIsBurst(false), 200);
      return;
    }
    const now = performance.now();
    if (now - s.lastTime >= s.intervalMs) {
      const next = indexRef.current + s.dir;
      if (next < 0 || next >= total) {
        s.remaining = 0;
        rafRef.current = null;
        burstTimerRef.current = setTimeout(() => setIsBurst(false), 200);
        return;
      }
      setDirection(s.dir);
      setIndex(next);
      indexRef.current = next;
      s.remaining--;
      s.lastTime = now;
    }
    rafRef.current = requestAnimationFrame(runBurst);
  }, [total]);

  // 단장 이동 — 버튼 전용. direction과 index를 하나의 플러셔로 묶어 배치 업데이트
  const moveSingle = useCallback(
    (dir) => {
      cancelBurst();
      const next = indexRef.current + dir;
      if (next < 0 || next >= total) return;
      // React 18 배치: 두 setState 가 같은 이벤트 핸들러 안에 있으면 자동 배치됨
      setDirection(dir);
      setIndex(next);
      indexRef.current = next;
    },
    [total, cancelBurst],
  );

  const startBurst = useCallback(
    (steps, dir, intervalMs) => {
      cancelBurst();
      const maxSteps =
        dir > 0
          ? Math.min(steps, total - 1 - indexRef.current)
          : Math.min(steps, indexRef.current);
      if (maxSteps <= 0) return;
      setIsBurst(true);
      burstRef.current = { remaining: maxSteps, dir, intervalMs, lastTime: 0 };
      rafRef.current = requestAnimationFrame(runBurst);
    },
    [total, cancelBurst, runBurst],
  );

  const goToImmediate = useCallback(
    (nextIdx, dir) => {
      cancelBurst();
      const clamped = Math.max(0, Math.min(total - 1, nextIdx));
      setDirection(dir);
      setIndex(clamped);
      indexRef.current = clamped;
    },
    [total, cancelBurst],
  );

  // 버튼 네비게이션 — moveSingle 사용
  const goPrev = useCallback(() => moveSingle(-1), [moveSingle]);
  const goNext = useCallback(() => moveSingle(1), [moveSingle]);

  const handleYearChange = useCallback(
    (e) => {
      const idx = sorted.findIndex((r) => r.date?.startsWith(e.target.value));
      if (idx !== -1) goToImmediate(idx, idx > indexRef.current ? 1 : -1);
    },
    [sorted, goToImmediate],
  );

  const handleMonthChange = useCallback(
    (e) => {
      const prefix = `${currentYear}-${e.target.value}`;
      const idx = sorted.findIndex((r) => r.date?.startsWith(prefix));
      if (idx !== -1) goToImmediate(idx, idx > indexRef.current ? 1 : -1);
    },
    [sorted, currentYear, goToImmediate],
  );

  // ── 스와이프: useEffect + addEventListener { passive: false } ──
  // React synthetic 이벤트는 passive 리스너라 preventDefault() 불가.
  // 직접 등록해야 가로 스와이프 시 브라우저 스크롤을 막을 수 있음.
  // touchAction 은 컨테이너에 걸지 않음 -> 버튼 click 합성 정상 작동.
  const containerRef = useRef(null);
  const touchRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    lockAxis: null,
  });

  // 클로저 안에서 최신 함수를 참조하기 위해 ref 로 보관
  const moveSingleRef = useRef(moveSingle);
  const startBurstRef = useRef(startBurst);
  const cancelBurstRef = useRef(cancelBurst);
  useEffect(() => { moveSingleRef.current = moveSingle; }, [moveSingle]);
  useEffect(() => { startBurstRef.current = startBurst; }, [startBurst]);
  useEffect(() => { cancelBurstRef.current = cancelBurst; }, [cancelBurst]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e) => {
      // 버튼/셀렉트 위 터치는 스와이프 트래킹 안 함 -> click 정상 발화
      if (e.target.closest("button") || e.target.closest("select")) return;
      cancelBurstRef.current();
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: performance.now(),
        lockAxis: null,
      };
    };

    const onMove = (e) => {
      const tc = touchRef.current;
      if (!tc.startTime) return;
      if (tc.lockAxis === "y") return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - tc.startX);
      const dy = Math.abs(t.clientY - tc.startY);
      if (!tc.lockAxis && (dx > 5 || dy > 5)) {
        tc.lockAxis = dx >= dy ? "x" : "y";
      }
      if (tc.lockAxis === "x") e.preventDefault();
    };

    const onEnd = (e) => {
      const tc = touchRef.current;
      if (!tc.startTime || tc.lockAxis !== "x") return;

      const t = e.changedTouches[0];
      const dx = t.clientX - tc.startX;
      const absDx = Math.abs(dx);
      const elapsed = Math.max(1, performance.now() - tc.startTime);
      const dir = dx < 0 ? 1 : -1;
      const velocity = absDx / elapsed;

      tc.startTime = 0; // 리셋

      if (absDx < 20) return;

      if (absDx < 120 || velocity < 0.5) {
        moveSingleRef.current(dir);
        return;
      }

      const steps = Math.min(8, Math.max(2, Math.round(velocity * 2.5)));
      const intervalMs = Math.max(60, 140 - steps * 10);
      startBurstRef.current(steps, dir, intervalMs);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  // 테마
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const accent = isDark ? theme.darkAccent : theme.accent;

  // 슬라이드 애니메이션 variants
  const variants = {
    enter: (dir) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? "-30%" : "30%",
      opacity: 0,
    }),
  };

  // 도트 인디케이터
  const dotStart = Math.max(0, Math.min(index - 3, total - 7));
  const dotEnd = Math.min(total, dotStart + 7);
  const dotIndices = Array.from(
    { length: dotEnd - dotStart },
    (_, i) => dotStart + i,
  );

  const selectStyle = {
    background: "transparent",
    border: "none",
    outline: "none",
    color: accent,
    fontWeight: 900,
    fontSize: "15px",
    appearance: "auto",
    WebkitAppearance: "auto",
    padding: "0 2px",
    cursor: "pointer",
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: isDark
          ? "linear-gradient(160deg, #0f0a2e 0%, #1a0a30 50%, #0a1a2e 100%)"
          : "linear-gradient(160deg, #f5f3ff 0%, #fdf4ff 50%, #f0fdf4 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* 헤더: 연/월 picker */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4 flex-shrink-0">
        {total === 0 ? (
          <p className="text-sm font-black text-gray-400">
            기록된 행복이 없어요
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <select
              value={currentYear}
              onChange={handleYearChange}
              style={{ ...selectStyle }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={currentMonth}
              onChange={handleMonthChange}
              style={{ ...selectStyle }}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {Number(m)}월
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/60 dark:bg-white/10"
          style={{ }}
        >
          <X className="w-4 h-4 text-gray-600 dark:text-violet-200" />
        </button>
      </div>

      {/* 카드 슬라이드 영역 */}
      <div className="flex-1 flex flex-col items-center px-5 overflow-hidden min-h-0">
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-4xl mb-4">🌱</p>
            <p className="text-sm font-bold text-gray-400 dark:text-violet-300/50">
              아직 기록된 행복이 없어요
            </p>
            <p className="text-xs text-gray-300 dark:text-violet-300/30 mt-1">
              오늘의 행복을 기록해보세요
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[340px] flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: "tween",
                  ease: isBurst
                    ? "linear"
                    : [0.22, 1, 0.36, 1], // burst 중엔 linear, 단장은 spring-like easing
                  duration: isBurst ? 0.07 : 0.22,
                }}
                className="absolute inset-0 flex flex-col"
              >
                <CardFace
                  record={sorted[index]}
                  index={index}
                  total={total}
                  accent={accent}
                  pageBg={isDark ? theme.darkPageBg : theme.pageBg}
                  lineBg={isDark ? theme.darkLineBg : theme.lineBg}
                  isDark={isDark}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      {total > 1 && (
        <div className="py-5 flex-shrink-0 flex items-center justify-center gap-5">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20"
            style={{ background: isDark ? "#ffffff15" : "#00000010" }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: accent }} />
          </button>

          <div className="flex items-center gap-1.5">
            {dotIndices.map((i) => (
              <button
                key={i}
                onClick={() => goToImmediate(i, i > index ? 1 : -1)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === index ? "18px" : "5px",
                  height: "5px",
                  background:
                    i === index
                      ? accent
                      : isDark
                        ? "#ffffff25"
                        : "#00000018",
                }}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={index >= total - 1}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20"
            style={{ background: isDark ? "#ffffff15" : "#00000010" }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: accent }} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
