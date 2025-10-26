import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { createSpot } from "../lib/api/client";
import type { ParkingSpotCreate } from "../lib/types";

const initialForm: ParkingSpotCreate = {
  label: "",
  location: "",
  has_ev_charger: false,
  is_reserved: false,
  is_active: true,
  notes: ""
};

const ParkingSpotForm = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ParkingSpotCreate>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createSpot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      setForm(initialForm);
      setError(null);
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      setError(err.response?.data?.detail ?? err.message);
    }
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          Etiqueta
        </label>
        <input
          name="label"
          value={form.label}
          onChange={handleChange}
          required
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Plaza A-01"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Ubicación (opcional)
        </label>
        <input
          name="location"
          value={form.location ?? ""}
          onChange={handleChange}
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Planta -1"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="has_ev_charger"
            checked={form.has_ev_charger ?? false}
            onChange={handleChange}
          />
          Cargador eléctrico
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_reserved" checked={form.is_reserved ?? false} onChange={handleChange} />
          Reservada
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" checked={form.is_active ?? false} onChange={handleChange} />
          Activa
        </label>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Notas (opcional)
        </label>
        <textarea
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange}
          rows={2}
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Ej. Uso preferente directiva"
        />
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <button
        type="submit"
        disabled={mutation.isLoading}
        className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {mutation.isLoading ? "Guardando..." : "Añadir plaza"}
      </button>
    </form>
  );
};

export default ParkingSpotForm;
