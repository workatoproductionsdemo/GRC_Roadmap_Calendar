import type { Activity, WindowOverride } from '../engine/types';

export type FrameworkStatus = 'certified' | 'attested' | 'in_progress' | 'not_started' | 'regulatory';

export interface Framework {
  id: string;
  name: string;
  status: FrameworkStatus;
  note?: string;
}

export interface TeamAsk {
  team: string;
  ask: string;
}

export interface FullActivity extends Activity {
  name: string;
  type: string;
  summary: string;
  owner: string;
  grc_contact: string;
  drivers: string[];
  requirements: string[];
  evidence: string[];
  frameworks: string[];
  team_asks: TeamAsk[];
  source_system: 'data_table' | 'sql';
}

/** Shape of calendar.json (see schema/calendar.schema.json). */
export interface Calendar {
  schema_version: string;
  generated_at: string;
  frameworks: Framework[];
  activities: FullActivity[];
  windows: WindowOverride[];
}
