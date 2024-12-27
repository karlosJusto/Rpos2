import { useState, useEffect } from 'react'; 
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import 'dayjs/locale/es';  // Cargar el locale en español
import { createTheme, ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';

import Layout from './Layout';



const theme = createTheme({
  palette: {
    primary: {
      main: '#f2ac02', // Cambiar a cualquier color que desees.
      
    },
  },
});

export default function Calendario({ onDateChange }) {


   
  const [selectedDate, setSelectedDate] = useState(dayjs());  // Inicializa con la fecha y hora actual

  // Función para manejar el cambio de fecha y hora
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);

    onDateChange(newDate ?  dayjs(newDate).format("DD/MM/YYYY HH:mm") : "");  // Pasamos la fecha seleccionada al ModalCliente

    //console.log(newDate);  // Ver la fecha y hora seleccionada
  };
  return (

   
    <ThemeProvider theme={theme}> {/* Aplicar el tema personalizado */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DemoContainer components={['DateTimePicker']}>
          <DateTimePicker
            label="Selecciona fecha y hora del pedido"
            value={selectedDate} // Establecer el valor del DateTimePicker
            onChange={handleDateChange} // Llamar a la función cuando se cambia la fecha
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock,
              seconds: renderTimeViewClock,
            }}
          />
        </DemoContainer>
       
      </LocalizationProvider>
    </ThemeProvider>
  );
}
