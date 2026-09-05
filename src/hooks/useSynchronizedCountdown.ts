import {
  useEffect,
  useState,
} from 'react';
import {
  synchronizationService,
} from '../services/SynchronizationService';

export type CountdownValue =
  | 3
  | 2
  | 1
  | 'GO'
  | null;

export function useSynchronizedCountdown(
  scheduledStartAt: string | null,
): CountdownValue {
  const [value, setValue] =
    useState<CountdownValue>(null);

  useEffect(() => {
    if (!scheduledStartAt) {
      setValue(null);
      return;
    }

    const scheduledEpoch =
      new Date(scheduledStartAt).getTime();

    function update(): void {
      const remainingMs =
        scheduledEpoch -
        synchronizationService.clock.serverNowMs();

      if (remainingMs <= -650) {
        setValue(null);
      } else if (remainingMs <= 350) {
        setValue('GO');
      } else {
        const seconds = Math.ceil(
          remainingMs / 1_000,
        );

        setValue(
          Math.min(3, Math.max(1, seconds)) as
            | 1
            | 2
            | 3,
        );
      }
    }

    update();

    const intervalId = window.setInterval(
      update,
      50,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [scheduledStartAt]);

  return value;
}
