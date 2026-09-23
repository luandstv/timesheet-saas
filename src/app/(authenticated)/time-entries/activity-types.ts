export type Activity = {
  id: string;
  description: string;
  incidentCode: string | null;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number;
  period: string | null;
};

export type ActivityDraft = {
  description: string;
  incidentCode: string;
  activityDate: string;
  startTime: string;
  endTime: string;
};
