import React, { useState, useEffect } from 'react';
import { db } from "../firebase/firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const StockDia = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nuevos estados para filtros
  const [isAdmin, setIsAdmin] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(dayjs().tz('Europe/Madrid').format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(dayjs().tz('Europe/Madrid').format('YYYY-MM-DD'));

  useEffect(() => {
    const checkAdmin = async () => {
      const nombre = sessionStorage.getItem('empleadoNombre');
      if (nombre) {
        const q = query(collection(db, 'empleados'), where('nombre', '==', nombre));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const empleado = snapshot.docs[0].data();
          if (empleado.rol === 'admin' || empleado.rol === 'jefe') {
            setIsAdmin(true);
          }
        }
      }
    };
    checkAdmin();
  }, []);

  const obtenerPedidosDelDia = async (inicioStr, finStr) => {
    setLoading(true);
    setError(null);

    try {
      const inicio = dayjs(inicioStr).tz('Europe/Madrid').startOf('day');
      const fin = dayjs(finStr).tz('Europe/Madrid').endOf('day');
      const isToday = inicio.isSame(dayjs().tz('Europe/Madrid').startOf('day'), 'day') && fin.isSame(dayjs().tz('Europe/Madrid').endOf('day'), 'day');

      const pedidosRef = collection(db, 'pedidos');
      // OPTIMIZACIÓN: Traer solo los últimos 1500 pedidos si es hoy, sino traemos todo para el rango
      const q = isToday 
        ? query(pedidosRef, orderBy("NumeroPedido", "desc"), limit(1500))
        : query(pedidosRef, orderBy("NumeroPedido", "desc"));
        
      const querySnapshot = await getDocs(q);

      const pedidosDelDia = [];
      querySnapshot.forEach((doc) => {
        const pedido = doc.data();
        if (pedido.productos) {
          const fechaRecogida = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm');

          if (!fechaRecogida.isValid()) {
            return;
          }

          if (fechaRecogida.isBetween(inicio, fin, null, '[]')) {
            pedido.productos.forEach((producto) => {
              // CAMBIO: No agrupamos aquí, solo aplanamos la lista de productos
              // y añadimos el 'origen' del pedido a cada producto.
              pedidosDelDia.push({
                id: producto.id,
                nombre: producto.nombre,
                categoria: producto.categoria,
                cantidad: producto.cantidad,
                position: producto.position,
                origen: pedido.origen, // CAMBIO: Añadimos el origen del pedido.
              });
            });
          }
        }
      });

      setPedidos(pedidosDelDia);
    } catch (err) {
      console.error("Error al obtener los pedidos del día: ", err);
      setError("Ocurrió un error al obtener los pedidos.");
    }
    setLoading(false);
  };

  useEffect(() => {
    obtenerPedidosDelDia(fechaInicio, fechaFin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CAMBIO: Lógica de agrupación modificada para separar por origen.
  const productosAgrupadosPorCategoria = pedidos.reduce((acc, producto) => {
    // Si la categoría no existe en el acumulador, la creamos.
    if (!acc[producto.categoria]) {
      acc[producto.categoria] = [];
    }

    // Buscamos si el producto ya fue agregado a la lista de esa categoría.
    const index = acc[producto.categoria].findIndex(p => p.id === producto.id);

    if (index > -1) {
      // Si ya existe, actualizamos las cantidades según el origen.
      if (producto.origen === 1) { // Online
        acc[producto.categoria][index].cantidadOnline += producto.cantidad;
      } else { // Tienda
        acc[producto.categoria][index].cantidadTienda += producto.cantidad;
      }
    } else {
      // Si no existe, lo agregamos inicializando las cantidades.
      acc[producto.categoria].push({
        id: producto.id,
        nombre: producto.nombre,
        position: producto.position,
        cantidadTienda: producto.origen !== 1 ? producto.cantidad : 0,
        cantidadOnline: producto.origen === 1 ? producto.cantidad : 0,
      });
    }
    return acc;
  }, {});

  // Definir el orden deseado de las categorías
  const ordenCategorias = ["comida", "complementos", "bebidas", "postres", "extras"];
  const categoriasOrdenadas = ordenCategorias.map(categoria => [categoria, productosAgrupadosPorCategoria[categoria]]).filter(item => item[1]);
  
  const isTodayView = dayjs(fechaInicio).isSame(dayjs().tz('Europe/Madrid'), 'day') && dayjs(fechaFin).isSame(dayjs().tz('Europe/Madrid'), 'day');
  const fechaMostrar = isTodayView 
    ? dayjs().tz('Europe/Madrid').format('DD/MM/YYYY')
    : `${dayjs(fechaInicio).format('DD/MM/YYYY')} al ${dayjs(fechaFin).format('DD/MM/YYYY')}`;

  // CAMBIO: La función ahora calcula totales para tienda, online y general.
  const calcularTotalesPollo = (productos) => {
    const getQty = (id, tipo) => {
      const p = productos.find(prod => prod.id === id);
      if (!p) return 0;
      return tipo === 'tienda' ? p.cantidadTienda : p.cantidadOnline;
    };

    const totalTienda =
      getQty(1, 'tienda') + (getQty(2, 'tienda') * 0.5) + (getQty(39, 'tienda') * 0.5) + (getQty(40, 'tienda') * 0.5);

    const totalOnline =
      getQty(1, 'online') + (getQty(2, 'online') * 0.5) + (getQty(39, 'online') * 0.5) + (getQty(40, 'online') * 0.5);

    return {
      tienda: totalTienda.toFixed(1),
      online: totalOnline.toFixed(1),
      general: (totalTienda + totalOnline).toFixed(1)
    };
  };

  return (
    <div className="max-w-full mx-auto">
      <h1 className="text-center mb-4 font-nunito text-gray-500 text-2xl -mt-5">Productos ya vendidos - {fechaMostrar}</h1>
      
      {isAdmin && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow max-w-2xl mx-auto font-nunito">
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
            onClick={() => obtenerPedidosDelDia(fechaInicio, fechaFin)}
            disabled={loading}
            className="px-6 py-2 mt-3 sm:mt-5 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2 font-bold"
          >
            Filtrar
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}
      {loading ? (
        <div className="flex justify-center items-cente">
          <div className="spinner-border animate-spin border-t-2 border-b-2 border-yellow-500 w-6 h-6 rounded-full"></div>
        </div>
      ) : (
        <div className="flex justify-center gap-3 font-nunito flex-wrap">
          {categoriasOrdenadas.length === 0 ? (
            <p className="text-center text-gray-500">No hay pedidos. (:</p>
          ) : (
            categoriasOrdenadas.map(([categoria, productos]) => {
              // CAMBIO: Se llama a la función aquí para tener los totales listos.
              const totalesPollo = categoria.toLowerCase() === 'comida' ? calcularTotalesPollo(productos) : null;

              return (
                <div key={categoria} className="bg-white rounded-md shadow-lg p-4 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 min-w-[250px]">
                  <h2 className="text-lg font-extrabold text-yellow-500 mb-2 text-center">{categoria.toUpperCase()}</h2>
                  <table className="table table-sm w-full border-separate text-sm">
                    {/* CAMBIO: Cabecera de la tabla actualizada */}
                    <thead>
                      <tr className="text-gray-600">
                        <th className="text-left font-semibold">Producto</th>
                        <th className="text-center font-semibold">Tienda</th>
                        <th className="text-center font-semibold">Online</th>
                        <th className="text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.sort((a, b) => a.position - b.position).map((producto) => (
                        // CAMBIO: Fila de la tabla actualizada con las nuevas cantidades
                        <tr key={producto.id}>
                          <td className="text-left">{producto.nombre}</td>
                          <td className="text-center">{producto.cantidadTienda > 0 ? producto.cantidadTienda : '-'}</td>
                          <td className="text-center">{producto.cantidadOnline > 0 ? producto.cantidadOnline : '-'}</td>
                          <td className="text-right font-extrabold">{producto.cantidadTienda + producto.cantidadOnline}</td>
                        </tr>
                      ))}
                    </tbody>
                    {/* CAMBIO: Pie de tabla para 'comida' actualizado */}
                    {categoria.toLowerCase() === 'comida' && (
                      <tfoot className="border-t-2 mt-2">
                        <tr>
                          <td className="font-bold text-left pt-2" colSpan="4">TOTAL POLLOS</td>
                        </tr>
                        <tr>
                          <td className="text-left pl-2">Tienda</td>
                          <td className="font-extrabold text-center">{totalesPollo.tienda}</td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr>
                          <td className="text-left pl-2">Online</td>
                          <td className="font-extrabold text-center">{totalesPollo.online}</td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr className='border-t'>
                          <td className="text-left font-bold pt-1">General</td>
                          <td></td>
                          <td></td>
                          <td className="font-extrabold text-right pt-1">{totalesPollo.general}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StockDia;