

import React from 'react'

const CardsResultados = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-2 text-center font-nunito">
            {/* Tarjetas (no modificadas) */}
            <div className="p-2 rounded-xl shadow-md bg-blue-500 text-white ">
              <h2 className="text-sm font-medium">Ventas</h2>
              <p className="text-3xl font-bold my-2">$8,400</p>
              <p className="text-xs opacity-80">+12% que la semana pasada</p>
            </div>
            <div className="p-2 rounded-xl shadow-md bg-green-500 text-white">
              <h2 className="text-sm font-medium">Usuarios</h2>
              <p className="text-3xl font-bold my-2">1,230</p>
              <p className="text-xs opacity-80">+5% que ayer</p>
            </div>
            <div className="p-2 rounded-xl shadow-md bg-pink-500 text-white">
              <h2 className="text-sm font-medium">Pedidos</h2>
              <p className="text-3xl font-bold my-2">320</p>
              <p className="text-xs opacity-80">-2% que el mes pasado</p>
            </div>
            <div className="p-2 rounded-xl shadow-md bg-yellow-500 text-white">
              <h2 className="text-sm font-medium">Comentarios</h2>
              <p className="text-3xl font-bold my-2">75</p>
              <p className="text-xs opacity-80">+8 nuevos hoy</p>
            </div>
            <div className="p-2 rounded-xl shadow-md bg-indigo-500 text-white">
              <h2 className="text-sm font-medium">Clientes nuevos</h2>
              <p className="text-3xl font-bold my-2">53</p>
              <p className="text-xs opacity-80">Alta retención</p>
            </div>
            <div className="p-2 rounded-xl shadow-md bg-red-500 text-white">
              <h2 className="text-sm font-medium">Alertas</h2>
              <p className="text-3xl font-bold my-2">9</p>
              <p className="text-xs opacity-80">3 críticas</p>
            </div>
          </div>
  )
}

export default CardsResultados
