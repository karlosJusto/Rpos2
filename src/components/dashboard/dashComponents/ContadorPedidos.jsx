import React from 'react';
import tienda from '../../../../src/assets/tienda.png';
import web from '../../../../src/assets/web.png';
import todos from '../../../../src/assets/todos.png';

const ContadorPedidos = ({
  totalOrders = 0,
  webOrders = 0,
  tiendaOrders = 0,
  previousDayTotalOrders, 
  previousDayWebOrders,   // Nueva prop
  previousDayTiendaOrders, // Nueva prop
  loading
}) => {

  // Determinar si se debe mostrar la flecha de comparación
  const showComparisonArrowTotal = previousDayTotalOrders !== null && previousDayTotalOrders !== undefined;
  const showComparisonArrowWeb = previousDayWebOrders !== null && previousDayWebOrders !== undefined;
  const showComparisonArrowTienda = previousDayTiendaOrders !== null && previousDayTiendaOrders !== undefined;

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
        <h1 className="font-nunito text-md bg-gradient-to-r from-yellow-700 to-yellow-500 bg-clip-text text-transparent font-semibold">
          Resumen de Pedidos
        </h1>
      </div>

      <div className="flex items-center justify-center gap-1 border-1 border-gray-400 py-3 px-4 rounded-md mt-1 shadow-sm">
        <img src={tienda} alt="Icono tienda" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-1'>Pedidos Tienda: <span className='font-extrabold ms-1 me-3'>{tiendaOrders}</span></span>
        {showComparisonArrowTienda && tiendaOrders > previousDayTiendaOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
        {showComparisonArrowTienda && tiendaOrders < previousDayTiendaOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
        {showComparisonArrowTienda && tiendaOrders === previousDayTiendaOrders && (
          <span className="text-gray-400 text-xl mx-1 font-bold">~</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 border-1 border-gray-400 py-3 px-4 rounded-md mt-2 shadow-md">
        <img src={web} alt="Icono online" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-1'>Pedidos Online: <span className='font-extrabold ms-1 me-3'>{webOrders}</span></span>
        {showComparisonArrowWeb && webOrders > previousDayWebOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
        {showComparisonArrowWeb && webOrders < previousDayWebOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
        {showComparisonArrowWeb && webOrders === previousDayWebOrders && (
          <span className="text-gray-400 text-xl mx-1 font-bold">~</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 border-1  border-gray-400 py-3 px-4 rounded-md mt-2 shadow-md"> 
        <img src={todos} alt="Icono todos los pedidos" className="w-6 h-6" />
        <span className='font-nunito text-sm text-white font-bold ms-1'>Pedidos Totales: <span className='font-extrabold ms-1 me-3'>{totalOrders}</span></span>
        {showComparisonArrowTotal && totalOrders > previousDayTotalOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
        {showComparisonArrowTotal && totalOrders < previousDayTotalOrders && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
{showComparisonArrowTotal && totalOrders === previousDayTotalOrders && (
          <span className="text-gray-400 text-xl mx-1 font-bold">~</span> 
        )}
      </div>
    </>
  )
}

export default ContadorPedidos;
