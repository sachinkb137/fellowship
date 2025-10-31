export interface District {
  id: number;
  state_code: string;
  district_code: string;
  name_en: string;
  name_local?: string;
  centroid_lat?: number;
  centroid_lon?: number;
}

export interface MonthlyStat {
  id: number;
  district_id: number;
  year_month: Date;
  workers_count: number;
  person_days: number;
  total_wages: number;
  pending_payments: number;
  jobs_created: number;
  raw_json_path?: string;
}

export interface Aggregate {
  id: number;
  district_id: number;
  metric_name: string;
  window: string;
  value: number;
  computed_at: Date;
}

export interface DistrictSummary {
  district: District;
  currentStats: MonthlyStat;
  trends: {
    workers: 'up' | 'down' | 'stable';
    wages: 'up' | 'down' | 'stable';
    jobs: 'up' | 'down' | 'stable';
  };
  stateComparison: {
    workers: 'above' | 'below' | 'equal';
    wages: 'above' | 'below' | 'equal';
    jobs: 'above' | 'below' | 'equal';
  };
  timeSeries?: Array<{
    date: string;
    workers_count: number;
    total_wages: number;
    jobs_created: number;
  }>;
  comparisons?: Array<{
    label: string;
    value: string | number;
    note?: string;
  }>;
}