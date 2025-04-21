import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot,getDocs } from 'firebase/firestore'; // Importa onSnapshot
import patata from '../../assets/freidora/patata.png';
import pimiento from '../../assets/freidora/pimiento.png';
import croquetas from '../../assets/freidora/croquetas.png';
import doble from '../../assets/freidora/doble.png';
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
  const [pedidosTotales, setPedidosTotales] = useState('');


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
// Función para obtener los pedidos del día
useEffect(() => {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();
  const horaActual = hoy.getHours();

  let fechaInicio, fechaFin;

  if (horaActual < 18) {
    fechaInicio = `${dia}/${mes}/${anio} 00:00`;
    fechaFin = `${dia}/${mes}/${anio} 17:59`;
  } else {
    fechaInicio = `${dia}/${mes}/${anio} 18:00`;
    fechaFin = `${dia}/${mes}/${anio} 23:59`;
  }

  setLoading(true);
  setError(null);

  const pedidosRef = collection(db, 'pedidos');
  const q = query(pedidosRef, where('fechahora', '>=', fechaInicio), where('fechahora', '<=', fechaFin));

  // Establecer el listener en tiempo real
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const pedidosDelDia = {};
    let productosTotales = {};

    snapshot.forEach((doc) => {
      const pedido = doc.data();

      if (pedido.productos) {
        const fechaRecogida = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm').tz('Europe/Madrid');

        pedido.productos.forEach((producto) => {
          if (producto.freidora === true) {
            let productoConFecha = {
              id: producto.id,
              nombre: producto.nombre,
              alias: producto.alias,
              categoria: producto.categoria,
              cantidad: producto.cantidad,
              celiaco: producto.celiaco,
              numeropedido: pedido.NumeroPedido,
              entregado: producto.entregado,
              cliente: pedido.cliente,
              fechahora: fechaRecogida.format('HH:mm'),
              doble: false,
            };

            let clave = `${productoConFecha.id}-${productoConFecha.fechahora}`;
            let producto_doble = false;
            if ((producto.id == 10) || (producto.id == 3)) {
              if (producto.cantidad > 1) {
                clave = clave + "_doble";
                producto_doble = true;
              }
            }
            /*if (producto.celiaco) {
              clave = clave + "_celiaco";
            }*/

            if (pedidosDelDia[clave]) {
              if (producto_doble) {
                pedidosDelDia[clave].cantidad += Math.floor(productoConFecha.cantidad / 2);
                pedidosDelDia[clave].entregado += Math.floor(productoConFecha.entregado / 2);
                if (producto.celiaco) {
                   pedidosDelDia[clave].cantidad_celiaco += Math.floor(productoConFecha.cantidad / 2);
                }
                if ((productoConFecha.cantidad % 2) > 0) {
                  pedidosDelDia[clave.replace('_doble', '')].cantidad += productoConFecha.cantidad % 2;
                  pedidosDelDia[clave.replace('_doble', '')].entregado += productoConFecha.entregado % 2;
                  if (producto.celiaco) {
                       pedidosDelDia[clave.replace('_doble', '')].cantidad_celiaco += productoConFecha.cantidad % 2;
                  }
                }
              } else {
                pedidosDelDia[clave].cantidad += productoConFecha.cantidad;
                pedidosDelDia[clave].entregado += productoConFecha.entregado;
                if (producto.celiaco) {
                    pedidosDelDia[clave].cantidad_celiaco += productoConFecha.cantidad;
                }
              }
            } else {
              pedidosDelDia[clave] = productoConFecha;
              if (producto_doble) {
                let productoDoble = { ...productoConFecha, alias: pedidosDelDia[clave].alias + " Dobles", cantidad: Math.floor(productoConFecha.cantidad / 2),  entregado: Math.floor(productoConFecha.entregado / 2), cantidad_celiaco: Math.floor(productoConFecha.cantidad / 2), doble: true };
                pedidosDelDia[clave] = productoDoble;
                if ((productoConFecha.cantidad % 2) > 0) {
                  let clave_simple = clave.replace('_doble', '');
                  if (pedidosDelDia[clave_simple]) {
                    pedidosDelDia[clave_simple].cantidad += productoConFecha.cantidad % 2;
                    pedidosDelDia[clave_simple].entregado += productoConFecha.entregado % 2;
                    if (producto.celiaco) {
                      pedidosDelDia[clave].cantidad_celiaco = productoConFecha.cantidad % 2;;
                    }
                  } else {
                    let productoSimple = { ...productoConFecha, cantidad: productoConFecha.cantidad % 2, entregado: productoConFecha.entregado % 2, cantidad_celiaco: productoConFecha.cantidad % 2  };
                    pedidosDelDia[clave_simple] = productoSimple;
                  }
                }
              } else {
                if (producto.celiaco) {
                  let productoSimple = { ...productoConFecha, cantidad_celiaco: productoConFecha.cantidad  };
                  pedidosDelDia[clave] = productoSimple;
                }
              }
            }
          }
        });
      }
    });

    const pedidosDelDiaArray = Object.entries(pedidosDelDia);
    pedidosDelDiaArray.sort(([, pedidoA], [, pedidoB]) => pedidoA.id - pedidoB.id);

    pedidosDelDiaArray.forEach(([clave, bloque]) => {
      bloque.cantidad -= bloque.entregado;
      let clave_totales = clave.split("-")[0];
      if (clave_totales.length + 6 < clave.length) {
        clave_totales = clave_totales + clave.substring(clave_totales.length + 6);
      }
     // clave_totales = clave_totales.replace('_celiaco', '');

      if (productosTotales[clave_totales]) {
        productosTotales[clave_totales].cantidad += bloque.cantidad;
        productosTotales[clave_totales].entregado += bloque.entregado;
        productosTotales[clave_totales].cantidad_celiaco += bloque.cantidad_celiaco ? bloque.cantidad_celiaco : 0;
      } else {
        productosTotales[clave_totales] = {
          id: bloque.id,
          nombre: bloque.nombre,
          alias: bloque.alias,
          cantidad: bloque.cantidad,
          entregado: bloque.entregado,
          cantidad_celiaco: bloque.cantidad_celiaco ? bloque.cantidad_celiaco : 0,
          doble: clave_totales.includes('_doble') ? true : false,
        };
      }
    });

    setPedidos(Object.values(pedidosDelDia));
    setPedidosTotales(productosTotales);
    setLoading(false);
  }, (error) => {
    console.error("Error al escuchar los pedidos del día: ", error);
    setError("Ocurrió un error al obtener los pedidos.");
    setLoading(false);
  });

  // Retornar la función de limpieza para cancelar la suscripción cuando el componente se desmonte
  return () => unsubscribe();
}, []); // El array vacío ahora es correcto porque onSnapshot se mantiene suscrito
  

  
  
  
  
  


  return (

    <>
      
      
        <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-2 ">
         
          {/* Patatas */}
          <div className="bg-[#F3F3F3] w-[30%]  rounded-lg h-[40vh]">
            <div className="flex justify-center p-2">
              <img
                src={patata}
                alt="patata"
                className="w-[15%] h-[15%] p-2 bg-white border-3 border-gray-700 rounded-full"
              />
            </div>
            <div className="text-center p-2 ">
              {pedidos
                .filter((pedido) => pedido.fechahora===bloqueHorario &&  pedido.nombre.toLowerCase().includes('patatas')) // Filtramos por 'patatas' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">

                      <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" /> ]
                                  </span>
                                )}
                              </h2>
                        
                  
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Pimientos */}
          <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[40vh]">
            <div className="flex justify-center p-2">
              <img
                src={pimiento}
                alt="pimiento"
                className="w-[15%] h-[15%] p-2 bg-white border-3 border-gray-700 rounded-full"
              />
            </div>
            <div className="text-center p-2">
              {pedidos
                .filter((pedido) => pedido.fechahora===bloqueHorario &&   pedido.nombre.toLowerCase().includes('pimientos')) // Filtramos por 'pimientos' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                      <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" /> ]
                                  </span>
                                )}
                              </h2>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Croquetas */}
          <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[40vh]">
            <div className="flex justify-center p-2">
              <img
                src={croquetas}
                alt="croquetas"
                 className="w-[15%] h-[15%] p-2 bg-white border-3 border-gray-700 rounded-full"
              />
            </div>
            <div className="text-center p-2">
              {pedidos
                .filter((pedido) => pedido.fechahora===bloqueHorario &&   pedido.nombre.toLowerCase().includes('croquetas') ) // Filtramos por 'croquetas' y cantidad > 0
                .map((pedido, index) => {
                  const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500';
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                      <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" /> ]
                                  </span>
                                )}
                              </h2>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>


          {/* Parte totales, anteriores y posteriores */}

        <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-2">
                {/* Totales */}
                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh]">
                    <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-md">Totales</h1>
                    <div className="text-center p-2 overflow-y-auto h-[37vh]">
                      {Object.values(pedidosTotales).map((pedido, index) => {
                  
                       const borderColor =
                        pedido.cantidad >0
                          ? 'border-red-500'
                          : 'border-yellow-500';

                        return (
                          <div
                            key={index}
                            className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                          >
                            <div className="flex items-center justify-center">
                              <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2 gap-[0.1vw]">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" />]
                                  </span>
                                )}
                              </h2>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
                
                {/* Anteriores */}

                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] ">
                      <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-md">Anteriores: {anteriores}</h1>
                      <div className="text-center p-2 overflow-y-auto h-[37vh]">
                        {pedidos
                          .filter((pedido) => pedido.fechahora === anteriores) // Filtramos solo los pedidos con fecha igual a 'anteriores'
                          .map((pedido, index) => {
                            const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500'; // Definimos el color del borde
                            return (
                              <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}>
                                <div className="flex items-center justify-center">
                                <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" /> ]
                                  </span>
                                )}
                              </h2>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                </div>


                {/* Posteriores */}
                <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh]">
                      <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-md">Posteriores: {posteriores}</h1>
                      <div className="text-center p-2 overflow-y-auto h-[37vh]">
                        {pedidos
                          .filter((pedido) => pedido.fechahora === posteriores) // Filtramos solo los pedidos con fecha igual a 'anteriores'
                          .map((pedido, index) => {
                            const borderColor = pedido.cantidad === 0 ? 'border-yellow-500' : 'border-red-500'; // Definimos el color del borde
                            return (
                              <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}>
                                <div className="flex items-center justify-center">
                                <h2 className="mr-2 text-md flex items-center">
                                {`${pedido.cantidad + pedido.entregado}`}
                                <span className="font-bold px-1">[ {pedido.entregado} ] </span>  x  {pedido.alias} 
                                {pedido.cantidad_celiaco > 0 && (
                                  <span className="flex items-center ms-2">
                                   [ {pedido.cantidad_celiaco} x
                                    <img src={singluten} alt="Sin gluten" className="w-4 h-4 ms-1 me-1" /> ]
                                  </span>
                                )}
                              </h2>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                </div>
        </div>
     



  </>

  );
};

export default Freidora;
