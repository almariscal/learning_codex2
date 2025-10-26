import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { addDays, format, startOfWeek } from "date-fns";
import es from "date-fns/locale/es";

import { getSpotColor } from "../lib/colors";
import type {
  Allocation,
  AllocationBulkResult,
  AllocationUpdate,
  Employee,
  ParkingSpot
} from "../lib/types";

type ViewMode = "week" | "two_weeks" | "month";

const RANGE_SIZE: Record<ViewMode, number> = {
  week: 7,
  two_weeks: 14,
  month: 28
};

const VIEW_LABEL: Record<ViewMode, string> = {
  week: "Semana",
  two_weeks: "2 semanas",
  month: "4 semanas"
};

const formatDayKey = (day: Date): string => format(day, "yyyy-MM-dd");

interface SelectionState {
  employeeId: number | null;
  dayKeys: string[];
}

interface DragAssignPayload {
  employeeId: number;
  dayKeys: string[];
  spotId: number;
}

interface RangeAssignPayload {
  employeeId: number;
  spotId: number;
  startDay: string;
  endDay: string;
}

interface Props {
  employees: Employee[];
  spots: ParkingSpot[];
  allocations: Allocation[];
  onAssignSelection: (payload: DragAssignPayload) => Promise<void>;
  onAssignRange: (payload: RangeAssignPayload) => Promise<AllocationBulkResult>;
  onUpdateAllocation: (allocationId: number, payload: AllocationUpdate) => Promise<void>;
  onDeleteAllocation: (allocationId: number) => Promise<void>;
  onDeleteAllocations: (allocationIds: number[]) => Promise<void>;
  isAssigningSelection: boolean;
  isAssigningRange: boolean;
  isUpdatingAllocation: boolean;
}

interface ActiveAllocationState {
  allocation: Allocation;
  spotLabel: string;
}

interface RangeFormState {
  employeeId: number | "";
  spotId: number | "";
  startDay: string;
  endDay: string;
}

