// --- ProductCard.jsx (Resaltado Azul Corregido) ---
import React, { useState, useEffect, memo, useRef } from "react"; // Añadir useRef
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

// Estilos CSS para blink (asegúrate que estén definidos globalmente)
/*
@keyframes blink { 50% { opacity: 0.4; } }
.animate-blink { animation: blink 1.2s linear infinite; }
*/

// eslint-disable-next-line react/display-name
const ProductCard = memo(({ product }) => {
    // Estado para manejar expiración del resaltado: Map<orderLineId, expiryTimestamp>
    const [highlightExpiryMap, setHighlightExpiryMap] = useState(new Map());
    // Ref para evitar que el intervalo acceda a un estado obsoleto en su callback
    const expiryMapRef = useRef(highlightExpiryMap);
    expiryMapRef.current = highlightExpiryMap; // Mantener ref actualizada

    // Efecto 1: Detectar nuevas órdenes y añadir su expiración al mapa
    useEffect(() => {
        const now = Date.now();
        let mapChanged = false;
        // Usar una copia para evitar mutaciones directas antes de setear el estado
        const nextMap = new Map(highlightExpiryMap);

        // Añadir nuevas órdenes al mapa de expiración
        product.orders.forEach(order => {
            if (order.isNew && !nextMap.has(order.orderLineId)) {
                nextMap.set(order.orderLineId, now + 5000); // Expira en 5 segundos
                mapChanged = true;
                console.log(`[Highlight ${product.id}] Añadido ${order.orderLineId} con expiración.`);
            }
        });

        // Limpiar del mapa las órdenes que ya no existen en la prop
        const currentOrderIds = new Set(product.orders.map(o => o.orderLineId));
        nextMap.forEach((expiry, orderLineId) => {
            if (!currentOrderIds.has(orderLineId)) {
                nextMap.delete(orderLineId);
                mapChanged = true;
                console.log(`[Highlight ${product.id}] Eliminada orden desaparecida ${orderLineId} del mapa.`);
            }
        });

        // Solo actualizar estado si hubo cambios
        if (mapChanged) {
             console.log(`[Highlight ${product.id}] Actualizando estado expiryMap.`);
            setHighlightExpiryMap(nextMap);
        }
        // Depende solo de las órdenes que llegan como prop
    }, [product.orders, product.id]); // Añadido product.id por si se usa en logs

    // Efecto 2: Intervalo para comprobar y eliminar expiraciones
    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = Date.now();
            // Acceder al mapa más reciente a través de la ref
            const currentMap = expiryMapRef.current;
            const nextMap = new Map(currentMap); // Trabajar sobre una copia
            let changed = false;

            nextMap.forEach((expiryTimestamp, orderLineId) => {
                if (now >= expiryTimestamp) {
                    nextMap.delete(orderLineId);
                    changed = true;
                    console.log(`[Highlight Interval ${product.id}] Expirado y eliminado ${orderLineId}`);
                }
            });

            // Actualizar estado solo si algo cambió
            if (changed) {
                console.log(`[Highlight Interval ${product.id}] Actualizando estado por expiración.`);
                setHighlightExpiryMap(nextMap);
            }
        }, 1000); // Comprobar cada segundo

        // Limpiar intervalo al desmontar
        return () => clearInterval(intervalId);
        // Este efecto solo necesita ejecutarse una vez para establecer el intervalo
    }, [product.id]); // Añadido product.id por si se usa en logs


    // --- Lógica de Click y Cálculos (sin cambios) ---
    const handleOrderClick = async (order) => { /* ... código original ... */ if (!order.idPedido || !order.orderLineId) { console.error("ID no definido en orden:", order); return; } const pedidoRef = doc(db, "pedidos", order.idPedido); try { const pedidoSnap = await getDoc(pedidoRef); if (!pedidoSnap.exists()) { console.error("Pedido no existe:", order.idPedido); return; } const pedidoData = pedidoSnap.data(); let productoEncontrado = false; let cambioRealizado = false; const productosActualizados = pedidoData.productos.map((prod, index) => { const currentLineId = `${order.idPedido}-${prod.id}-${prod.uniqueId || index}`; if (currentLineId === order.orderLineId) { productoEncontrado = true; if (prod.listo !== !prod.listo) { cambioRealizado = true; } return { ...prod, listo: !prod.listo }; } return prod; }); if (productoEncontrado && cambioRealizado) { await updateDoc(pedidoRef, { productos: productosActualizados }); console.log(`Order line ${order.orderLineId} status toggled in Firestore.`); } else if (!productoEncontrado) { console.warn("Línea de pedido no encontrada para actualizar 'listo':", order.orderLineId); } } catch (error) { console.error("Error actualizando estado 'listo':", error); } };
    const listosCount = product.orders.reduce((count, order) => count + (order.producto?.listo ? (order.cantidad ?? 1) : 0), 0);
    const totalPedidosCount = product.pedidos;


    // --- Renderizado ---
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#F3F3F3] shadow-sm flex flex-col h-full">
            {/* Cabecera (sin cambios) */}
            <div className="flex justify-between items-center p-1 border-b border-gray-200 bg-gray-700"> <div className="truncate text-lg text-white font-nunito flex p-2"> {product.name} </div> <div className="flex gap-4 text-[15px] font-nunito me-4"> <div className="flex flex-col items-center"> <span className="font-semibold text-white">STOCK</span> <span className="font-medium text-white">{product.stock !== undefined ? product.stock : '-'}</span> </div> <div className="flex flex-col items-center"> <span className="font-semibold text-white">PEDIDOS</span> <span className="font-medium text-white">{totalPedidosCount} <span className="px-1 ">[ {listosCount} ]</span></span> </div> </div> </div>

            {/* Tabla de Pedidos */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[15px] font-nunito">
                    {/* Cabecera Tabla (sin cambios) */}
                     <thead className="bg-gray-50 sticky top-0 text-center z-10"> <tr> <th className="py-1 px-2 text-gray-900 font-semibold">HORA</th> <th className="py-1 px-2 text-gray-900 font-semibold">PEDIDO</th> <th className="py-1 px-2 text-gray-900 font-semibold">NOMBRE</th> <th className="py-1 px-2 text-gray-900 font-semibold">CANTIDAD</th> <th className="py-1 px-2 text-gray-900 font-semibold">DESCRIPCION</th> </tr> </thead>
                    {/* Cuerpo Tabla */}
                    <tbody>
                        {product.orders.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4 text-gray-500 italic">No hay pedidos.</td></tr>
                        ) : (
                            product.orders.map((order, index) => {
                                // --- Lógica de Estilos Condicionales ---
                                const baseRowColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                                const baseTextColor = "text-gray-900";
                                const baseBorder = "border-gray-100";
                                let rowClasses = [baseRowColor, "border-t", baseBorder];
                                let textColor = baseTextColor;

                                // Comprobar si la fila debe estar resaltada en azul
                                const isHighlightedBlue = highlightExpiryMap.has(order.orderLineId);

                                if (order.producto?.listo) {
                                    rowClasses = ["bg-[#52be80]", "border-t", baseBorder]; textColor = "text-white";
                                } else if (order.isOverdue) { // Asegúrate que 'isOverdue' se calcula en Cocina.jsx
                                    rowClasses = ["bg-red-500", "border-t", "border-red-300"]; rowClasses = rowClasses.filter(c => c !== 'animate-blink'); textColor = "text-white";
                                } else if (order.needsCookingAlert) {
                                    rowClasses = ["bg-yellow-300", "border-t", baseBorder]; rowClasses.push("animate-blink"); textColor = "text-gray-800";
                                // *** CAMBIO AQUÍ: Usar el estado del mapa de expiración ***
                                } else if (isHighlightedBlue) {
                                    rowClasses = ["bg-blue-200", "border-t", baseBorder]; rowClasses = rowClasses.filter(c => c !== 'animate-blink'); textColor = "text-blue-800";
                                }
                                // Interacción
                                if (!order.producto?.listo) {
                                    rowClasses.push("cursor-pointer", "hover:bg-gray-200", "transition-colors");
                                }
                                // Formato Hora
                                const horaFormateada = dayjs(order.hora, "DD/MM/YYYY HH:mm").format("HH:mm");

                                // Renderizar fila
                                return ( <tr key={order.orderLineId} className={`${rowClasses.join(" ")} ${textColor}`} onClick={() => handleOrderClick(order)} > <td className="py-1 px-2 text-center text-lg font-nunito">{horaFormateada !== 'Invalid Date' ? horaFormateada : '-'}</td> <td className="py-1 px-2 text-center text-lg font-nunito font-bold">{order.idPedido.slice(-4)}</td> <td className="py-1 px-2 font-medium text-center text-lg font-nunito">{order.nombre}</td> <td className="py-1 px-2 text-center text-lg font-nunito">{order.cantidad}</td> <td className="py-1 px-2 text-center text-lg font-nunito truncate" title={order.descripcion}>{order.descripcion || "-"}</td> </tr> );
                            }) // Fin map
                        )}
                    </tbody>
                </table>
            </div>
        </div> // Fin Card
    );
}); // Fin memo

export default ProductCard;