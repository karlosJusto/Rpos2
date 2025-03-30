import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Tabs from "./Tabs";
import Card from "./Card";
import Ticket from "./Ticket";
import { useState, useEffect } from "react";
import fondo from "../../assets/fondo.jpg";
import ModalClientes from "./ModalClientes";

// Importa Swiper para React
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/scrollbar";
import "swiper/css/mousewheel";

// Importa Firestore
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase"; // Ajusta la ruta a tu configuración de Firebase

const Layout = ({ bloquesPedidos }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Obtener la fecha actual en formato "YYYY-MM-DD"
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        // Consulta el documento correspondiente a la fecha actual
        const docRef = doc(db, "chicken_calendar_daily", formattedDate);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCalendarData(docSnap.data());
        } else {
          console.error("No existe el documento para la fecha:", formattedDate);
        }
      } catch (error) {
        console.error("Error al obtener los datos de Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, [formattedDate]);

  // Filtrar intervalos según turno:
  // Turno Mañana: intervalos cuyo inicio es menor a las 18:00.
  // Turno Tarde: intervalos cuyo inicio es a partir de las 18:00.
  const morningIntervals =
    calendarData?.intervals.filter((interval) => interval.start < "18:00") ||
    [];
  const afternoonIntervals =
    calendarData?.intervals.filter((interval) => interval.start >= "18:00") ||
    [];

  // Determinar si mostrar el turno mañana o tarde según la hora actual
  const currentHour = today.getHours();
  const isMorning = currentHour < 18;

  return (
    <>
      <div
        className="flex max-w-[2500px] mx-auto h-[calc(100vh-5px)] bg-no-repeat bg-cover"
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
          <div className="p-[2.5vw] pl-[3vw] h-[64%] max-h-[75%] grid grid-cols-5 overflow-y-auto gap-4">
            <Card />
          </div>
          {/* Contenedor del slider con fondo y recuadro blanco */}
          <div className="w-full pt-[1vh] border-2 border-white rounded p-4 bg-white">
            {loading ? (
              <p>Cargando horarios...</p>
            ) : (
              <Swiper
                slidesPerView={1}
                spaceBetween={20}
                scrollbar={{ draggable: true }}
                mousewheel={true}
                className="w-full"
              >
                <SwiperSlide>
                  <h2 className="text-xl font-bold mb-2">
                    {isMorning
                      ? "Turno Mañana (hasta las 18:00)"
                      : "Turno Tarde (desde las 18:00)"}
                  </h2>
                  {/* Contenedor que permite que los botones se envuelvan a nuevas filas si es necesario */}
                  <div className="flex flex-wrap gap-2">
                    {(isMorning ? morningIntervals : afternoonIntervals).map(
                      (interval, index) => (
                        <button
                          key={index}
                          className="px-4 py-2 border rounded whitespace-nowrap"
                        >
                          {interval.start} (
                          <span
                            className={
                              interval.orderedCount > interval.maxAllowed
                                ? "text-red-500"
                                : ""
                            }
                          >
                            {interval.orderedCount}
                          </span>
                          )
                        </button>
                      )
                    )}
                  </div>
                </SwiperSlide>
              </Swiper>
            )}
          </div>
        </div>

        <div className="bg-[#F3F3F3] w-[23%]">
          <Ticket />
        </div>
      </div>
    </>
  );
};

export default Layout;
