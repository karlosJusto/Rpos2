import { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Tabs from "./Tabs";
import Card from "./Card";
import Ticket from "./Ticket";
import fondo from "../../assets/fondo.jpg";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/scrollbar";
import "swiper/css/mousewheel";
import { doc, onSnapshot, collection, query, updateDoc } from "firebase/firestore"; // Añadir updateDoc
import { db } from "../firebase/firebase";
import { dataContext } from '../Context/DataContext';

const Layout = () => {
  const {
    setCart,
    orderBeingEdited,
    isEditingOrder,
    setOrderBeingEdited,
    data, // Lista base de todos los productos disponibles
    selectedSlotTime,
    setSelectedSlotTime
  } = useContext(dataContext);

  const location = useLocation();
  const navigate = useNavigate();

  const [isOrderLoadedInCart, setIsOrderLoadedInCart] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [errorCalendar, setErrorCalendar] = useState(null); // Para manejar errores del listener
  const [totalPollosPedidosHoy, setTotalPollosPedidosHoy] = useState(0); // Estado para el conteo de pollos de pedidos
  // Estado para almacenar los conteos calculados directamente desde la colección 'pedidos'
  // para las franjas horarias específicas que se corrigen.
  // Formato: { "HH:MM": count, ... }
  const [calculatedSlotCounts, setCalculatedSlotCounts] = useState({});

  // Ref para el timeout de la actualización del calendario
  const updateCalendarTimeoutRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Para forzar actualización manual

  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  useEffect(() => {
    if (isEditingOrder && orderBeingEdited && !isOrderLoadedInCart && data && data.length > 0) {
      if (orderBeingEdited.productos && Array.isArray(orderBeingEdited.productos)) {
        console.log("Layout (Context): Detectado orderBeingEdited CON productos. Procesando para carrito:", orderBeingEdited.productos);
        const unifiedProducts = orderBeingEdited.productos.map((orderProduct, index) => {
          const fullProductData = data.find(p =>
              p.id_product === orderProduct.id || p.id === orderProduct.id
          );
          if (!fullProductData) {
            console.warn(`Layout (Context): No se encontraron datos completos para el producto ID ${orderProduct.id} del pedido ${orderBeingEdited.NumeroPedido || 'nuevo'}. Usando datos del pedido.`);
            return {
              ...orderProduct,
              id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${orderProduct.id}-${index}-${Date.now()}`,
              name: orderProduct.nombre || orderProduct.alias || 'Producto Desconocido',
              imagen: orderProduct.imagen || 'URL_IMAGEN_POR_DEFECTO.png',
              price: parseFloat(orderProduct.precio || 0),
              cantidad: parseInt(orderProduct.cantidad || 1, 10),
            };
          }
          return {
            ...fullProductData,
            ...orderProduct,
            id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${fullProductData.id_product || fullProductData.id}-${index}-${Date.now()}`,
            name: fullProductData.name || orderProduct.nombre || orderProduct.alias,
            price: orderProduct.precio !== undefined ? parseFloat(orderProduct.precio) : parseFloat(fullProductData.price || 0),
            imagen: fullProductData.imagen || orderProduct.imagen,
            cantidad: parseInt(orderProduct.cantidad || 1, 10),
          };
        });
        console.log("Layout (Context): Productos unificados para el carrito:", unifiedProducts);
        setCart(unifiedProducts);
        setIsOrderLoadedInCart(true);
      } else {
        console.log("Layout (Context): orderBeingEdited (en modo edición) no tiene 'productos' o no es un array. No se carga el carrito desde aquí.", orderBeingEdited);
      }
    } else if (!isEditingOrder && isOrderLoadedInCart) {
      console.log("Layout (Context): Saliendo del modo edición o iniciando nuevo pedido. Reseteando bandera isOrderLoadedInCart.");
      setIsOrderLoadedInCart(false);
    }
  }, [isEditingOrder, orderBeingEdited, isOrderLoadedInCart, setCart, data, setIsOrderLoadedInCart]);

  useEffect(() => {
    if (!location.pathname.startsWith('/layout') && isEditingOrder) {
      console.log("Layout (Context): Navegación fuera de /layout detectada mientras se editaba. Limpiando estado de edición y carrito.");
      setOrderBeingEdited(null);
      setCart([]);
    }
  }, [location.pathname, isEditingOrder, setOrderBeingEdited, setCart]);

  // --- Efecto para cargar los datos del calendario desde Firestore con onSnapshot ---
  useEffect(() => {
    console.log(`Layout (Calendar): Configurando listener para chicken_calendar_daily/${formattedDate}`);
    setLoadingCalendar(true);
    setErrorCalendar(null); // Limpiar errores previos
    setCalendarData(null); // Limpiar datos viejos al cambiar de fecha o iniciar

    const docRef = doc(db, "chicken_calendar_daily", formattedDate);

    // Usar onSnapshot para escuchar cambios en tiempo real
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log(`Layout (Calendar): Datos de calendario recibidos/actualizados para ${formattedDate}.`);
        setCalendarData(docSnap.data());
      } else {
        console.warn(`Layout (Calendar): Documento de calendario para la fecha ${formattedDate} no existe.`);
        setCalendarData(null); // Asegurar que no haya datos viejos si el documento no existe o es borrado.
      }
      setLoadingCalendar(false); // Finalizar carga una vez que se recibe el primer snapshot o se confirma que no existe.
    }, (error) => {
      console.error("Layout (Calendar): Error en el listener de calendario:", error);
      setErrorCalendar("Error cargando calendario."); // Establecer mensaje de error
      setCalendarData(null);
      setLoadingCalendar(false); // Aunque haya error, marcamos como no cargando.
    });

    // Limpiar el listener cuando el componente se desmonte o cuando formattedDate cambie
    return () => {
      console.log(`Layout (Calendar): Limpiando listener para chicken_calendar_daily/${formattedDate}.`);
      unsubscribe(); // Retorna la función de desuscripción
    };
  }, [formattedDate, refreshTrigger]); // Añadir refreshTrigger para actualización manual

  const handleManualRefresh = () => {
    console.log("Layout: Disparando actualización manual de datos.");
    setRefreshTrigger(prev => prev + 1);
  };

  // --- Efecto para validar/corroborar los datos del calendario cuando se actualizan ---
  useEffect(() => {
    if (calendarData && calendarData.intervals && Array.isArray(calendarData.intervals) && calendarData.intervals.length > 0) {
      console.log("Layout (Calendar Aggregation): Datos de calendario recibidos/actualizados. Calculando conteo total para corroboración.");

      const totalOrderedInCalendar = calendarData.intervals.reduce((sum, interval) => {
        return sum + (Number(interval.orderedCount) || 0);
      }, 0);

      console.log(`Layout (Calendar Aggregation): Conteo total de items programados en todas las franjas horarias del día actual (relevante para productos como IDs 1, 2, 39, 40): ${totalOrderedInCalendar}.`);
      console.log("Layout (Calendar Aggregation): Este valor puede ser usado para corroborar si los datos recibidos del calendario son correctos según las expectativas.");

    } else if (calendarData && (!calendarData.intervals || calendarData.intervals.length === 0)) {
      console.log("Layout (Calendar Aggregation): Datos de calendario recibidos, pero no hay intervalos para procesar o los intervalos están vacíos.");
    }
  }, [calendarData]);

  // --- Efecto para contar pollos del día actual desde la colección 'pedidos' ---
  useEffect(() => {
    console.log(`Layout (Pedidos Pollos): Configurando listener para contar pollos en pedidos del día ${formattedDate}.`);
    setTotalPollosPedidosHoy(0);
    setCalculatedSlotCounts({});
    
    const convertirFechaPedidoAYYYYMMDD = (fechaDDMMYYYYConHora) => {
      if (!fechaDDMMYYYYConHora || typeof fechaDDMMYYYYConHora !== 'string' || !fechaDDMMYYYYConHora.includes(' ')) return null;
      const [datePart] = fechaDDMMYYYYConHora.split(' ');
      const partes = datePart.split('/');
      if (partes.length !== 3) return null;
      const [dia, mes, ano] = partes;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    };

    const pedidosRef = collection(db, "pedidos");
    const qPedidos = query(pedidosRef);

    const unsubscribePedidos = onSnapshot(qPedidos, (querySnapshot) => {
      console.log(`Layout (Pedidos Pollos - DEBUG): INICIO onSnapshot de 'pedidos'. Procesando ${querySnapshot.size} documentos.`);
      let pollosHoy = 0;
      
      // Objeto para almacenar conteos por franjas específicas
      // AÑADIDAS LAS FRANJAS 20:30, 20:45, 21:00 SOLICITADAS.
      const pollosPorFranjaEspecifica = {
        
        
        "11:00": 0, "11:15": 0, "11:30": 0, "11:45": 0,
        "12:00": 0, "12:15": 0, "12:30": 0, "12:45": 0,
        "13:00": 0, "13:15": 0, "13:30": 0, "13:45": 0,
        "14:00": 0, "14:15": 0, "14:30": 0, "14:45": 0,
        "15:00": 0, "15:15": 0, "15:30": 0, 
        "20:30": 0, 
        "20:15": 0, 
        "20:00": 0, 
        "19:45": 0, 
        "19:30": 0, 
        "19:15": 0, 
        "19:00": 0, 
        "20:45": 0, 
        "21:00": 0, 
        "21:30": 0,
        "21:45": 0,
        "22:00": 0,
      };

      const franjasDeInteres = ["20:30", "20:45", "21:00"];

      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        const fechaPedidoFormatoComparar = convertirFechaPedidoAYYYYMMDD(orderData.fechahora);

        if (fechaPedidoFormatoComparar === formattedDate) {
          const horaPedido = orderData.fechahora ? orderData.fechahora.split(' ')[1] : null;
          if (Array.isArray(orderData.productos)) {
            orderData.productos.forEach(producto => {
              const productId = Number(producto.id);
              const cantidadPedido = Number(producto.cantidad) || 0;
              let cantidadAfectada = 0;

              if (productId === 1) {
                cantidadAfectada = 1 * cantidadPedido;
              } else if (productId === 2 || productId === 39 || productId === 40) {
                cantidadAfectada = 0.5 * cantidadPedido;
              }

              if (cantidadAfectada > 0) {
                 pollosHoy += cantidadAfectada;
                 if (horaPedido && pollosPorFranjaEspecifica.hasOwnProperty(horaPedido)) {
                    pollosPorFranjaEspecifica[horaPedido] += cantidadAfectada;

                    // CONSOLE LOG AÑADIDO: Notifica si un pedido afecta a las franjas de interés.
                    if (franjasDeInteres.includes(horaPedido)) {
                        console.log(`DEBUG_FRANJAS: Pedido #${doc.id} (${orderData.observaciones}) afecta a la franja ${horaPedido}. Sumando ${cantidadAfectada}. Nuevo total para la franja: ${pollosPorFranjaEspecifica[horaPedido]}`);
                    }
                 }
              }
            });
          }
        }
      });
      
      setTotalPollosPedidosHoy(pollosHoy);
      setCalculatedSlotCounts(pollosPorFranjaEspecifica);

      // CONSOLE LOGS AÑADIDOS: Muestra el resultado final del cálculo para las franjas de interés.
      console.log("---------- DEBUG CÁLCULO FRANJAS NOCTURNAS ----------");
      console.log(`DEBUG_FRANJAS: Conteo final desde 'pedidos' para 20:30 -> ${pollosPorFranjaEspecifica["20:30"]}`);
      console.log(`DEBUG_FRANJAS: Conteo final desde 'pedidos' para 20:45 -> ${pollosPorFranjaEspecifica["20:45"]}`);
      console.log(`DEBUG_FRANJAS: Conteo final desde 'pedidos' para 21:00 -> ${pollosPorFranjaEspecifica["21:00"]}`);
      console.log("----------------------------------------------------");

    }, (error) => {
      console.error("Layout (Pedidos Pollos): Error en el listener de la colección 'pedidos':", error);
    });

    return () => {
      console.log(`Layout (Pedidos Pollos): Limpiando listener de 'pedidos' para ${formattedDate}.`);
      unsubscribePedidos();
    };
  }, [formattedDate, refreshTrigger]);

  // --- Effect for correcting calendar data based on calculatedSlotCounts ---
  useEffect(() => {
    if (updateCalendarTimeoutRef.current) {
        clearTimeout(updateCalendarTimeoutRef.current);
    }

    if (
        calendarData &&
        calendarData.intervals &&
        Array.isArray(calendarData.intervals) &&
        Object.keys(calculatedSlotCounts).length > 0
    ) {
        const calendarDocRef = doc(db, "chicken_calendar_daily", formattedDate);
        let intervalsWereUpdated = false;
        const newIntervalsArray = JSON.parse(JSON.stringify(calendarData.intervals));

        newIntervalsArray.forEach(intervalInCalendar => {
            const horaFranja = intervalInCalendar.start;
            const conteoCalculadoDesdePedidos = calculatedSlotCounts[horaFranja];

            if (conteoCalculadoDesdePedidos !== undefined) {
                const currentOrderedCountInCalendar = Number(intervalInCalendar.orderedCount) || 0;
                const conteoPedidosNumerico = Number(conteoCalculadoDesdePedidos);

                if (currentOrderedCountInCalendar !== conteoPedidosNumerico) {
                    console.warn(`Layout (Corrección Calendario): Discrepancia para ${horaFranja}. Calendario: ${currentOrderedCountInCalendar}, Pedidos (Calculado): ${conteoPedidosNumerico}. SOBREESCRIBIENDO CALENDARIO.`);
                    
                    // CONSOLE LOG AÑADIDO: Notifica específicamente sobre la corrección en franjas de interés.


                    intervalInCalendar.orderedCount = conteoPedidosNumerico;
                    intervalsWereUpdated = true;
                }
            }
        });

        if (intervalsWereUpdated) {
            console.log(`Layout (Corrección Calendario): Discrepancia(s) detectada(s). Programando actualización para chicken_calendar_daily/${formattedDate} en 3 segundos.`);
            updateCalendarTimeoutRef.current = setTimeout(() => {
                updateDoc(calendarDocRef, { intervals: newIntervalsArray })
                    .then(() => {
                        console.log(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Documento chicken_calendar_daily/${formattedDate} actualizado con éxito.`);
                    })
                    .catch(error => console.error(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Error al actualizar chicken_calendar_daily/${formattedDate}:`, error));
            }, 3000);
        }
    }

    return () => {
        if (updateCalendarTimeoutRef.current) {
            clearTimeout(updateCalendarTimeoutRef.current);
        }
    };
  }, [calendarData, calculatedSlotCounts, formattedDate]);


  const morningIntervals =
    calendarData?.intervals?.filter((interval) => interval.start < "18:00") || [];
  const afternoonIntervals =
    calendarData?.intervals?.filter((interval) => interval.start >= "18:00") || [];
  
  const currentHour = today.getHours();
  const isMorning = currentHour < 18;

  useEffect(() => {
    if (!loadingCalendar && calendarData) {
      console.log(`Layout (Swiper Intervals Log): Intervalos de MAÑANA contemplados para HOY (${formattedDate}):`, morningIntervals.map(i => i.start));
      console.log(`Layout (Swiper Intervals Log): Intervalos de TARDE contemplados para HOY (${formattedDate}):`, afternoonIntervals.map(i => i.start));
    } else if (loadingCalendar) {
      console.log("Layout (Swiper Intervals Log): Esperando carga del calendario para loggear intervalos del Swiper.");
    }
  }, [morningIntervals, afternoonIntervals, formattedDate, loadingCalendar, calendarData]);

  return (
    <>
      <div
        className="flex max-w-[2500px] mx-auto h-screen bg-no-repeat bg-cover"
        style={{ backgroundImage: `url(${fondo})` }}
      >
        <div className="w-[7%] flex-shrink-0">
          <Sidebar />
        </div>

        <div className="w-[70%] flex flex-col">
              <div className="h-[9%] flex-shrink-0">
                <Navbar />
              </div>
              <div className="h-[9%] flex-shrink-0">
                <Tabs />
              </div>
              <div className="p-[1.5vw] pl-[3vw] h-[58%] max-h-[75%] grid grid-cols-5 overflow-y-auto gap-4">
                <Card />
              </div>
               <div className="w-[90%] pt-[1vh] ms-[3.8vw] border-white rounded p-4 bg-white ">
                <div className="flex justify-end items-center mb-2">
                  <button
                    onClick={handleManualRefresh}
                    className="p-2 hover:bg-gray-200 rounded-full text-xl"
                    title="Actualizar horarios manualmente"
                  >
                    🔄
                  </button>
                </div>
                {loadingCalendar ? (
                  <p>Cargando horarios...</p>
                ) : errorCalendar ? (
                  <p className="text-red-500">{errorCalendar}</p>
                ) : calendarData && (morningIntervals.length > 0 || afternoonIntervals.length > 0) ? (
                  <Swiper
                    slidesPerView={1}
                    spaceBetween={20}
                    mousewheel={true}
                    className="w-full"
                  >
                    <SwiperSlide>
                      <div className="flex flex-wrap gap-2">
                        {(isMorning ? morningIntervals : afternoonIntervals).map((interval, index) => {
                            let displayCount = Number(interval.orderedCount) || 0;
                            if (
                              calculatedSlotCounts.hasOwnProperty(interval.start)
                            ) {
                              displayCount = calculatedSlotCounts[interval.start];
                            }

                            return (
                              <button
                                key={`${interval.start}-${index}-${displayCount}`}
                                className={`px-2 py-1 ms-4 border rounded whitespace-nowrap font-nunito transition-colors duration-150
                                  ${selectedSlotTime === interval.start ? 'bg-yellow-400 border-yellow-600 ring-2 ring-yellow-300' : 'hover:bg-gray-200'}`}
                                onClick={() => setSelectedSlotTime(interval.start)}
                              >
                                {interval.start} [
                                <span
                                  className={
                                    displayCount >= interval.maxAllowed
                                      ? "text-red-500 font-extrabold"
                                      : "text-green-700 font-extrabold"
                                  }
                                >
                                  {displayCount}
                                </span>
                                ]
                              </button>
                            );
                          })}
                      </div>
                    </SwiperSlide>
                  </Swiper>
                ) : (
                  <p>No hay horarios disponibles para mostrar.</p>
                )}
              </div>
        </div>

        <div className={`${isEditingOrder ? 'bg-[#b2b9ab]' : 'bg-[#F3F3F3]'} w-[23%] flex-shrink-0 shadow-lg`}>
          <Ticket />
        </div>
      </div>
    </>
  );
};

export default Layout;