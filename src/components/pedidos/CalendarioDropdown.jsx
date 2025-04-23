import React, { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { format } from "date-fns";

registerLocale("es", es);

function CalendarioDropdown({ onDateChange }) {
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState("");
  const [minuto, setMinuto] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const horasDisponibles = ["11", "12", "13", "14", "15", "18", "19", "20", "21", "22"];
  const minutosDisponibles = ["00", "15", "30", "45"];

  const fechaActual = format(new Date(), "dd/MM/yyyy");

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleSelect = (tipo, valor) => {
    if (tipo === "hora") setHora(valor);
    if (tipo === "minuto") setMinuto(valor);
  };

  const getFechaHoraRealizado = () => {
    if (fecha && hora && minuto) {
      const fechaHora = new Date(fecha);
      fechaHora.setHours(hora);
      fechaHora.setMinutes(minuto);
      return format(fechaHora, "dd/MM/yyyy HH:mm");
    }
    return "";
  };

  useEffect(() => {
    if (hora && minuto) {
      const fechaHoraFinal = getFechaHoraRealizado();
      onDateChange(fechaHoraFinal);
      setDropdownOpen(false); // cerrar dropdown una vez todo esté seleccionado
    }
  }, [hora, minuto]);

  const handleFocus = (e) => {
    e.target.blur();
  };

  return (
    <div className="flex p-3 rounded border-2 border-gray-200 space-x-10 justify-around">
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
          minDate={new Date()} // 👉 Evita seleccionar fechas anteriores a hoy
          className="w-full text-sm px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 text-center "
          onFocus={handleFocus}

      
        />
      </div>

      {/* Dropdown hora:minuto */}
      <div className="text-center w-64 relative">
        <h2 className="text-gray-500 font-extrabold text-sm mb-1 font-nunito">Selecciona hora</h2>
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

        {/* Dropdown con columnas */}
        {dropdownOpen && (
          <div className="absolute bg-white border border-gray-300 rounded shadow-lg w-full mt-2 z-10">
            <div className="flex">
              <div className="w-1/2">
                {horasDisponibles.map((h) => (
                  <div
                    key={h}
                    onClick={() => handleSelect("hora", h)}
                    className="font-nunito text-sm text-gray-900 px-2 py-2 cursor-pointer hover:bg-yellow-500"
                  >
                    {h}
                  </div>
                ))}
              </div>
              <div className="w-1/2">
                {minutosDisponibles.map((m) => (
                  <div
                    key={m}
                    onClick={() => handleSelect("minuto", m)}
                    className="px-2 text-sm font-nunito text-gray-900 py-2 cursor-pointer hover:bg-yellow-500"
                  >
                    {m}
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
