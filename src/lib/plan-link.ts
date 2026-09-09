/**
 * Tying a submission to the month it belongs to.
 *
 * Employees record freely — any brand, any activity type — because stands do
 * arrive outside the plan and locking the screen to the plan would only make
 * those go unrecorded. So the link to the plan is found rather than demanded.
 *
 * Which month a submission belongs to is not the month it was sent. Someone
 * recording a September stand on 3 October is reporting on September, and
 * filing it under October would quietly corrupt every monthly comparison.
 */

export interface PlannedActivity {
  id: string;
  month: string;
  planned_store_id: string | null;
  brand: string;
  display_type: string;
}

export interface PlanLink {
  activity_id: string | null;
  month: string;
  /** No planned line matched: a stand that arrived outside the plan. */
  offPlan: boolean;
}

/** "2026-09" for a given date. */
export function monthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month before, rolling the year back at January. */
export function previousMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const year = Number(match[1]);
  const index = Number(match[2]);
  return index === 1
    ? `${year - 1}-12`
    : `${year}-${String(index - 1).padStart(2, "0")}`;
}

function matches(
  activity: PlannedActivity,
  storeId: string,
  brand: string,
  displayType: string,
): boolean {
  return (
    activity.planned_store_id === storeId &&
    activity.brand === brand &&
    activity.display_type === displayType
  );
}

/**
 * Find the planned line this submission answers.
 *
 * The current month is searched first, then the one before it, so a late entry
 * settles in the month it was actually for. With nothing to match, the
 * submission stands on its own in the month it was sent.
 */
export function linkToPlan(
  submission: { storeId: string; brand: string; displayType: string },
  activities: PlannedActivity[],
  today: Date = new Date(),
): PlanLink {
  const current = monthOf(today);
  const previous = previousMonth(current);

  for (const month of [current, previous]) {
    const hit = activities.find(
      (a) =>
        a.month === month &&
        matches(a, submission.storeId, submission.brand, submission.displayType),
    );
    if (hit) return { activity_id: hit.id, month: hit.month, offPlan: false };
  }

  return { activity_id: null, month: current, offPlan: true };
}
