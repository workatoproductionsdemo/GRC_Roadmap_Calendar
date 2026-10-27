export type Cadence = 'annual' | 'semiannual' | 'quarterly' | 'monthly' | 'once';
export type Status = 'planned' | 'in_progress' | 'done';
export type Basis = 'confirmed' | 'indicative';
export type StatusSource = 'jira' | 'manual' | 'date';

/** ISO calendar date, YYYY-MM-DD. */
export type ISODate = string;

export interface Activity {
  id: string;
  cadence: Cadence;
  /** First occurrence. null = dates TBC (no windows generated). */
  anchor: ISODate | null;
  duration_days: number;
  active: boolean;
}

/** Per-window override and status, keyed by window_id. */
export interface WindowOverride {
  window_id: string;
  start?: ISODate;
  end?: ISODate;
  basis?: Basis;
  status?: Status;
  /** Status of the linked Jira issue, mapped by the publisher. */
  jira_status?: Status;
  jira_key?: string;
  notes?: string;
}

export interface Window {
  window_id: string;
  activity_id: string;
  fiscal_year: number;
  period: string;
  start: ISODate;
  end: ISODate;
  basis: Basis;
  status: Status;
  status_source: StatusSource;
  jira_key?: string;
  notes?: string;
}
