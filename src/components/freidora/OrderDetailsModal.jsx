import React from 'react';

const OrderDetailsModal = ({ isOpen, onClose, data, timeBlock }) => {
  if (!isOpen || !data || data.length === 0) {
    return null;
  }
  const modalTitle = `Desglose de Pedidos (${timeBlock})`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 font-nunito"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{modalTitle}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Mapeamos cada categoría (ej: "Patatas Dobles", "Patatas Individuales") */}
          {data.map((aggregatedItem, itemIndex) => (
            <div key={itemIndex} className="mb-4 last:mb-0">
              {/* CAMBIO: Se elimina la cantidad del título de la categoría */}
              <h3 className="font-bold text-lg text-blue-600 border-b-2 border-blue-200 pb-1 mb-2">
                {aggregatedItem.alias}
              </h3>
              {/* Mapeamos el desglose de pedidos que componen esa categoría */}
              <ul className="space-y-1 pl-2">
                {aggregatedItem.breakdown.map((order, orderIndex) => (
                  <li key={orderIndex} className="bg-gray-100 p-2 rounded-md flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-700">
                      Pedido: {order.numeropedido}
                    </span>
                    <span className="text-gray-600">
                      x {order.contributed_portions} {aggregatedItem.doble ? 'doble(s)' : ''} (Total pedido: {order.original_total})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
