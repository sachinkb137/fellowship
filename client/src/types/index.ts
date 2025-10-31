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
  year_month: string;
  workers_count: number;
  person_days: number;
  total_wages: number;
  pending_payments: number;
  jobs_created: number;
  raw_json_path?: string;
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
  // Time series for charts (last N months)
  timeSeries?: Array<{
    date: string;
    workers_count: number;
    total_wages: number;
    jobs_created: number;
  }>;
  // Lightweight comparison items for UI
  comparisons?: Array<{
    label: string;
    value: string | number;
    note?: string;
  }>;
}