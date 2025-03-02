import React from 'react';

export function ProductCard({ product }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center p-1 border-b border-gray-200">
        <div className="truncate text-xs font-bold text-gray-800">{product.name}</div>
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
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">HORA</th>
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">NOMBRE</th>
              <th className="py-1 px-2 text-left text-gray-600 font-semibold">CANTIDAD</th>
            </tr>
          </thead>
          <tbody>
            {product.orders.map((order, index) => (
              <tr 
                key={index} 
                className={`
                  ${index % 2 === 0 ? 'bg-green-50' : 'bg-white'}
                  hover:bg-gray-50 transition-colors
                `}
              >
                <td className="py-1 px-2 border-t border-gray-100">{order.hora}</td>
                <td className="py-1 px-2 border-t border-gray-100 font-medium">{order.nombre}</td>
                <td className="py-1 px-2 border-t border-gray-100">{order.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
