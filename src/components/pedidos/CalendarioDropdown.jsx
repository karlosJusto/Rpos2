import React, { useState, useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { format, addMinutes, addHours, startOfHour } from "date-fns";

registerLocale("es", es);

function CalendarioDropdown({ onDateChange,initialDate }) {
  const [fecha, setFecha] = useState(null);
  const [hora, setHora] = useState("");
  const [minuto, setMinuto] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [horaSeleccionada, setHoraSeleccionada] = useState(false);
  const [minutoSeleccionado, setMinutoSeleccionado] = useState(false);

  const horasDisponibles = ["11", "12", "13", "14", "15","16","17", "18", "19", "20", "21", "22"];
  const minutosDisponibles = ["00", "15", "30", "45"];

  const fechaActual = format(new Date(), "dd/MM/yyyy");

  const ajustarHoraYMinutos = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    let nuevoBloque = startOfHour(now);
  
    if (minutes >= 1 && minutes <= 15) {
      nuevoBloque = addMinutes(nuevoBloque, 15);
    } else if (minutes >= 16 && minutes <= 30) {
      nuevoBloque = addMinutes(nuevoBloque, 30);
    } else if (minutes >= 31 && minutes <= 45) {
      nuevoBloque = addMinutes(nuevoBloque, 45);
    } else if (minutes >= 46 && minutes <= 59) {
      nuevoBloque = startOfHour(addHours(now, 1));
    }
  
    const horaAjustada = format(nuevoBloque, "HH");
    const minutoAjustado = format(nuevoBloque, "mm");
  
    const horaFinal = horasDisponibles.includes(horaAjustada) ? horaAjustada : horasDisponibles[0];
    const minutoFinal = minutosDisponibles.includes(minutoAjustado) ? minutoAjustado : minutosDisponibles[0];
  
    const fechaActualizada = new Date();
    fechaActualizada.setHours(horaFinal);
    fechaActualizada.setMinutes(minutoFinal);
  
    setHora(horaFinal);
    setMinuto(minutoFinal);
    setFecha(fechaActualizada);
  
    // ✅ Añade esta línea para notificar al padre con la fecha completa (fecha + hora)
    onDateChange(format(fechaActualizada, "dd/MM/yyyy HH:mm"));
  };
  

  useEffect(() => {
    ajustarHoraYMinutos();
  }, []);

  useEffect(() => {
    if (horaSeleccionada && minutoSeleccionado) {
      const fechaHoraFinal = getFechaHoraRealizado();
      onDateChange(fechaHoraFinal);
      setDropdownOpen(false);
      setHoraSeleccionada(false);
      setMinutoSeleccionado(false);
    }
  }, [horaSeleccionada, minutoSeleccionado]);

  const handleSelect = (tipo, valor) => {
    if (tipo === "hora") {
      setHora(valor);
      setHoraSeleccionada(true);
    }
    if (tipo === "minuto") {
      setMinuto(valor);
      setMinutoSeleccionado(true);
    }
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

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleFocus = (e) => {
    e.target.blur();
  };
  useEffect(() => {
    if (initialDate) {
      try {
        const [fechaStr, horaStr] = initialDate.split(" ");
        const [dia, mes, anio] = fechaStr.split("/");
        const [horaParsed, minutoParsed] = horaStr.split(":");
  
        const fechaObj = new Date(`${anio}-${mes}-${dia}T${horaParsed}:${minutoParsed}:00`);
  
        setFecha(fechaObj);
        setHora(horaParsed);
        setMinuto(minutoParsed);
  
        // ✅ Notificamos al padre
        onDateChange(format(fechaObj, "dd/MM/yyyy HH:mm"));
      } catch (error) {
        console.error("Error al parsear la fecha inicial:", error);
        ajustarHoraYMinutos(); // fallback
      }
    } else {
      ajustarHoraYMinutos(); // fallback
    }
  }, [initialDate]);
  

  

  return (
    <div className="flex p-3 rounded border-2 border-gray-200 space-x-10 justify-around">
      {/* Calendario */}
      <div className="text-center w-60">
        <h2 className="text-gray-500 font-extrabold text-sm mb-1 font-nunito">Selecciona una fecha</h2>
        <DatePicker
              selected={fecha}
              onChange={(date) => {
                setFecha(date);

                // ✅ Si ya tenemos hora y minuto, notificamos al padre con la nueva fecha completa
                if (hora && minuto) {
                  const nuevaFecha = new Date(date);
                  nuevaFecha.setHours(hora);
                  nuevaFecha.setMinutes(minuto);
                  onDateChange(format(nuevaFecha, "dd/MM/yyyy HH:mm"));
                }
              }}
              locale="es"
              dateFormat="dd/MM/yyyy"
              placeholderText={fechaActual}
              showPopperArrow={false}
              dropdownMode="select"
              minDate={new Date()}
              className="w-full text-sm px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 text-center"
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
