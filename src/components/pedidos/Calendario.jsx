import { useState } from 'react'; 
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TextField } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';  // Cargar el locale en español

const theme = createTheme({
  palette: {
    primary: {
      main: '#f2ac02', // Cambiar a cualquier color que desees.
    },
  },
  typography: {
    fontSize: 18, // Aumentar el tamaño de la fuente en el tema
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          fontSize: '1.2rem', // Aumentar el tamaño del texto en el input
        },
      },
    },
    MuiDateTimePicker: {
      styleOverrides: {
        root: {
          fontSize: '1.2rem', // Aumentar el tamaño de la fuente en el DateTimePicker
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          width: '100px', // Ajustar el tamaño de la ventana emergente (popup)
          fontSize: '1.2rem', // Aumentar el tamaño de la fuente en la ventana del calendario
        },
      },
    },
  },
});


export default function Calendario({ onDateChange }) {
  // Inicializa con la fecha y hora actual más 15 minutos
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Función para manejar el cambio de fecha y hora
  const handleDateChange = (newDate) => {
    // Si se pasa una nueva fecha, o si no, utilizamos la hora actual
    const dateToRound = newDate ? dayjs(newDate) : dayjs();
  
    // Redondear los minutos a los bloques de 15 minutos (00, 15, 30, 45)
    const minutes = dateToRound.minute();
    const roundedMinutes = [0, 15, 30, 45].reduce((prev, curr) =>
      Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
    );
  
    // Crear la nueva fecha redondeada a los 15 minutos más cercanos
    const roundedDate = dateToRound
      .minute(roundedMinutes)
      .second(0)
      .millisecond(0); // Aseguramos que los milisegundos sean 0
  
    // Establecer la fecha redondeada en el estado
    setSelectedDate(roundedDate);
  
    // Pasamos la fecha seleccionada al ModalCliente
    onDateChange(roundedDate ? roundedDate.format("DD/MM/YYYY HH:mm") : "");
  };

  return (
    <ThemeProvider theme={theme}> {/* Aplicar el tema personalizado */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DemoContainer components={['DateTimePicker', 'DateTimePicker']}>
          <DateTimePicker
            label="Selecciona fecha y hora del pedido"
            value={selectedDate} // Establecer el valor del DateTimePicker
            onChange={handleDateChange} // Llamar a la función cuando se cambia la fecha
            minTime={dayjs().set('hour', 11).set('minute', 10)} // Hora mínima (11:00)
            maxTime={dayjs().set('hour', 23).set('minute', 0)} // Hora máxima (23:00)
            ampm={false} // Usar formato de 24 horas (sin AM/PM)
            textField={(params) => <TextField {...params} />}
            format="DD/MM/YYYY HH:mm" // Formato de fecha y hora (día/mes/año hora:minutos)
          />
        </DemoContainer>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
