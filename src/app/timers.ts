import { useEffect, useEffectEvent } from "react";
import type { Banner } from "../domain/types.js";

export function useBannerTimer(
  activeBanner: Banner | undefined,
  onExpire: () => void,
): void {
  const handleExpire = useEffectEvent(onExpire);

  useEffect(() => {
    if (!activeBanner) {
      return undefined;
    }

    const timer = setTimeout(() => {
      handleExpire();
    }, 3200);

    return () => {
      clearTimeout(timer);
    };
  }, [activeBanner?.id, handleExpire]);
}
