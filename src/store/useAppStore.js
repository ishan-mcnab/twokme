import { create } from 'zustand'

const defaultOnboardingData = {
  name: '',
  username: '',
  position: '',
  heightInches: null,
  weightLbs: null,
  questionnaireAnswers: {},
  developmentPath: null,
  planDurationWeeks: null,
  trainingEnvironment: [],
  sessionDuration: null,
}

const useAppStore = create((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Onboarding
  onboardingData: { ...defaultOnboardingData },
  setOnboardingData: (data) =>
    set((state) => ({
      onboardingData: {
        ...state.onboardingData,
        ...data,
        questionnaireAnswers:
          data.questionnaireAnswers != null
            ? {
                ...state.onboardingData.questionnaireAnswers,
                ...data.questionnaireAnswers,
              }
            : state.onboardingData.questionnaireAnswers,
      },
    })),

  // Player build
  currentBuild: null,
  setCurrentBuild: (build) => set({ currentBuild: build }),

  /** Latest row from `workout_plans` for the current build (plan_data, current_day, id, …). */
  currentWorkoutPlan: null,
  setCurrentWorkoutPlan: (plan) => set({ currentWorkoutPlan: plan }),

  // Attributes
  attributes: {},
  setAttributes: (attrs) => set({ attributes: attrs }),

  // Streak
  currentStreak: 0,
  setCurrentStreak: (streak) => set({ currentStreak: streak }),

  evolutionPending: false,
  pendingEvolution: null,
  setEvolutionPending: (pending, data = null) =>
    set({ evolutionPending: Boolean(pending), pendingEvolution: data }),

  /** Clear client state after sign-out (auth session cleared separately). */
  resetForSignOut: () =>
    set({
      user: null,
      onboardingData: { ...defaultOnboardingData },
      currentBuild: null,
      currentWorkoutPlan: null,
      attributes: {},
      currentStreak: 0,
      evolutionPending: false,
      pendingEvolution: null,
    }),

  /** After deleting build data from Supabase — drop cached build + plan. */
  resetAfterBuildDelete: () =>
    set({
      currentBuild: null,
      currentWorkoutPlan: null,
      currentStreak: 0,
      evolutionPending: false,
      pendingEvolution: null,
    }),
}))

export default useAppStore
