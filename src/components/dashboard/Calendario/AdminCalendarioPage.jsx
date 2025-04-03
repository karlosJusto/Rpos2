import React from 'react';
import ConfiguracionCalendario from './ConfiguracionCalendario'; // Ajusta la ruta
import VistaDiariaTabs from './VistaDiariaTabs'; // Ajusta la ruta
// Si tu OrderProvider no está ya en un nivel superior, impórtalo
// import { OrderProvider } from '../../Context/OrderProviderContext'; // Ajusta la ruta

function AdminCalendarioPage() {
  return (
    // Si necesitas el provider aquí:
    // <OrderProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4 space-y-8">
        {/* Componente para configurar la semana */}
        <ConfiguracionCalendario />

        {/* Componente para ver los intervalos diarios del día seleccionado */}
        <VistaDiariaTabs />
      </div>
    // </OrderProvider>
  );
}

export default AdminCalendarioPage;