
import React from 'react'
import tienda from '../../../../src/assets/tienda.png';
import web from '../../../../src/assets/web.png';

const ContadorPedidosMedios = ({ averageWebOrder = 0, averageTiendaOrder = 0, loading }) => {
  
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
        <h1 className="font-nunito text-md bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent font-semibold mt-[0.4vh]">
          Pedido Medio
        </h1>
      </div>

      <div className="flex items-center justify-center gap-1 border-1 border-gray-500 py-2 px-4 rounded-md mt-3 shadow-md">
        <img src={tienda} alt="Icono tienda" className="w-6 h-6" /> 
       
        <span className='font-nunito text-sm text-white font-bold ms-1'>Tienda: <span className='font-extrabold ms-1 me-3'>{averageTiendaOrder.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></span>
      </div>

      <div className="flex items-center justify-center gap-1 border-1 border-gray-500 py-2 px-4 rounded-md mt-4 shadow-md">
        <img src={web} alt="Icono web" className="w-6 h-6" /> 
         
        <span className='font-nunito text-sm text-white font-bold ms-1'>Web: <span className='font-extrabold ms-1 me-3'>{averageWebOrder.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></span>
      </div>
    </>
  );
}

export default ContadorPedidosMedios