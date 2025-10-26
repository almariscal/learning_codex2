export interface Employee {
  id: number;
  full_name: string;
  email: string;
  initials?: string | null;
  is_active: boolean;
  is_admin: boolean;
  has_ev_car: boolean;
  created_at: string;
}

export interface ParkingSpot {
  id: number;
  label: string;
  location?: string | null;
  has_ev_charger: boolean;
  is_reserved: boolean;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
}

export interface Allocation {
  id: number;
  day: string;
  employee_id: number;
  spot_id: number;
  status: string;
  created_at: string;
}

export interface AllocationUpdate {
  day?: string;
  employee_id?: number;
  spot_id?: number;
  status?: string;
}

export interface AllocationBulkCreate {
  employee_id: number;
  spot_id: number;
  start_day: string;
  end_day: string;
}

export interface AllocationBulkResult {
  created: number;
  skipped: number;
  conflicts: string[];
}

export interface EmployeeUpdate {
  full_name?: string;
  initials?: string;
  is_active?: boolean;
  is_admin?: boolean;
  has_ev_car?: boolean;
}

export interface ParkingSpotUpdate {
  label?: string;
  location?: string;
  has_ev_charger?: boolean;
  is_reserved?: boolean;
  is_active?: boolean;
  notes?: string;
}

export interface EmployeeCreate {
  full_name: string;
  email: string;
  initials?: string;
  is_admin?: boolean;
  has_ev_car?: boolean;
}

export interface ParkingSpotCreate {
  label: string;
  location?: string;
  has_ev_charger?: boolean;
  is_reserved?: boolean;
  is_active?: boolean;
  notes?: string;
}

export interface AllocationCreate {
  day: string;
  employee_id: number;
  spot_id: number;
  status?: string;
}
