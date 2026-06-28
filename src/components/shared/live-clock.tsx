"use client";

import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/constants";

export function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function updateClock() {
      setTime(DateTime.now().setZone(TIMEZONE).toFormat("HH:mm:ss"));
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-4xl font-mono font-bold tabular-nums">{time}</span>
  );
}
