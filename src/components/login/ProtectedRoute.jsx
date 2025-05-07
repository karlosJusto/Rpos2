import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Comprueba si el nombre del empleado existe en sessionStorage
  const empleadoNombre = sessionStorage.getItem('empleadoNombre');

  // Si no hay nombre de empleado, redirige a la página de login
  if (!empleadoNombre) {
    // Puedes añadir un mensaje o estado si quieres informar al usuario
    console.log("Acceso denegado: Usuario no autenticado. Redirigiendo a /login");
    // 'replace' evita que la ruta protegida quede en el historial del navegador
    return <Navigate to="/login" replace />;
  }

  // Si hay nombre de empleado, permite el acceso a la ruta solicitada
  // <Outlet /> renderizará el componente hijo definido en la ruta
  return <Outlet />;
};

export default ProtectedRoute;