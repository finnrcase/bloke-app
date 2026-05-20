import { Database } from '@/types/database';

export type WeeklyCheckIn = Database['public']['Tables']['weekly_checkins']['Row'];

export function getWeekStart(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export function getConsistencyScore({
  habitCompleted,
  habitTarget,
  workoutCompleted,
  workoutTarget,
}: {
  habitCompleted: number;
  habitTarget: number;
  workoutCompleted: number;
  workoutTarget: number;
}) {
  const workoutScore = Math.min(workoutCompleted / Math.max(workoutTarget, 1), 1);
  const habitScore = Math.min(habitCompleted / Math.max(habitTarget, 1), 1);
  return Math.round(((workoutScore + habitScore) / 2) * 100);
}

export function isSubmitted(checkIn: Pick<WeeklyCheckIn, 'submitted_at'>) {
  return Boolean(checkIn.submitted_at);
}

export function getAccountabilityStreak(checkIns: WeeklyCheckIn[]) {
  const submittedWeeks = new Set(checkIns.filter(isSubmitted).map((checkIn) => checkIn.week_start));
  let streak = 0;
  const cursor = new Date(`${getWeekStart()}T00:00:00.000Z`);

  while (submittedWeeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

export function getAverageConsistency(checkIns: WeeklyCheckIn[]) {
  const submitted = checkIns.filter(isSubmitted);

  if (submitted.length === 0) return 0;

  return Math.round(
    submitted.reduce((sum, checkIn) => sum + checkIn.consistency_score, 0) / submitted.length,
  );
}
