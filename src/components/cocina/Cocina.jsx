import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { SaladTypeCard } from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDoc 
  //, query, where  // Si decides usar un campo timestamp
} from 'firebase/firestore';

// Función para formatear la fecha en "dd/mm/yyyy" (con ceros a la izquierda)
const formatDate = (date) => {
  const d = new Date(date);
  let day = d.getDate();
  let month = d.getMonth() + 1;
  const year = d.getFullYear();
  day = day < 10 ? `0${day}` : day;
  month = month < 10 ? `0${month}` : month;
  return `${day}/${month}/${year}`;
};

const Cocina = () => {
  // Estados para productos, pedidos, ensaladas y fecha
  const [cocinaProducts, setCocinaProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [alertScheduled, setAlertScheduled] = useState({ codillos: false, chorizo: false });
  const prevPedidosRef = useRef([]);

  // Suscripción a la colección "cocina"
  useEffect(() => {
    const cocinaRef = collection(db, 'cocina');
    const unsubscribeCocina = onSnapshot(cocinaRef, (querySnapshot) => {
      const productos = [];
      querySnapshot.forEach((doc) => {
        productos.push({ id: parseInt(doc.id), ...doc.data() });
      });
      setCocinaProducts(productos);
    });
    return () => unsubscribeCocina();
  }, []);

  // Función para determinar el turno actual
  const getTurnoActual = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startTime, endTime;
    if (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0)) {
      startTime = new Date(today.getTime());
      startTime.setMinutes(1); // 00:01
      endTime = new Date(today.getTime());
      endTime.setHours(18, 0, 0, 0); // 18:00
    } else {
      startTime = new Date(today.getTime());
      startTime.setHours(18, 1, 0, 0); // 18:01
      endTime = new Date(today.getTime());
      endTime.setHours(23, 59, 0, 0); // 23:59
    }
    return { startTime, endTime };
  };

  // Manejo del cambio de fecha desde el calendario
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  const selectedDateStr = formatDate(selectedDate);
  const todayStr = formatDate(new Date());
  const isToday = selectedDateStr === todayStr;

  let turnoText = '';
  if (isToday) {
    const now = new Date();
    turnoText = (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0))
      ? 'Turno de mañana'
      : 'Turno de tarde';
  } else {
    turnoText = 'Mostrando todos los pedidos del día';
  }

  // Agrupación de pedidos para ProductCard
  useEffect(() => {
    if (cocinaProducts.length === 0) return;
    
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      const pedidosDelDia = pedidos.filter((pedido) => {
        if (!pedido.fechahora) return false;
        const [fechaPedido, horaPedido] = pedido.fechahora.split(' ');
        if (fechaPedido !== selectedDateStr) return false;
        if (isToday) {
          const { startTime, endTime } = getTurnoActual();
          const [day, month, year] = fechaPedido.split('/');
          const [hour, minute] = horaPedido.split(':');
          const orderDate = new Date(year, month - 1, day, hour, minute);
          return orderDate >= startTime && orderDate <= endTime;
        }
        return true;
      });

      const validProductIds = cocinaProducts.map(product => product.id);
      const aggregatedProducts = {};

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            if (validProductIds.includes(prod.id)) {
              if (!aggregatedProducts[prod.id]) {
                aggregatedProducts[prod.id] = {
                  name: prod.nombre,
                  stock: 8, // valor por defecto
                  pedidos: 0,
                  orders: [],
                };
              }
              aggregatedProducts[prod.id].orders.push({
                idPedido: pedido.id,
                idProducto: prod.id,
                producto: prod,
                hora: pedido.fechahora,
                nombre: pedido.cliente,
                cantidad: prod.cantidad,
                descripcion: prod.observaciones || "",
              });
              aggregatedProducts[prod.id].pedidos += prod.cantidad;
            }
          });
        }
      });

      validProductIds.forEach((id) => {
        if (!aggregatedProducts[id]) {
          const productInfo = cocinaProducts.find(p => p.id === id);
          aggregatedProducts[id] = {
            name: productInfo?.nombre || `Producto ${id}`,
            stock: productInfo?.stock || 8,
            pedidos: 0,
            orders: [],
          };
        }
      });

      const sortedProducts = cocinaProducts.map(product => aggregatedProducts[product.id]);
      setProductsData(sortedProducts);
    });

    return () => unsubscribe();
  }, [selectedDate, cocinaProducts, selectedDateStr, isToday]);

  // --- Lógica para ensaladas/ensaladillas ---
  const todayDocId = selectedDateStr.replace(/\//g, '-');

  // Suscripción al documento de ensaladas (inicializa usando merge)
  useEffect(() => {
    const saladsRef = doc(db, 'ensaladas', todayDocId);
    const unsubscribe = onSnapshot(saladsRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setSaladsData([docSnapshot.data()]);
      } else {
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
        // Usar merge para que no se sobrescriban datos ya existentes
        setDoc(saladsRef, initialData, { merge: true });
        setSaladsData([initialData]);
      }
    });
    return () => unsubscribe();
  }, [todayDocId]);

  // Actualización condicional de "pedidas" en ensaladas/ensaladillas:
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      const pedidosDelDia = pedidos.filter((pedido) => {
        if (!pedido.fechahora) return false;
        const [fechaPedido, horaPedido] = pedido.fechahora.split(' ');
        if (fechaPedido !== selectedDateStr) return false;
        if (isToday) {
          const { startTime, endTime } = getTurnoActual();
          const [day, month, year] = fechaPedido.split('/');
          const [hour, minute] = horaPedido.split(':');
          const orderDate = new Date(year, month - 1, day, hour, minute);
          return orderDate >= startTime && orderDate <= endTime;
        }
        return true;
      });

      let ensaladasPedidasGr = 0;
      let ensaladasPedidasPeq = 0;
      let ensaladillasPedidasGr = 0;
      let ensaladillasPedidasPeq = 0;

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            // Suponiendo que prod.id === 12 para ensaladas y prod.id === 13 para ensaladillas,
            // y que el campo 'size' ya se define (por ejemplo, "pequeñas" o "grandes")
            if (prod.id === 12) {
              if (prod.size && prod.size.toLowerCase().includes('peque')) {
                ensaladasPedidasPeq += prod.cantidad;
              } else {
                ensaladasPedidasGr += prod.cantidad;
              }
            }
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
      // Leer el documento actual y actualizar solo si al menos uno de los nuevos totales NO es 0
      getDoc(saladsRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const currentData = docSnapshot.data();
            const currentEnsGr = currentData.ensaladas?.grandes?.pedidas || 0;
            const currentEnsPeq = currentData.ensaladas?.pequenas?.pedidas || 0;
            const currentEnsadGr = currentData.ensaladillas?.grandes?.pedidas || 0;
            const currentEnsadPeq = currentData.ensaladillas?.pequenas?.pedidas || 0;

            // Solo actualizamos si al menos uno de los nuevos totales es mayor que 0
            if (
              (ensaladasPedidasGr > 0 || ensaladasPedidasPeq > 0 || ensaladillasPedidasGr > 0 || ensaladillasPedidasPeq > 0) &&
              (currentEnsGr !== ensaladasPedidasGr ||
              currentEnsPeq !== ensaladasPedidasPeq ||
              currentEnsadGr !== ensaladillasPedidasGr ||
              currentEnsadPeq !== ensaladillasPedidasPeq)
            ) {
              updateDoc(saladsRef, {
                "ensaladas.grandes.pedidas": ensaladasPedidasGr,
                "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
                "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
                "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
              }).catch(err => console.error("Error updating salad pedidas:", err));
            }
          }
        })
        .catch(err => console.error("Error reading current salad doc:", err));
    });
    return () => unsubscribe();
  }, [selectedDate, todayDocId, selectedDateStr, isToday]);

  // Función para actualizar la cantidad de "preparadas"
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

  // Lógica para alertas y marcar pedidos como "visto"
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const currentPedidos = [];
      querySnapshot.forEach((doc) => {
        currentPedidos.push({ id: doc.id, ...doc.data() });
      });

      currentPedidos.forEach((pedido) => {
        const isNewOrder = !prevPedidosRef.current.find((p) => p.id === pedido.id);
        const hasUnseen = pedido.productos && pedido.productos.some(prod => !prod.visto);
        if (isNewOrder && hasUnseen) {
          const productosNombres = pedido.productos
            ? pedido.productos.map(p => p.nombre).join(', ')
            : 'Sin productos';
          console.log(`Nuevo pedido de ${pedido.cliente}. Productos: ${productosNombres}`);

          if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach((prod) => {
              const nombreProd = prod.nombre.toLowerCase();
              const now = new Date();
              const { endTime } = getTurnoActual();

              if ((nombreProd.includes('codillo') || nombreProd.includes('costilla')) && !alertScheduled.codillos) {
                const alertTime = new Date(endTime.getTime() - 30 * 60000);
                const delay = alertTime.getTime() - now.getTime();
                if (delay > 0) {
                  setTimeout(() => {
                    console.log("¡Atención! Faltan 30 minutos para los CODILLOS Y COSTILLAS.");
                  }, delay);
                  setAlertScheduled(prev => ({ ...prev, codillos: true }));
                }
              }
              if ((nombreProd.includes('chorizo') || nombreProd.includes('pimientos')) && !alertScheduled.chorizo) {
                const alertTime = new Date(endTime.getTime() - 15 * 60000);
                const delay = alertTime.getTime() - now.getTime();
                if (delay > 0) {
                  setTimeout(() => {
                    alert("¡Atención! Faltan 15 minutos para el CHORIZO Y MORCILLA.");
                  }, delay);
                  setAlertScheduled(prev => ({ ...prev, chorizo: true }));
                }
              }
            });
          }
          setTimeout(() => {
            const updatedProductos = pedido.productos.map(prod => ({ ...prod, visto: true }));
            updateDoc(doc(db, 'pedidos', pedido.id), { productos: updatedProductos })
              .catch(err => console.error("Error updating pedido visto:", err));
          }, 30000);
        }
      });
      prevPedidosRef.current = currentPedidos;
    });
    return () => unsubscribe();
  }, [alertScheduled]);

  // Configuración de la grilla para ProductCard
  const productCount = Math.min(cocinaProducts.length, 9);
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
      {/* Botón, calendario y turno */}
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
      {/* Sección de ProductCards */}
      <div className="p-6 flex-grow overflow-hidden">
        <div className={`grid gap-6 ${gridClass} h-full`}>
          {productsData.slice(0, 9).map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      </div>
      {/* Sección inferior: ensaladas y ensaladillas */}
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
