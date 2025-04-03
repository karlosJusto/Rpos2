import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { SaladTypeCard } from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const Cocina = () => {
  // Estado para productos de la colección "cocina"
  const [cocinaProducts, setCocinaProducts] = useState([]);
  // Estado para los pedidos agrupados según los productos de cocina
  const [productsData, setProductsData] = useState([]);
  // Estado para ensaladas/ensaladillas
  const [saladsData, setSaladsData] = useState([]);
  // Estado para la fecha seleccionada (por defecto, la fecha actual)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Estado para mostrar/ocultar el input de calendario
  const [showCalendar, setShowCalendar] = useState(false);

  // Estado para evitar reprogramar alertas específicas en el mismo turno
  const [alertScheduled, setAlertScheduled] = useState({ codillos: false, chorizo: false });
  // Ref para almacenar los pedidos previos y detectar nuevos
  const prevPedidosRef = useRef([]);

  // --- 1. Suscripción a la colección "cocina" ---
  useEffect(() => {
    const cocinaRef = collection(db, 'cocina');
    const unsubscribeCocina = onSnapshot(cocinaRef, (querySnapshot) => {
      const productos = [];
      querySnapshot.forEach((doc) => {
        // Se asume que el id del documento es numérico (si no, omite parseInt)
        productos.push({ id: parseInt(doc.id), ...doc.data() });
      });
      setCocinaProducts(productos);
    });
    return () => unsubscribeCocina();
  }, []);

  // --- 2. Función para determinar el turno actual ---
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

  // --- 3. Manejo del cambio de fecha desde el calendario ---
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  // Determinar el texto del turno
  const isToday = selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  let turnoText = '';
  if (isToday) {
    const now = new Date();
    turnoText = (now.getHours() < 18 || (now.getHours() === 18 && now.getMinutes() === 0))
      ? 'Turno de mañana'
      : 'Turno de tarde';
  } else {
    turnoText = 'Mostrando todos los pedidos del día';
  }

  // --- 4. Lógica para agrupar pedidos en ProductCard ---
  useEffect(() => {
    if (cocinaProducts.length === 0) return;
    
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      // Convertir la fecha seleccionada a "dd/mm/yyyy"
      const selectedDateStr = selectedDate.toLocaleDateString('es-ES');
      const todayStr = new Date().toLocaleDateString('es-ES');

      // Filtrar pedidos del día seleccionado y, en caso de hoy, por turno
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

      // Generar IDs válidos a partir de "cocina"
      const validProductIds = cocinaProducts.map(product => product.id);

      // Objeto para agrupar los pedidos por producto
      const aggregatedProducts = {};

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            if (validProductIds.includes(prod.id)) {
              if (!aggregatedProducts[prod.id]) {
                aggregatedProducts[prod.id] = {
                  name: prod.nombre,
                  stock: 8, // valor por defecto; se actualizará si se encuentra en cocinaProducts
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
                descripcion: prod.observaciones || "",
              });
              aggregatedProducts[prod.id].pedidos += prod.cantidad;
            }
          });
        }
      });

      // Incluir todos los productos válidos, incluso sin pedidos
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

      // Ordenar los productos según el orden definido en cocinaProducts
      const sortedProducts = cocinaProducts.map(product => aggregatedProducts[product.id]);
      setProductsData(sortedProducts);
    });

    return () => unsubscribe();
  }, [selectedDate, cocinaProducts]);

  // --- 5. Lógica para ensaladas y ensaladillas ---
  // Se usa la fecha seleccionada como id de documento (formato "dd-mm-yyyy")
  const todayDocId = selectedDate.toLocaleDateString('es-ES').replace(/\//g, '-');

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
        setDoc(saladsRef, initialData);
        setSaladsData([initialData]);
      }
    });
    return () => unsubscribe();
  }, [todayDocId]);

  // --- 6. Actualizar "pedidas" en ensaladas/ensaladillas ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      const selectedDateStr = selectedDate.toLocaleDateString('es-ES');
      const todayStr = new Date().toLocaleDateString('es-ES');

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

      let ensaladasPedidasGr = 0;
      let ensaladasPedidasPeq = 0;
      let ensaladillasPedidasGr = 0;
      let ensaladillasPedidasPeq = 0;

      pedidosDelDia.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
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
      updateDoc(saladsRef, {
        "ensaladas.grandes.pedidas": ensaladasPedidasGr,
        "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
        "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
        "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
      }).catch(err => console.error("Error updating salad pedidas:", err));
    });
    return () => unsubscribe();
  }, [selectedDate, todayDocId]);

  // --- Función para actualizar la cantidad de "preparadas" en Firebase ---
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

  // --- 7. Lógica para alertas de nuevos pedidos y actualización de la propiedad "visto" ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const currentPedidos = [];
      querySnapshot.forEach((doc) => {
        currentPedidos.push({ id: doc.id, ...doc.data() });
      });

      currentPedidos.forEach((pedido) => {
        // Detectamos si el pedido es nuevo
        const isNewOrder = !prevPedidosRef.current.find((p) => p.id === pedido.id);
        // Se verifica si al menos uno de los productos no tiene la propiedad "visto" (o es false)
        const hasUnseen = pedido.productos && pedido.productos.some(prod => !prod.visto);
        if (isNewOrder && hasUnseen) {
          const productosNombres = pedido.productos
            ? pedido.productos.map(p => p.nombre).join(', ')
            : 'Sin productos';
          console.log(`Nuevo pedido de ${pedido.cliente}. Productos: ${productosNombres}`);

          // Programar alertas para productos específicos
          if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach((prod) => {
              const nombreProd = prod.nombre.toLowerCase();
              const now = new Date();
              const { endTime } = getTurnoActual();

              // Para "codillos" o "costillas": alert 30 minutos antes del fin del turno
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

              // Para "chorizo" o "morcilla": alert 15 minutos antes del fin del turno
              if ((nombreProd.includes('chorizo') || nombreProd.includes('morcilla')) && !alertScheduled.chorizo) {
                const alertTime = new Date(endTime.getTime() - 15 * 60000);
                const delay = alertTime.getTime() - now.getTime();
                if (delay > 0) {
                  setTimeout(() => {
                    console.log("¡Atención! Faltan 15 minutos para el CHORIZO Y MORCILLA.");
                  }, delay);
                  setAlertScheduled(prev => ({ ...prev, chorizo: true }));
                }
              }
            });
          }

          // Después de 30 segundos, actualizamos el pedido en la colección "pedidos"
          // modificando el campo "productos": se establece "visto" a true en cada producto
          setTimeout(() => {
            const updatedProductos = pedido.productos.map(prod => ({ ...prod, visto: true }));
            updateDoc(doc(db, 'pedidos', pedido.id), { productos: updatedProductos })
              .catch(err => console.error("Error updating pedido visto:", err));
          }, 30000);
        }
      });
      // Actualizamos la referencia de pedidos previos
      prevPedidosRef.current = currentPedidos;
    });
    return () => unsubscribe();
  }, [alertScheduled]);

  // --- 8. Configurar la grilla para ProductCard según los productos en "cocina" ---
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
      {/* Botón, calendario y texto de turno */}
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
