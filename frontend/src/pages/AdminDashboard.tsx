import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import es from "date-fns/locale/es";

import AssignmentMatrix from "../components/AssignmentMatrix";
import EmployeeForm from "../components/EmployeeForm";
import ParkingSpotForm from "../components/ParkingSpotForm";
import {
  createAllocationsBulk,
  createAllocation,
  deleteAllocation,
  deleteEmployee,
  deleteSpot,
  downloadBulkICS,
  fetchAllocations,
  fetchEmployees,
  fetchSpots,
  updateAllocation,
  updateEmployee,
  updateSpot
} from "../lib/api/client";
import type { Allocation, Employee, ParkingSpot } from "../lib/types";

interface AllocationSummary extends Allocation {
  employee?: Employee;
  spot?: ParkingSpot;
}

const AdminDashboard = (): JSX.Element => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"schedule" | "control">("schedule");
  const [bulkICSForm, setBulkICSForm] = useState({
    startDay: format(new Date(), "yyyy-MM-dd"),
    endDay: format(new Date(), "yyyy-MM-dd")
  });
  const [bulkICSError, setBulkICSError] = useState<string | null>(null);

  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: fetchEmployees });
  const spotsQuery = useQuery({ queryKey: ["spots"], queryFn: fetchSpots });
  const allocationsQuery = useQuery({ queryKey: ["allocations"], queryFn: fetchAllocations });

  const combinedAllocations = useMemo<AllocationSummary[]>(() => {
    if (!allocationsQuery.data || !employeesQuery.data || !spotsQuery.data) {
      return [];
    }
    const employeeMap = new Map(employeesQuery.data.map((item) => [item.id, item]));
    const spotMap = new Map(spotsQuery.data.map((item) => [item.id, item]));
    return allocationsQuery.data.map((allocation) => ({
      ...allocation,
      employee: employeeMap.get(allocation.employee_id),
      spot: spotMap.get(allocation.spot_id)
    }));
  }, [allocationsQuery.data, employeesQuery.data, spotsQuery.data]);

  const assignMutation = useMutation({
    mutationFn: async ({
      employeeId,
      dayKeys,
      spotId
    }: {
      employeeId: number;
      dayKeys: string[];
      spotId: number;
    }) => {
      const failures: string[] = [];
      for (const day of dayKeys) {
        try {
          await createAllocation({ day, employee_id: employeeId, spot_id: spotId });
        } catch (error) {
          failures.push(day);
        }
      }
      if (failures.length) {
        const formatted = failures
          .map((day) => format(new Date(day), "dd/MM", { locale: es }))
          .join(", ");
        throw new Error(`No se asignaron algunos días por conflicto: ${formatted}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const rangeMutation = useMutation({
    mutationFn: createAllocationsBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ allocationId, payload }: { allocationId: number; payload: any }) =>
      updateAllocation(allocationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (allocationId: number) => deleteAllocation(allocationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (allocationIds: number[]) => {
      for (const id of allocationIds) {
        await deleteAllocation(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: number; payload: any }) =>
      updateEmployee(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: number) => deleteEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const updateSpotMutation = useMutation({
    mutationFn: ({ spotId, payload }: { spotId: number; payload: any }) => updateSpot(spotId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spots"] });
    }
  });

  const deleteSpotMutation = useMutation({
    mutationFn: (spotId: number) => deleteSpot(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spots"] });
    }
  });

  const isLoading =
    employeesQuery.isLoading || spotsQuery.isLoading || allocationsQuery.isLoading;

  const handleBulkICSDownload = async () => {
    setBulkICSError(null);
    const { startDay, endDay } = bulkICSForm;
    if (endDay < startDay) {
      setBulkICSError("El rango es inválido (fecha fin anterior a fecha inicio).");
      return;
    }
    try {
      const blob = await downloadBulkICS(startDay, endDay);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parking-${startDay}-${endDay}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setBulkICSError(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el paquete de convocatorias."
      );
    }
  };

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Panel de RRHH
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Coordina las asignaciones de parking, gestiona el inventario y exporta convocatorias en un solo lugar.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "schedule"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-600 shadow dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Asignaciones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("control")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "control"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-600 shadow dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Panel de control
        </button>
      </div>

      {activeTab === "schedule" ? (
        <>
          <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Calendario matricial de plazas
            </h2>
            {employeesQuery.data && spotsQuery.data ? (
              <div className="overflow-x-auto">
                <div className="max-h-[70vh] overflow-y-auto">
                  <AssignmentMatrix
                    employees={employeesQuery.data}
                    spots={spotsQuery.data}
                    allocations={allocationsQuery.data ?? []}
                    onAssignSelection={assignMutation.mutateAsync}
                    onAssignRange={rangeMutation.mutateAsync}
                    onUpdateAllocation={(allocationId, payload) =>
                      updateMutation.mutateAsync({ allocationId, payload })
                    }
                    onDeleteAllocation={(allocationId) => deleteMutation.mutateAsync(allocationId)}
                    onDeleteAllocations={(ids) => deleteManyMutation.mutateAsync(ids)}
                    isAssigningSelection={assignMutation.isPending}
                    isAssigningRange={rangeMutation.isPending}
                    isUpdatingAllocation={
                      updateMutation.isPending || deleteMutation.isPending || deleteManyMutation.isPending
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Necesitas al menos un empleado y una plaza para comenzar a asignar.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Asignaciones recientes
            </h2>
            {isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando asignaciones...</p>
            ) : combinedAllocations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay asignaciones guardadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Empleado</th>
                      <th className="py-2">Plaza</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedAllocations.map((allocation) => (
                      <tr key={allocation.id} className="border-b border-slate-100 dark:border-slate-800/60">
                        <td className="py-2">
                          {new Date(allocation.day).toLocaleDateString("es-ES", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-2">{allocation.employee?.full_name ?? "Sin asignar"}</td>
                        <td className="py-2">{allocation.spot?.label ?? "Sin plaza"}</td>
                        <td className="py-2 capitalize">{allocation.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Exportar convocatorias (ZIP)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Descarga un paquete con las convocatorias de Outlook para todos los empleados entre dos fechas. Cada
              empleado tendrá su carpeta con archivos .ics preparados para importar.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
                <input
                  type="date"
                  value={bulkICSForm.startDay}
                  onChange={(event) =>
                    setBulkICSForm((prev) => ({ ...prev, startDay: event.target.value }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
                <input
                  type="date"
                  value={bulkICSForm.endDay}
                  onChange={(event) =>
                    setBulkICSForm((prev) => ({ ...prev, endDay: event.target.value }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBulkICSDownload}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Descargar ZIP
              </button>
              {bulkICSError ? <span className="text-xs text-rose-500">{bulkICSError}</span> : null}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Nuevo empleado
              </h2>
              <EmployeeForm />
            </div>
            <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Nueva plaza
              </h2>
              <ParkingSpotForm />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Gestión de empleados
            </h2>
            {employeesQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando empleados...</p>
            ) : employeesQuery.data?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      <th className="py-2 text-left">Nombre</th>
                      <th className="py-2 text-left">Iniciales</th>
                      <th className="py-2 text-left">Email</th>
                      <th className="py-2 text-left">Coche eléctrico</th>
                      <th className="py-2 text-left">Activo</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {employeesQuery.data.map((employee) => (
                      <tr key={employee.id} className="border-b border-slate-100 dark:border-slate-800/60">
                        <td className="py-2">{employee.full_name}</td>
                        <td className="py-2">{employee.initials ?? "-"}</td>
                        <td className="py-2">{employee.email}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateEmployeeMutation.mutate({
                                employeeId: employee.id,
                                payload: { has_ev_car: !employee.has_ev_car }
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              employee.has_ev_car
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {employee.has_ev_car ? "Sí" : "No"}
                          </button>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateEmployeeMutation.mutate({
                                employeeId: employee.id,
                                payload: { is_active: !employee.is_active }
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              employee.is_active
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {employee.is_active ? "Activo" : "Inactivo"}
                          </button>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay empleados registrados.</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Gestión de plazas
            </h2>
            {spotsQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando plazas...</p>
            ) : spotsQuery.data?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      <th className="py-2 text-left">Plaza</th>
                      <th className="py-2 text-left">Ubicación</th>
                      <th className="py-2 text-left">Cargador</th>
                      <th className="py-2 text-left">Activa</th>
                      <th className="py-2 text-left">Reservada</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {spotsQuery.data.map((spot) => (
                      <tr key={spot.id} className="border-b border-slate-100 dark:border-slate-800/60">
                        <td className="py-2">{spot.label}</td>
                        <td className="py-2">{spot.location ?? "-"}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSpotMutation.mutate({
                                spotId: spot.id,
                                payload: { has_ev_charger: !spot.has_ev_charger }
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              spot.has_ev_charger
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {spot.has_ev_charger ? "Sí" : "No"}
                          </button>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSpotMutation.mutate({
                                spotId: spot.id,
                                payload: { is_active: !spot.is_active }
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              spot.is_active
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {spot.is_active ? "Activa" : "Inactiva"}
                          </button>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSpotMutation.mutate({
                                spotId: spot.id,
                                payload: { is_reserved: !spot.is_reserved }
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              spot.is_reserved
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {spot.is_reserved ? "Reservada" : "Libre"}
                          </button>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => deleteSpotMutation.mutate(spot.id)}
                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay plazas registradas.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
