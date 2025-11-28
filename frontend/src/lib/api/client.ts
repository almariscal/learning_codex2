import axios from "axios";

import type {
  Allocation,
  AllocationBulkCreate,
  AllocationBulkResult,
  AllocationCreate,
  AllocationUpdate,
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  ParkingSpot,
  ParkingSpotCreate,
  ParkingSpotUpdate
} from "../types";

const API_FALLBACK = "/api";

export const resolveInitialApiBase = (): string => {
  if (typeof window !== "undefined" && window.__API_BASE__) {
    return window.__API_BASE__;
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  return API_FALLBACK;
};

const api = axios.create({
  baseURL: resolveInitialApiBase()
});

export const setApiBaseUrl = (baseURL: string): void => {
  api.defaults.baseURL = baseURL;
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data } = await api.get<Employee[]>("/employees/");
  return data;
};

export const createEmployee = async (payload: EmployeeCreate): Promise<Employee> => {
  const { data } = await api.post<Employee>("/employees/", payload);
  return data;
};

export const updateEmployee = async (employeeId: number, payload: EmployeeUpdate): Promise<Employee> => {
  const { data } = await api.patch<Employee>(`/employees/${employeeId}`, payload);
  return data;
};

export const deleteEmployee = async (employeeId: number): Promise<void> => {
  await api.delete(`/employees/${employeeId}`);
};

export const fetchSpots = async (): Promise<ParkingSpot[]> => {
  const { data } = await api.get<ParkingSpot[]>("/spots/");
  return data;
};

export const createSpot = async (payload: ParkingSpotCreate): Promise<ParkingSpot> => {
  const { data } = await api.post<ParkingSpot>("/spots/", payload);
  return data;
};

export const updateSpot = async (spotId: number, payload: ParkingSpotUpdate): Promise<ParkingSpot> => {
  const { data } = await api.patch<ParkingSpot>(`/spots/${spotId}`, payload);
  return data;
};

export const deleteSpot = async (spotId: number): Promise<void> => {
  await api.delete(`/spots/${spotId}`);
};

export const fetchAllocations = async (): Promise<Allocation[]> => {
  const { data } = await api.get<Allocation[]>("/allocations/");
  return data;
};

export const createAllocation = async (payload: AllocationCreate): Promise<Allocation> => {
  const { data } = await api.post<Allocation>("/allocations/", payload);
  return data;
};

export const createAllocationsBulk = async (
  payload: AllocationBulkCreate
): Promise<AllocationBulkResult> => {
  const { data } = await api.post<AllocationBulkResult>("/allocations/bulk", payload);
  return data;
};

export const updateAllocation = async (
  allocationId: number,
  payload: AllocationUpdate
): Promise<Allocation> => {
  const { data } = await api.patch<Allocation>(`/allocations/${allocationId}`, payload);
  return data;
};

export const deleteAllocation = async (allocationId: number): Promise<void> => {
  await api.delete(`/allocations/${allocationId}`);
};

export const downloadEmployeeICS = async (
  employeeId: number,
  startDay: string,
  endDay: string
): Promise<Blob> => {
  const response = await api.get(`/allocations/employees/${employeeId}/ics`, {
    params: { start_date: startDay, end_date: endDay },
    responseType: "blob"
  });
  return response.data;
};

export const downloadBulkICS = async (startDay: string, endDay: string): Promise<Blob> => {
  const response = await api.get("/allocations/ics/export", {
    params: { start_date: startDay, end_date: endDay },
    responseType: "blob"
  });
  return response.data;
};

export default api;
