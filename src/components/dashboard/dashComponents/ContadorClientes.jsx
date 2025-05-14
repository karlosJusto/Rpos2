import React from 'react';
import tienda from '../../../../src/assets/tienda.png';
import web from '../../../../src/assets/web.png';
import todos from '../../../../src/assets/todos.png';


const ContadorClientes = ({
  totalClients = 0,
  webClients = 0,
  tiendaClients = 0,
  // Ya no se reciben props de previousDay para clientes
  loading
}) => {

  if (loading) {
    return (
        <div className="flex justify-center items-center p-2 h-full">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        
      </div>
    );
  }

  return (
    <>
      <div className='flex justify-center items-center p-2'>
        <h1 className="font-nunito text-md bg-gradient-to-r from-yellow-700 to-yellow-600 bg-clip-text text-transparent font-semibold">
          Resumen de Clientes
        </h1>
      </div>

      <div className="flex items-center justify-center gap-1 border-1 border-gray-500 py-3 px-4 rounded-md mt-1 shadow-md">
        <img src={tienda} alt="Icono tienda" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-1'>Clientes Tienda: <span className='font-extrabold ms-1 me-3 '>{tiendaClients}</span></span>
        {/* Ya no hay flecha de comparación para clientes por día */}
      </div>

      <div className="flex items-center justify-center gap-1 border-1  border-gray-500 py-3 px-4 rounded-md mt-2 shadow-md">
        {/* <img src={iconoClienteWeb} alt="Icono clientes web" className="w-6 h-6" /> */}
        <img src={web} alt="Icono tienda" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-3'>Clientes Web: <span className='font-extrabold ms-1 me-3 text-green-700'>{webClients}</span></span>
        {/* Ya no hay flecha de comparación para clientes por día */}
      </div>

      <div className="flex items-center justify-center gap-1 border-1   border-gray-500 py-3 px-4 rounded-md mt-2 shadow-md">
        {/* <img src={iconoClientesTodos} alt="Icono total clientes" className="w-6 h-6" /> */}
        <img src={todos} alt="Icono tienda" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-1'>Clientes Totales: <span className='font-extrabold ms-1 me-3'>{totalClients}</span></span>
        {/* Ya no hay flecha de comparación para clientes por día */}
      </div>
    </>
  );
}

export default ContadorClientes;
