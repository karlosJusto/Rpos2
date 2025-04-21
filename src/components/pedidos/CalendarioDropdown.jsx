
import React, { useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { format } from "date-fns"; // Importamos 'format' para formatear la fecha y hora

registerLocale("es", es);

function CalendarioDropdown({ onDateChange }) {
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState("");
  const [minuto, setMinuto] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const horasDisponibles = ["11", "12", "13", "14", "15", "18", "19", "20", "21", "22"];
  const minutosDisponibles = ["00", "15", "30", "45"];

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleHoraChange = (horaSeleccionada) => {
    setHora(horaSeleccionada);
  };

  const handleMinutoChange = (minutoSeleccionado) => {
    setMinuto(minutoSeleccionado);
  };

  // Cerrar el dropdown solo cuando ambos, hora y minuto, hayan sido seleccionados
  const handleSelectBoth = () => {
    if (hora && minuto) {
      setDropdownOpen(false); // Cerrar el dropdown solo si ambos valores son seleccionados
       // Pasar fecha y hora ya formateada al componente padre
    const fechaHoraFinal = getFechaHoraRealizado();
    onDateChange(fechaHoraFinal); // aquí se manda al componente padre
    console.log('<<<<<<<<<<<'+fechaHoraFinal);
    }
  };

  // Prevenir que se abra el teclado virtual al interactuar con el campo de fecha
  const handleFocus = (e) => {
    e.target.blur(); // Desenfocar el campo cuando se hace foco para evitar el teclado
  };

  // Función para combinar la fecha y la hora/minuto en el formato "dd/MM/yyyy HH:mm"
  const getFechaHoraRealizado = () => {
    if (fecha && hora && minuto) {
      const fechaHora = new Date(fecha);
      fechaHora.setHours(hora); // Establecer la hora seleccionada
      fechaHora.setMinutes(minuto); // Establecer los minutos seleccionados

      // Formatear la fecha y hora en el formato "dd/MM/yyyy HH:mm"
      return format(fechaHora, "dd/MM/yyyy HH:mm");
    }
    return "";
  
  };
  const fechaActual = format(new Date(), "dd/MM/yyyy");
  

  return (
    
      <div className="flex  p-3 rounded border-2 border-gray-200 space-x-10 justify-around">
        {/* Calendario */}
        <div className="text-center w-60">
          <h2 className="text-gray-500 font-extrabold text-sm mb-1 font-nunito">Selecciona una fecha</h2>
          <DatePicker
            selected={fecha}
            onChange={(date) => setFecha(date)}
            locale="es"
            dateFormat="dd/MM/yyyy"
            placeholderText={fechaActual}
            showPopperArrow={false}
            dropdownMode="select"
            className="w-full text-sm px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 text-center "
            onFocus={handleFocus} // Deshabilitar la apertura del teclado al enfocar el campo
          />
          
          
        </div>

        {/* Dropdown de horas y minutos en columnas */}
        <div className="text-center w-64 relative">
          <h2 className="text-gray-500 font-extrabold text-sm mb-1 font-nunito">Selecciona hora</h2> 

          {/* Botón para abrir el dropdown */}
          <div
            onClick={toggleDropdown}
            className="cursor-pointer w-full text-md px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 flex justify-center items-center"
          >
            <span className="text-gray-500">
              {hora ? hora : <span className="font-nunito text-sm text-gray-400">Hora</span>}
            </span>
            <span className="text-gray-400 font-nunito">:</span>
            <span className="text-gray-500">
              {minuto ? minuto : <span className="font-nunito text-sm text-gray-400">Minutos</span>}
            </span>

          </div>

          {/* Dropdown de horas y minutos */}
          {dropdownOpen && (
            <div className="absolute bg-white border border-gray-300 rounded shadow-lg w-full mt-2">
              <div className="flex">
                {/* Selección de hora */}
                <div className="w-1/2">
                  {horasDisponibles.map((horaOption) => (
                    <div
                      key={horaOption}
                      onClick={() => {
                        handleHoraChange(horaOption);
                      }}
                      className="font-nunito text-sm text-gray-900 px-2 py-2 cursor-pointer hover:bg-yellow-500"
                    >
                      {horaOption}
                    </div>
                  ))}
                </div>

                {/* Selección de minutos */}
                <div className="w-1/2">
                  {minutosDisponibles.map((minutoOption) => (
                    <div
                      key={minutoOption}
                      onClick={() => {
                        handleMinutoChange(minutoOption);
                        handleSelectBoth(); // Verifica si ambos han sido seleccionados
                      }}
                      className="px-2 text-sm font-nunito text-gray-900 py-2 cursor-pointer hover:bg-yellow-500"
                    >
                      {minutoOption}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        
      </div>

  );
}

export default CalendarioDropdown;
