// src/hooks/useEffectiveLevel.ts
// 구독 중이면 레벨을 LUCKY_LEVEL_THRESHOLD로 올려서 반환
import { useSubscription } from "@/hooks/useSubscription";
import { LUCKY_LEVEL_THRESHOLD } from "@/config/unlockConfig";

export function useEffectiveLevel(level: number): number {
  const { isSubscribed } = useSubscription();
  return isSubscribed ? LUCKY_LEVEL_THRESHOLD : level;
}