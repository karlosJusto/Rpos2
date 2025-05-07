import { useState } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TextField, IconButton, Box } from '@mui/material';

import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');



import React from 'react'

const theme = createTheme({
    palette: {
      mode: 'light',
      
     
    },
  });

const NavbarResultados = () => {

    const [fecha, setFecha] = useState(dayjs());


  return (
    <div className="flex items-center justify-between h-full px-6">
    {/* fechas */}
    <div className="flex items-center     rounded-lg  w-44 h-8">

    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      
         

          <DatePicker
            value={fecha}
            onChange={(newValue) => setFecha(newValue)}
            TextField={(params) => (
              <TextField
                {...params}
                variant="standard"
                sx={{ display: 'none' }} // Ocultar input visible
              />
            )}
          />

          <IconButton  onClick={() => document.querySelector('input[type="text"]')?.focus()}>
           
          </IconButton>
      
      </LocalizationProvider>
    </ThemeProvider>
      
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
            C
      </div>
        <div className="text-sm">
          <p className="font-medium text-gray-900 leading-none">Empleado</p>
          <p className="text-gray-500 text-xs leading-none text-center">Carlos</p>
        </div>
      </div>
    </div>
  </div>

  )
}

export default NavbarResultados
