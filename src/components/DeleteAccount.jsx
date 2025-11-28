/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from 'react';

// Este es el componente principal de la aplicación.
// Contiene toda la lógica para el formulario de eliminación de cuenta.
export default function DeleteAccount() {
    const [email, setEmail] = useState('');
  // 'idle' | 'loading' | 'requested' | 'error'
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  // Maneja el envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, introduce tu correo electrónico.');
      setStatus('error');
      return;
    }

    console.log('Iniciando solicitud de eliminación para:', email);
    setStatus('loading');
    setError(null);

    // Simula una llamada a la API
    setTimeout(() => {
      // Simula una respuesta exitosa
      console.log('Solicitud exitosa.');
      setStatus('requested');
    }, 1500); // Simula 1.5 segundos de carga
  };

  // Maneja la cancelación de la solicitud
  const handleCancel = () => {
    console.log('Cancelando solicitud de eliminación para:', email);
    setStatus('loading');

    // Simula una llamada a la API para cancelar
    setTimeout(() => {
      console.log('Cancelación exitosa.');
      setStatus('idle');
      setEmail(''); // Limpia el email después de cancelar
    }, 1000); // Simula 1 segundo de carga
  };

  // Renderiza el contenido principal
  const renderContent = () => {
    switch (status) {
      case 'requested':
        return (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-green-700">Solicitud Recibida</h2>
            <p className="mt-2 text-gray-600">
              Hemos recibido tu solicitud para eliminar la cuenta asociada con <strong>{email}</strong>.
            </p>
            <p className="mt-2 text-gray-600">
              Tu cuenta se eliminará permanentemente en un plazo de <strong>7 días</strong>.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Si cambias de opinión, puedes cancelar esta solicitud.
            </p>
            <button
              onClick={handleCancel}
              className="mt-6 w-full inline-flex justify-center rounded-md border border-transparent bg-gray-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar Solicitud de Eliminación
            </button>
          </div>
        );
      case 'loading':
        return (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            <span className="ml-3 text-gray-700">Procesando...</span>
          </div>
        );
      default: // 'idle' o 'error'
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                />
              </div>
            </div>

            {status === 'error' && error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div>
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Solicitar Eliminación de Cuenta
              </button>
            </div>

            <p className="text-center text-sm text-gray-600">
              Al confirmar, tu cuenta se eliminará permanentemente en 7 días.
            </p>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <svg className="mx-auto h-12 w-auto text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>

        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Eliminar tu Cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          ¿Estás seguro de que quieres irte?
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}