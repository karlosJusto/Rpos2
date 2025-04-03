import React, { useState, useEffect } from 'react';
import { db } from "../firebase/firebase"; // Asegúrate de tener correctamente la configuración de Firebase
import { collection, getDocs } from "firebase/firestore";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC

// Extender dayjs para usar los plugins de zona horaria y UTC
dayjs.extend(utc);
dayjs.extend(timezone);

const StockDia = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Función para obtener los pedidos del día
    const obtenerPedidosDelDia = async () => {
      setLoading(true);
      setError(null);

      try {
        const pedidosRef = collection(db, 'pedidos');
        const querySnapshot = await getDocs(pedidosRef);

        const pedidosDelDia = [];
        querySnapshot.forEach((doc) => {
          const pedido = doc.data();
          // Verificamos si la fecha de recogida está hoy
          if (pedido.productos) {
            // Utilizamos la fecha desde el objeto pedido
            const fechaRecogida = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm'); // O ajusta el formato según sea necesario
            const fechaHoy = dayjs().tz('Europe/Madrid').startOf('day'); // Hora inicio del día
            const fechaFinal = dayjs().tz('Europe/Madrid').endOf('day'); // Hora final del día

            // Validamos si la fecha de recogida es válida
            if (!fechaRecogida.isValid()) {
              return;
            }

            // Comprobamos si la fecha de recogida está dentro del rango de hoy
            if (fechaRecogida.isBetween(fechaHoy, fechaFinal, null, '[]')) {
              // Agrupar los productos dentro del mismo pedido
              pedido.productos.forEach((producto) => {
                const index = pedidosDelDia.findIndex((p) => p.id === producto.id && p.numeropedido === pedido.NumeroPedido);

                if (index > -1) {
                  // Si el producto ya existe en el mismo pedido, solo actualizamos la cantidad
                  pedidosDelDia[index].cantidad += producto.cantidad;
                } else {
                  // Si el producto no existe, lo agregamos como nuevo
                  pedidosDelDia.push({
                    id: producto.id,
                    nombre: producto.nombre,
                    categoria: producto.categoria, // Añadimos la categoría
                    cantidad: producto.cantidad,
                    numeropedido: pedido.NumeroPedido,
                    cliente: pedido.cliente,
                    fechahora: fechaRecogida.format('DD/MM/YYYY HH:mm'),
                  });
                }
              });
            }
          }
        });

        setPedidos(pedidosDelDia); // Actualiza el estado con los pedidos del día
      } catch (err) {
        console.error("Error al obtener los pedidos del día: ", err);
        setError("Ocurrió un error al obtener los pedidos.");
      }
      setLoading(false); // Finaliza el estado de carga
    };

    obtenerPedidosDelDia();
  }, []);

  // Agrupar los productos por categoría
  const productosAgrupadosPorCategoria = pedidos.reduce((acc, pedido) => {
    // Verifica si la categoría ya existe en el acumulador
    if (!acc[pedido.categoria]) {
      acc[pedido.categoria] = [];
    }
    // Ahora buscamos si el producto ya existe en esa categoría
    const index = acc[pedido.categoria].findIndex(p => p.id === pedido.id);

    if (index > -1) {
      // Si el producto ya existe en esa categoría, solo actualizamos la cantidad
      acc[pedido.categoria][index].cantidadTotal += pedido.cantidad;
    } else {
      // Si el producto no existe en la categoría, lo agregamos
      acc[pedido.categoria].push({
        id: pedido.id,
        nombre: pedido.nombre,
        cantidadTotal: pedido.cantidad,
      });
    }

    return acc;
  }, {});

  // Convertir el objeto de categorías a un array para poder renderizarlo
  const categoriasArray = Object.entries(productosAgrupadosPorCategoria);

  // Obtener la fecha actual y formatearla
  const fechaHoy = dayjs().tz('Europe/Madrid').format('DD/MM/YYYY');

  // Sumar la cantidad de Pollo Asado (id 1) y 1/2 Pollo (id 2)
  const calcularTotalPollo = (productos) => {
    const polloAsado = productos.find(p => p.id === 1);
    const medioPollo = productos.find(p => p.id === 2);
    const total = (polloAsado ? polloAsado.cantidadTotal : 0) + (medioPollo ? medioPollo.cantidadTotal * 0.5 : 0);
    return total.toFixed(1); // Retorna el total con dos decimales
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Mensaje de error */}
      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}

      {/* Cargando */}
      {loading ? (
        <div className="flex justify-center items-center">
          <div className="spinner-border animate-spin border-t-2 border-b-2 border-yellow-500 w-6 h-6 rounded-full"></div>
        </div>
      ) : (
        <div className="flex justify-center gap-8 font-nunito">
          {/* Tabla de resultados agrupados por categoría */}
          <div className="overflow-x-auto w-1/2 text-center">
            <h1 className="text-center mb-4 font-nunito text-gray-500 text-2xl">Productos ya vendidos - {fechaHoy}</h1>
            {categoriasArray.length === 0 ? (
              <p className="text-center text-gray-500">No hay pedidos. (:</p>
            ) : (
              categoriasArray.map(([categoria, productos]) => (
                <div key={categoria} className="mb-6">
                  <h2 className="text-lg font-semibold text-yellow-500">{categoria.toUpperCase()}</h2>
                  <table className="table table-sm w-full border-separate mt-4">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Ordenamos los productos por id antes de mostrarlos */}
                      {productos.sort((a, b) => a.id - b.id).map((producto) => (
                        <tr key={producto.id}>
                          <td>{producto.nombre}</td>
                          <td className="font-extrabold">{producto.cantidadTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                    {categoria.toLowerCase() === 'comida' && (
                      <tfoot className="border-2 text-2xl ">
                      <tr>
                        <td className="font-extrabold border-b-2 border-gray-300">Total Pollo</td>
                        <td className="font-extrabold border-b-2 border-gray-300">
                          {calcularTotalPollo(productos)}
                        </td>
                      </tr>
                    </tfoot>
                      )}
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDia;
