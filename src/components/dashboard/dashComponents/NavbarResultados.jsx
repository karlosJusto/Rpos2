import React from 'react'; // Eliminado useState ya que no se usa aquí
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TextField, IconButton } from '@mui/material'; // Box no se usa, se puede quitar si no hay otros usos

import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

// El tema de MUI se puede definir fuera si no cambia
const theme = createTheme({
    palette: {
      mode: 'light',
      // Puedes añadir más personalizaciones del tema aquí si es necesario
    },
  });

// El componente ahora recibe selectedDate y onDateChange como props
const NavbarResultados = ({ selectedDate, onDateChange }) => {
    // El estado 'fecha' y 'setFecha' se eliminan, ya que la fecha se maneja en el componente padre

    const empleadoNombre = sessionStorage.getItem('empleadoNombre');

  return (
    <div className="flex items-center justify-between h-full px-6">
    {/* fechas */}
    <div className="flex items-center rounded-lg w-auto h-8"> {/* Ajustado w-44 a w-auto para flexibilidad */}

    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <DatePicker
            value={selectedDate} // Usa la prop selectedDate
            onChange={onDateChange} // Usa la prop onDateChange
            slots={{
                textField: (params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    InputProps={{ ...params.InputProps, disableUnderline: true }} // Quitar el subrayado
                    sx={{
                        // Estilos para el contenedor del input si es necesario
                        '& .MuiInputBase-input': {
                            padding: '8px 8px', // Ajustar padding si es necesario
                            fontSize: '1rem', // Ajustar tamaño de fuente
                            cursor: 'pointer',
                            marginRight:'-60px',
                        },
                        // Puedes ocultar el input si solo quieres mostrar el valor y abrir con un botón
                        // o estilizarlo para que parezca un texto normal.
                    }}
                  />
                ),
                // Puedes añadir un openPickerIcon personalizado si lo deseas
              }}
              // Para que el DatePicker no muestre el input y se abra con un botón externo (opcional)
              // renderInput={(params) => <TextField {...params} sx={{ display: 'none' }} />}
          />
          {/* Si quieres un botón para abrir el DatePicker (si el input está oculto) */}
          {/* <IconButton onClick={() => document.querySelector('input[aria-label="Choose date"]')?.focus()}>
             <CalendarTodayIcon /> // Ejemplo de icono
          </IconButton> */}
      
      </LocalizationProvider>
    </ThemeProvider>
      
    </div>

    <div>
      <h1 className='text-yellow-600  text-2xl font-bold font-nunito -ms-8'>Dashboard</h1>
    </div>
   

    {/* Icons and user info */}
    <div className="flex items-center gap-4">
      {/* Mail icon */}
      <button className="text-gray-500 hover:text-yellow-500">
      <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5"
            >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-.768 1.707l-7.5 6.75a2.25 2.25 0 01-3.024 0l-7.5-6.75A2.25 2.25 0 012.25 6.993V6.75"
            />
        </svg>
      </button>

      {/* Bell icon */}
      <button className="text-gray-500 hover:text-yellow-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {/* User info */}
      <div className="flex items-center gap-2 font-nunito">
      <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-semibold text-sm">
            {empleadoNombre ? empleadoNombre.charAt(0).toUpperCase() : 'U'} {/* Inicial del empleado o 'U' */}
      </div>
        <div className="text-sm">
          <p className="font-medium text-gray-900 leading-none">Empleado</p>
          <p className="text-gray-500 text-xs leading-none text-center">{empleadoNombre || 'Usuario'}</p>
        </div>
      </div>
    </div>
  </div>
  )
}

export default NavbarResultados;
