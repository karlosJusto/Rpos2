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
  
    // Obtener los minutos actuales
    const minutes = dateToRound.minute();
    
    // Lógica de redondeo de los minutos
    let nuevoBloque;
    
    // Bloques de minutos: 00, 15, 30, 45
    if (minutes === 0) {
      nuevoBloque = dateToRound.startOf('hour'); // Bloque exacto a la hora (xx:00)
    } else if (minutes >= 5 && minutes <= 15) {
      nuevoBloque = dateToRound.startOf('hour').add(15, 'minute'); // xx:15
    } else if (minutes >= 16 && minutes <= 30) {
      nuevoBloque = dateToRound.startOf('hour').add(30, 'minute'); // xx:30
    } else if (minutes >= 31 && minutes <= 45) {
      nuevoBloque = dateToRound.startOf('hour').add(45, 'minute'); // xx:45
    } else if (minutes >= 46 && minutes <= 59) {
      nuevoBloque = dateToRound.add(1, 'hour').startOf('hour'); // siguiente hora en punto
    }
    // Establecer la nueva fecha con el minuto redondeado
    const roundedDate = nuevoBloque.second(0).millisecond(0); // Aseguramos que los segundos y milisegundos sean 0
  
    // Establecer la fecha redondeada en el estado
    setSelectedDate(roundedDate);
  
    // Pasamos la fecha seleccionada al ModalCliente
    onDateChange(roundedDate ? roundedDate.format("DD/MM/YYYY HH:mm") : "");
  };
  

  // Función para deshabilitar ciertas horas y minutos
  const shouldDisableTime = (time, clockType) => {
    const hour = time.hour();  // Obtener la hora usando el método .hour() de Dayjs

    // Deshabilitar entre las 00:00 y las 12:00, y entre las 16:00 y las 18:00
    if (clockType === "hours") {
      if (
        (hour >= 0 && hour < 12) || // Deshabilitar entre las 00:00 y las 12:00
        (hour >= 15 && hour < 18)   // Deshabilitar entre las 16:00 y las 18:00
      ) {
        return true;
      }
    }
    return false;
  };

  return (
    <ThemeProvider theme={theme}> {/* Aplicar el tema personalizado */}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DemoContainer components={['DateTimePicker', 'DateTimePicker']}>
          <DateTimePicker
            label="Selecciona fecha y hora del pedido"
            value={selectedDate} // Establecer el valor del DateTimePicker
            onChange={handleDateChange} // Llamar a la función cuando se cambia la fecha
            minTime={dayjs().set('hour', 12).set('minute', 0)} // Hora mínima (11:00)
            maxTime={dayjs().set('hour', 22).set('minute', 0)} // Hora máxima (23:00)
            ampm={false} // Usar formato de 24 horas (sin AM/PM)
            textField={(params) => <TextField {...params} />}
            format="DD/MM/YYYY HH:mm" // Formato de fecha y hora (día/mes/año hora:minutos)
            shouldDisableTime={shouldDisableTime} // Deshabilitar horas fuera de los rangos
          />
        </DemoContainer>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
