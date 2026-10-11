// TEMPORARY: PROJECT BLUE 10.12 — delete this file after the event.
export const PROJECT_BLUE_START = Date.UTC(2026, 9, 11, 16, 0, 0); // Oct 12, midnight in Manila.
export const PROJECT_BLUE_END = Date.UTC(2026, 9, 12, 16, 0, 0); // Oct 13, midnight in Manila.

export function isProjectBlueDay(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return value('year') === '2026' && value('month') === '10' && value('day') === '12';
}
