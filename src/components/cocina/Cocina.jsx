import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { SaladCard } from './components/SaladCard';
import { db } from '../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const Cocina = () => {
  const [productsData, setProductsData] = useState([]);
  const [saladsData, setSaladsData] = useState([]);

  const parseFechaHora = (str) => {
    if (!str) return new Date(0);
    const [date, time] = str.split(' ');
    if (!date || !time) return new Date(0);
    const [day, month, year] = date.split('/');
    const [hour, minute] = time.split(':');
    return new Date(year, month - 1, day, hour, minute);
  };

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
                idPedido: pedido.id,       // Agregamos el id del pedido
                idProducto: prod.id,       // Agregamos el id del producto
                producto: prod,            // Objeto completo del producto (incluye "listo")
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

      Object.values(aggregatedProducts).forEach((product) => {
        product.orders.sort((a, b) => parseFechaHora(a.hora) - parseFechaHora(b.hora));
        product.pedidos = `${product.orders.length} (${product.pedidos})`;
      });

      setProductsData(Object.values(aggregatedProducts));
    });

    return () => unsubscribe();
  }, []);

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
      <div className="p-6 bg-gray-100 flex justify-center">
        <div className="flex gap-6 w-1/2">
          {saladsData.map((salad, index) => (
            <div key={index} className="w-1/2">
              <SaladCard salad={salad} className="h-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cocina;
