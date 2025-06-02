import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore'; // Importa onSnapshot, getDocs, orderBy, doc, updateDoc
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

  const audioRef = useRef(null);
  const previousRelevantOrderProductIdsRef = useRef(new Set()); // Stores "orderId-productId-uniqueId"
  const initialLoadFreidoraDoneRef = useRef(false);

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

  const playNotificationSoundFreidora = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => console.warn("Error playing freidora notification sound:", error));
    }
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
    const productosTotalesAcumulados = {}; // Para la sección "Totales"
    let anyNewFreidoraItemFoundGlobal = false;
    const currentSnapshotRelevantProductIds = new Set();
    const updatePromises = [];

    snapshot.forEach((pedidoDoc) => {
      const pedidoData = { id: pedidoDoc.id, ...pedidoDoc.data() };
      let ordenNecesitaActualizacionFirestore = false;
      let itemsQueDispararonSonidoEnEstaOrden = new Set();

      const productosModificados = pedidoData.productos ? pedidoData.productos.map((prod, idx) => {
        let p = { ...prod };
        if (p.freidora === true) {
          const itemUniqueId = `${pedidoData.id}-${p.id}-${p.uniqueId || idx}`;
          currentSnapshotRelevantProductIds.add(itemUniqueId);

          if (p.vistoFreidora === undefined) {
            p.vistoFreidora = false;
            ordenNecesitaActualizacionFirestore = true;
          }

          if (p.vistoFreidora === false && initialLoadFreidoraDoneRef.current && !previousRelevantOrderProductIdsRef.current.has(itemUniqueId)) {
            anyNewFreidoraItemFoundGlobal = true;
            itemsQueDispararonSonidoEnEstaOrden.add(itemUniqueId);
            // No se marca p.vistoFreidora = true aquí directamente, se hará antes del updateDoc
            ordenNecesitaActualizacionFirestore = true; // Ensure update is flagged
          }
        }
        return p;
      }) : [];

      if (ordenNecesitaActualizacionFirestore) {
        const productosParaFirestore = productosModificados.map((prod, idx) => {
          let p = { ...prod };
          if (p.freidora === true) {
            const itemUniqueId = `${pedidoData.id}-${p.id}-${p.uniqueId || idx}`;
            if (itemsQueDispararonSonidoEnEstaOrden.has(itemUniqueId)) {
              p.vistoFreidora = true; // Mark as seen if it triggered sound
            }
          }
          return p;
        });
        const pedidoRef = doc(db, 'pedidos', pedidoData.id);
        updatePromises.push(
          updateDoc(pedidoRef, { productos: productosParaFirestore })
            .then(() => console.log(`[Freidora] Firestore updated for ${pedidoData.id} (vistoFreidora)`))
            .catch(err => console.error(`[Freidora] Error updating ${pedidoData.id} (vistoFreidora)`, err))
        );
      }
      
      // Accumulation logic using the potentially updated products
      const productosParaAcumular = ordenNecesitaActualizacionFirestore ? productosModificados.map((prod, idx) => {
        let p = { ...prod }; // Start with a copy of the modified product
        if (p.freidora === true) {
            const itemUniqueId = `${pedidoData.id}-${p.id}-${p.uniqueId || idx}`;
            if (itemsQueDispararonSonidoEnEstaOrden.has(itemUniqueId)) {
                p.vistoFreidora = true; // Ensure `vistoFreidora` is true if it triggered sound
            }
        }
        return p;
      }) : (pedidoData.productos || []);


      if (productosParaAcumular) {
          const fechaRecogidaPedido = dayjs(pedidoData.fechahora, 'DD/MM/YYYY HH:mm').tz('Europe/Madrid');
          productosParaAcumular.forEach((productoItem) => {
            if (productoItem.freidora === true) {
              let productoBase = {
                id: productoItem.id,
                nombre: productoItem.nombre,
                alias: productoItem.alias,
                cantidad: productoItem.cantidad,
                celiaco: productoItem.celiaco,
                cantidad_celiaco: 0,
                numeropedido: pedidoData.NumeroPedido,
                entregado: productoItem.entregado || 0,
                fechahora: fechaRecogidaPedido.format('HH:mm'),
                doble: false,
                vistoFreidora: productoItem.vistoFreidora, // Carry over the status
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

    Promise.all(updatePromises).then(() => {
      // console.log("[Freidora] All Firestore updates for vistoFreidora completed for this snapshot.");
    });

    if (anyNewFreidoraItemFoundGlobal) {
      playNotificationSoundFreidora();
    }
    previousRelevantOrderProductIdsRef.current = currentSnapshotRelevantProductIds;

    // Mark initial load as done after the first snapshot has been processed,
    // regardless of whether it contained orders or not.
    if (!initialLoadFreidoraDoneRef.current) {
      initialLoadFreidoraDoneRef.current = true;
      console.log("[Freidora] Initial processing pass complete. Ready for new order sounds. Snapshot size: " + snapshot.size);
    }

    const arrayPedidosProcesados = Object.values(pedidosDelDiaAcumulados);
    arrayPedidosProcesados.forEach((pedido) => {
      pedido.cantidad_original_pedido = pedido.cantidad;
      pedido.cantidad = Math.max(0, pedido.cantidad - pedido.entregado);

      let claveTotal = `${pedido.id}`;
      if (pedido.doble) claveTotal += "_doble";

      if (productosTotalesAcumulados[claveTotal]) {
        productosTotalesAcumulados[claveTotal].cantidad += pedido.cantidad;
        productosTotalesAcumulados[claveTotal].entregado += pedido.entregado;
        productosTotalesAcumulados[claveTotal].cantidad_celiaco += pedido.cantidad_celiaco || 0;
      } else {
        productosTotalesAcumulados[claveTotal] = {
          id: pedido.id,
          nombre: pedido.nombre,
          alias: pedido.alias,
          cantidad: pedido.cantidad,
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


const contenedorProductosClases =
  numProductosFreidora > 6
    ? "flex flex-nowrap overflow-x-auto gap-4 py-2 px-4 font-nunito mt-2 w-full"
    : "flex flex-wrap justify-between gap-4 py-2 px-4 font-nunito mt-2 w-full";

const tarjetaProductoClases =
  numProductosFreidora > 6
    ? "bg-[#F3F3F3] rounded-lg h-[40vh] flex flex-col flex-shrink-0 w-[15.66%] min-w-[200px]"
    : "bg-[#F3F3F3] rounded-lg h-[40vh] flex flex-col flex-grow basis-0 min-w-[200px]";


  return (
    <>
      <div className={contenedorProductosClases}>
        {uniqueProductosFreidoraMostrados.map((productoInfo) => (
          <div key={productoInfo.id} className={tarjetaProductoClases}>
            <div className="flex justify-center p-2">
              <img
                src={productoInfo.imagenSrc}
                alt={productoInfo.nombreDisplay}
                className="w-16 h-16 p-1 bg-white border-2 border-gray-700 rounded-full object-contain"
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
      <audio ref={audioRef} src="/musica/level-up.mp3" preload="auto" />
    </>
  );
};

export default Freidora;
