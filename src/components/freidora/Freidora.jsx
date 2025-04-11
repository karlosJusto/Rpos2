import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import patata from '../../assets/freidora/patata.png';
import pimiento from '../../assets/freidora/pimiento.png';
import croquetas from '../../assets/freidora/croquetas.png';
import singluten from '../../assets/singluten.png'; // Imagen sin gluten
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC

import LGFreidora from './LGFreidora';

dayjs.extend(utc);
dayjs.extend(timezone);

const Freidora = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hora, setHora] = useState('');
  const [bloqueHorario, setBloqueHorario] = useState('');
  const [anteriores, setAnteriores] = useState('');
  const [posteriores, setPosteriores] = useState('');

  useEffect(() => {
    // Función para actualizar la hora y los bloques
    const actualizarHora = () => {
      const currentTime = dayjs().locale('es').tz('Europe/Madrid'); // Obtener la hora actual en España
      setHora(currentTime.format('HH:mm:ss')); // Establecer la hora actual en formato 'HH:mm:ss'

      // Obtener los minutos de la hora actual
      const minutos = currentTime.minute();

      let nuevoBloque = '';

      // Determinamos el bloque horario según los minutos de la hora actual
      if (minutos >= 0 && minutos <= 15) {
        nuevoBloque = currentTime.startOf('hour').add(15, 'minute').format('HH:mm'); // Bloque a las xx:15
      } else if (minutos >= 16 && minutos <= 30) {
        nuevoBloque = currentTime.startOf('hour').add(30, 'minute').format('HH:mm'); // Bloque a las xx:30
      } else if (minutos >= 31 && minutos <= 45) {
        nuevoBloque = currentTime.startOf('hour').add(45, 'minute').format('HH:mm'); // Bloque a las xx:45
      } else if (minutos >= 46 && minutos <= 59) {
        nuevoBloque = currentTime.add(1, 'hour').startOf('hour').format('HH:mm'); // Bloque a la siguiente hora (xx+1:00)
      }

      setBloqueHorario(nuevoBloque); // Actualizamos el estado con el nuevo bloque horario

      // Calcular anteriores y posteriores basados en el bloqueHorario
      const bloqueTime = dayjs(nuevoBloque, 'HH:mm'); // Convertimos bloqueHorario a dayjs

      // Anteriores: Restamos 15 minutos al bloqueHorario
      const tiempoAnteriores = bloqueTime.subtract(15, 'minute').format('HH:mm');
      setAnteriores(tiempoAnteriores);

      // Posteriores: Sumamos 30 minutos al bloqueHorario
      const tiempoPosteriores = bloqueTime.add(15, 'minute').format('HH:mm');
      setPosteriores(tiempoPosteriores);
    };

    // Llamamos a la función por primera vez para inicializar los valores
    actualizarHora();

    // Configuramos un intervalo para comprobar la hora cada minuto
    const interval = setInterval(() => {
      actualizarHora();
    }, 60000); // Comprobamos cada minuto

    // Limpiamos el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, []); // El array vacío asegura que se ejecute solo una vez al montar el componente






// Función para obtener los pedidos del día
useEffect(() => {
  const obtenerPedidosDelDia = async () => {
    setLoading(true);
    setError(null);

    try {
  

      const pedidosRef = collection(db, 'pedidos');
     // const q = query(pedidosRef, where('fechahora', '>=', tsInicio), where('fechahora', '<', tsFin));



      //const querySnapshot = await getDocs(q);
      const querySnapshot = await getDocs(pedidosRef);
      const pedidosDelDia = {}; // Objeto para agrupar productos por bloque horario

      querySnapshot.forEach((doc) => {
        //console.log('tttttttttttttttttttttttttttt');
        const pedido = doc.data();
        //console.log('->' + JSON.stringify(pedido));

        // Verificamos si la fecha de recogida está hoy
        if (pedido.productos) {
          // Utilizamos la fecha desde el objeto pedido
          const fechaRecogida = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm').tz('Europe/Madrid'); // Aseguramos que esté en la zona horaria de España
          const fechaHoy = dayjs().tz('Europe/Madrid').startOf('day'); // Hora inicio del día en España
          const fechaFinal = dayjs().tz('Europe/Madrid').endOf('day'); // Hora final del día en España
        // console.log('fechaRecogida: '+fechaRecogida)
          // Validamos si la fecha de recogida es válida
          if (!fechaRecogida.isValid()) {
            return;
          }

          // Convertimos bloqueHorario a día y hora y sumamos 15 minutos
          const fechaBloqueInicio = dayjs(bloqueHorario, 'HH:mm').tz('Europe/Madrid'); // Utilizamos bloqueHorario como inicio
          const fechaBloqueFin = fechaBloqueInicio.subtract(15, 'minutes'); // Sumamos 15 minutos al bloque horario

          // Comprobamos si la fecha de recogida está dentro del rango entre bloqueInicio y bloqueFin
          if (fechaRecogida.isBetween(fechaBloqueInicio, fechaBloqueFin, null, '[]')) {
            // Agrupar los productos dentro del mismo pedido, solo si freidora === true
            pedido.productos.forEach((producto) => {
              // Solo procesar productos con freidora: true
              if (producto.freidora === true) {
                let productoConFecha = {
                  id: producto.id,
                  nombre: producto.nombre,
                  alias: producto.alias,
                  categoria: producto.categoria, // Añadimos la categoría
                  cantidad: producto.cantidad,
                  celiaco: producto.celiaco,
                  numeropedido: pedido.NumeroPedido,
                  entregado: producto.entregado, // Agregar el campo entregado
                  cliente: pedido.cliente,
                  fechahora: fechaRecogida.format('HH:mm'),
                };

                const clave = `${productoConFecha.id}-${productoConFecha.fechahora}`; // Generar clave única basada en id y hora

                if (pedidosDelDia[clave]) {
                  // Si ya existe, sumamos la cantidad y también actualizamos la cantidad entregada
                  pedidosDelDia[clave].cantidad += productoConFecha.cantidad;
                  pedidosDelDia[clave].entregado += productoConFecha.entregado; // Sumar el entregado también
                } else {
                  // Si no existe, añadimos el producto
                  pedidosDelDia[clave] = productoConFecha;
                }
              }
            });
          }
        }
      });

      // Calculamos la cantidad total que aún está pendiente de entrega
      Object.keys(pedidosDelDia).forEach((clave) => {
        const bloque = pedidosDelDia[clave];
        // Restamos la cantidad entregada de la cantidad total del bloque
        bloque.cantidad -= bloque.entregado;
      });

      // Convertimos el objeto a array para que se pueda mostrar en la interfaz
      setPedidos(Object.values(pedidosDelDia));
    } catch (err) {
      console.error("Error al obtener los pedidos del día: ", err);
      setError("Ocurrió un error al obtener los pedidos.");
    }
    setLoading(false); // Finaliza el estado de carga
  };

  obtenerPedidosDelDia();
}, [bloqueHorario]); // Dependemos de bloqueHorario para que se actualizado
  

  
  
  
  
  


  return (

    <>
      <div>
      
        <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-3 ">
         
          {/* Patatas */}
          <div className="bg-[#F3F3F3] w-[30%]  rounded-lg h-[45vh]">
            <div className="flex justify-center p-3">
              <img
                src={patata}
                alt="patata"
                className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full"
              />
            </div>
            <div className="text-center p-2 ">
              {pedidos
                .filter((pedido) => pedido.nombre.toLowerCase().includes('patatas') && pedido.cantidad > 0) // Filtramos por 'patatas' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                      <h2 className="mr-2">{`${pedido.cantidad+pedido.entregado}`}  <span className='font-bold'>[ {`${pedido.entregado}`} ]</span> x {pedido.alias} - {pedido.fechahora}</h2>
                        {pedido.celiaco && (
                          <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Pimientos */}
          <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[45vh]">
            <div className="flex justify-center p-3">
              <img
                src={pimiento}
                alt="pimiento"
                className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full "
              />
            </div>
            <div className="text-center p-2">
              {pedidos
                .filter((pedido) => pedido.nombre.toLowerCase().includes('pimientos') && pedido.cantidad > 0) // Filtramos por 'pimientos' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                      <h2 className="mr-2">{`${pedido.cantidad+pedido.entregado}`}  <span className='font-bold'>[ {`${pedido.entregado}`} ]</span> x {pedido.alias} - {pedido.fechahora}</h2>
                        {pedido.celiaco && (
                          <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Croquetas */}
          <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[45vh]">
            <div className="flex justify-center p-3">
              <img
                src={croquetas}
                alt="croquetas"
                className="w-[20%] h-[20%] p-3 bg-white border-4 border-gray-700 rounded-full "
              />
            </div>
            <div className="text-center p-2">
              {pedidos
                .filter((pedido) => pedido.nombre.toLowerCase().includes('croquetas') && pedido.cantidad > 0) // Filtramos por 'croquetas' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                      <h2 className="mr-2">{`${pedido.cantidad+pedido.entregado}`}  <span className='font-bold'>[ {`${pedido.entregado}`} ]</span> x {pedido.alias} - {pedido.fechahora}</h2>
                        {pedido.celiaco && (
                          <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>


          {/* Parte totales, anteriores y posteriores */}

        <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-4">
                {/* Totales */}
                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[43vh]">
                  <h1 className="bg-gray-700 p-2 text-white text-xl text-center rounded-md">Totales</h1>
                  <div className="text-center p-2">
                    {/*{pedidos
                      .filter((pedido) => pedido.cantidad === 0) // Aquí filtramos todos los pedidos con cantidad 0
                      .map((pedido, index) => (
                        <div key={index} className="mb-2 p-2 bg-white rounded-md shadow-md">
                          <div className="flex items-center justify-center">
                          <h2 className="mr-2">{`${pedido.cantidad+pedido.entregado}`}  <span className='font-bold'>[ {`${pedido.entregado}`} ]</span> x {pedido.alias} - {pedido.fechahora}</h2>
                            {pedido.celiaco && (
                              <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                            )}
                          </div>
                        </div>
                      ))}*/}
                  </div>
                </div>

                {/* Anteriores */}
                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[43vh]">
                  <h1 className="bg-gray-700 p-2 text-white text-xl text-center rounded-md">Anteriores: {anteriores} </h1>
                  <div className="text-center p-2">
                    {/*{pedidos
                      .filter((pedido) => pedido.cantidad === 0) // Filtramos solo los pedidos con cantidad 0
                      .map((pedido, index) => (
                        <div key={index} className="mb-2 p-2 bg-white rounded-md shadow-md">
                          <div className="flex items-center justify-center">
                          <h2 className="mr-2">{`${pedido.cantidad+pedido.entregado}`}  <span className='font-bold'>[ {`${pedido.entregado}`} ]</span> x {pedido.alias} - {pedido.fechahora}</h2>
                            {pedido.celiaco && (
                              <img src={singluten} alt="Sin gluten" className="w-6 h-6" />
                            )}
                          </div>
                        </div>
                      ))}*/}
                  </div>
                </div>
                

                {/* Posteriores */}
                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[43vh]">
                  <h1 className="bg-gray-700 p-2 text-white text-xl text-center rounded-md ">Posteriores: {posteriores} </h1>
                  {/* Aquí puedes agregar los pedidos que se deben mostrar en Posteriores */}
                </div>
              </div>
      </div>



  </>

  );
};

export default Freidora;
