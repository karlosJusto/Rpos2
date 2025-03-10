import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { SaladTypeCard } from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const Cocina = () => {
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  // Estado para la fecha seleccionada (por defecto, la fecha actual)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Estado para mostrar u ocultar el input de calendario
  const [showCalendar, setShowCalendar] = useState(false);

  // Función para obtener el turno actual con sus rangos horarios
  const getTurnoActual = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startTime, endTime;

    // Si la hora actual es menor o igual a las 18:00, se considera turno de mañana
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
      startTime = new Date(today.getTime());
      startTime.setMinutes(1); // 00:01
      endTime = new Date(today.getTime());
      endTime.setHours(18, 0, 0, 0); // 18:00
    } else {
      // Si la hora actual es mayor a 18:00, se considera turno de tarde: 18:01 a 23:59
      startTime = new Date(today.getTime());
      startTime.setHours(18, 1, 0, 0); // 18:01
      endTime = new Date(today.getTime());
      endTime.setHours(23, 59, 0, 0); // 23:59
    }
    return { startTime, endTime };
  };

  // Función para manejar el cambio de fecha desde el calendario
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  // Determinar si la fecha seleccionada es hoy y establecer el texto de turno
  const isToday = selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  let turnoText = '';
  if (isToday) {
    const now = new Date();
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
      turnoText = 'Turno de mañana';
    } else {
      turnoText = 'Turno de tarde';
    }
  } else {
    turnoText = 'Mostrando todos los pedidos del día';
  }

  // --- Lógica para ProductCard (pedidos) ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      // Convertimos la fecha seleccionada a formato "dd/mm/yyyy"
      const selectedDateStr = selectedDate.toLocaleDateString('es-ES');
      // La fecha actual en el mismo formato
      const todayStr = new Date().toLocaleDateString('es-ES');

      // Filtrar pedidos del día seleccionado
      const pedidosDelDia = pedidos.filter((pedido) => {
        if (!pedido.fechahora_realizado) return false;
        const [fechaPedido, horaPedido] = pedido.fechahora_realizado.split(' ');
        if (fechaPedido !== selectedDateStr) return false;

        // Si la fecha seleccionada es hoy, filtrar por turno (mañana/tarde)
        if (selectedDateStr === todayStr) {
          const { startTime, endTime } = getTurnoActual();
          const [day, month, year] = fechaPedido.split('/');
          const [hour, minute] = horaPedido.split(':');
          const orderDate = new Date(year, month - 1, day, hour, minute);
          return orderDate >= startTime && orderDate <= endTime;
        }
        // Para otra fecha, no se filtra por turno
        return true;
      });

      // IDs de productos válidos para pintar en ProductCard
      const validProductIds = [20, 24, 3, 41];
      const aggregatedProducts = {};

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            if (validProductIds.includes(prod.id)) {
              if (!aggregatedProducts[prod.id]) {
                aggregatedProducts[prod.id] = {
                  name: prod.nombre,
                  stock: 8,
                  pedidos: 0,
                  orders: [],
                };
              }
              aggregatedProducts[prod.id].orders.push({
                idPedido: pedido.id,
                idProducto: prod.id,
                producto: prod,
                hora: pedido.fechahora_realizado,
                nombre: pedido.cliente,
                cantidad: prod.cantidad,
              });
              aggregatedProducts[prod.id].pedidos += prod.cantidad;
            }
          });
        }
      });

      // Incluir todos los productos válidos, incluso sin pedidos
      validProductIds.forEach((id) => {
        if (!aggregatedProducts[id]) {
          aggregatedProducts[id] = {
            name: `Producto ${id}`,
            stock: 8,
            pedidos: 0,
            orders: [],
          };
        }
      });

      // Función para parsear la fecha y hora
      const parseFechaHora = (str) => {
        if (!str) return new Date(0);
        const [date, time] = str.split(' ');
        if (!date || !time) return new Date(0);
        const [day, month, year] = date.split('/');
        const [hour, minute] = time.split(':');
        return new Date(year, month - 1, day, hour, minute);
      };

      Object.values(aggregatedProducts).forEach((product) => {
        product.orders.sort((a, b) => parseFechaHora(a.hora) - parseFechaHora(b.hora));
        product.pedidos = `${product.orders.length} (${product.pedidos})`;
      });

      setProductsData(Object.values(aggregatedProducts));
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // --- Lógica para ensaladas y ensaladillas en Firestore ---
  // Usamos la fecha seleccionada como id de documento en la colección "ensaladas"
  const todayDocId = selectedDate.toLocaleDateString('es-ES').replace(/\//g, '-'); // "dd-mm-yyyy"

  useEffect(() => {
    const saladsRef = doc(db, 'ensaladas', todayDocId);
    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setSaladsData([docSnapshot.data()]);
      } else {
        // Si no existe el documento, se crea con valores iniciales
        const initialData = {
          name: 'Ensaladas y Ensaladillas del día',
          ensaladas: {
            grandes: { preparadas: 10, pedidas: 0 },
            pequenas: { preparadas: 10, pedidas: 0 },
          },
          ensaladillas: {
            grandes: { preparadas: 10, pedidas: 0 },
            pequenas: { preparadas: 10, pedidas: 0 },
          },
        };
        setDoc(saladsRef, initialData);
        setSaladsData([initialData]);
      }
    });

    return () => unsubscribe();
  }, [todayDocId]);

  // --- Lógica para actualizar "pedidas" en ensaladas/ensaladillas ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      const selectedDateStr = selectedDate.toLocaleDateString('es-ES');
      const todayStr = new Date().toLocaleDateString('es-ES');

      // Filtrar pedidos del día seleccionado
      const pedidosDelDia = pedidos.filter((pedido) => {
        if (!pedido.fechahora_realizado) return false;
        const [fechaPedido, horaPedido] = pedido.fechahora_realizado.split(' ');
        if (fechaPedido !== selectedDateStr) return false;
        if (selectedDateStr === todayStr) {
          const { startTime, endTime } = getTurnoActual();
          const [day, month, year] = fechaPedido.split('/');
          const [hour, minute] = horaPedido.split(':');
          const orderDate = new Date(year, month - 1, day, hour, minute);
          return orderDate >= startTime && orderDate <= endTime;
        }
        return true;
      });

      // Contadores para ensaladas y ensaladillas
      let ensaladasPedidasGr = 0;
      let ensaladasPedidasPeq = 0;
      let ensaladillasPedidasGr = 0;
      let ensaladillasPedidasPeq = 0;

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            // Producto de ensaladas (id 12)
            if (prod.id === 12) {
              if (prod.size && prod.size.toLowerCase().includes('peque')) {
                ensaladasPedidasPeq += prod.cantidad;
              } else {
                ensaladasPedidasGr += prod.cantidad;
              }
            }
            // Producto de ensaladillas (id 13)
            if (prod.id === 13) {
              if (prod.size && prod.size.toLowerCase().includes('peque')) {
                ensaladillasPedidasPeq += prod.cantidad;
              } else {
                ensaladillasPedidasGr += prod.cantidad;
              }
            }
          });
        }
      });

      const saladsRef = doc(db, 'ensaladas', todayDocId);
      updateDoc(saladsRef, {
        "ensaladas.grandes.pedidas": ensaladasPedidasGr,
        "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
        "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
        "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
      }).catch(err => console.error("Error updating salad pedidas:", err));
    });

    return () => unsubscribe();
  }, [selectedDate, todayDocId]);

  // Función para actualizar la cantidad de preparadas en Firebase
  const updateSaladCount = async (type, size, amount) => {
    const saladsRef = doc(db, 'ensaladas', todayDocId);
    try {
      await updateDoc(saladsRef, {
        [`${type}.${size}.preparadas`]: amount,
      });
    } catch (error) {
      console.error("Error actualizando ensaladas:", error);
    }
  };

  // Determinamos el grid para ProductCard
  const productCount = Math.min(productsData.length, 9);
  let gridClass = '';

  if (productCount === 4) {
    gridClass = 'grid-cols-2 grid-rows-2';
  } else if (productCount === 5 || productCount === 6) {
    gridClass = 'grid-cols-2 grid-rows-3';
  } else if (productCount > 6) {
    gridClass = 'grid-cols-3 grid-rows-3';
  } else {
    gridClass = 'grid-cols-1';
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <Header />
      {/* Botón, calendario y texto indicador de turno */}
      <div className="p-4 flex items-center space-x-4">
        <button 
          className="px-4 py-2 bg-[#f2ac02] text-white rounded"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          Seleccionar Fecha
        </button>
        <span className="text-gray-700 font-medium">{turnoText}</span>
        {showCalendar && (
          <input 
            type="date" 
            className="ml-4 p-2 border rounded"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
          />
        )}
      </div>
      <div className="p-6 flex-grow overflow-hidden">
        <div className={`grid gap-6 ${gridClass} h-full`}>
          {productsData.slice(0, 9).map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      </div>
      {/* Sección inferior: dos cards, cada una ocupando la mitad de la pantalla */}
      <div className="p-6 bg-gray-100">
        <div className="flex">
          <div className="w-1/2 p-2">
            {saladsData.length > 0 && (
              <SaladTypeCard
                type="ensaladas"
                data={saladsData[0].ensaladas}
                updateSaladCount={updateSaladCount}
              />
            )}
          </div>
          <div className="w-1/2 p-2">
            {saladsData.length > 0 && (
              <SaladTypeCard
                type="ensaladillas"
                data={saladsData[0].ensaladillas}
                updateSaladCount={updateSaladCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cocina;
