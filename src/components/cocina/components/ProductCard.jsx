import React from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

function ProductCard({ product }) {
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

  console.log({product})





  
  

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#F3F3F3] shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center p-1 border-b border-gray-200 bg-gray-700">
        <div className="truncate text-xl  text-white font-nunito flex p-2">
          {product.name}
        </div>
        <div className="flex gap-4 text-[15px] font-nunito me-4">
          <div className="flex flex-col items-center  ">
            <span className="font-semibold text-white ">STOCK</span>
            <span className="font-medium text-white">{product.stock}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold text-white">PEDIDOS</span>
            <span className="font-medium text-white">{product.pedidos} <span className="px-1 ">[ 0 ]</span></span> 
          </div>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[15px] font-nunito ">
          <thead className="bg-gray-50 sticky top-0 text-center">
            <tr>
              <th className="py-1 px-2  text-gray-900 font-semibold ">
                HORA
              </th>
              <th className="py-1 px-2  text-gray-900 font-semibold">
                PEDIDO
              </th>
              <th className="py-1 px-2  text-gray-900 font-semibold">
                NOMBRE
              </th>
              <th className="py-1 px-2  text-gray-900 font-semibold">
                CANTIDAD
              </th>
              <th className="py-1 px-2  text-gray-900 font-semibold">
                DESCRIPCION
              </th>
            </tr>
          </thead>
          <tbody>
            {product.orders.map((order, index) => {
              console.log(order);

              const baseColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
              const rowClass =
                order.producto && order.producto.listo
                  ? "bg-[#52be80]"
                  : baseColor;

              return (
                <tr
                  key={index}
                  className={`cursor-pointer ${rowClass} hover:bg-gray-200 transition-colors`}
                  onClick={() => handleOrderClick(order)}
                >
                  <td className="py-1 px-2 border-t border-gray-100 text-center text-lg font-nunito">
                  {dayjs(order.hora, "DD/MM/YYYY HH:mm").format("HH:mm")}
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100  text-center text-lg font-nunito font-bold">
                   {order.idPedido}  
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100 font-medium text-center text-lg font-nunito">
                    {order.nombre}
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100 text-center text-lg font-nunito">
                    {order.cantidad}
                  </td>
                  <td className="py-1 px-2 border-t border-gray-100 text-center text-lg font-nunito truncate">
                    {order.descripcion}
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

export default ProductCard;