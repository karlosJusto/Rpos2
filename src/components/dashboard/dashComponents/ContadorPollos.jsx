import React from 'react'; // Eliminado useState y useEffect
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Ya no se necesita Firebase aquí
import dayjs from 'dayjs'; // Se mantiene por si se usa para formateo en Tooltip o similar, aunque no es estrictamente necesario ahora
import 'dayjs/locale/es'; 

dayjs.locale('es');

// Ahora recibe chartData, loading y error como props
const ContadorPollos = ({ chartData = [], loading, error }) => { 

  if (loading) {
    return (
      <div className="flex justify-center items-center p-2 h-full">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    // Podrías mostrar un mensaje de error más específico si el error se pasa como prop
    return <div className="p-2 text-center text-red-500 font-nunito">Error al cargar datos de ventas de pollos.</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className='flex justify-center items-center p-2'>
        <h1 className="font-nunito text-md bg-gradient-to-r from-yellow-700 to-yellow-500 bg-clip-text text-transparent font-semibold">
          Ventas Pollos (Últimos 7 Días)
        </h1>
      </div>
      {chartData.length === 0 && !loading && (
        <p className="text-center text-sm text-gray-400 font-nunito mt-4">No hay datos de ventas de pollos para mostrar.</p>
      )}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height="100%" minHeight={200}> {/* Ajusta minHeight según necesites */}
          <BarChart
            data={chartData} // Usa los datos de las props
            margin={{
              top: 5,
              right: 20, 
              left: -20,  
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#555" /> 
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#ccc' }} /> 
            <YAxis tick={{ fontSize: 10, fill: '#ccc' }} /> 
            <Tooltip
              contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '5px' }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              itemStyle={{ color: '#F59E0B' }} // Ajustado color para coincidir con la barra
              formatter={(value) => [`${value} uds`, "Ventas"]} // Formateador para el tooltip
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="Ventas" fill="#F59E0B" barSize={20} name="Pollos Vendidos" /> {/* Añadido 'name' para la leyenda */}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default ContadorPollos;
