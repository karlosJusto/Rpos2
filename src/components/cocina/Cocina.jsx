import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { SaladTypeCard } from './components/SaladTypeCard';
import { db } from '../firebase/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const Cocina = () => {
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);

  // --- Lógica para ProductCard (pedidos) ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      // Obtener fecha de hoy en formato "dd/mm/yyyy"
      const today = new Date();
      const todayStr = today.toLocaleDateString('es-ES');

      // Filtrar pedidos del día actual usando "fechahora_realizado"
      const pedidosHoy = pedidos.filter((pedido) => {
        if (!pedido.fechahora_realizado) return false;
        const fechaPedido = pedido.fechahora_realizado.split(' ')[0];
        return fechaPedido === todayStr;
      });

      // IDs de productos válidos para pintar en ProductCard
      const validProductIds = [20, 24, 3, 41];
      const aggregatedProducts = {};

      pedidosHoy.forEach((pedido) => {
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
  }, []);

  // --- Lógica para ensaladas y ensaladillas en Firestore ---
  // Usamos la fecha de hoy como id de documento en la colección "ensaladas"
  const todayDocId = new Date().toLocaleDateString('es-ES').replace(/\//g, '-'); // "dd-mm-yyyy"

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

  // --- Nueva lógica: Agregar actualización de "pedidas" para ensaladas/ensaladillas a partir de los pedidos ---
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(pedidosRef, (querySnapshot) => {
      const pedidos = [];
      querySnapshot.forEach((doc) => {
        pedidos.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar pedidos del día actual
      const today = new Date();
      const todayStr = today.toLocaleDateString('es-ES');
      const pedidosHoy = pedidos.filter((pedido) => {
        if (!pedido.fechahora_realizado) return false;
        const fechaPedido = pedido.fechahora_realizado.split(' ')[0];
        return fechaPedido === todayStr;
      });

      // Inicializamos contadores para cada tipo y tamaño
      let ensaladasPedidasGr = 0;
      let ensaladasPedidasPeq = 0;
      let ensaladillasPedidasGr = 0;
      let ensaladillasPedidasPeq = 0;

      // Iteramos cada pedido y cada producto
      pedidosHoy.forEach((pedido) => {
        if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((prod) => {
            // Si el producto es de ensaladas (id 12)
            if (prod.id === 12) {
              // Se asume que prod.size indica el tamaño ("grande" o "pequeña")
              if (prod.size && prod.size.toLowerCase().includes('peque')) {
                ensaladasPedidasPeq += prod.cantidad;
              } else {
                ensaladasPedidasGr += prod.cantidad;
              }
            }
            // Si el producto es de ensaladillas (id 13)
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

      // Actualizamos el documento de "ensaladas" con los nuevos valores de pedidas
      const saladsRef = doc(db, 'ensaladas', todayDocId);
      updateDoc(saladsRef, {
        "ensaladas.grandes.pedidas": ensaladasPedidasGr,
        "ensaladas.pequenas.pedidas": ensaladasPedidasPeq,
        "ensaladillas.grandes.pedidas": ensaladillasPedidasGr,
        "ensaladillas.pequenas.pedidas": ensaladillasPedidasPeq,
      }).catch(err => console.error("Error updating salad pedidas:", err));
    });

    return () => unsubscribe();
  }, [todayDocId]);

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
