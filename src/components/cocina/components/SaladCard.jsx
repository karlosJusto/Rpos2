import React, { useState } from 'react';

export function SaladCard({ salad }) {
  const [grandesPreparadas, setGrandesPreparadas] = useState(salad.grandes.preparadas);
  const [pequenasPreparadas, setPequenasPreparadas] = useState(salad.pequenas.preparadas);

  const incrementGrandes = () => setGrandesPreparadas(prev => prev + 1);
  const decrementGrandes = () => setGrandesPreparadas(prev => prev - 1);
  
  const incrementPequenas = () => setPequenasPreparadas(prev => prev + 1);
  const decrementPequenas = () => setPequenasPreparadas(prev => prev - 1);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm h-full">
      <div className="p-2">
        <div className="text-sm font-bold text-gray-800 mb-2">{salad.name}</div>
        <div className="grid grid-cols-2 gap-4">
          {/* GRANDES */}
          <div>
            <div className="font-semibold text-center text-gray-600 mb-1 text-xs">GRANDES</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-center text-gray-500 mb-1">PREPARADAS</div>
                <div className="flex items-center justify-center space-x-1">
                  <button 
                    onClick={decrementGrandes} 
                    className="px-1 text-sm border rounded"
                  >
                    -
                  </button>
                  <span className="text-sm font-medium">{grandesPreparadas}</span>
                  <button 
                    onClick={incrementGrandes} 
                    className="px-1 text-sm border rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-center text-gray-500 mb-1">PEDIDAS</div>
                <div className="text-center text-sm font-medium">{salad.grandes.pedidas}</div>
              </div>
            </div>
          </div>
          {/* PEQUEÑAS */}
          <div>
            <div className="font-semibold text-center text-gray-600 mb-1 text-xs">PEQUEÑAS</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-center text-gray-500 mb-1">PREPARADAS</div>
                <div className="flex items-center justify-center space-x-1">
                  <button 
                    onClick={decrementPequenas} 
                    className="px-1 text-sm border rounded"
                  >
                    -
                  </button>
                  <span 
                    className={`text-sm font-medium ${
                      pequenasPreparadas < salad.pequenas.pedidas ? 'bg-red-50 text-red-600' : ''
                    }`}
                  >
                    {pequenasPreparadas}
                  </span>
                  <button 
                    onClick={incrementPequenas} 
                    className="px-1 text-sm border rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-center text-gray-500 mb-1">PEDIDAS</div>
                <div className="text-center text-sm font-medium">{salad.pequenas.pedidas}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
