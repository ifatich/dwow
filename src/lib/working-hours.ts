/**
 * Utility untuk menghitung jam kerja aktif tim (Business Hours).
 * Ketentuan:
 * - Hari Kerja: Senin – Jumat (1 - 5)
 * - Jam Kerja: 07:30 – 16:30 WIB (UTC+7)
 * - Di luar jam kerja dan akhir pekan, perhitungan timer dijeda secara otomatis.
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export const WORK_START_HOUR = 7;
export const WORK_START_MINUTE = 30;
export const WORK_END_HOUR = 16;
export const WORK_END_MINUTE = 30;

/** Hari kerja: 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat */
export const WORK_DAYS = [1, 2, 3, 4, 5];

/**
 * Mengecek apakah timestamp saat ini berada di dalam jendela jam kerja WIB.
 */
export function isWithinWorkingHours(timestampMs: number = Date.now()): boolean {
  const shifted = new Date(timestampMs + JAKARTA_OFFSET_MS);
  const day = shifted.getUTCDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  if (!WORK_DAYS.includes(day)) return false;

  const minutesFromMidnight = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const startMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE; // 450 (07:30)
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE;       // 990 (16:30)

  return minutesFromMidnight >= startMinutes && minutesFromMidnight < endMinutes;
}

/**
 * Menghitung durasi kerja aktif (dalam milidetik) antara dua timestamp,
 * HANYA mengikutsertakan jendela jam kerja (Senin–Jumat, 07:30–16:30 WIB).
 * Waktu di luar jam kerja dan akhir pekan otomatis dipotong (dijeda).
 */
export function calculateWorkingDurationMs(
  startTimeMs: number,
  endTimeMs: number
): number {
  if (startTimeMs >= endTimeMs) return 0;

  let totalMs = 0;

  // Konversi ke kalender lokal Jakarta (+7)
  const startShifted = new Date(startTimeMs + JAKARTA_OFFSET_MS);
  const endShifted = new Date(endTimeMs + JAKARTA_OFFSET_MS);

  const curDate = new Date(Date.UTC(
    startShifted.getUTCFullYear(),
    startShifted.getUTCMonth(),
    startShifted.getUTCDate()
  ));

  const lastDate = new Date(Date.UTC(
    endShifted.getUTCFullYear(),
    endShifted.getUTCMonth(),
    endShifted.getUTCDate()
  ));

  while (curDate <= lastDate) {
    const dayOfWeek = curDate.getUTCDay();
    if (WORK_DAYS.includes(dayOfWeek)) {
      const year = curDate.getUTCFullYear();
      const month = curDate.getUTCMonth();
      const date = curDate.getUTCDate();

      // Jendela kerja hari ini dalam epoch UTC
      const windowStartMs = Date.UTC(year, month, date, WORK_START_HOUR, WORK_START_MINUTE, 0, 0) - JAKARTA_OFFSET_MS;
      const windowEndMs = Date.UTC(year, month, date, WORK_END_HOUR, WORK_END_MINUTE, 0, 0) - JAKARTA_OFFSET_MS;

      const activeStart = Math.max(startTimeMs, windowStartMs);
      const activeEnd = Math.min(endTimeMs, windowEndMs);

      if (activeEnd > activeStart) {
        totalMs += (activeEnd - activeStart);
      }
    }

    // Pindah ke hari berikutnya
    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }

  return totalMs;
}
