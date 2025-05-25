import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from "../../firebase/firebase"; // Asegúrate que la ruta sea correcta
import NavbarResultados from './NavbarResultados'; // Ajusta la ruta
import CardsResultados from './CardsResultados';   // Ajusta la ruta
import ContadorPedidos from './ContadorPedidos';
import ContadorClientes from './ContadorClientes';
import ContadorStock from './ContadorStock';
import ContadorPedidosMedios from './ContadorPedidosMedios';
import ContadorPollos from './ContadorPollos';

const VistaDeResultados = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs()); // Fecha inicial es hoy
  const [categoryTotals, setCategoryTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [orderCounts, setOrderCounts] = useState({ total: 0, web: 0, tienda: 0 });
  const [previousDayOrderCounts, setPreviousDayOrderCounts] = useState({ total: 0, web: 0, tienda: 0, hasData: false });
  const [clientCounts, setClientCounts] = useState({ total: 0, web: 0, tienda: 0 });
  const [averageOrderValues, setAverageOrderValues] = useState({ web: 0, tienda: 0 });
  const [pollosSalesLast7Days, setPollosSalesLast7Days] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      // Resetear estados antes de cada nueva carga
      setCategoryTotals({});
      setGrandTotal(0);
      setOrderCounts({ total: 0, web: 0, tienda: 0 });
      setPreviousDayOrderCounts({ total: 0, web: 0, tienda: 0, hasData: false });
      setClientCounts({ total: 0, web: 0, tienda: 0 });
      setAverageOrderValues({ web: 0, tienda: 0 });
      setPollosSalesLast7Days([]);


      try {
        const dateToProcess = selectedDate && dayjs(selectedDate).isValid() ? dayjs(selectedDate) : dayjs();
        
        // --- Función para procesar pedidos de un día específico ---
        const processOrdersForDay = async (date, isCurrentSelectedDay) => {
          const fechaInicioPedidos = date.startOf('day').format('DD/MM/YYYY HH:mm');
          const fechaFinPedidos = date.endOf('day').format('DD/MM/YYYY HH:mm');
          
          console.log(`VistaDeResultados: Consultando pedidos para ${date.format('DD/MM/YYYY')} entre: ${fechaInicioPedidos} y ${fechaFinPedidos}`);

          const pedidosRef = collection(db, 'pedidos');
          const pedidosQuery = query(pedidosRef,
                          where('fechahora', '>=', fechaInicioPedidos),
                          where('fechahora', '<=', fechaFinPedidos));
          const pedidosSnapshot = await getDocs(pedidosQuery);
          console.log(`VistaDeResultados: Pedidos encontrados para ${date.format('DD/MM/YYYY')}: ${pedidosSnapshot.docs.length}`);

          let dayCategoryTotals = {};
          if (isCurrentSelectedDay) {
            ["comida", "complementos", "bebidas", "postres", "extras"].forEach(key => {
              dayCategoryTotals[key] = 0;
            });
          }
          let dayGrandTotal = 0;
          let dayTotalOrders = 0;
          let dayWebOrders = 0;
          let dayTiendaOrders = 0;
          let totalValueWebOrders = 0;
          let totalValueTiendaOrders = 0;
          

          pedidosSnapshot.forEach((doc) => {
            const pedido = doc.data();
            dayTotalOrders++;
            if (pedido.origen === 1) { // Asumiendo que 1 significa 'web'
              dayWebOrders++;
            } else {
              dayTiendaOrders++;
            }

            if (isCurrentSelectedDay && pedido.productos && Array.isArray(pedido.productos)) {
              pedido.productos.forEach((producto) => { // 'producto' aquí es un item dentro del array pedido.productos
                const categoriaProcesada = producto.categoria ? producto.categoria.toLowerCase() : 'otros';
                const cleanedPriceString = String(producto.precio).replace(',', '.').replace(/[^\d.]/g, '');
                const priceProcesado = parseFloat(cleanedPriceString) || 0;

                if (priceProcesado > 0) {
                  dayCategoryTotals[categoriaProcesada] = (dayCategoryTotals[categoriaProcesada] || 0) + priceProcesado;
                  dayGrandTotal += priceProcesado;

                  // Sumar al total por origen para el cálculo del pedido medio
                  if (pedido.origen === 1) {
                    totalValueWebOrders += priceProcesado;
                  } else {
                    totalValueTiendaOrders += priceProcesado;
                  }
                }
              });
            }
          });
          return { 
            dayCategoryTotals, 
            dayGrandTotal, 
            dayTotalOrders, 
            dayWebOrders, 
            dayTiendaOrders, 
            orderHasData: pedidosSnapshot.docs.length > 0,
            totalValueWebOrders, // Devolver los valores totales por origen
            totalValueTiendaOrders 
          };
        };

        // --- Función para procesar todos los clientes ---
        const processAllClients = async () => {
          console.log(`VistaDeResultados: Consultando TODOS los clientes.`);
          const clientesRef = collection(db, 'clientes');
          const clientesSnapshot = await getDocs(clientesRef); // Sin filtro de fecha
          console.log(`VistaDeResultados: Clientes totales encontrados: ${clientesSnapshot.docs.length}`);
          
          let totalClients = 0;
          let webClients = 0;
          let tiendaClients = 0;

          clientesSnapshot.forEach((doc) => {
            const cliente = doc.data();
            totalClients++;
            if (cliente.email && String(cliente.email).trim() !== '') {
              webClients++;
            }
          });
          tiendaClients = totalClients - webClients;
          return { totalClients, webClients, tiendaClients };
        };

        // --- Función para obtener ventas de pollos (id_producto === 1) de los últimos 7 días ---
        const fetchPollosSalesLast7Days = async () => {
          const today = dayjs(); // Usar la fecha actual para el rango de 7 días
          const salesData = [];
          const datesToQuery = [];

          for (let i = 14; i >= 0; i--) { // Últimos 14 días, incluyendo hoy
            const dateObj = today.subtract(i, 'day');
            datesToQuery.push({
              dateString: dateObj.format('DD/MM/YYYY'), // Para la consulta
              formattedName: dateObj.format('DD/MM')    // Para la etiqueta de la gráfica
            });
          }

          for (const dateInfo of datesToQuery) {
            const fechaInicio = dayjs(dateInfo.dateString, 'DD/MM/YYYY').startOf('day').format('DD/MM/YYYY HH:mm');
            const fechaFin = dayjs(dateInfo.dateString, 'DD/MM/YYYY').endOf('day').format('DD/MM/YYYY HH:mm');
            
            const pedidosRef = collection(db, 'pedidos');
            const q = query(pedidosRef, where('fechahora', '>=', fechaInicio), where('fechahora', '<=', fechaFin));
            const querySnapshot = await getDocs(q);
            
            let pollosVendidosHoy = 0;
            querySnapshot.forEach(doc => {
              const pedido = doc.data();
              if (pedido.productos && Array.isArray(pedido.productos)) {
                pedido.productos.forEach(item => {
                  // Asegúrate que 'item.id' es el campo correcto para id_producto y que 1 es el ID del pollo
                  if (item.id === 1 || String(item.id) === "1") { 
                    pollosVendidosHoy += Number(item.cantidad) || 0;
                  }
                });
              }
            });
            salesData.push({ name: dateInfo.formattedName, Ventas: pollosVendidosHoy });
          }
          console.log("VistaDeResultados: Datos de ventas de pollos (últimos 7 días):", salesData);
          return salesData;
        };

        // Ejecutar procesamiento de pedidos para el día actual y anterior
        const currentDayOrderData = await processOrdersForDay(dateToProcess, true);
        setCategoryTotals(currentDayOrderData.dayCategoryTotals);
        setGrandTotal(currentDayOrderData.dayGrandTotal);
        setOrderCounts({ total: currentDayOrderData.dayTotalOrders, web: currentDayOrderData.dayWebOrders, tienda: currentDayOrderData.dayTiendaOrders });

        const previousDate = dateToProcess.subtract(1, 'day');
        const previousDayOrderData = await processOrdersForDay(previousDate, false);
        setPreviousDayOrderCounts({ 
          total: previousDayOrderData.dayTotalOrders, 
          web: previousDayOrderData.dayWebOrders, 
          tienda: previousDayOrderData.dayTiendaOrders, 
          hasData: previousDayOrderData.orderHasData 
        });

        // Ejecutar procesamiento de todos los clientes
        const clientData = await processAllClients();
        setClientCounts({ total: clientData.totalClients, web: clientData.webClients, tienda: clientData.tiendaClients });

        // Calcular y establecer los valores medios de los pedidos para el día actual
        const avgWeb = currentDayOrderData.dayWebOrders > 0 ? currentDayOrderData.totalValueWebOrders / currentDayOrderData.dayWebOrders : 0;
        const avgTienda = currentDayOrderData.dayTiendaOrders > 0 ? currentDayOrderData.totalValueTiendaOrders / currentDayOrderData.dayTiendaOrders : 0;
        setAverageOrderValues({ web: avgWeb, tienda: avgTienda });

        // Obtener y establecer datos de ventas de pollos
        const pollosData = await fetchPollosSalesLast7Days();
        setPollosSalesLast7Days(pollosData);

      } catch (err) {
        console.error("VistaDeResultados: Error al obtener o procesar los datos:", err);
        setError("Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedDate]);

  return (
    <div className='bg-white h-16 rounded-xl -mt-2'>
      <NavbarResultados 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
      />

      <div className='mt-3'>
        <CardsResultados 
          categoryTotals={categoryTotals}
          grandTotal={grandTotal}
          loading={loading}
          error={error}
        />
      </div>

       {/* Bloque pollo */}
       <div className="bg-gray-200 h-64 rounded-xl mt-3 p-3">
         <ContadorPollos 
            chartData={pollosSalesLast7Days}
            loading={loading} 
            error={error}     
         />
        </div>

        {/* Bloques otros productos */}
        <div className="flex mt-3 p-2 gap-3 h-64 overflow-auto">
          <div className="flex-[1.35] rounded-xl bg-slate-600 px-1 ">
            <ContadorPedidosMedios
                averageWebOrder={averageOrderValues.web}
                averageTiendaOrder={averageOrderValues.tienda}
                loading={loading}
            />
          </div>

          <div className="flex-[1.40] rounded-xl bg-slate-500 px-1 h-60 overflow-y-auto">
            <ContadorStock />
          </div>

          <div className="flex-[1.75] rounded-xl bg-slate-400 px-2">
            <ContadorClientes
              totalClients={clientCounts.total}
              webClients={clientCounts.web}
              tiendaClients={clientCounts.tienda}
              loading={loading}
            />
          </div>

          <div className="flex-[1.75] rounded-xl bg-slate-300 px-2">
            <ContadorPedidos
              totalOrders={orderCounts.total}
              webOrders={orderCounts.web}
              tiendaOrders={orderCounts.tienda}
              previousDayTotalOrders={previousDayOrderCounts.hasData ? previousDayOrderCounts.total : null}
              previousDayWebOrders={previousDayOrderCounts.hasData ? previousDayOrderCounts.web : null}
              previousDayTiendaOrders={previousDayOrderCounts.hasData ? previousDayOrderCounts.tienda : null}
              loading={loading}
            />
          </div>
        </div>
      
    </div>
  );
}

export default VistaDeResultados;
