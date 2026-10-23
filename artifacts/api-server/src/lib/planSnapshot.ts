/** A plan as a reusable snapshot: the shape `POST /api/plans/bulk` takes, without any ids, so it can be copied again and again. */

export interface SnapshotExercise {
  name: string;
  description?: string | null;
  videoUrl?: string | null;
  sets: number;
  reps: number;
  load?: string | null;
  restTime?: number | null;
  technique?: string | null;
  rir?: number | null;
  tempo?: string | null;
  orderIndex: number;
}

export interface SnapshotWorkout {
  name: string;
  description?: string | null;
  orderIndex: number;
  exercises: SnapshotExercise[];
}

export interface PlanSnapshot {
  name: string;
  description: string | null;
  workouts: SnapshotWorkout[];
}

const byOrder = <T extends { orderIndex?: number | null }>(a: T, b: T) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0);

export function snapshotPlan(
  plan: { name: string; description?: string | null },
  workouts: (Partial<SnapshotWorkout> & { name: string; exercises: (Partial<SnapshotExercise> & { name: string; sets: number; reps: number })[] })[],
): PlanSnapshot {
  return {
    name: plan.name,
    description: plan.description ?? null,
    workouts: [...workouts]
      .sort(byOrder)
      .map((workout, workoutIndex) => ({
        name: workout.name,
        description: workout.description ?? null,
        orderIndex: workoutIndex,
        exercises: [...workout.exercises].sort(byOrder).map((exercise, exerciseIndex) => ({
          name: exercise.name,
          description: exercise.description ?? null,
          videoUrl: exercise.videoUrl ?? null,
          sets: exercise.sets,
          reps: exercise.reps,
          load: exercise.load ?? null,
          restTime: exercise.restTime ?? null,
          technique: exercise.technique ?? null,
          rir: exercise.rir ?? null,
          tempo: exercise.tempo ?? null,
          orderIndex: exerciseIndex,
        })),
      })),
  };
}

/** What the template list shows: the days and the exercise names, nothing else. */
export function snapshotSummary(snapshot: Pick<PlanSnapshot, "workouts">) {
  return snapshot.workouts.map((workout) => ({ name: workout.name, exercises: workout.exercises.map((exercise) => exercise.name) }));
}
