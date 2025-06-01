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
    data, // Lista base de todos los productos disponibles
    selectedSlotTime,
    setSelectedSlotTime
  } = useContext(dataContext);

  const location = useLocation();
  const navigate = useNavigate(); // Aunque no se usa directamente, es bueno tenerlo por si se necesita.

  // Estado local para rastrear si los productos de un pedido en edición ya se cargaron en el carrito.
  const [isOrderLoadedInCart, setIsOrderLoadedInCart] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const today = new Date();
  // formattedDate se calcula una vez por render. Si el componente permanece montado
  // y el día cambia, el efecto que carga el calendario se re-ejecutará.
  const formattedDate = today.toISOString().split("T")[0];

  // --- Efecto para Cargar el Pedido en Edición en el Carrito ---
  useEffect(() => {
    // Solo procesar si:
    // 1. Estamos en modo edición (isEditingOrder es true).
    // 2. Hay un objeto orderBeingEdited.
    // 3. Los productos de este pedido aún no se han cargado en el carrito (isOrderLoadedInCart es false).
    // 4. La lista base de productos 'data' está disponible.
    if (isEditingOrder && orderBeingEdited && !isOrderLoadedInCart && data && data.length > 0) {
      
      // VERIFICACIÓN CRUCIAL:
      // Asegurarse de que orderBeingEdited tiene la propiedad 'productos' y es un array.
      // Esto es vital para el flujo de 'handleCreateOrder' desde Ordenes.jsx,
      // donde orderBeingEdited podría ser solo clientInfo (sin la propiedad 'productos').
      // Si isEditingOrder es false (como en handleCreateOrder), este bloque if principal no se ejecutará.
      // Esta guarda interna es para robustez si isEditingOrder fuera true pero orderBeingEdited no tuviera productos.
      if (orderBeingEdited.productos && Array.isArray(orderBeingEdited.productos)) {
        console.log("Layout (Context): Detectado orderBeingEdited CON productos. Procesando para carrito:", orderBeingEdited.productos);

        // --- Paso de Unificación de Datos ---
        // Esta lógica combina los productos del pedido en edición con los datos completos
        // de la lista 'data' para asegurar que el carrito tenga toda la información necesaria.
        const unifiedProducts = orderBeingEdited.productos.map((orderProduct, index) => {
          const fullProductData = data.find(p =>
              p.id_product === orderProduct.id || p.id === orderProduct.id // Compara con id_product o id
          );

          if (!fullProductData) {
            console.warn(`Layout (Context): No se encontraron datos completos para el producto ID ${orderProduct.id} del pedido ${orderBeingEdited.NumeroPedido}. Usando datos del pedido.`);
            // Fallback: si el producto no se encuentra en 'data', usar los datos del pedido tal cual.
            return {
              ...orderProduct,
              id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${orderProduct.id}-${index}-${Date.now()}`, // Generar un id_cart único
              name: orderProduct.nombre || orderProduct.alias || 'Producto Desconocido',
              imagen: orderProduct.imagen || 'URL_IMAGEN_POR_DEFECTO.png', // Considera una URL de imagen por defecto real
              price: parseFloat(orderProduct.precio || 0),
              cantidad: parseInt(orderProduct.cantidad || 1, 10),
            };
          }

          // Combinar datos: priorizar los del pedido si existen, luego los de 'data'.
          // Esto es útil si, por ejemplo, el precio de un producto en un pedido específico fue diferente.
          return {
            ...fullProductData, // Datos base del producto desde 'data'
            ...orderProduct,    // Datos específicos del producto en el pedido (pueden sobreescribir los de fullProductData)
            id_cart: orderProduct.id_cart || `edit-${orderBeingEdited.NumeroPedido || 'new'}-${fullProductData.id}-${index}-${Date.now()}`, // Usar ID de fullProductData para id_cart
            name: fullProductData.name || orderProduct.nombre || orderProduct.alias, // Asegurar que 'name' se tome de fullProductData si existe
            price: orderProduct.precio !== undefined ? parseFloat(orderProduct.precio) : parseFloat(fullProductData.price || 0), // Priorizar precio del pedido
            imagen: fullProductData.imagen || orderProduct.imagen,
            cantidad: parseInt(orderProduct.cantidad || 1, 10),
          };
        });
        // --- Fin Unificación de Datos ---

        console.log("Layout (Context): Productos unificados para el carrito:", unifiedProducts);
        setCart(unifiedProducts);
        setIsOrderLoadedInCart(true); // Marcar que los productos de este pedido han sido cargados en el carrito.

      } else {
        // Este bloque se ejecuta si isEditingOrder es true, PERO orderBeingEdited NO tiene la propiedad 'productos'
        // (o no es un array). Esto no debería suceder en el flujo normal de 'handleCreateOrder' si 'isEditingOrder'
        // se calcula correctamente (basado en la presencia de NumeroPedido).
        console.log("Layout (Context): orderBeingEdited (en modo edición) no tiene 'productos' o no es un array. No se carga el carrito desde aquí.", orderBeingEdited);
        // No se establece setIsOrderLoadedInCart(true) para permitir que una futura carga correcta ocurra.
      }

    } else if (!isEditingOrder && isOrderLoadedInCart) {
      // Si ya no estamos en modo edición (isEditingOrder es false) PERO la bandera
      // isOrderLoadedInCart indica que un pedido fue cargado previamente, reseteamos la bandera.
      // Esto prepara el estado para una posible futura edición o un nuevo pedido.
      console.log("Layout (Context): Saliendo del modo edición o iniciando nuevo pedido. Reseteando bandera isOrderLoadedInCart.");
      setIsOrderLoadedInCart(false);
    }
  // Dependencias:
  // - isEditingOrder, orderBeingEdited: Para reaccionar a cambios en el estado de edición.
  // - isOrderLoadedInCart: Para evitar recargas innecesarias y para resetear la bandera.
  // - setCart: Función del contexto para actualizar el carrito.
  // - data: Lista base de productos.
  // - setIsOrderLoadedInCart: Para actualizar el estado local.
  }, [isEditingOrder, orderBeingEdited, isOrderLoadedInCart, setCart, data, setIsOrderLoadedInCart]);


  // --- Efecto para Limpiar Estado al Salir de la Sección /layout ---
  useEffect(() => {
    // Si la ruta actual NO empieza con '/layout' (es decir, el usuario navegó a otra sección)
    // Y estábamos en modo edición (isEditingOrder era true)...
    if (!location.pathname.startsWith('/layout') && isEditingOrder) {
      console.log("Layout (Context): Navegación fuera de /layout detectada mientras se editaba. Limpiando estado de edición y carrito.");
      setOrderBeingEdited(null); // Limpiar el pedido en edición del contexto (esto cambiará isEditingOrder a false).
      setCart([]);               // Vaciar el carrito.
      // setIsOrderLoadedInCart(false) se manejará por el efecto anterior cuando isEditingOrder cambie a false.
    }
    // Este efecto se ejecuta cada vez que cambia la ruta (location.pathname) o el estado de edición (isEditingOrder).
  }, [location.pathname, isEditingOrder, setOrderBeingEdited, setCart]);


  // --- Efecto para cargar los datos del calendario desde Firestore ---
  useEffect(() => {
    const fetchCalendar = async () => {
      setLoadingCalendar(true);
      try {
        const docRef = doc(db, "chicken_calendar_daily", formattedDate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCalendarData(docSnap.data());
        } else {
          console.warn(`Layout (Calendar): No existe el documento de calendario para la fecha: ${formattedDate}. Se mostrará sin horarios.`);
          setCalendarData(null); // Asegurar que no haya datos viejos si el documento no existe.
        }
      } catch (error) {
        console.error("Layout (Calendar): Error al obtener los datos del calendario:", error);
        setCalendarData(null); // En caso de error, limpiar datos para evitar mostrar info incorrecta.
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, [formattedDate]); // Dependencia: formattedDate. Si cambia el día, se vuelve a ejecutar.

  // Lógica del calendario para filtrar y mostrar intervalos (SIN CAMBIOS)
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
              {/* Slider con los intervalos horarios (SIN CAMBIOS EN SU LÓGICA INTERNA) */}
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
                              key={`${interval.start}-${index}`} // Usar una key más única
                              className={`px-2 py-1 ms-4 border rounded whitespace-nowrap font-nunito transition-colors duration-150
                                ${selectedSlotTime === interval.start ? 'bg-yellow-400 border-yellow-600 ring-2 ring-yellow-300' : 'hover:bg-gray-200'}`}
                              onClick={() => setSelectedSlotTime(interval.start)} // Establecer el slot seleccionado
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

        {/* Columna del Ticket */}
        <div className={`${isEditingOrder ? 'bg-[#b2b9ab]' : 'bg-[#F3F3F3]'} w-[23%] flex-shrink-0 shadow-lg`}>
          <Ticket />
        </div>
      </div>
    </>
  );
};

export default Layout;
