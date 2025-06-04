import { useState, useEffect, useContext } from "react";
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
import { doc, onSnapshot } from "firebase/firestore"; // Importar onSnapshot en lugar de getDoc
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
                        {(isMorning ? morningIntervals : afternoonIntervals).map(
                          (interval, index) => (
                            <button
                              key={`${interval.start}-${index}-${interval.orderedCount}`} // Key más única para forzar re-render si orderedCount cambia
                              className={`px-2 py-1 ms-4 border rounded whitespace-nowrap font-nunito transition-colors duration-150
                                ${selectedSlotTime === interval.start ? 'bg-yellow-400 border-yellow-600 ring-2 ring-yellow-300' : 'hover:bg-gray-200'}`}
                              onClick={() => setSelectedSlotTime(interval.start)}
                            >
                              {interval.start} [
                              <span
                                className={
                                  interval.orderedCount >= interval.maxAllowed
                                    ? "text-red-500 font-extrabold"
                                    : "text-green-700 font-extrabold"
                                }
                              >
                                {interval.orderedCount}
                              </span>
                              ]
                            </button>
                          )
                        )}
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
