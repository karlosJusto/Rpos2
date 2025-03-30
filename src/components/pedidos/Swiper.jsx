import React from 'react';

// Simulación de los datos que vendrían de la colección chicken_calendar_daily
const chickenCalendarDaily = {
  date: "2025-03-30",
  intervals: [
    { start: "11:00", end: "11:15", maxAllowed: 5, orderedCount: 0 },
    { start: "11:15", end: "11:30", maxAllowed: 5, orderedCount: 0 },
    { start: "11:30", end: "11:45", maxAllowed: 5, orderedCount: 0 },
    { start: "11:45", end: "12:00", maxAllowed: 5, orderedCount: 0 },
    { start: "12:00", end: "12:15", maxAllowed: 5, orderedCount: 0 },
    { start: "12:15", end: "12:30", maxAllowed: 5, orderedCount: 0 },
    { start: "12:30", end: "12:45", maxAllowed: 5, orderedCount: 0 },
    { start: "12:45", end: "13:00", maxAllowed: 5, orderedCount: 0 },
    { start: "15:00", end: "15:15", maxAllowed: 5, orderedCount: 0 },
    { start: "15:15", end: "15:30", maxAllowed: 5, orderedCount: 0 },
    { start: "15:30", end: "15:45", maxAllowed: 5, orderedCount: 0 },
    { start: "15:45", end: "16:00", maxAllowed: 5, orderedCount: 0 },
    { start: "16:00", end: "16:15", maxAllowed: 5, orderedCount: 0 },
    { start: "16:15", end: "16:30", maxAllowed: 5, orderedCount: 0 },
    { start: "16:30", end: "16:45", maxAllowed: 5, orderedCount: 0 },
    { start: "16:45", end: "17:00", maxAllowed: 5, orderedCount: 0 },
    { start: "17:00", end: "17:15", maxAllowed: 5, orderedCount: 0 },
    { start: "17:15", end: "17:30", maxAllowed: 5, orderedCount: 0 },
    { start: "17:30", end: "17:45", maxAllowed: 5, orderedCount: 0 },
    { start: "17:45", end: "18:00", maxAllowed: 5, orderedCount: 0 },
    { start: "18:00", end: "18:15", maxAllowed: 5, orderedCount: 0 },
    { start: "18:15", end: "18:30", maxAllowed: 5, orderedCount: 0 },
    { start: "18:30", end: "18:45", maxAllowed: 5, orderedCount: 0 },
    { start: "18:45", end: "19:00", maxAllowed: 5, orderedCount: 0 },
    { start: "19:00", end: "19:15", maxAllowed: 5, orderedCount: 0 },
    { start: "19:15", end: "19:30", maxAllowed: 5, orderedCount: 0 },
    { start: "19:30", end: "19:45", maxAllowed: 5, orderedCount: 6 },
    { start: "19:45", end: "20:00", maxAllowed: 5, orderedCount: 0 },
    { start: "20:00", end: "20:15", maxAllowed: 5, orderedCount: 0 },
    { start: "20:15", end: "20:30", maxAllowed: 5, orderedCount: 0 },
    { start: "20:30", end: "20:45", maxAllowed: 5, orderedCount: 0 },
    { start: "20:45", end: "21:00", maxAllowed: 5, orderedCount: 0 },
    { start: "21:00", end: "21:15", maxAllowed: 5, orderedCount: 0 },
    { start: "21:15", end: "21:30", maxAllowed: 5, orderedCount: 0 },
    { start: "21:30", end: "21:45", maxAllowed: 5, orderedCount: 0 },
    { start: "21:45", end: "22:00", maxAllowed: 5, orderedCount: 0 }
  ]
};

const Swiper = () => {
  // Filtramos los intervalos para cada turno:
  // Consideramos el turno de mañana aquellos intervalos con hora de inicio menor a 13:00
  const morningIntervals = chickenCalendarDaily.intervals.filter(
    (interval) => interval.start < "13:00"
  );
  // Y para el turno de tarde aquellos con hora de inicio desde las 15:00 en adelante
  const afternoonIntervals = chickenCalendarDaily.intervals.filter(
    (interval) => interval.start >= "15:00"
  );

  return (
    <div>
      <swiper-container
        slides-per-view="3"
        space-between="20"
        scrollbar-clickable="true"
        mousewheel-invert="true"
      >
        {/* Slide para el turno mañana */}
        <swiper-slide>
          <h2>Turno Mañana</h2>
          {morningIntervals.map((interval, index) => (
            <button key={index}>
              {interval.start} - {interval.end}
            </button>
          ))}
        </swiper-slide>

        {/* Slide para el turno tarde */}
        <swiper-slide>
          <h2>Turno Tarde</h2>
          {afternoonIntervals.map((interval, index) => (
            <button key={index}>
              {interval.start} - {interval.end}
            </button>
          ))}
        </swiper-slide>

        {/* Otros slides si los requieres */}
        <swiper-slide>adasjkdkasdkashk</swiper-slide>
        <swiper-slide>Slide4</swiper-slide>
        <swiper-slide>Slide5</swiper-slide>
      </swiper-container>
    </div>
  );
};

export default Swiper;
