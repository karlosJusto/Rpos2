import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import singluten from '../../assets/singluten.png';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

// --- Componente del Modal (Integrado y Corregido) ---
const OrderDetailsModal = ({ isOpen, onClose, data, timeBlock }) => {
  if (!isOpen || !data || data.length === 0) {
    return null;
  }
  const modalTitle = `Desglose de Pedidos (${timeBlock})`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 font-nunito"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{modalTitle}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {data.map((aggregatedItem, itemIndex) => (
            <div key={itemIndex} className="mb-4 last:mb-0">
              <h3 className="font-bold text-lg text-blue-600 border-b-2 border-blue-200 pb-1 mb-2">
                {aggregatedItem.alias}
              </h3>
              <ul className="space-y-1 pl-2">
                {/* CORRECCIÓN: Se añade `|| []` para evitar el error si `breakdown` es undefined. */}
                {(aggregatedItem.breakdown || []).map((order, orderIndex) => (
                  <li key={orderIndex} className="bg-gray-100 p-2 rounded-md flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">
                      Pedido: {order.numeropedido}
                    </span>
                    <span className="text-gray-600">
                      x{order.contributed_portions} {aggregatedItem.doble ? 'doble(s)' : ''} (Total pedido: {order.original_total})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- Componente Principal Freidora ---
const Freidora = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hora, setHora] = useState('');
  const [bloqueHorario, setBloqueHorario] = useState('');
  const [anteriores, setAnteriores] = useState('');
  const [posteriores, setPosteriores] = useState('');
  const [pedidosTotales, setPedidosTotales] = useState({});
  const [productosFreidoraConfig, setProductosFreidoraConfig] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTimeBlock, setModalTimeBlock] = useState("");
  const audioRef = useRef(null);
  const previousRelevantOrderProductIdsRef = useRef(new Set());
  const initialLoadFreidoraDoneRef = useRef(false);

  useEffect(() => {
    const actualizarHora = () => {
      const currentTime = dayjs().locale('es').tz('Europe/Madrid');
      setHora(currentTime.format('HH:mm:ss'));
      const minutos = currentTime.minute();
      let nuevoBloque = '';
      if (minutos >= 0 && minutos <= 15) nuevoBloque = currentTime.startOf('hour').add(15, 'minute').format('HH:mm');
      else if (minutos >= 16 && minutos <= 30) nuevoBloque = currentTime.startOf('hour').add(30, 'minute').format('HH:mm');
      else if (minutos >= 31 && minutos <= 45) nuevoBloque = currentTime.startOf('hour').add(45, 'minute').format('HH:mm');
      else if (minutos >= 46 && minutos <= 59) nuevoBloque = currentTime.add(1, 'hour').startOf('hour').format('HH:mm');
      setBloqueHorario(nuevoBloque);
      const bloqueTime = dayjs(nuevoBloque, 'HH:mm');
      setAnteriores(bloqueTime.subtract(15, 'minute').format('HH:mm'));
      setPosteriores(bloqueTime.add(15, 'minute').format('HH:mm'));
    };
    actualizarHora();
    const interval = setInterval(actualizarHora, 60000); 
    return () => clearInterval(interval);
  }, []);

  const playNotificationSoundFreidora = useCallback(() => {
    if (audioRef.current) audioRef.current.play().catch(error => console.warn("Error playing sound:", error));
  }, []);

  useEffect(() => {
    const fetchFreidoraProducts = async () => {
      try {
        const q = query(collection(db, 'freidora'), orderBy('nombreDisplay')); 
        const querySnapshot = await getDocs(q);
        const loadedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, imagenSrc: doc.data().imagenUrl || null, ...doc.data() }));
        setProductosFreidoraConfig(loadedProducts);
      } catch (err) { console.error("Error fetching freidora products:", err); }
    };
    fetchFreidoraProducts();
  }, []);

  const uniqueProductosFreidoraMostrados = useMemo(() => {
    const uniqueKeys = new Set();
    return productosFreidoraConfig.filter(p => !uniqueKeys.has(p.filtroKey) && uniqueKeys.add(p.filtroKey));
  }, [productosFreidoraConfig]);

  useEffect(() => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    const horaActualDate = hoy.getHours();
    const fechaInicio = horaActualDate < 18 ? `${dia}/${mes}/${anio} 00:00` : `${dia}/${mes}/${anio} 18:00`;
    const fechaFin = horaActualDate < 18 ? `${dia}/${mes}/${anio} 17:59` : `${dia}/${mes}/${anio} 23:59`;
    
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'pedidos'), where('fechahora', '>=', fechaInicio), where('fechahora', '<=', fechaFin));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todasLasPorciones = [];
      const productosTotalesFinal = {};
      
      snapshot.forEach((pedidoDoc) => {
        const pedidoData = { id: pedidoDoc.id, ...pedidoDoc.data() };
        
        // Lógica de notificaciones
        let ordenNecesitaActualizacionFirestore = false;
        let itemsQueDispararonSonidoEnEstaOrden = new Set();
        const productosModificados = pedidoData.productos ? pedidoData.productos.map((prod, idx) => {
          let p = { ...prod };
          if (p.freidora === true) {
            const itemUniqueId = `${pedidoData.id}-${p.id}-${p.uniqueId || idx}`;
            if (p.vistoFreidora === undefined) {
              p.vistoFreidora = false;
              ordenNecesitaActualizacionFirestore = true;
            }
            if (p.vistoFreidora === false && initialLoadFreidoraDoneRef.current && !previousRelevantOrderProductIdsRef.current.has(itemUniqueId)) {
              itemsQueDispararonSonidoEnEstaOrden.add(itemUniqueId);
              ordenNecesitaActualizacionFirestore = true;
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
                p.vistoFreidora = true;
              }
            }
            return p;
          });
          const pedidoRef = doc(db, 'pedidos', pedidoData.id);
          updateDoc(pedidoRef, { productos: productosParaFirestore }).catch(err => console.error(`Error updating ${pedidoData.id}`, err));
        }
        if (itemsQueDispararonSonidoEnEstaOrden.size > 0) {
            playNotificationSoundFreidora();
        }
        
        const productosDelPedido = pedidoData.productos || [];
        const fechaRecogidaPedido = dayjs(pedidoData.fechahora, 'DD/MM/YYYY HH:mm').tz('Europe/Madrid');

        productosDelPedido.forEach((productoItem) => {
          if (productoItem.freidora === true) {
            // Acumular para la tarjeta de "Totales"
            const claveTotal = `${productoItem.id}`;
            if (productosTotalesFinal[claveTotal]) {
                productosTotalesFinal[claveTotal].cantidad += productoItem.cantidad;
                productosTotalesFinal[claveTotal].entregado += productoItem.entregado || 0;
                if (productoItem.celiaco) productosTotalesFinal[claveTotal].cantidad_celiaco += productoItem.cantidad;
            } else {
                productosTotalesFinal[claveTotal] = {
                    id: productoItem.id, nombre: productoItem.nombre, alias: productoItem.alias,
                    cantidad: productoItem.cantidad, entregado: productoItem.entregado || 0,
                    cantidad_celiaco: productoItem.celiaco ? productoItem.cantidad : 0, position: productoItem.position,
                };
            }

            // Generar porciones individuales para la visualización
            const esEspecial = (productoItem.id === 10 || productoItem.id === 3);
            const baseItem = {
                id: productoItem.id, nombre: productoItem.nombre, displayAlias: productoItem.alias || productoItem.nombre,
                entregado: productoItem.entregado || 0, fechahora: fechaRecogidaPedido.format('HH:mm'),
                position: productoItem.position, celiaco: productoItem.celiaco,
            };

            const breakdownInfo = {
                numeropedido: pedidoData.NumeroPedido,
                original_total: productoItem.cantidad,
            };

            if (esEspecial) {
                const cantidadDobles = Math.floor(productoItem.cantidad / 2);
                const cantidadSimples = productoItem.cantidad % 2;

                if (cantidadDobles > 0) {
                    todasLasPorciones.push({
                        ...baseItem, tipo: 'doble', cantidad_racion: cantidadDobles,
                        breakdown: { ...breakdownInfo, contributed_portions: cantidadDobles },
                        cantidad_celiaco_racion: baseItem.celiaco ? cantidadDobles * 2 : 0,
                    });
                }
                if (cantidadSimples > 0) {
                    todasLasPorciones.push({
                        ...baseItem, tipo: 'simple', cantidad_racion: cantidadSimples,
                        breakdown: { ...breakdownInfo, contributed_portions: cantidadSimples },
                        cantidad_celiaco_racion: baseItem.celiaco ? cantidadSimples : 0,
                    });
                }
            } else {
                todasLasPorciones.push({
                    ...baseItem, tipo: 'simple', cantidad_racion: productoItem.cantidad,
                    breakdown: { ...breakdownInfo, contributed_portions: productoItem.cantidad },
                    cantidad_celiaco_racion: baseItem.celiaco ? productoItem.cantidad : 0,
                });
            }
          }
        });
      });
      
      const porcionesAgrupadas = {};
      todasLasPorciones.forEach(porcion => {
          const claveAgrupacion = `${porcion.id}-${porcion.fechahora}-${porcion.tipo}`;
          if (porcionesAgrupadas[claveAgrupacion]) {
              porcionesAgrupadas[claveAgrupacion].cantidad_original_pedido += porcion.cantidad_racion;
              porcionesAgrupadas[claveAgrupacion].entregado += porcion.entregado;
              porcionesAgrupadas[claveAgrupacion].cantidad_celiaco += porcion.cantidad_celiaco_racion;
              porcionesAgrupadas[claveAgrupacion].breakdown.push(porcion.breakdown);
          } else {
              porcionesAgrupadas[claveAgrupacion] = {
                  id: porcion.id, nombre: porcion.nombre,
                  alias: porcion.tipo === 'doble' ? `${porcion.displayAlias} Dobles` : porcion.displayAlias,
                  displayAlias: porcion.displayAlias, cantidad_original_pedido: porcion.cantidad_racion,
                  entregado: porcion.entregado, fechahora: porcion.fechahora,
                  position: porcion.position, breakdown: [porcion.breakdown],
                  celiaco: porcion.celiaco, doble: porcion.tipo === 'doble',
                  cantidad_celiaco: porcion.cantidad_celiaco_racion,
              };
          }
      });

      const arrayPedidosFinal = Object.values(porcionesAgrupadas).map(p => ({
          ...p,
          cantidad: Math.max(0, p.cantidad_original_pedido - p.entregado),
      }));
      
      setPedidos(arrayPedidosFinal);
      setPedidosTotales(productosTotalesFinal);
      setLoading(false);
      
      if (!initialLoadFreidoraDoneRef.current) {
        initialLoadFreidoraDoneRef.current = true;
      }
      
    }, (error) => {
      console.error("Error en Snapshot:", error);
      setError("Error al obtener pedidos.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (timeBlock) => {
    const itemsInBlock = pedidos.filter(p => p.fechahora === timeBlock);
    if (itemsInBlock.length > 0) {
      setModalData(itemsInBlock);
      setModalTimeBlock(timeBlock);
      setModalOpen(true);
    }
  };

  const showAnterioresInfoButton = useMemo(() => 
    pedidos.some(p => p.fechahora === anteriores),
    [pedidos, anteriores]
  );
  
  const showPosterioresInfoButton = useMemo(() => 
    pedidos.some(p => p.fechahora === posteriores),
    [pedidos, posteriores]
  );

  const numProductosFreidora = uniqueProductosFreidoraMostrados.length;
  const contenedorProductosClases = numProductosFreidora > 6 ? "flex flex-nowrap overflow-x-auto gap-4 py-2 px-4 font-nunito mt-2 w-full" : "flex flex-wrap justify-between gap-4 py-2 px-4 font-nunito mt-2 w-full";
  const tarjetaProductoClases = numProductosFreidora > 6 ? "bg-[#F3F3F3] rounded-lg h-[40vh] flex flex-col flex-shrink-0 w-[15.66%] min-w-[200px]" : "bg-[#F3F3F3] rounded-lg h-[40vh] flex flex-col flex-grow basis-0 min-w-[200px]";

  const sortFunction = (a, b) => {
      const isDobleA = a.alias?.toLowerCase().includes('dobles');
      const isDobleB = b.alias?.toLowerCase().includes('dobles');
      const baseAliasA = (a.displayAlias || a.alias)?.toLowerCase().replace('dobles', '').trim();
      const baseAliasB = (b.displayAlias || b.alias)?.toLowerCase().replace('dobles', '').trim();
      const esPatataOPimiento = (alias) => alias.includes('patata') || alias.includes('pimiento');
      if (baseAliasA === baseAliasB && esPatataOPimiento(baseAliasA)) {
        if (isDobleA && !isDobleB) return -1;
        if (!isDobleA && isDobleB) return 1;
      }
      return (Number(a.position) || 0) - (Number(b.position) || 0);
  };

  return (
    <>
      <div className={contenedorProductosClases}>
        {uniqueProductosFreidoraMostrados.map((productoInfo) => (
          <div key={productoInfo.id} className={tarjetaProductoClases}>
            <div className="flex justify-center p-2 -mt-4"><img src={productoInfo.imagenSrc} alt={productoInfo.nombreDisplay} className="w-20 h-20 bg-white border-2 border-gray-700 rounded-full object-contain" /></div>
            <div className="text-center p-2 overflow-y-auto flex-grow">
              {pedidos.filter((p) => p.fechahora === bloqueHorario && p.nombre.toLowerCase().includes(productoInfo.filtroKey)).sort(sortFunction).map((pedido, index) => (
                <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${pedido.cantidad > 0 ? 'border-red-500' : 'border-green-500'}`}>
                  <div className="flex items-center justify-center">
                    <h2 className="mr-2 text-md flex items-center">{`${pedido.cantidad_original_pedido}`}<span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}{pedido.cantidad_celiaco > 0 && (<span className="flex items-center ms-2">[ {pedido.cantidad_celiaco} x<img src={singluten} alt="Sin gluten" className="w-6 h-6 ms-1 me-1" />]</span>)}</h2>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito mt-2">
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <h1 className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md">Totales</h1>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]">
            {Object.values(pedidosTotales).sort(sortFunction).map((pedido, index) => (
                <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${pedido.cantidad > pedido.entregado ? 'border-red-500' : 'border-green-500'}`}>
                  <div className="flex items-center justify-center">
                    <h2 className="mr-2 text-md flex items-center">{`${pedido.cantidad}`}<span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}{pedido.cantidad_celiaco > 0 && (<span className="flex items-center ms-2 gap-[0.1vw]">[ {pedido.cantidad_celiaco} x<img src={singluten} alt="Sin gluten" className="w-6 h-6 ms-1 me-1" />]</span>)}</h2>
                  </div>
                </div>
            ))}
          </div>
        </div>
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <div className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md flex items-center justify-center">
            <h1>Anteriores: {anteriores}</h1>
            {showAnterioresInfoButton && (<button onClick={() => handleOpenModal(anteriores)} className="ml-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-blue-600 transition-transform duration-200 hover:scale-110" aria-label="Ver desglose">i</button>)}
          </div>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]">
            {pedidos.filter((p) => p.fechahora === anteriores).sort(sortFunction).map((pedido, index) => (
              <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${pedido.cantidad > 0 ? 'border-red-500' : 'border-green-500'}`}>
                <div className="flex items-center justify-center">
                  <h2 className="mr-2 text-md flex items-center">{`${pedido.cantidad_original_pedido}`}<span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}{pedido.cantidad_celiaco > 0 && (<span className="flex items-center ms-2">[ {pedido.cantidad_celiaco} x<img src={singluten} alt="Sin gluten" className="w-6 h-6 ms-1 me-1" />]</span>)}</h2>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[42vh] flex flex-col">
          <div className="bg-gray-700 p-2 text-white text-lg text-center rounded-t-md flex items-center justify-center">
            <h1>Posteriores: {posteriores}</h1>
            {showPosterioresInfoButton && (<button onClick={() => handleOpenModal(posteriores)} className="ml-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-blue-600 transition-transform duration-200 hover:scale-110" aria-label="Ver desglose">i</button>)}
          </div>
          <div className="text-center p-2 overflow-y-auto h-[calc(42vh-theme(spacing.10))]">
            {pedidos.filter((p) => p.fechahora === posteriores).sort(sortFunction).map((pedido, index) => (
              <div key={index} className={`mb-2 p-2 bg-white rounded-md shadow-md border-2 ${pedido.cantidad > 0 ? 'border-red-500' : 'border-green-500'}`}>
                 <div className="flex items-center justify-center">
                  <h2 className="mr-2 text-md flex items-center">{`${pedido.cantidad_original_pedido}`}<span className="font-bold px-1">[ {pedido.entregado} ]</span> x {pedido.alias}{pedido.cantidad_celiaco > 0 && (<span className="flex items-center ms-2">[ {pedido.cantidad_celiaco} x<img src={singluten} alt="Sin gluten" className="w-6 h-6 ms-1 me-1" />]</span>)}</h2>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <audio ref={audioRef} src="/musica/level-up.mp3" preload="auto" />
      <OrderDetailsModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} data={modalData} timeBlock={modalTimeBlock} />
    </>
  );
};

export default Freidora;
