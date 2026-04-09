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
import { doc, onSnapshot, collection, query, updateDoc, where } from "firebase/firestore";
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
  const [errorCalendar, setErrorCalendar] = useState(null);
  const [totalPollosPedidosHoy, setTotalPollosPedidosHoy] = useState(0);
  const [calculatedSlotCounts, setCalculatedSlotCounts] = useState({});

  const updateCalendarTimeoutRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const today = new Date();

  // ==================================================================
  // ========= INICIO DE LA CORRECCIÓN APLICADA =======================
  // ==================================================================
  // Se modifica la generación de 'formattedDate' para que coincida con
  // el formato "DD-MM-YYYY" que existe en la base de datos.
  const dia = String(today.getDate()).padStart(2, '0');
  const mes = String(today.getMonth() + 1).padStart(2, '0'); // +1 porque los meses son 0-11
  const anio = today.getFullYear();
  const formattedDate = `${dia}-${mes}-${anio}`; // Produce "27-06-2025"
  // ==================================================================
  // ========= FIN DE LA CORRECCIÓN APLICADA ==========================
  // ==================================================================

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

  useEffect(() => {
    // La fecha del calendario se genera con formato YYYY-MM-DD
    const calendarDate = today.toISOString().split("T")[0];
    console.log(`Layout (Calendar): Configurando listener para chicken_calendar_daily/${calendarDate}`);
    setLoadingCalendar(true);
    setErrorCalendar(null);
    setCalendarData(null);

    const docRef = doc(db, "chicken_calendar_daily", calendarDate);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log(`Layout (Calendar): Datos de calendario recibidos/actualizados para ${calendarDate}.`);
        setCalendarData(docSnap.data());
      } else {
        console.warn(`Layout (Calendar): Documento de calendario para la fecha ${calendarDate} no existe.`);
        setCalendarData(null);
      }
      setLoadingCalendar(false);
    }, (error) => {
      console.error("Layout (Calendar): Error en el listener de calendario:", error);
      setErrorCalendar("Error cargando calendario.");
      setCalendarData(null);
      setLoadingCalendar(false);
    });

    return () => {
      console.log(`Layout (Calendar): Limpiando listener para chicken_calendar_daily/${calendarDate}.`);
      unsubscribe();
    };
  }, [refreshTrigger]); // `today` se quita como dependencia si no queremos que cambie al pasar de medianoche



  useEffect(() => {
    if (calendarData && calendarData.intervals && Array.isArray(calendarData.intervals) && calendarData.intervals.length > 0) {
      const totalOrderedInCalendar = calendarData.intervals.reduce((sum, interval) => {
        return sum + (Number(interval.orderedCount) || 0);
      }, 0);
      console.log(`Layout (Calendar Aggregation): Conteo total en calendario: ${totalOrderedInCalendar}.`);
    }
  }, [calendarData]);

  // --- Efecto para contar pollos del día actual desde la colección 'pedidos' ---
  useEffect(() => {
    console.log(`Layout (Pedidos Pollos): Configurando listener para contar pollos en pedidos del día ${formattedDate}.`);
    setTotalPollosPedidosHoy(0);
    setCalculatedSlotCounts({});

    const pedidosRef = collection(db, "pedidos");
    const qPedidos = query(pedidosRef, where("fecha_filtro", "==", formattedDate));

    const unsubscribePedidos = onSnapshot(qPedidos, (querySnapshot) => {
      console.log(`Layout (Pedidos Pollos): Snapshot recibido, la consulta encontró ${querySnapshot.size} pedidos para la fecha ${formattedDate}.`);

      let pollosHoy = 0;
      const pollosPorFranjaEspecifica = {
        "11:00": 0, "11:15": 0, "11:30": 0, "11:45": 0,
        "12:00": 0, "12:15": 0, "12:30": 0, "12:45": 0,
        "13:00": 0, "13:15": 0, "13:30": 0, "13:45": 0,
        "14:00": 0, "14:15": 0, "14:30": 0, "14:45": 0,
        "15:00": 0, "15:15": 0, "15:30": 0, "15:45": 0,
        "19:00": 0, "19:15": 0, "19:30": 0, "19:45": 0,
        "20:00": 0, "20:15": 0, "20:30": 0, "20:45": 0,
        "21:00": 0, "21:30": 0, "21:45": 0, "22:00": 0,
      };

      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        const horaPedido = orderData.fechahora ? orderData.fechahora.split(' ')[1] : null;
        if (Array.isArray(orderData.productos)) {
          orderData.productos.forEach(producto => {
            const productId = Number(producto.id);
            const cantidadPedido = Number(producto.cantidad) || 0;
            let cantidadAfectada = 0;

            if (productId === 1) { // Pollo Entero
              cantidadAfectada = 1 * cantidadPedido;
            } else if (productId === 2 || productId === 39 || productId === 40) { // Medio Pollo o promociones
              cantidadAfectada = 0.5 * cantidadPedido;
            }

            if (cantidadAfectada > 0) {
              pollosHoy += cantidadAfectada;
              if (horaPedido && pollosPorFranjaEspecifica.hasOwnProperty(horaPedido)) {
                pollosPorFranjaEspecifica[horaPedido] += cantidadAfectada;
              }
            }
          });
        }
      });

      setTotalPollosPedidosHoy(pollosHoy);
      setCalculatedSlotCounts(pollosPorFranjaEspecifica);

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

    // La fecha del calendario se genera con formato YYYY-MM-DD
    const calendarDate = today.toISOString().split("T")[0];

    if (
      calendarData &&
      calendarData.intervals &&
      Array.isArray(calendarData.intervals) &&
      Object.keys(calculatedSlotCounts).length > 0
    ) {
      const calendarDocRef = doc(db, "chicken_calendar_daily", calendarDate);
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
            intervalInCalendar.orderedCount = conteoPedidosNumerico;
            intervalsWereUpdated = true;
          }
        }
      });

      if (intervalsWereUpdated) {
        console.log(`Layout (Corrección Calendario): Discrepancia(s) detectada(s). Programando actualización para chicken_calendar_daily/${calendarDate} en 3 segundos.`);
        updateCalendarTimeoutRef.current = setTimeout(() => {
          updateDoc(calendarDocRef, { intervals: newIntervalsArray })
            .then(() => {
              console.log(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Documento chicken_calendar_daily/${calendarDate} actualizado con éxito.`);
            })
            .catch(error => console.error(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Error al actualizar chicken_calendar_daily/${calendarDate}:`, error));
        }, 3000);
      }
    }

    return () => {
      if (updateCalendarTimeoutRef.current) {
        clearTimeout(updateCalendarTimeoutRef.current);
      }
    };
  }, [calendarData, calculatedSlotCounts]);


  const morningIntervals =
    calendarData?.intervals?.filter((interval) => interval.start < "18:00") || [];
  const afternoonIntervals =
    calendarData?.intervals?.filter((interval) => interval.start >= "18:00") || [];

  const currentHour = today.getHours();
  const isMorning = currentHour < 18;

  useEffect(() => {
    if (!loadingCalendar && calendarData) {
      console.log(`Layout (Swiper Intervals Log): Intervalos de MAÑANA para HOY:`, morningIntervals.map(i => i.start));
      console.log(`Layout (Swiper Intervals Log): Intervalos de TARDE para HOY:`, afternoonIntervals.map(i => i.start));
    }
  }, [morningIntervals, afternoonIntervals, loadingCalendar, calendarData]);

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
                      // Se prioriza el conteo calculado en tiempo real si existe
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