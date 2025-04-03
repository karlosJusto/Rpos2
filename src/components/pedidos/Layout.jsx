import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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

const Layout = ({ bloquesPedidos }) => {
  const location = useLocation();
  // Se recibe el pedido a editar (si existe) desde Ordenes
  const orderToEdit = location.state?.orderToEdit || null;

  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
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

  const morningIntervals =
    calendarData?.intervals.filter((interval) => interval.start < "18:00") || [];
  const afternoonIntervals =
    calendarData?.intervals.filter((interval) => interval.start >= "18:00") || [];

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
          {/* Slider con los intervalos */}
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
                      ? "Turno Mañana"
                      : "Turno Tarde "}
                  </h2>
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
          {/* Se pasa orderToEdit para indicar que se trata de un pedido a editar */}
          <Ticket orderToEdit={orderToEdit} />
        </div>
      </div>
    </>
  );
};

export default Layout;
