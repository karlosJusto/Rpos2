import { useEffect, useState, useMemo } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore'; // Importa onSnapshot, getDocs, orderBy
import singluten from '../../assets/singluten.png'; // Imagen sin gluten
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC

// import LGFreidora from './LGFreidora'; // Eliminado para evitar dependencia circular o uso incorrecto

dayjs.extend(utc);
dayjs.extend(timezone);

// Images will be loaded directly from Firebase Storage URLs provided in Firestore documents

const Freidora = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hora, setHora] = useState('');
  const [bloqueHorario, setBloqueHorario] = useState('');
  const [anteriores, setAnteriores] = useState('');
  const [posteriores, setPosteriores] = useState('');
  const [pedidosTotales, setPedidosTotales] = useState({}); // Inicializado como objeto para consistencia
  const [productosFreidoraConfig, setProductosFreidoraConfig] = useState([]); // State for freidora products

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

      // Posteriores: Sumamos 15 minutos al bloqueHorario (originalmente eran 30, ajustado a 15 para simetría)
      const tiempoPosteriores = bloqueTime.add(15, 'minute').format('HH:mm');
      setPosteriores(tiempoPosteriores);
    };

    actualizarHora();
    const interval = setInterval(actualizarHora, 60000); 
    return () => clearInterval(interval);
  }, []);

  // useEffect to load freidora products configuration from Firebase
  useEffect(() => {
    const fetchFreidoraProducts = async () => {
      try {
        const freidoraCollectionRef = collection(db, 'freidora');
        // You can order by a specific field, e.g., 'orden' or 'nombreDisplay'
        // If you add an 'orden' field to your Firebase documents, use orderBy('orden')
        const q = query(freidoraCollectionRef, orderBy('nombreDisplay')); 
        const querySnapshot = await getDocs(q);
        const loadedProducts = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedProducts.push({
            id: doc.id, // Use Firestore document ID as the product id
            nombreDisplay: data.nombreDisplay,
            imagenSrc: data.imagenUrl || null, // Use the image URL from Firebase
            filtroKey: data.filtroKey,
          });
        });
        setProductosFreidoraConfig(loadedProducts);
      } catch (err) {
        console.error("Error fetching freidora products:", err);
        // Optionally, set an error state here to display to the user
      }
    };
    fetchFreidoraProducts();
  }, []); // Runs once on mount

  // Use useMemo to create a list of freidora products with unique filtroKey
  const uniqueProductosFreidoraMostrados = useMemo(() => {
    const uniqueKeys = new Set();
    const result = [];
    productosFreidoraConfig.forEach(producto => {
      if (!uniqueKeys.has(producto.filtroKey)) {
        uniqueKeys.add(producto.filtroKey);
        result.push(producto);
      }
    });
    return result;
  }, [productosFreidoraConfig]);


