import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

export type CountdownState = 'future' | 'advisory' | 'live' | 'ended';

export function useCountdown(startTime: Date | null, endTime: Date | null) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!startTime || !endTime) return;
    
    // Tick every second precisely
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (!startTime || !endTime) {
    return { formatted: '00:00:00', state: 'ended' as CountdownState, totalSeconds: 0 };
  }

  const startDiff = differenceInSeconds(startTime, now);
  const endDiff = differenceInSeconds(endTime, now);

  let state: CountdownState = 'future';
  let totalSeconds = startDiff;

  if (startDiff <= 0 && endDiff > 0) {
    state = 'live';
    totalSeconds = Math.abs(startDiff); // Elapsed time
  } else if (startDiff > 0 && startDiff <= 1800) {
    state = 'advisory'; // < 30 mins
  } else if (endDiff <= 0) {
    state = 'ended';
    totalSeconds = 0;
  }

  const h = Math.floor(Math.abs(totalSeconds) / 3600).toString().padStart(2, '0');
  const m = Math.floor((Math.abs(totalSeconds) % 3600) / 60).toString().padStart(2, '0');
  const s = (Math.abs(totalSeconds) % 60).toString().padStart(2, '0');

  return {
    formatted: `${h}:${m}:${s}`,
    state,
    totalSeconds,
  };
}
