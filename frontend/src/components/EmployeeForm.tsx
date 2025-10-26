import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { createEmployee } from "../lib/api/client";
import type { EmployeeCreate } from "../lib/types";

const initialForm: EmployeeCreate = {
  full_name: "",
  email: "",
  initials: "",
  is_admin: false,
  has_ev_car: false
};

const EmployeeForm = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EmployeeCreate>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setForm(initialForm);
      setError(null);
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      setError(err.response?.data?.detail ?? err.message);
    }
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Nombre completo
        </label>
        <input
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Ej. Ana Pérez"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Email corporativo
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="ana.perez@empresa.com"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-1/2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Iniciales
          </label>
          <input
            name="initials"
            value={form.initials ?? ""}
            onChange={handleChange}
            className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            placeholder="AP"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              name="is_admin"
              checked={form.is_admin ?? false}
              onChange={handleChange}
            />
            RRHH/Admin
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              name="has_ev_car"
              checked={form.has_ev_car ?? false}
              onChange={handleChange}
            />
            Coche eléctrico
          </label>
        </div>
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <button
        type="submit"
        disabled={mutation.isLoading}
        className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {mutation.isLoading ? "Guardando..." : "Añadir empleado"}
      </button>
    </form>
  );
};

export default EmployeeForm;
