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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dataContext } from '../Context/DataContext';

const Layout = () => {
  const {
    setCart,
    orderBeingEdited,
    isEditingOrder,
    setOrderBeingEdited,
    data
  } = useContext(dataContext);

  const location = useLocation();
  const navigate = useNavigate();

  const [isOrderLoadedInCart, setIsOrderLoadedInCart] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  // --- Efecto para Cargar el Pedido en Edición en el Carrito ---
  useEffect(() => {
    // Asegúrate de que 'data' (lista de productos) esté cargado antes de procesar
    if (isEditingOrder && orderBeingEdited && !isOrderLoadedInCart && data && data.length > 0) {


      //console.log("Layout (Context): DOrden:", orderBeingEdited);

      console.log("Layout (Context): Detectado orderBeingEdited, procesando para carrito:", orderBeingEdited.productos);

      // --- Paso de Unificación de Datos ---
      const unifiedProducts = orderBeingEdited.productos.map((orderProduct, index) => {
        const fullProductData = data.find(p =>
            p.id_product === orderProduct.id || p.id === orderProduct.id
        );

        if (!fullProductData) {
          console.warn(`Layout: No se encontraron datos completos para el producto ID ${orderProduct.id} del pedido ${orderBeingEdited.NumeroPedido}`);
          return {
            ...orderProduct,
            id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${index}-${Date.now()}`,
            name: orderProduct.nombre || orderProduct.alias || 'Producto Desconocido',
            imagen: orderProduct.imagen || 'URL_IMAGEN_POR_DEFECTO.png',
            price: parseFloat(orderProduct.precio || 0),
            cantidad: parseInt(orderProduct.cantidad || 1, 10),
          };
        }

        return {
          ...fullProductData,
          ...orderProduct,
          id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${index}-${Date.now()}`,
          name: fullProductData.name || orderProduct.nombre,
          price: fullProductData.price ?? parseFloat(orderProduct.precio || 0),
          imagen: fullProductData.imagen || orderProduct.imagen,
          cantidad: parseInt(orderProduct.cantidad || 1, 10),
        };
      });
      // --- Fin Unificación de Datos ---

      console.log("Layout (Context): Productos unificados para el carrito:", unifiedProducts);
      setCart(unifiedProducts);
      setIsOrderLoadedInCart(true);

    } else if (!isEditingOrder && isOrderLoadedInCart) {
      console.log("Layout (Context): Saliendo del modo edición, reseteando bandera isOrderLoadedInCart.");
      setIsOrderLoadedInCart(false);
      // No limpiamos el carrito aquí, solo reseteamos la bandera de carga
    }

  }, [isEditingOrder, orderBeingEdited, isOrderLoadedInCart, setCart, data]);


  // --- NUEVO: Efecto para Limpiar Estado al Salir de /layout ---
  useEffect(() => {
    // Si la ruta actual NO empieza con '/layout' Y estábamos en modo edición...
    if (!location.pathname.startsWith('/layout') && isEditingOrder) {
      console.log("Layout: Navegación fuera de /layout detectada mientras se editaba. Limpiando carrito y modo edición.");
      setOrderBeingEdited(null); // Salir del modo edición
      setCart([]);               // Vaciar el carrito
      // La bandera isOrderLoadedInCart se reseteará automáticamente por el efecto anterior
      // cuando isEditingOrder cambie a false.
    }
    // Este efecto se ejecuta cada vez que cambia la ruta o el estado de edición.
  }, [location.pathname, isEditingOrder, setOrderBeingEdited, setCart]);


  // --- Efecto para cargar los datos del calendario ---
  useEffect(() => {
    const fetchCalendar = async () => {
      setLoadingCalendar(true);
      try {
        const docRef = doc(db, "chicken_calendar_daily", formattedDate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCalendarData(docSnap.data());
        } else {
          console.error("No existe el documento de calendario para la fecha:", formattedDate);
          setCalendarData(null);
        }
      } catch (error) {
        console.error("Error al obtener los datos del calendario:", error);
        setCalendarData(null);
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, [formattedDate]);

  // Lógica del calendario
  const morningIntervals =
    calendarData?.intervals?.filter((interval) => interval.start < "18:00") || [];
  const afternoonIntervals =
    calendarData?.intervals?.filter((interval) => interval.start >= "18:00") || [];
  const currentHour = today.getHours();
  const isMorning = currentHour < 18;

  return (
    <>
      <div
        className="flex max-w-[2500px] mx-auto h-[calc(100vh-0px)] bg-no-repeat bg-cover"
        style={{ backgroundImage: `url(${fondo})` }}
      >
        <div className="w-[7%]">
          <Sidebar />
        </div>

        <div className="w-[70%]">
              <div className="h-[9%]">
                <Navbar />
              </div>
              <div className="h-[9%]">
                <Tabs />
              </div>
              <div className="p-[1.5vw] pl-[3vw] h-[58%] max-h-[75%] grid grid-cols-5 overflow-y-auto gap-4">
                <Card />
              </div>
              {/* Slider con los intervalos */}
              <div className="w-[90%] pt-[1vh] ms-[3.8vw] border-white rounded p-4 bg-white ">
                {loadingCalendar ? (
                  <p>Cargando horarios...</p>
                ) : calendarData ? (
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
                              key={index}
                              className="px-2 py-1 ms-4 border rounded whitespace-nowrap font-nunito"
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
                  <p>No hay datos de calendario disponibles para hoy.</p>
                )}
              </div>
        </div>

        {/* Cambia el fondo del Ticket basado en el estado del contexto */}
        <div className={`${isEditingOrder ? 'bg-[#b2b9ab]' : 'bg-[#F3F3F3]'} w-[23%]`}>
          <Ticket />
        </div>
      </div>
    </>
  );
};

export default Layout;
