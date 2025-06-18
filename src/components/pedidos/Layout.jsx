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
  }, [formattedDate]); // Dependencia: formattedDate. Si cambia el día, se vuelve a ejecutar y limpia el listener anterior.

  // --- Efecto para validar/corroborar los datos del calendario cuando se actualizan ---
  useEffect(() => {
    if (calendarData && calendarData.intervals && Array.isArray(calendarData.intervals) && calendarData.intervals.length > 0) {
      console.log("Layout (Calendar Aggregation): Datos de calendario recibidos/actualizados. Calculando conteo total para corroboración.");

      // Sumar todos los 'orderedCount' de todos los intervalos.
      // Se asume que 'orderedCount' en cada intervalo ya representa las cantidades
      // para los productos relevantes que este calendario gestiona (ej. pollos, IDs 1, 2, 39, 40).
      const totalOrderedInCalendar = calendarData.intervals.reduce((sum, interval) => {
        return sum + (Number(interval.orderedCount) || 0); // Asegura que se sume un número
      }, 0);

      console.log(`Layout (Calendar Aggregation): Conteo total de items programados en todas las franjas horarias del día actual (relevante para productos como IDs 1, 2, 39, 40): ${totalOrderedInCalendar}.`);
      console.log("Layout (Calendar Aggregation): Este valor puede ser usado para corroborar si los datos recibidos del calendario son correctos según las expectativas.");

      // Aquí podrías añadir lógica de comparación más avanzada si tuvieras:
      // 1. Una fuente externa para el total esperado de estos productos.
      // 2. Umbrales definidos para 'totalOrderedInCalendar'.
      // Ejemplo:
      // const expectedTotalForCriticalProducts = obtenerTotalEsperadoDeOtraFuente();
      // if (totalOrderedInCalendar !== expectedTotalForCriticalProducts) {
      //   console.warn(`Layout (Calendar Aggregation): Discrepancia detectada. Total del calendario: ${totalOrderedInCalendar}, Esperado: ${expectedTotalForCriticalProducts}`);
      // }
    } else if (calendarData && (!calendarData.intervals || calendarData.intervals.length === 0)) {
      console.log("Layout (Calendar Aggregation): Datos de calendario recibidos, pero no hay intervalos para procesar o los intervalos están vacíos.");
    }
  }, [calendarData]); // Dependencia: calendarData. Se ejecuta cada vez que calendarData cambia.

  // --- Efecto para contar pollos del día actual desde la colección 'pedidos' ---
  useEffect(() => {
    console.log(`Layout (Pedidos Pollos): Configurando listener para contar pollos en pedidos del día ${formattedDate}.`);
    setTotalPollosPedidosHoy(0); // Resetear al cambiar de día o al montar
    setCalculatedSlotCounts({}); // Resetear conteos calculados al cambiar de día

    // Limpiar cualquier timeout pendiente si el efecto se re-ejecuta (ej. cambio de fecha)
    // Esto también se hace en la función de limpieza del return, pero es bueno tenerlo aquí
    // por si acaso, aunque la lógica principal de limpieza está en el return.
    if (updateCalendarTimeoutRef.current) {
      clearTimeout(updateCalendarTimeoutRef.current);
    }
    // Helper para convertir "DD/MM/YYYY HH:MM" a "YYYY-MM-DD"
    const convertirFechaPedidoAYYYYMMDD = (fechaDDMMYYYYConHora) => {
      if (!fechaDDMMYYYYConHora || typeof fechaDDMMYYYYConHora !== 'string' || !fechaDDMMYYYYConHora.includes(' ')) return null;
      const [datePart] = fechaDDMMYYYYConHora.split(' ');
      const partes = datePart.split('/');
      if (partes.length !== 3) return null;
      const [dia, mes, ano] = partes;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    };

    const pedidosRef = collection(db, "pedidos");
    // NOTA: Escuchar toda la colección y filtrar en cliente puede ser ineficiente para colecciones grandes.
    // Lo ideal sería tener un campo de fecha normalizado (ej. YYYY-MM-DD) en los documentos 'pedidos'
    // para filtrar directamente en la query de Firestore.
    const qPedidos = query(pedidosRef); // Por ahora, obtenemos todos los pedidos.

    const unsubscribePedidos = onSnapshot(qPedidos, (querySnapshot) => {
      console.log(`Layout (Pedidos Pollos - DEBUG): INICIO onSnapshot de 'pedidos'. Procesando ${querySnapshot.size} documentos.`);
      let pollosHoy = 0;
      // Objeto para almacenar conteos por franjas específicas
      // Incluimos las franjas de la mañana solicitadas y mantenemos las de la noche.
      const pollosPorFranjaEspecifica = {
        "08:45": 0,
        "09:00": 0,
        "09:15": 0,
        "09:30": 0,
        "09:45": 0,
        // Añadimos más franjas de la mañana para depuración si es necesario
        "10:00": 0, "10:15": 0, "10:30": 0, "10:45": 0,
        "11:00": 0, "11:15": 0, "11:30": 0, "11:45": 0,
        "12:00": 0, "12:15": 0, "12:30": 0, "12:45": 0,
        "13:00": 0, "13:15": 0, "13:30": 0, "13:45": 0,
        "21:30": 0,
        "21:45": 0,
        "22:00": 0,
      };


      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        const fechaPedidoFormatoComparar = convertirFechaPedidoAYYYYMMDD(orderData.fechahora);
        // console.log(`Layout (Pedidos Pollos - DEBUG): Procesando pedido ID ${doc.id}, fecha_filtro: ${orderData.fecha_filtro}, fechahora: ${orderData.fechahora}, fechaPedidoFormatoComparar: ${fechaPedidoFormatoComparar}, formattedDate (hoy): ${formattedDate}`);

        if (fechaPedidoFormatoComparar === formattedDate) {
          const horaPedido = orderData.fechahora ? orderData.fechahora.split(' ')[1] : null; // Extraer HH:MM
          if (Array.isArray(orderData.productos)) {
            orderData.productos.forEach(producto => {
              const productId = Number(producto.id); // Asegurar que productId sea un número
              const cantidadPedido = Number(producto.cantidad) || 0;

              // Log para cada producto dentro de un pedido del día actual
              // console.log(`Layout (Pedidos Pollos - DEBUG): Pedido ID ${doc.id}, Producto ID: ${productId}, Cantidad: ${cantidadPedido}, Hora Pedido: ${horaPedido}`);

              if (productId === 1) { // Pollo entero
                pollosHoy += 1 * cantidadPedido;
                if (horaPedido && pollosPorFranjaEspecifica.hasOwnProperty(horaPedido)) {
                  pollosPorFranjaEspecifica[horaPedido] += 1 * cantidadPedido;
                  // console.log(`Layout (Pedidos Pollos - DEBUG): Sumado 1 pollo a ${horaPedido}. Nuevo total para ${horaPedido}: ${pollosPorFranjaEspecifica[horaPedido]}`);
                }
              } else if (productId === 2 || productId === 39 || productId === 40) { // Medio pollo o equivalentes
                pollosHoy += 0.5 * cantidadPedido;
                if (horaPedido && pollosPorFranjaEspecifica.hasOwnProperty(horaPedido)) {
                  pollosPorFranjaEspecifica[horaPedido] += 0.5 * cantidadPedido;
                  // console.log(`Layout (Pedidos Pollos - DEBUG): Sumado 0.5 pollo a ${horaPedido}. Nuevo total para ${horaPedido}: ${pollosPorFranjaEspecifica[horaPedido]}`);
                }
              }
            });
          }
        }
      });
      setTotalPollosPedidosHoy(pollosHoy);
      // console.log(`Layout (Pedidos Pollos): TOTAL DIARIO de pollos (IDs 1,2,39,40) para ${formattedDate} desde 'pedidos': ${pollosHoy}`); // Log general eliminado

      console.log("Layout (Pedidos Pollos - DEBUG): pollosPorFranjaEspecifica FINAL CALCULADO:", JSON.parse(JSON.stringify(pollosPorFranjaEspecifica)));
      // Actualizar el estado con los conteos calculados desde 'pedidos' para las franjas específicas
      setCalculatedSlotCounts(pollosPorFranjaEspecifica);
      console.log("Layout (Pedidos Pollos - DEBUG): Estado calculatedSlotCounts actualizado.");

      // Log de los conteos para las franjas específicas

      // --- Lógica para sobrescribir el calendario si hay discrepancias ---
      // Logs específicos solicitados (se mantienen, pero el log de arriba es más completo)
      console.log(`Layout (Pedidos Pollos - DEBUG): Conteo para 11:00 -> ${pollosPorFranjaEspecifica["11:00"] ?? 'No definido en pollosPorFranjaEspecifica'}`);
      console.log(`Layout (Pedidos Pollos - DEBUG): Conteo para 11:15 -> ${pollosPorFranjaEspecifica["11:15"] ?? 'No definido en pollosPorFranjaEspecifica'}`);
      console.log(`Layout (Pedidos Pollos - DEBUG): Conteo para 11:30 -> ${pollosPorFranjaEspecifica["11:30"] ?? 'No definido en pollosPorFranjaEspecifica'}`);

      if (calendarData && calendarData.intervals && Array.isArray(calendarData.intervals)) {
        const calendarDocRef = doc(db, "chicken_calendar_daily", formattedDate);
        let intervalsWereUpdated = false;
        // Es crucial trabajar con una copia para no mutar el estado directamente antes de setearlo
        // y para preparar el objeto de actualización para Firestore.
        const newIntervalsArray = JSON.parse(JSON.stringify(calendarData.intervals));

        // Definimos las franjas a corregir directamente desde todos los intervalos del calendario.
        // Ya no filtramos por mañana/tarde aquí, ya que el listener de pedidos es para todo el día.
        const franjasDelCalendario = calendarData.intervals.map(interval => interval.start);
        console.log(`Layout (Corrección Calendario - DEBUG): Franjas del calendario a considerar para corrección:`, franjasDelCalendario);

        franjasDelCalendario.forEach(horaFranja => {
          console.log(`Layout (Corrección Calendario - DEBUG): Procesando franja del calendario: ${horaFranja}`);
          // Asegúrate de que esta línea esté presente y correcta.
          const conteoCalculadoDesdePedidos = pollosPorFranjaEspecifica[horaFranja];
          console.log(`Layout (Corrección Calendario - DEBUG): Para ${horaFranja}, conteoCalculadoDesdePedidos es: ${conteoCalculadoDesdePedidos}`);

          // Si conteoCalculadoDesdePedidos es undefined para esta horaFranja del calendario,
          // significa que no hay pedidos registrados para esa franja específica.
          // En este caso, NO MODIFICAMOS el calendario. Dejamos su valor actual.
          if (conteoCalculadoDesdePedidos !== undefined) {
            console.log(`Layout (Corrección Calendario - DEBUG): ${horaFranja} tiene un conteo definido (${conteoCalculadoDesdePedidos}). Procediendo a comparar con calendario.`);
            const intervalIndex = newIntervalsArray.findIndex(interval => interval.start === horaFranja);
            console.log(`Layout (Corrección Calendario - DEBUG): Para ${horaFranja}, intervalIndex en newIntervalsArray es: ${intervalIndex}`);

            if (intervalIndex !== -1) {
              const currentOrderedCountInCalendar = Number(newIntervalsArray[intervalIndex].orderedCount) || 0;
              // Convertimos el conteo de pedidos a número, ya que sabemos que no es undefined.
              const conteoPedidosNumerico = Number(conteoCalculadoDesdePedidos);
              console.log(`Layout (Corrección Calendario - DEBUG): Para ${horaFranja}, currentOrderedCountInCalendar: ${currentOrderedCountInCalendar}, conteoPedidosNumerico: ${conteoPedidosNumerico}`);

              if (currentOrderedCountInCalendar !== conteoPedidosNumerico) {
                console.warn(`Layout (Corrección Calendario): Discrepancia para ${horaFranja}. Calendario: ${currentOrderedCountInCalendar}, Pedidos (Calculado): ${conteoPedidosNumerico}. SOBREESCRIBIENDO CALENDARIO.`);
                newIntervalsArray[intervalIndex].orderedCount = conteoPedidosNumerico;
                intervalsWereUpdated = true;
                console.log(`Layout (Corrección Calendario - DEBUG): ${horaFranja} actualizada en newIntervalsArray a ${conteoPedidosNumerico}. intervalsWereUpdated = true.`);
              }
            } else {
              console.error(`Layout (Corrección Calendario): INCONSISTENCIA INTERNA. La franja horaria ${horaFranja} del calendario no se encontró en la copia de trabajo de los intervalos. No se puede corregir esta franja.`);
            }
          }
          // Si conteoCalculadoDesdePedidos es undefined, no se hace nada, el calendario para esa franja no se toca.
        });

        if (intervalsWereUpdated) {
          // Limpiar cualquier timeout existente para la corrección del calendario
          if (updateCalendarTimeoutRef.current) {
            clearTimeout(updateCalendarTimeoutRef.current);
          }
          console.log(`Layout (Corrección Calendario - DEBUG): Se detectaron actualizaciones. newIntervalsArray ANTES de programar updateDoc:`, JSON.parse(JSON.stringify(newIntervalsArray)));
          // Establecer un nuevo timeout para actualizar el documento
          console.log(`Layout (Corrección Calendario): Discrepancia(s) detectada(s). Programando actualización para chicken_calendar_daily/${formattedDate} en 3 segundos.`);
          updateCalendarTimeoutRef.current = setTimeout(() => {
            updateDoc(calendarDocRef, { intervals: newIntervalsArray })
              .then(() => console.log(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Documento chicken_calendar_daily/${formattedDate} actualizado.`))
              .catch(error => console.error(`Layout (Corrección Calendario TIMEOUT EJECUTADO): Error al actualizar chicken_calendar_daily/${formattedDate}:`, error));
          }, 3000); // 3000 milisegundos = 3 segundos

        } else {
          console.log(`Layout (Corrección Calendario - DEBUG): No se detectaron discrepancias que requieran actualizar el calendario.`);
        }
      } else {
        console.warn("Layout (Corrección Calendario): calendarData o sus intervalos no están disponibles en este momento. No se puede intentar la corrección del calendario.");
      }
    }, (error) => {
      console.error("Layout (Pedidos Pollos): Error en el listener de la colección 'pedidos':", error);
    });

    return () => {
      console.log(`Layout (Pedidos Pollos): Limpiando listener de 'pedidos' para ${formattedDate}.`);
      unsubscribePedidos();
      // Asegurarse de limpiar el timeout si el componente se desmonta o las dependencias cambian
      if (updateCalendarTimeoutRef.current) {
        clearTimeout(updateCalendarTimeoutRef.current);
      }
    };
  }, [formattedDate, calendarData]); // Añadir calendarData como dependencia

  const morningIntervals =
    calendarData?.intervals?.filter((interval) => interval.start < "18:00") || [];
  const afternoonIntervals =
    calendarData?.intervals?.filter((interval) => interval.start >= "18:00") || [];
  
  const currentHour = today.getHours();
  const isMorning = currentHour < 18;

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
                            // Determinar el conteo a mostrar:
                            // Priorizar calculatedSlotCounts para las franjas críticas, si está disponible.
                            let displayCount = Number(interval.orderedCount) || 0; // Valor por defecto desde calendarData
                            // Las franjas críticas para visualización ahora son todas las del calendario.
                            // La corrección ya se habrá aplicado (o estará en proceso) a `interval.orderedCount`
                            // si `calculatedSlotCounts` tenía un valor diferente.

                            if (
                              calculatedSlotCounts.hasOwnProperty(interval.start) // Asegura que la clave exista
                            ) {
                              displayCount = calculatedSlotCounts[interval.start];
                            }

                            return (
                              <button
                                key={`${interval.start}-${index}-${displayCount}`} // Usar displayCount en la key
                                className={`px-2 py-1 ms-4 border rounded whitespace-nowrap font-nunito transition-colors duration-150
                                  ${selectedSlotTime === interval.start ? 'bg-yellow-400 border-yellow-600 ring-2 ring-yellow-300' : 'hover:bg-gray-200'}`}
                                onClick={() => setSelectedSlotTime(interval.start)}
                              >
                                {interval.start} [
                                <span
                                  className={
                                    displayCount >= interval.maxAllowed // Usar displayCount para el estilo
                                      ? "text-red-500 font-extrabold"
                                      : "text-green-700 font-extrabold"
                                  }
                                >
                                  {displayCount} {/* Mostrar displayCount */}
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
