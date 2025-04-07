import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper.min.css';

// Función auxiliar para convertir "HH:MM" a minutos
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const ScheduleSwiper = ({ dailyIntervals, calendarConfig }) => {
  // Estado para determinar qué horario se muestra: "morning" o "evening"
  const [scheduleType, setScheduleType] = useState('morning');

  // Función para filtrar los intervalos según el tipo de horario configurado
  const getIntervalsForSchedule = (scheduleType) => {
    if (!dailyIntervals || !calendarConfig) return [];
    let schedule;
    if (scheduleType === 'morning') {
      schedule = calendarConfig.morningSchedule;
    } else if (scheduleType === 'evening') {
      schedule = calendarConfig.eveningSchedule;
    }
    if (!schedule || !schedule.active) return [];

    const startLimit = timeToMinutes(schedule.start);
    const endLimit = timeToMinutes(schedule.end);

    // Filtra los intervalos cuyo inicio y fin estén dentro del rango definido
    return dailyIntervals.filter(interval => {
      const intervalStart = timeToMinutes(interval.start);
      const intervalEnd = timeToMinutes(interval.end);
      return intervalStart >= startLimit && intervalEnd <= endLimit;
    });
  };

  const filteredIntervals = getIntervalsForSchedule(scheduleType);

  return (
    <div>
      {/* Controles para cambiar entre horario de mañana y tarde */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setScheduleType('morning')}>Mañana</button>
        <button onClick={() => setScheduleType('evening')}>Tarde</button>
      </div>

      {/* Swiper que muestra los intervalos filtrados */}
      <Swiper>
        {filteredIntervals.map((interval, index) => (
          <SwiperSlide key={index}>
            <div style={{ padding: '1rem', textAlign: 'center', border: '1px solid #ccc' }}>
              <p>{interval.start} - {interval.end}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ScheduleSwiper;
