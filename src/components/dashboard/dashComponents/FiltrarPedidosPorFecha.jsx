// src/components/dashboard/dashComponents/FiltrarPedidosPorFecha.jsx (o donde prefieras)
import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from '../../firebase/firebase'; // Ajusta la ruta si es necesario
import dayjs from 'dayjs';
// Asegúrate de tener estos plugins si no están globales
import isBetween from 'dayjs/plugin/isBetween';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Extiende dayjs con los plugins necesarios
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

import tienda from '../../../assets/tienda.png';
import web from '../../../assets/web.png';



const FiltrarPedidosPorFecha = () => {
  // Estados para las fechas
  const [fechaInicio, setFechaInicio] = useState(dayjs().format('YYYY-MM-DD')); // Fecha de hoy por defecto
  const [fechaFin, setFechaFin] = useState(dayjs().format('YYYY-MM-DD')); // Fecha de hoy por defecto

  // Estados para los datos y la carga
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false); // Para saber si mostrar "No hay resultados"

  // Función para buscar pedidos en el rango de fechas
  const buscarPedidosPorFecha = async () => {
    setLoading(true);
    setError(null);
    setPedidosFiltrados([]);
    setBusquedaRealizada(true); // Marcamos que se intentó buscar

    // Validar fechas
    const inicio = dayjs(fechaInicio, 'YYYY-MM-DD');
    const fin = dayjs(fechaFin, 'YYYY-MM-DD');

    if (!inicio.isValid() || !fin.isValid()) {
      setError("Por favor, selecciona fechas válidas.");
      setLoading(false);
      return;
    }

    if (fin.isBefore(inicio)) {
      setError("La fecha final no puede ser anterior a la fecha inicial.");
      setLoading(false);
      return;
    }

    console.log(`Buscando pedidos entre ${inicio.format('DD-MM-YYYY')} y ${fin.format('DD-MM-YYYY')}`);

    try {
      // **IMPORTANTE:** Asume que tienes un campo de fecha en tus pedidos.
      // Cambia 'fechahora_realizado_str' al nombre real de tu campo de fecha (string DD-MM-YYYY).
      // **NOTA:** Filtrar por rangos de fechas usando strings 'DD-MM-YYYY' directamente en Firestore
      // con >= y <= NO FUNCIONA CORRECTAMENTE debido al orden lexicográfico.
      // La forma más fiable (si no puedes usar Timestamps) es traer todos los documentos
      // y filtrarlos en el cliente, lo cual puede ser ineficiente con muchos datos.
      // Aquí implementamos el filtrado en el cliente.

      const pedidosRef = collection(db, 'pedidos');
      // Podrías intentar limitar un poco la consulta si tienes otro campo ordenable,
      // pero para el filtro de fecha estricto, a menudo necesitas traer todo.
      const q = query(pedidosRef, orderBy('NumeroPedido', 'desc')); // Ordena por número de pedido

      const querySnapshot = await getDocs(q);
      const todosLosPedidos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filtrar en el cliente
      const pedidosEnRango = todosLosPedidos.filter(pedido => {
        // *** AJUSTA 'fechahora_realizado' al nombre de tu campo de fecha string DD-MM-YYYY ***
        const fechaPedidoStr = pedido.fechahora_realizado; // Ejemplo: "30-07-2024"
        if (!fechaPedidoStr) return false; // Ignora pedidos sin fecha

        const fechaPedido = dayjs(fechaPedidoStr, 'DD-MM-YYYY');
        if (!fechaPedido.isValid()) return false; // Ignora fechas inválidas

        // Comprueba si la fecha del pedido está entre inicio y fin (inclusive)
        // Usamos isBetween con el tercer parámetro '[]' para incluir los límites
        return fechaPedido.isBetween(inicio, fin, 'day', '[]');
      });

      console.log(`Se encontraron ${pedidosEnRango.length} pedidos en el rango.`);
      setPedidosFiltrados(pedidosEnRango);

    } catch (err) {
      console.error("Error buscando pedidos por fecha:", err);
      setError("Ocurrió un error al buscar los pedidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-2 font-nunito">
      <h2 className="text-2xl text-center  font-extrabold text-gray-900">Filtrar Pedidos por Fecha</h2>
      <p className="text-gray-500 text-center mb-8 font-nunito ">Muestra los pedidos realizados en fechas concretas.</p>

      {/* Selección de Fechas */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow">
        <div>
          <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Inicial:
          </label>
          <input
            type="date"
            id="fechaInicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Final:
          </label>
          <input
            type="date"
            id="fechaFin"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
          />
        </div>
        <button
          onClick={buscarPedidosPorFecha}
          disabled={loading}
          className="px-6 py-2 mt-3 sm:mt-5 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
          Buscar
        </button>
      </div>

      {/* Mensaje de Error */}
      {error && <p className="text-center text-red-600 mb-4">{error}</p>}

      {/* Resultados */}
           {/* Resultados */}
           <div className="mt-6">
        {loading ? (
          <p className="text-center text-gray-500">Buscando pedidos...</p>
        ) : busquedaRealizada && pedidosFiltrados.length === 0 ? (
          <p className="text-center text-gray-500">No se encontraron pedidos en el rango de fechas seleccionado.</p>
        ) : pedidosFiltrados.length > 0 ? (
          // *** 1. Añade max-h-* y overflow-y-auto a este div ***
          <div className="overflow-x-auto shadow-md rounded-lg max-h-[60vh] overflow-y-auto"> {/* Ajusta max-h-[60vh] según necesites */}
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="bg-gray-700 text-white uppercase sticky top-0 z-10"> {/* Añadido sticky para cabecera */}
                  <th className="px-4 py-3 text-center">Nº Pedido</th>
                  <th className="px-4 py-3 text-center">Cliente</th>
                  <th className="px-4 py-3 text-center">Fecha Realizado</th>
                  <th className="px-4 py-3 text-center">Fecha Recogida</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Pagado</th>
                  <th className="px-4 py-3 text-center">Origen</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido, index) => (
                  <tr key={pedido.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                    <td className="px-4 py-2 text-center font-medium">{pedido.NumeroPedido}</td>
                    <td className="px-4 py-2 text-center">{pedido.cliente || '-'}</td>
                    <td className="px-4 py-2 text-center">{pedido.fechahora_realizado || '-'}</td>
                    <td className="px-4 py-2 text-center">{pedido.fechahora || '-'}</td>
                    <td className="px-4 py-2 text-center font-bold">
                      {!isNaN(parseFloat(pedido.total_pedido)) ? parseFloat(pedido.total_pedido).toFixed(2) : '0.00'} €
                    </td>
                    <td className="px-4 py-2 text-center">
                      {pedido.pagado ? (
                        <svg className="w-5 h-5 mx-auto text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-5 h-5 mx-auto text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {pedido.origen === 1 ? (
                        <img src={web} alt="Pedido Web" className="w-5 h-5 mx-auto" title="Pedido Web" />
                      ) : (
                        <img src={tienda} alt="Pedido en Tienda" className="w-5 h-5 mx-auto" title="Pedido en Tienda" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null }
      </div>


      
    </div>
  );
};

export default FiltrarPedidosPorFecha;
