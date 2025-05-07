

import React from 'react';

const OperativaTienda = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 font-nunito">
      <h1 className="text-3xl font-bold text-yellow-500 mb-4">¡Próximamente!</h1>
      <p className="text-gray-600 text-md mb-6">Estamos trabajando en esta sección. Vuelve pronto ✨</p>
      <img
        src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGZyMGh0czV4ZXY2a2E1eW93eGU0Z3E2M3dmd2M0MGo5NWdpNjFydCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gHkZgoApCd4bHKh2vK/giphy.gif"
        alt="En desarrollo"
        className="w-64 h-auto rounded-xl shadow-lg"
      />
    </div>
  );
};

export default OperativaTienda;
