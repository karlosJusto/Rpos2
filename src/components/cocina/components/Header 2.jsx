import React from 'react';
//import { Clock } from 'lucide-react';
//          <Clock className="w-7 h-7" />

export function Header() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center bg-slate-800 text-white p-4 h-24 shadow-lg">
      <div className="flex items-center gap-6">
        <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg flex items-center gap-3 text-lg font-medium transition-colors">
          Nuevo Pedido
        </button>
        <div className="flex gap-3">
          <div className="bg-slate-700 px-6 py-2 rounded-lg">
            <span className="text-lg font-medium">1P</span>
            <div className="flex gap-4 mt-1">
              <button className="hover:text-slate-300 transition-colors">-5</button>
              <button className="hover:text-slate-300 transition-colors">+5</button>
            </div>
          </div>
          <div className="bg-slate-700 px-6 py-2 rounded-lg">
            <span className="text-lg font-medium">1/2P</span>
            <div className="flex gap-4 mt-1">
              <button className="hover:text-slate-300 transition-colors">-4</button>
              <button className="hover:text-slate-300 transition-colors">+4</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="bg-slate-600 px-8 py-2 rounded-lg text-center min-w-[120px]">
          <div className="text-3xl font-semibold">10</div>
          <div className="text-sm font-medium">En barra</div>
        </div>
        <div className="flex gap-3 items-center">
          <button className="hover:text-slate-300 transition-colors text-lg">+1</button>
          <button className="hover:text-slate-300 transition-colors text-lg">-1</button>
        </div>
        <div className="flex gap-3 items-center">
          <button className="hover:text-slate-300 transition-colors text-lg">+1/2</button>
          <button className="hover:text-slate-300 transition-colors text-lg">-1/2</button>
        </div>
        <div className="bg-slate-600 px-8 py-2 rounded-lg text-center min-w-[120px]">
          <div className="text-3xl font-semibold">4</div>
          <div className="text-sm font-medium">Libres</div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-lg font-medium transition-colors">
          FREIDORA
        </button>
        <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-lg font-medium transition-colors">
          PEDIDOS
        </button>
        <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-lg font-medium transition-colors">
          COCINA
        </button>
        <div className="bg-slate-700 px-6 py-3 rounded-lg text-2xl font-semibold min-w-[120px] text-center">
          {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}