useEffect(() => {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();
  const horaActualDate = hoy.getHours(); // Renamed to avoid conflict with 'hora' state

  let fechaInicio, fechaFin;

  if (horaActualDate < 18) {
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

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const pedidosDelDiaAcumulados = {}; // Para acumular cantidades por clave única
    let productosTotalesAcumulados = {}; // Para la sección "Totales"

    snapshot.forEach((doc) => {
      const pedidoData = doc.data();
      if (pedidoData.productos) {
        const fechaRecogidaPedido = dayjs(pedidoData.fechahora, 'DD/MM/YYYY HH:mm').tz('Europe/Madrid');
        pedidoData.productos.forEach((productoItem) => {
          if (productoItem.freidora === true) {
            let productoBase = {
              id: productoItem.id,
              nombre: productoItem.nombre,
              alias: productoItem.alias,
              cantidad: productoItem.cantidad,
              celiaco: productoItem.celiaco,
              cantidad_celiaco: 0, // Inicializar
              numeropedido: pedidoData.NumeroPedido,
              entregado: productoItem.entregado || 0,
              fechahora: fechaRecogidaPedido.format('HH:mm'),
              doble: false,
            };

            let claveUnicaPedido = `${productoBase.id}-${productoBase.fechahora}`;
            let esDobleOriginal = false;

            if ((productoBase.id === 10 || productoBase.id === 3) && productoBase.cantidad > 1) {
              claveUnicaPedido += "_doble";
              esDobleOriginal = true;
            }

            if (pedidosDelDiaAcumulados[claveUnicaPedido]) {
              if (esDobleOriginal) {
                pedidosDelDiaAcumulados[claveUnicaPedido].cantidad += Math.floor(productoBase.cantidad / 2);
                pedidosDelDiaAcumulados[claveUnicaPedido].entregado += Math.floor(productoBase.entregado / 2);
                if (productoBase.celiaco) {
                  pedidosDelDiaAcumulados[claveUnicaPedido].cantidad_celiaco += Math.floor(productoBase.cantidad / 2);
                }
                if ((productoBase.cantidad % 2) > 0) {
                  const claveSimpleRestante = claveUnicaPedido.replace('_doble', '');
                  if (pedidosDelDiaAcumulados[claveSimpleRestante]) {
                      pedidosDelDiaAcumulados[claveSimpleRestante].cantidad += 1;
                      pedidosDelDiaAcumulados[claveSimpleRestante].entregado += (productoBase.entregado % 2);
                      if (productoBase.celiaco) pedidosDelDiaAcumulados[claveSimpleRestante].cantidad_celiaco += 1;
                  } else {
                      let itemSimpleRestante = { ...productoBase, cantidad: 1, entregado: (productoBase.entregado % 2), cantidad_celiaco: productoBase.celiaco ? 1 : 0, doble: false };
                      pedidosDelDiaAcumulados[claveSimpleRestante] = itemSimpleRestante;
                  }
                }
              } else {
                pedidosDelDiaAcumulados[claveUnicaPedido].cantidad += productoBase.cantidad;
                pedidosDelDiaAcumulados[claveUnicaPedido].entregado += productoBase.entregado;
                if (productoBase.celiaco) {
                  pedidosDelDiaAcumulados[claveUnicaPedido].cantidad_celiaco += productoBase.cantidad;
                }
              }
            } else {
              if (esDobleOriginal) {
                let itemDobleNuevo = { ...productoBase, alias: (productoBase.alias || productoBase.nombre) + " Dobles", cantidad: Math.floor(productoBase.cantidad / 2), entregado: Math.floor(productoBase.entregado / 2), cantidad_celiaco: productoBase.celiaco ? Math.floor(productoBase.cantidad / 2) : 0, doble: true };
                pedidosDelDiaAcumulados[claveUnicaPedido] = itemDobleNuevo;
                if ((productoBase.cantidad % 2) > 0) {
                  const claveSimpleRestante = claveUnicaPedido.replace('_doble', '');
                  let itemSimpleRestante = { ...productoBase, cantidad: 1, entregado: (productoBase.entregado % 2), cantidad_celiaco: productoBase.celiaco ? 1 : 0, doble: false };
                  pedidosDelDiaAcumulados[claveSimpleRestante] = itemSimpleRestante;
                }
              } else {
                let itemSimpleNuevo = { ...productoBase, cantidad_celiaco: productoBase.celiaco ? productoBase.cantidad : 0 };
                pedidosDelDiaAcumulados[claveUnicaPedido] = itemSimpleNuevo;
              }
            }
          }
        });
      }
    });

    const arrayPedidosProcesados = Object.values(pedidosDelDiaAcumulados);
    
    arrayPedidosProcesados.forEach((pedido) => {
      // Guardar la cantidad original antes de restar los entregados para la UI
      pedido.cantidad_original_pedido = pedido.cantidad; 
      // La cantidad a mostrar como "pendiente" es la original menos lo entregado
      pedido.cantidad = Math.max(0, pedido.cantidad - pedido.entregado); 

      let claveTotal = `${pedido.id}`;
      if (pedido.doble) claveTotal += "_doble";

      if (productosTotalesAcumulados[claveTotal]) {
        productosTotalesAcumulados[claveTotal].cantidad += pedido.cantidad; // Sumar cantidad pendiente
        productosTotalesAcumulados[claveTotal].entregado += pedido.entregado;
        productosTotalesAcumulados[claveTotal].cantidad_celiaco += pedido.cantidad_celiaco || 0;
      } else {
        productosTotalesAcumulados[claveTotal] = {
          id: pedido.id,
          nombre: pedido.nombre,
          alias: pedido.alias,
          cantidad: pedido.cantidad, // Cantidad pendiente
          entregado: pedido.entregado,
          cantidad_celiaco: pedido.cantidad_celiaco || 0,
          doble: pedido.doble,
        };
      }
    });
    
    setPedidos(arrayPedidosProcesados);
    setPedidosTotales(productosTotalesAcumulados);
    setLoading(false);
  }, (error) => {
    console.error("Error al escuchar los pedidos del día: ", error);
    setError("Ocurrió un error al obtener los pedidos.");
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

  const numProductosFreidora = uniqueProductosFreidoraMostrados.length;

  const contenedorProductosClases = numProductosFreidora > 3
    ? "flex items-stretch space-x-4 overflow-x-auto py-2 mx-auto w-full px-2 sm:px-4 font-nunito mt-2"
    : "flex justify-between items-center mx-auto w-full px-4 font-nunito mt-2";

  const tarjetaProductoClases = numProductosFreidora > 3
    ? "bg-[#F3F3F3] rounded-lg h-[40vh] flex flex-col flex-1 min-w-[240px] max-w-xs"
    : "bg-[#F3F3F3] w-[30%] rounded-lg h-[40vh] flex flex-col";


  return (
    <>
      <div className={contenedorProductosClases}>
        {uniqueProductosFreidoraMostrados.map((productoInfo) => (
          <div key={productoInfo.id} className={tarjetaProductoClases}>
            <div className="flex justify-center p-2">
              <img
                src={productoInfo.imagenSrc}
                alt={productoInfo.nombreDisplay}
                className="w-20 h-20 p-1 bg-white border-2 border-gray-700 rounded-full object-contain"
              />
            </div>
            {/* Opcional: Título dentro de la tarjeta si lo deseas */}
            {/* <p className="text-center font-semibold text-gray-700 text-sm px-2 truncate">{productoInfo.nombreDisplay}</p> */}
            <div className="text-center p-2 overflow-y-auto flex-grow">
              {pedidos
                .filter((pedido) => pedido.fechahora === bloqueHorario && pedido.nombre.toLowerCase().includes(productoInfo.filtroKey))
                .map((pedido, index) => {
                  // Usar cantidad original del pedido para el borde, pero mostrar cantidad original y entregado
                  const borderColor = pedido.cantidad > 0 ? 'border-red-500' : 'border-yellow-500';
                  const itemKey = `${pedido.numeropedido || 'N/A'}-${pedido.id}-${productoInfo.id}-${index}`;
                  return (
                    <div
                      key={itemKey}
                      className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                    >
                      <div className="flex items-center justify-center">
                        <h2 className="mr-2 text-md flex items-center">
                          {`${pedido.cantidad_original_pedido}`} {/* Mostrar cantidad original del pedido */}
                          <span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}
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
        ))}
      </div>

      {/* Parte totales, anteriores y posteriores */}
      <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-2">
        {/* Totales */}
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md">Totales</h1>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]"> {/* Ajuste para scroll interno */}
            {Object.values(pedidosTotales)
              .sort((a,b) => (a.alias || "").localeCompare(b.alias || "")) // Ordenar para consistencia
              .map((pedido, index) => {
              const borderColor = pedido.cantidad > 0 ? 'border-red-500' : 'border-yellow-500';
              const itemKey = `total-${pedido.id}-${pedido.alias || index}-${pedido.doble ? 'd' : 's'}`;
              return (
                <div
                  key={itemKey}
                  className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}
                >
                  <div className="flex items-center justify-center">
                    <h2 className="mr-2 text-md flex items-center">
                      {`${pedido.cantidad + pedido.entregado}`}
                      <span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}
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
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md">Anteriores: {anteriores}</h1>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]">
            {pedidos
              .filter((pedido) => pedido.fechahora === anteriores)
              .sort((a,b) => (a.alias || "").localeCompare(b.alias || ""))
              .map((pedido, index) => {
                const borderColor = pedido.cantidad > 0 ? 'border-red-500' : 'border-yellow-500';
                const itemKey = `anterior-${pedido.numeropedido || 'N/A'}-${pedido.id}-${index}`;
                return (
                  <div key={itemKey} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}>
                    <div className="flex items-center justify-center">
                      <h2 className="mr-2 text-md flex items-center">
                        {`${pedido.cantidad_original_pedido}`}
                        <span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}
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
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md">Posteriores: {posteriores}</h1>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]">
            {pedidos
              .filter((pedido) => pedido.fechahora === posteriores)
              .sort((a,b) => (a.alias || "").localeCompare(b.alias || ""))
              .map((pedido, index) => {
                const borderColor = pedido.cantidad > 0 ? 'border-red-500' : 'border-yellow-500';
                const itemKey = `posterior-${pedido.numeropedido || 'N/A'}-${pedido.id}-${index}`;
                return (
                  <div key={itemKey} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${borderColor}`}>
                    <div className="flex items-center justify-center">
                      <h2 className="mr-2 text-md flex items-center">
                        {`${pedido.cantidad_original_pedido}`}
                        <span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}
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
