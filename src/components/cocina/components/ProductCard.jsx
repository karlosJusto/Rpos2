import React from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export function ProductCard({ product }) {
  const handleOrderClick = async (order) => {
    try {
      if (!order.idPedido) {
        console.error("El idPedido no está definido en la orden");
        return;
      }
      
      const pedidoRef = doc(db, "pedidos", order.idPedido);
      const pedidoSnap = await getDoc(pedidoRef);
      if (!pedidoSnap.exists()) {
        console.error("El pedido no existe");
        return;
      }
      const pedidoData = pedidoSnap.data();
  
      // Alternamos el valor de 'listo' para el producto correspondiente
      const productosActualizados = pedidoData.productos.map((prod) =>
        prod.id === order.idProducto ? { ...prod, listo: !prod.listo } : prod
      );
  
      await updateDoc(pedidoRef, { productos: productosActualizados });
      console.log(
        `Producto ${order.idProducto} del pedido ${order.idPedido} cambiado a ${order.producto.listo ? "no listo" : "listo"}.`
      );
  
      // Actualización local para reflejar el cambio (opcional)
      order.producto.listo = !order.producto.listo;
    } catch (error) {
      console.error("Error actualizando el pedido:", error);
    }
  };
  

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center p-1 border-b border-gray-200 bg-[#f2ac02]">
        <div className="truncate text-xs font-bold text-gray-800">
          {product.name}
        </div>
        <div className="flex gap-2 text-[10px]">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-600">STOCK</span>
            <span className="font-medium">{product.stock}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-gray-600">PEDIDOS</span>
            <span className="font-medium">{product.pedidos}</span>
          </div>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">
                HORA
              </th>
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">
                NOMBRE
              </th>
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">
                CANTIDAD
              </th>
            </tr>
          </thead>
          <tbody>
            {product.orders.map((order, index) => {
              const baseColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
              const rowClass =
                order.producto && order.producto.listo
                  ? "bg-green-500"
                  : baseColor;

              return (
                <tr
                  key={index}
                  className={`cursor-pointer ${rowClass} hover:bg-[#f2ac02] transition-colors`}
                  onClick={() => handleOrderClick(order)}
                >
                  <td className="py-1 px-2 border-t border-gray-100">
                    {order.hora}
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100 font-medium">
                    {order.nombre}
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100">
                    {order.cantidad}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
