import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import patata from '../../assets/freidora/patata.png';
import pimiento from '../../assets/freidora/pimiento.png';
import croquetas from '../../assets/freidora/croquetas.png';
import singluten from '../../assets/singluten.png'; // Imagen sin gluten
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC

const Freidora = () => {
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
              // Agrupar los productos dentro del mismo pedido, solo si freidora === true
              pedido.productos.forEach((producto) => {
                // Solo procesar productos con freidora: true
                if (producto.freidora === true) {
                  const index = pedidosDelDia.findIndex((p) => p.id === producto.id && p.numeropedido === pedido.NumeroPedido);

                  if (index > -1) {
                    // Si el producto ya existe en el mismo pedido, solo actualizamos la cantidad
                    pedidosDelDia[index].cantidad += producto.cantidad;
                  } else {
                    // Si el producto no existe, lo agregamos como nuevo
                    pedidosDelDia.push({
                      id: producto.id,
                      nombre: producto.nombre,
                      alias: producto.alias,
                      categoria: producto.categoria, // Añadimos la categoría
                      cantidad: producto.cantidad,
                      celiaco: producto.celiaco,
                      numeropedido: pedido.NumeroPedido,
                      cliente: pedido.cliente,
                      fechahora: fechaRecogida.format('HH:mm'),
                    });
                  }
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

 

  return (
    <div>
      <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-4 ">
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[50vh] ">
          <div className="flex justify-center p-3">
            <img
              src={patata}
              alt="patata"
              className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full"
            />
          </div>
          <div className="text-center p-2">
          {pedidos.filter((pedido) => pedido.id === 10 || pedido.id === '49').map((pedido, index) => (
            <div key={index} className="mb-2 p-2 bg-white rounded-md shadow-md">
              <div className="flex items-center justify-center"> {/* Flex container */}
                <h2 className="mr-2">{`Cantidad: ${pedido.cantidad}`} - {pedido.alias} - {pedido.fechahora}</h2>

                {/* Verificar si celiaco es true y mostrar la imagen */}
                {pedido.celiaco && (
                  <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                )}
              </div>
            </div>
          ))}
        </div>

     
        </div>

        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[50vh]">
          <div className="flex justify-center p-3">
            <img
              src={pimiento}
              alt="pimiento"
              className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full "
            />
          </div>
          <div className="text-center p-2">
            
          {pedidos.filter((pedido) => pedido.id === 3 || pedido.id === 50).map((pedido, index) => (
              <div key={index} className="mb-2 p-2 bg-white rounded-md shadow-md" >
                <h2>{`Cantidad  ${pedido.cantidad}`}-{pedido.alias}-{pedido.fechahora}</h2>
              
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[50vh]">
          <div className="flex justify-center p-3">
            <img
              src={croquetas}
              alt="croquetas"
              className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full"
            />
          </div>
          <div className="text-center p-2">
           
          {pedidos.filter((pedido) => pedido.id === 45 || pedido.id === 46 || pedido.id === 47).map((pedido, index) => (
              <div key={index} className="mb-2 p-2 bg-white rounded-md shadow-md">
                <h2>{`Cantidad  ${pedido.cantidad}`}-{pedido.alias}-{pedido.fechahora}</h2>
              
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-10">
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
          <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Totales</h1>
        </div>

        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
          <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Anteriores: </h1>
        </div>

        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
          <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Posteriores</h1>
        </div>
      </div>
    </div>
  );
};

export default Freidora;
