import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { createAllocation } from "../lib/api/client";
import type { AllocationCreate, Employee, ParkingSpot } from "../lib/types";

interface Props {
  employees: Employee[];
  spots: ParkingSpot[];
}

const initialForm: AllocationCreate = {
  day: "",
  employee_id: 0,
  spot_id: 0,
  status: "confirmed"
};

const AllocationForm = ({ employees, spots }: Props): JSX.Element => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AllocationCreate>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createAllocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      setForm(initialForm);
      setError(null);
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      setError(err.response?.data?.detail ?? err.message);
    }
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name.endsWith("_id") ? Number(value) : value
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.employee_id || !form.spot_id || !form.day) {
      setError("Completa todos los campos antes de guardar.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Fecha
        </label>
        <input
          type="date"
          name="day"
          value={form.day}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Empleado
        </label>
        <select
          name="employee_id"
          value={form.employee_id === 0 ? "" : form.employee_id}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecciona empleado...</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Plaza
        </label>
        <select
          name="spot_id"
          value={form.spot_id === 0 ? "" : form.spot_id}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Selecciona plaza...</option>
          {spots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {spot.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <button
        type="submit"
        disabled={mutation.isLoading}
        className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {mutation.isLoading ? "Guardando..." : "Asignar plaza"}
      </button>
    </form>
  );
};

export default AllocationForm;
