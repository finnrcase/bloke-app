import { supabase } from '@/lib/supabase';

// Badge awarding runs server-side via database triggers on weekly_progress and
// attendance (see migration 20260518181000_harden_badge_awards.sql). This module
// is read-only: it derives streak and milestone info for the UI.

type Milestone = {
  badgeCode: string;
  displayName: string;
  weekNumber: number;
};

const milestones: Milestone[] = [
  { badgeCode: 'milestone_initiate', displayName: 'Initiate', weekNumber: 1 },
  { badgeCode: 'milestone_showing_up', displayName: 'Showing Up', weekNumber: 5 },
  { badgeCode: 'milestone_reliable', displayName: 'Reliable', weekNumber: 10 },
  { badgeCode: 'milestone_grounded', displayName: 'Grounded', weekNumber: 25 },
  { badgeCode: 'milestone_capable', displayName: 'Capable', weekNumber: 50 },
  { badgeCode: 'milestone_leader', displayName: 'Leader', weekNumber: 51 },
  { badgeCode: 'completion_builder', displayName: 'Builder / Completion', weekNumber: 52 },
];

function isCompleteWeek(progress: {
  act_complete: boolean | null;
  learn_complete: boolean | null;
  log_complete: boolean | null;
}) {
  return Boolean(progress.learn_complete && progress.act_complete && progress.log_complete);
}

async function getCompletedWeekNumbers(profileId: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('weekly_progress')
    .select('week_number, learn_complete, act_complete, log_complete')
    .eq('profile_id', profileId)
    .order('week_number', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter(isCompleteWeek)
    .map((progress) => progress.week_number)
    .filter((weekNumber): weekNumber is number => typeof weekNumber === 'number');
}

export async function getUserStreak(profileId: string) {
  const completedWeeks = await getCompletedWeekNumbers(profileId);
  const completedSet = new Set(completedWeeks);
  let streak = 0;

  for (let weekNumber = Math.max(0, ...completedWeeks); weekNumber > 0; weekNumber -= 1) {
    if (!completedSet.has(weekNumber)) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function getNextMilestone(currentWeek: number) {
  return milestones.find((milestone) => milestone.weekNumber > currentWeek) ?? milestones[milestones.length - 1];
}
