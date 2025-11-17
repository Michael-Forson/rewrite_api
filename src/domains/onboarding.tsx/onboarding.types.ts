// types/onboarding.types.ts
export type AddictionType =
  | "Alcohol"
  | "Drugs"
  | "Smoking"
  | "Gambling"
  | "Multiple"
  | "Others";

export type AddictionDuration =
  | "1-6 months"
  | "6 months to 1 year"
  | "1-3 years"
  | "3+ years";

export type DailyImpact = "Minimal" | "Mild" | "Moderate" | "Significant";

export type TriggerSituation =
  | "Stress or anxiety"
  | "Boredom"
  | "Friends"
  | "Loneliness"
  | "Other";

export type AddictionFrequency =
  | "Multiple times a day"
  | "Once a day"
  | "Weekly"
  | "Only when triggered"
  | "Rarely / Occasionally";

export type TriggerTime =
  | "Mornings"
  | "Afternoons"
  | "Evenings"
  | "Late nights";

export type TriggerPlace =
  | "At home"
  | "At work or school"
  | "Commuting"
  | "Alone"
  | "With others"
  | "Other";

export interface OnboardingRequestBody {
  addictionTypes: AddictionType[];
  duration: AddictionDuration;
  dailyImpact: DailyImpact;
  triggerSituations?: TriggerSituation[];
  frequency?: AddictionFrequency;
  triggerTimes?: TriggerTime[];
  triggerPlaces?: TriggerPlace[];
  primaryGoal?: string;
  motivation?: string;
  previousAttempts?: string;
}
