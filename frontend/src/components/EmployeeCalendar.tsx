import { useMemo } from "react";
import { Calendar, type EventProps, Views, dateFnsLocalizer } from "react-big-calendar";
import { addHours, format, getDay, parse, startOfWeek } from "date-fns";
import es from "date-fns/locale/es";

import type { Allocation, ParkingSpot } from "../lib/types";
import { getSpotColor } from "../lib/colors";

const locales = {
  es
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { locale: es }),
  getDay,
  locales
});

interface EventShape {
  id: number;
  title: string;
  start: Date;
  end: Date;
  spotLabel: string;
}

interface Props {
  allocations: Allocation[];
  spots: ParkingSpot[];
}

const eventPropGetter: EventProps<EventShape>["eventPropGetter"] = (event) => {
  const backgroundColor = getSpotColor(event.spotLabel);
  return {
    style: {
      backgroundColor,
      borderRadius: "6px",
      border: "none"
    }
  };
};

const EmployeeCalendar = ({ allocations, spots }: Props): JSX.Element => {
  const events = useMemo<EventShape[]>(() => {
    const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
    return allocations.map((allocation) => {
      const day = new Date(allocation.day);
      const start = addHours(day, 8);
      const end = addHours(day, 9);
      const spotLabel = spotMap.get(allocation.spot_id)?.label ?? "Sin plaza";
      return {
        id: allocation.id,
        title: `${spotLabel} · ${allocation.status}`,
        start,
        end,
        spotLabel
      };
    });
  }, [allocations, spots]);

  return (
    <div className="space-y-4">
      <Calendar
        culture="es"
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK]}
        style={{ height: 520 }}
        eventPropGetter={eventPropGetter}
        messages={{
          month: "Mes",
          week: "Semana",
          previous: "Anterior",
          next: "Siguiente",
          today: "Hoy"
        }}
      />
    </div>
  );
};

export default EmployeeCalendar;