const AssignmentMatrix = ({
  employees,
  spots,
  allocations,
  onAssignSelection,
  onAssignRange,
  onUpdateAllocation,
  onDeleteAllocation,
  onDeleteAllocations,
  isAssigningSelection,
  isAssigningRange,
  isUpdatingAllocation
}: Props): JSX.Element => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [startDate, setStartDate] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selection, setSelection] = useState<SelectionState>({ employeeId: null, dayKeys: [] });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");
  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocationState | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mode, setMode] = useState<"assign" | "cancel">("assign");
  const [cancelSelection, setCancelSelection] = useState<number[]>([]);
  const [rangeForm, setRangeForm] = useState<RangeFormState>(() => ({
    employeeId: "",
    spotId: "",
    startDay: format(new Date(), "yyyy-MM-dd"),
    endDay: format(addDays(new Date(), 5), "yyyy-MM-dd")
  }));
  const [rangeResult, setRangeResult] = useState<AllocationBulkResult | null>(null);

  const days = useMemo(() => {
    const length = RANGE_SIZE[viewMode];
    return Array.from({ length }, (_, idx) => addDays(startDate, idx));
  }, [startDate, viewMode]);

  const spotMap = useMemo(() => new Map(spots.map((spot) => [spot.id, spot])), [spots]);

  const allocationMap = useMemo(() => {
    const map = new Map<string, Allocation>();
    allocations.forEach((allocation) => {
      map.set(`${allocation.employee_id}-${allocation.day}`, allocation);
    });
    return map;
  }, [allocations]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!employees.length || !spots.length) {
      return;
    }
    setRangeForm((prev) => ({
      employeeId: prev.employeeId || employees[0].id,
      spotId: prev.spotId || spots[0].id,
      startDay: prev.startDay,
      endDay: prev.endDay
    }));
  }, [employees, spots]);

  useEffect(() => {
    setCancelSelection([]);
    setActiveAllocation(null);
    resetSelection();
  }, [mode]);

  const resetSelection = (resetFeedback = true) => {
    setSelection({ employeeId: null, dayKeys: [] });
    setSelectedSpotId("");
    setIsDragging(false);
    if (resetFeedback) {
      setFeedback(null);
    }
  };

  const handleEmptyCellMouseDown = (employeeId: number, dayKey: string) => {
    if (mode !== "assign") {
      return;
    }
    setActiveAllocation(null);
    setSelection({ employeeId, dayKeys: [dayKey] });
    setIsDragging(true);
    setFeedback(null);
  };

  const handleCellEnter = (
    employeeId: number,
    dayKey: string,
    allocation: Allocation | undefined
  ) => {
    if (!isDragging) {
      return;
    }

    if (mode === "assign") {
      if (selection.employeeId !== employeeId) {
        return;
      }
      setSelection((prev) => {
        if (prev.dayKeys.includes(dayKey)) {
          return prev;
        }
        return { ...prev, dayKeys: [...prev.dayKeys, dayKey] };
      });
    } else if (mode === "cancel" && allocation) {
      setCancelSelection((prev) => (prev.includes(allocation.id) ? prev : [...prev, allocation.id]));
    }
  };

  const handleAssignSelection = async () => {
    if (!selection.employeeId || selection.dayKeys.length === 0 || selectedSpotId === "") {
      setFeedback({ type: "error", message: "Selecciona al menos una celda y una plaza para continuar." });
      return;
    }

    try {
      await onAssignSelection({
        employeeId: selection.employeeId,
        dayKeys: selection.dayKeys,
        spotId: selectedSpotId
      });
      resetSelection(false);
      setFeedback({
        type: "success",
        message: `Asignación guardada (${selection.dayKeys.length} día/s).`
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo completar la asignación. Comprueba conflictos."
      });
    }
  };

  const handleRangeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rangeForm.employeeId || !rangeForm.spotId) {
      setRangeResult(null);
      setFeedback({ type: "error", message: "Selecciona empleado y plaza para asignar." });
      return;
    }

    try {
      const result = await onAssignRange({
        employeeId: Number(rangeForm.employeeId),
        spotId: Number(rangeForm.spotId),
        startDay: rangeForm.startDay,
        endDay: rangeForm.endDay
      });
      setRangeResult(result);
      setFeedback({
        type: "success",
        message: `Asignación en bloque completada. Creadas: ${result.created}.`
      });
    } catch (error) {
      setRangeResult(null);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo realizar la asignación en bloque."
      });
    }
  };

  const handleAllocationUpdate = async (payload: AllocationUpdate) => {
    if (!activeAllocation) {
      return;
    }
    try {
      await onUpdateAllocation(activeAllocation.allocation.id, payload);
      setActiveAllocation((prev) => {
        if (!prev) {
          return prev;
        }
        const nextAllocation = { ...prev.allocation, ...payload } as Allocation;
        const nextSpotLabel =
          payload.spot_id != null
            ? spots.find((spot) => spot.id === payload.spot_id)?.label ?? prev.spotLabel
            : prev.spotLabel;
        if (payload.day) {
          nextAllocation.day = payload.day;
        }
        return { allocation: nextAllocation, spotLabel: nextSpotLabel };
      });
      setFeedback({ type: "success", message: "Asignación actualizada correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la asignación."
      });
    }
  };

  const handleAllocationDelete = async () => {
    if (!activeAllocation) {
      return;
    }
    try {
      await onDeleteAllocation(activeAllocation.allocation.id);
      setActiveAllocation(null);
      setFeedback({ type: "success", message: "La reserva se canceló correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cancelar la reserva."
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!cancelSelection.length) {
      setFeedback({ type: "error", message: "Selecciona una o más reservas para cancelar." });
      return;
    }
    try {
      await onDeleteAllocations(cancelSelection);
      setCancelSelection([]);
      resetSelection();
      setFeedback({ type: "success", message: "Reservas canceladas correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cancelar las reservas seleccionadas."
      });
    }
  };

  const selectionSet = new Set(selection.dayKeys);
  const cancelSelectionSet = new Set(cancelSelection);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Vista:</span>
          <div className="inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
            {(Object.keys(RANGE_SIZE) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  "px-3 py-1 text-sm transition",
                  viewMode === mode
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {VIEW_LABEL[mode]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Modo:</span>
          <div className="inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
            {[
              { id: "assign", label: "Asignar" },
              { id: "cancel", label: "Cancelar" }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id as "assign" | "cancel")}
                className={clsx(
                  "px-3 py-1 text-sm transition",
                  mode === option.id
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStartDate((current) => addDays(current, RANGE_SIZE[viewMode] * -1))}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setStartDate((current) => addDays(current, RANGE_SIZE[viewMode]))}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full select-none text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left dark:bg-slate-800">Empleado</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="px-3 py-2 text-left">
                  <div className="flex flex-col">
                    <span>{format(day, "EEE", { locale: es })}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {format(day, "dd/MM")}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <div>{employee.full_name}</div>
                  {employee.initials ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{employee.initials}</span>
                  ) : null}
                </th>
                {days.map((day) => {
                  const dayKey = formatDayKey(day);
                  const cellKey = `${employee.id}-${dayKey}`;
                  const allocation = allocationMap.get(cellKey);
                  const isSelected = selection.employeeId === employee.id && selectionSet.has(dayKey);
                  const isMarkedForCancel = allocation ? cancelSelectionSet.has(allocation.id) : false;
                  const spotLabel = allocation ? spotMap.get(allocation.spot_id)?.label ?? "Plaza" : "";
                  const spotColor = allocation ? getSpotColor(spotLabel) : "#e2e8f0";

                  const handleMouseDown = () => {
                    if (allocation) {
                      if (mode === "cancel") {
                        setActiveAllocation(null);
                        setCancelSelection([allocation.id]);
                        setIsDragging(true);
                        setFeedback(null);
                      } else {
                        setActiveAllocation({ allocation, spotLabel });
                        resetSelection();
                      }
                    } else {
                      handleEmptyCellMouseDown(employee.id, dayKey);
                    }
                  };

                  return (
                    <td
                      key={dayKey}
                      className={clsx(
                        "cursor-pointer border-l border-slate-200 p-2 align-top transition dark:border-slate-800",
                        isSelected && "ring-2 ring-indigo-400"
                      )}
                      onMouseDown={handleMouseDown}
                      onMouseEnter={() => handleCellEnter(employee.id, dayKey, allocation)}
                    >
                      {allocation ? (
                        <div
                          className={clsx(
                            "flex flex-col rounded-md px-2 py-1 text-xs font-semibold text-white",
                            isMarkedForCancel && "ring-2 ring-rose-300"
                          )}
                          style={{ backgroundColor: spotColor }}
                        >
                          <span>{spotLabel}</span>
                          <span className="text-[10px] font-normal uppercase opacity-70">{allocation.status}</span>
                        </div>
                      ) : (
                        <div
                          className={clsx(
                            "flex h-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500",
                            isSelected &&
                              "border-indigo-400 bg-indigo-50 text-indigo-500 dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-200"
                          )}
                        >
                          Libre
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selection.employeeId && selection.dayKeys.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Asignar plazas</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Selección actual: {selection.dayKeys.length} día(s). Arrastra sobre la tabla para ampliar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetSelection()}
              className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancelar selección
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Plaza a asignar
              </label>
              <select
                value={selectedSpotId}
                onChange={(event) =>
                  setSelectedSpotId(event.target.value ? Number(event.target.value) : "")
                }
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Selecciona plaza...</option>
                {spots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.label} {spot.has_ev_charger ? "⚡" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAssignSelection}
                disabled={isAssigningSelection}
                className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isAssigningSelection ? "Asignando..." : "Confirmar asignación"}
              </button>
            </div>
          </div>

          {feedback && selection.employeeId ? (
            <p
              className={clsx(
                "mt-3 text-sm",
                feedback.type === "success" ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Asignación rápida por rango
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecciona un empleado, la plaza y el rango de fechas. Se crearán reservas para cada día del intervalo.
        </p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleRangeSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Empleado</label>
            <select
              value={rangeForm.employeeId}
              onChange={(event) =>
                setRangeForm((prev) => ({
                  ...prev,
                  employeeId: event.target.value ? Number(event.target.value) : ""
                }))
              }
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Selecciona empleado...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Plaza</label>
            <select
              value={rangeForm.spotId}
              onChange={(event) =>
                setRangeForm((prev) => ({
                  ...prev,
                  spotId: event.target.value ? Number(event.target.value) : ""
                }))
              }
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Selecciona plaza...</option>
              {spots.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
            <input
              type="date"
              value={rangeForm.startDay}
              onChange={(event) =>
                setRangeForm((prev) => ({ ...prev, startDay: event.target.value }))
              }
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
            <input
              type="date"
              value={rangeForm.endDay}
              onChange={(event) =>
                setRangeForm((prev) => ({ ...prev, endDay: event.target.value }))
              }
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <button
              type="submit"
              disabled={isAssigningRange}
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300 md:w-auto"
            >
              {isAssigningRange ? "Procesando..." : "Asignar rango"}
            </button>
            {rangeResult ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Creadas: {rangeResult.created} · Conflictos: {rangeResult.skipped}
              </span>
            ) : null}
          </div>
        </form>
      </div>

      {activeAllocation ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Editar asignación
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activeAllocation.spotLabel} · {activeAllocation.allocation.day}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAllocation(null)}
              className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Empleado</label>
              <select
                value={activeAllocation.allocation.employee_id}
                onChange={(event) =>
                  handleAllocationUpdate({ employee_id: Number(event.target.value) })
                }
                disabled={isUpdatingAllocation}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Plaza</label>
              <select
                value={activeAllocation.allocation.spot_id}
                onChange={(event) =>
                  handleAllocationUpdate({ spot_id: Number(event.target.value) })
                }
                disabled={isUpdatingAllocation}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {spots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Día</label>
              <input
                type="date"
                value={activeAllocation.allocation.day}
                onChange={(event) => handleAllocationUpdate({ day: event.target.value })}
                disabled={isUpdatingAllocation}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAllocationDelete}
              disabled={isUpdatingAllocation}
              className="rounded border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              Cancelar reserva
            </button>
          </div>
        </div>
      ) : null}

      {feedback && !selection.employeeId ? (
        <p
          className={clsx(
            "text-sm",
            feedback.type === "success" ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {feedback.message}
        </p>
      ) : null}

      {mode === "cancel" && cancelSelection.length > 0 ? (
        <div className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-rose-600 dark:text-rose-300">
              Reservas seleccionadas: {cancelSelection.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelSelection([])}
                className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Limpiar selección
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isUpdatingAllocation}
                className="rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                Cancelar reservas
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AssignmentMatrix;
