import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

import EmployeeCalendar from "../components/EmployeeCalendar";
import {
  downloadEmployeeICS,
  fetchAllocations,
  fetchEmployees,
  fetchSpots
} from "../lib/api/client";

const EmployeePortal = (): JSX.Element => {
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
  const spotsQuery = useQuery({ queryKey: ["spots"], queryFn: fetchSpots });
  const allocationsQuery = useQuery({ queryKey: ["allocations"], queryFn: fetchAllocations });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>(undefined);
  const [icsForm, setIcsForm] = useState({
    startDay: format(new Date(), "yyyy-MM-dd"),
    endDay: format(addDays(new Date(), 7), "yyyy-MM-dd")
  });
  const [icsError, setIcsError] = useState<string | null>(null);

  const allocations = useMemo(() => {
    if (!allocationsQuery.data || !spotsQuery.data) {
      return [];
    }
    const spotMap = new Map(spotsQuery.data.map((item) => [item.id, item]));
    return allocationsQuery.data
      .filter((allocation) =>
        selectedEmployeeId ? allocation.employee_id === selectedEmployeeId : true
      )
      .map((allocation) => ({
        ...allocation,
        spotLabel: spotMap.get(allocation.spot_id)?.label ?? "Sin plaza"
      }));
  }, [allocationsQuery.data, selectedEmployeeId, spotsQuery.data]);

  const isLoading = employeesQuery.isLoading || allocationsQuery.isLoading;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Mi calendario de plazas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecciona tu usuario para consultar las reservas y sincroniza manualmente tu agenda.
        </p>
      </header>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Empleado
        </label>
        <select
          className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          value={selectedEmployeeId ?? ""}
          onChange={(event) =>
            setSelectedEmployeeId((prev) => {
              const next = event.target.value ? Number(event.target.value) : undefined;
              setIcsError(null);
              return next;
            })
          }
        >
          <option value="">Selecciona empleado...</option>
          {employeesQuery.data?.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Exportar convocatorias (ICS)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Descarga un fichero compatible con Outlook entre las fechas seleccionadas.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
            <input
              type="date"
              value={icsForm.startDay}
              onChange={(event) => {
                setIcsError(null);
                setIcsForm((prev) => ({ ...prev, startDay: event.target.value }));
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
            <input
              type="date"
              value={icsForm.endDay}
              onChange={(event) => {
                setIcsError(null);
                setIcsForm((prev) => ({ ...prev, endDay: event.target.value }));
              }}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!selectedEmployeeId}
          onClick={async () => {
            if (!selectedEmployeeId) {
              return;
            }
            if (icsForm.endDay < icsForm.startDay) {
              setIcsError("El rango seleccionado no es válido.");
              return;
            }
            try {
              setIcsError(null);
              const blob = await downloadEmployeeICS(
                selectedEmployeeId,
                icsForm.startDay,
                icsForm.endDay
              );
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `parking-${icsForm.startDay}-${icsForm.endDay}.ics`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } catch (error) {
              setIcsError(
                error instanceof Error
                  ? error.message
                  : "No se pudo descargar la convocatoria."
              );
            }
          }}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          Descargar ICS
        </button>
        {icsError ? <p className="mt-2 text-xs text-rose-500">{icsError}</p> : null}
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando asignaciones...</p>
        ) : !selectedEmployeeId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecciona tu usuario para visualizar el calendario interactivo.
          </p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay asignaciones registradas para los próximos días.
          </p>
        ) : (
          <EmployeeCalendar allocations={allocations} spots={spotsQuery.data ?? []} />
        )}
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando asignaciones...</p>
        ) : allocations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay asignaciones registradas.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {allocations.map((allocation) => (
              <li
                key={allocation.id}
                className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-700"
              >
                <span className="font-medium">
                  {new Date(allocation.day).toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </span>
                <span className="text-sm text-indigo-600 dark:text-indigo-300">{allocation.spotLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default EmployeePortal;
