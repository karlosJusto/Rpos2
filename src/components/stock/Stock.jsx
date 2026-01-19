import React, { useContext, useState, useEffect } from 'react';
import { dataContext } from '../Context/DataContext';
import { db } from '../../components/firebase/firebase';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import CierreDia from './CierreDia';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const Stock = () => {
  const { data, actualizarStock, loading } = useContext(dataContext);

  // Estado para guardar el objeto con TODOS los stocks de ayer
  const [stockAnterior, setStockAnterior] = useState({});


  const [stockActual, setStockActual] = useState({});
  const [nuevoStock, setNuevoStock] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (data && data.length > 0) {
      setStockActual(
        data.reduce((acc, producto) => {
          acc[producto.id_product] = producto.stock;
          return acc;
        }, {})
      );
      setNuevoStock(
        data.reduce((acc, producto) => {
          acc[producto.id_product] = 0;
          return acc;
        }, {})
      );
    }
  }, [data]);

  useEffect(() => {
    const fetchStockAnterior = async () => {
      const fechaAyer = dayjs().tz('Europe/Madrid').subtract(1, 'day').format('YYYY-MM-DD');
      console.log(`[Stock Debug] Intentando recuperar historialStock para la fecha: ${fechaAyer}`);

      // Apuntamos al documento del día de ayer
      const docRef = doc(db, 'historialStock', fechaAyer);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().stocks) {
        const stocksAyer = docSnap.data().stocks;
        console.log("[Stock Debug] Stock de ayer encontrado:", stocksAyer);
        // Guardamos el mapa completo de stocks en el estado
        setStockAnterior(stocksAyer);
      } else {
        console.log("[Stock Debug] No se encontró el histórico de stock para el día de ayer (o documento vacío).");
        setStockAnterior({});
      }
    };

    fetchStockAnterior();
  }, []);

  // LOGS DE DEBUGGING PARA CÁLCULOS
  useEffect(() => {
    if (!data || data.length === 0) return;

    console.groupCollapsed("[Stock Debug] Cálculos Actuales de Stock");
    console.log("Timestamp:", new Date().toLocaleTimeString());
    console.log("Raw Data Context (data):", data);
    console.log("State Stock Actual:", stockActual);
    console.log("State Nuevo Stock (Entran):", nuevoStock);
    console.log("State Stock Anterior (Ayer):", stockAnterior);

    // Simulación de cálculo para log
    data.forEach(producto => {
      // SOLICITUD USUARIO: SOLO LOGUEAR ID 1 (POLLO)
      // Convertimos a string por seguridad en la comparación
      if (String(producto.id_product) !== '1') return;

      const id = producto.id_product;
      const nombre = producto.name;

      const sAyer = stockAnterior[id] ?? 'N/D';
      const sActual = parseFloat(stockActual[id]) || 0;
      const entran = parseFloat(nuevoStock[id]) || 0;
      const totalSemana = sActual + entran;
      // Stock Hoy = Stock Semana (según ultima lógica)

      console.log(`Producto: ${nombre} (ID: ${id})`);
      console.log(`   -> Stock Ayer (DB): ${sAyer}`);
      console.log(`   -> Stock Actual (Context): ${sActual}`);
      console.log(`   -> Entran (Input): ${entran}`);
      console.log(`   -> Resultado (Semana/Hoy): ${totalSemana}`);
      console.log('------------------------------------------------');
    });
    console.groupEnd();

  }, [data, stockActual, nuevoStock, stockAnterior]);

  // Se ha eliminado la lógica de cálculo de pedidos futuros para que Stock Hoy coincida con Stock Actual/Semana




  // --- RE-IMPLEMENTACIÓN: CÁLCULO DE PEDIDOS FUTUROS ---
  // El usuario quiere que "Stock Hoy" NO tenga restados los pedidos de mañana en adelante.
  // Como el "Stock Actual" de la DB ya tiene restados TODOS los pedidos (hoy y futuros),
  // necesitamos SUMAR de vuelta lo que se ha "reservado" para el futuro para mostrar la disponibilidad real de HOY.

  const [futurosTotales, setFuturosTotales] = useState({});

  useEffect(() => {
    // Escuchar pedidos recientes para calcular cuánto stock está reservado para días futuros
    const ordersRef = collection(db, 'pedidos');
    const q = query(ordersRef, orderBy("NumeroPedido", "desc"), limit(500));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cantidadReservadaFuturo = {};
      const now = dayjs().tz('Europe/Madrid');
      const startOfTomorrow = now.add(1, 'day').startOf('day');

      snapshot.docs.forEach(doc => {
        const order = doc.data();
        if (!order.fechahora || !order.productos) return;

        // Parsear fecha
        const orderDate = dayjs(order.fechahora, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid', true);

        // Si el pedido es para mañana o después, sumamos sus cantidades
        if (orderDate.isValid() && (orderDate.isSame(startOfTomorrow) || orderDate.isAfter(startOfTomorrow))) {

          // Usamos el helper de cantidad que teníamos (re-creado inline o movemos el helper fuera)
          // Haremos la lógica aquí mismo para simplificar y asegurar consistencia
          order.productos.forEach(item => {
            const itemId = item.id;
            const cantidad = Number(item.cantidad) || 0;
            if (cantidad <= 0) return;

            let idStockToMap = null;
            let qtyToMap = cantidad;
            const nameLower = (item.name || item.nombre || "").toLowerCase();

            // Lógica de mapeo de IDs (mismo que CartTotal)
            if (nameLower.includes("gratis")) return;

            if (itemId === 1 || itemId === "1") idStockToMap = 1;
            else if ([2, 39, 40].includes(Number(itemId)) || nameLower.includes("menú")) {
              idStockToMap = 1; qtyToMap = cantidad * 0.5;
            }
            else if (itemId === 41 || itemId === "41") idStockToMap = 41;
            else if (itemId === 48 || itemId === "48") {
              idStockToMap = 41; qtyToMap = cantidad * 0.5;
            }
            else idStockToMap = itemId;

            if (idStockToMap) {
              cantidadReservadaFuturo[idStockToMap] = (cantidadReservadaFuturo[idStockToMap] || 0) + qtyToMap;
            }
          });
        }
      });
      setFuturosTotales(cantidadReservadaFuturo);
    });

    return () => unsubscribe();
  }, []);


  // LOGS DE DEBUGGING (SOLO ID 1)
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Solo logueamos si ha cambiado algo relevante
    console.groupCollapsed("[Stock Debug] Análisis de Pollo (ID 1)");
    const productoPollo = data.find(p => String(p.id_product) === '1');

    if (productoPollo) {
      const id = 1;
      const sAyer = stockAnterior[id] ?? 'N/D';
      const sActualDB = parseFloat(stockActual[id]) || 0; // Esto es lo que pone la DB (Total - Todo)
      const entran = parseFloat(nuevoStock[id]) || 0;

      const reservadosFuturo = futurosTotales[id] || 0;

      // CÁLCULO FINAL EXPLICADO
      // Stock Semana = Stock Real DB (Ya tiene todo restado) + Entran
      const stockSemana = sActualDB + entran;

      // Stock Hoy = Stock Semana + Reservas Futuras (Porque esas NO deberían restar para hoy)
      const stockHoy = stockSemana + reservadosFuturo;

      console.log(`POLLO ASADO (ID: 1)`);
      console.log(`1. Stock Ayer (DB Histórico):`, sAyer);
      console.log(`2. Stock Actual (DB Productos):`, sActualDB, " <-- Incluye restas de pedidos futuros");
      console.log(`3. Entran (Input manual):`, entran);
      console.log(`4. Reservado para Futuro (Detectado en pedidos):`, reservadosFuturo);
      console.log(`-----------------------------------------------`);
      console.log(`RESULTADO 'STOCK SEMANA' (Actual DB + Entran):`, stockSemana);
      console.log(`RESULTADO 'STOCK HOY' (Semana + Futuros):`, stockHoy, " <-- Disponible HOY (ignorando compromisos futuros)");
    }
    console.groupEnd();

  }, [data, stockActual, nuevoStock, stockAnterior, futurosTotales]);


  const clearSearch = () => {
    setSearch('');
  };

  const handleStockChange = (id_product, e) => {
    setNuevoStock({
      ...nuevoStock,
      [id_product]: parseFloat(e.target.value) || 0,
    });
  };

  const handleActualizarStock = () => {
    Object.keys(stockActual).forEach((id_product) => {
      const stock = (parseFloat(stockActual[id_product]) || 0) + (parseFloat(nuevoStock[id_product]) || 0);
      actualizarStock(id_product, stock);
      setStockActual(prev => ({ ...prev, [id_product]: stock }));
      setNuevoStock(prev => ({ ...prev, [id_product]: 0 }));
    });
  };

  if (loading) {
    return <p className="text-center">Cargando productos...</p>;
  }

  // AHORA MOSTRAMOS TODOS LOS PRODUCTOS, sin el filtro del producto 20
  const productosFiltrados = data.filter((producto) =>
    producto.name.toLowerCase().includes(search.toLowerCase()) && ![2, 39, 40, 48].includes(producto.id_product)
  );

  const productosPorCategoria = productosFiltrados.reduce((acc, producto) => {
    const { categoria } = producto;
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(producto);
    return acc;
  }, {});

  const ordenCategorias = ['comida', 'complementos', 'bebidas', 'postres', 'extras'];
  const categoriasOrdenadas = ordenCategorias.filter(categoria => productosPorCategoria[categoria]);

  return (
    <div className="flex justify-center items-start mt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mb-24">
        <div className="mb-6 flex justify-center">
          <div className="relative w-full sm:w-1/2 lg:w-1/3">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md w-full focus:ring-yellow-500 focus:border-yellow-500 pr-10"
            />
            {search && (
              <svg onClick={clearSearch} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-900 cursor-pointer" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {categoriasOrdenadas.map((categoria) => (
          <div key={categoria} className="mb-8">
            <h2 className="text-2xl font-nunito font-semibold mb-6  text-gray-500 capitalize">{categoria}</h2>
            <table className="table-auto w-full text-center border-collapse">
              <thead className="bg-[#F3F3F3]">
                <tr className="text-xl font-nunito">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Stock Anterior</th>

                  <th className="px-4 py-2">Entran</th>
                  <th className="px-4 py-2">Stock Hoy</th>
                  <th className="px-4 py-2 text-[#f2ac02]">Stock Semana</th>
                </tr>
              </thead>
              <tbody>
                {productosPorCategoria[categoria]
                  .sort((a, b) => a.position - b.position)
                  .map((producto) => {
                    // LÓGICA DE VISUALIZACIÓN
                    const stockDeAyer = stockAnterior[producto.id_product] ?? 'N/D';
                    const sActual = parseFloat(stockActual[producto.id_product]) || 0;
                    const entran = parseFloat(nuevoStock[producto.id_product]) || 0;

                    // Stock Semana = Lo que hay realmente en DB (que ya descontó futuros)
                    const stockTotalSemana = sActual + entran;

                    // Stock Hoy = Stock Semana + Lo que está reservado para futuro (lo sumamos porque NO lo vendemos hoy)
                    const qtyFutura = futurosTotales[producto.id_product] || 0;
                    let stockHoy = stockTotalSemana + qtyFutura;

                    // Si el producto es GRATIS, siempre mostrar 1.0
                    const esGratis = producto.name?.toLowerCase().includes("gratis");
                    const displayStockActual = esGratis ? 1.0 : sActual;
                    const displayStockHoy = esGratis ? 1.0 : stockHoy;
                    const displayStockSemana = esGratis ? 1.0 : stockTotalSemana;

                    return (
                      <tr key={producto.id_product} className="border-b">
                        <td className="px-4 py-2">
                          <img src={producto.imagen_rpos} alt={producto.name} className="w-15 h-10 object-cover rounded-md mx-auto" />
                        </td>
                        <td className="px-4 py-2 font-nunito text-lg truncate max-w-[150px]">{producto.name}</td>
                        <td className="px-4 py-2 font-nunito text-lg font-bold text-gray-500">
                          {stockDeAyer}
                        </td>

                        <td className="px-4 py-2">
                          <input type="number" value={nuevoStock[producto.id_product] || ""} onChange={(e) => handleStockChange(producto.id_product, e)} min="0" step="any" placeholder="" className="px-2 py-1 border border-gray-300 rounded-md w-20 text-center focus:ring-yellow-500 focus:border-yellow-500" />
                        </td>
                        <td className={`px-4 py-2 font-nunito text-lg font-extrabold ${!esGratis && displayStockHoy < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {esGratis ? "1.0" : displayStockHoy.toFixed(1)}
                        </td>
                        <td className={`px-4 py-2 font-nunito text-lg font-extrabold ${!esGratis && displayStockSemana < 0 ? 'text-red-700 bg-red-100 rounded' : 'text-[#f2ac02]'}`}>
                          {esGratis ? "1.0" : displayStockSemana.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center w-full fixed bottom-4 mx-4 rounded-md">
        <button onClick={handleActualizarStock} className="w-[33%] py-3 bg-yellow-500 text-white font-nunito rounded-md focus:ring-yellow-500 hover:bg-yellow-600 flex items-center justify-center gap-2">
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
            <g id="SVGRepo_iconCarrier"><path d="M4 18V6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path><path d="M20 12L20 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path><path d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z" stroke="#ffffff" strokeWidth="1.5"></path><path d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path><path d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18" stroke="#ffffff" strokeWidth="1.5"></path></g>
          </svg>
          <span className="font-nunito text-lg">Actualizar Stock</span>
        </button>
      </div>
    </div>
  );
};

export default Stock;