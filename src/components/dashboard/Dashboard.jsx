// src/components/dashboard/Dashboard.jsx
import React from 'react';
// *** 1. Importa NavLink en lugar de Link ***
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import favicon from '../../assets/favicon.png';

const Dashboard = () => {

  const navigate = useNavigate(); // Obtén la función navigate
  

  // Define las clases base y las clases activas para reutilizar
  const baseLinkClass = "flex items-center gap-2 hover:text-yellow-500 cursor-pointer p-2 rounded-md transition-colors duration-150";
  const activeLinkClass = "text-yellow-500 font-bold "; // Clases cuando el enlace está activo
  const inactiveLinkClass = "text-gray-500"; // Clases cuando el enlace está inactivo (puedes ajustar)

  const handleLogout = () => {
    sessionStorage.removeItem('empleadoNombre');
    // Limpia cualquier otro estado relacionado si es necesario
    navigate('/login');
  };

  return (
    <div className="p-2">
      <div className="flex h-[calc(100vh-1rem)] overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-[#F3F3F3] text-gray-500 p-4 ms-3 rounded-xl overflow-y-auto max-h-screen flex-shrink-0">
          <img src={favicon} alt="logo empresa" className="h-12 w-12 mx-auto mb-10" />
          {/* *** 2. Usa NavLink y la función className *** */}
          <ul className="space-y-4 font-nunito text-center"> {/* Ajustado space-y */}
            {/* Enlace al Dashboard principal con prop 'end' */}
            <li>
              <NavLink
                to="/dashboard"
                end // <-- Importante para que solo coincida con /dashboard exacto
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* SVG Dashboard */}
                  <g id="SVGRepo_iconCarrier"> <path d="M2.55078 4.5C2.61472 3.84994 2.75923 3.41238 3.08582 3.08579C3.67161 2.5 4.61442 2.5 6.50004 2.5C8.38565 2.5 9.32846 2.5 9.91425 3.08579C10.5 3.67157 10.5 4.61438 10.5 6.5C10.5 8.38562 10.5 9.32843 9.91425 9.91421C9.32846 10.5 8.38565 10.5 6.50004 10.5C4.61442 10.5 3.67161 10.5 3.08582 9.91421C2.77645 9.60484 2.63047 9.19589 2.56158 8.60106" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> <path d="M21.4493 15.5C21.3853 14.8499 21.2408 14.4124 20.9142 14.0858C20.3284 13.5 19.3856 13.5 17.5 13.5C15.6144 13.5 14.6716 13.5 14.0858 14.0858C13.5 14.6716 13.5 15.6144 13.5 17.5C13.5 19.3856 13.5 20.3284 14.0858 20.9142C14.6716 21.5 15.6144 21.5 17.5 21.5C19.3856 21.5 20.3284 21.5 20.9142 20.9142C21.2408 20.5876 21.3853 20.1501 21.4493 19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> <path d="M2.5 17.5C2.5 15.6144 2.5 14.6716 3.08579 14.0858C3.67157 13.5 4.61438 13.5 6.5 13.5C8.38562 13.5 9.32843 13.5 9.91421 14.0858C10.5 14.6716 10.5 15.6144 10.5 17.5C10.5 19.3856 10.5 20.3284 9.91421 20.9142C9.32843 21.5 8.38562 21.5 6.5 21.5C4.61438 21.5 3.67157 21.5 3.08579 20.9142C2.5 20.3284 2.5 19.3856 2.5 17.5Z" stroke="currentColor" strokeWidth="1.5"/> <path d="M13.5 6.5C13.5 4.61438 13.5 3.67157 14.0858 3.08579C14.6716 2.5 15.6144 2.5 17.5 2.5C19.3856 2.5 20.3284 2.5 20.9142 3.08579C21.5 3.67157 21.5 4.61438 21.5 6.5C21.5 8.38562 21.5 9.32843 20.9142 9.91421C20.3284 10.5 19.3856 10.5 17.5 10.5C15.6144 10.5 14.6716 10.5 14.0858 9.91421C13.5 9.32843 13.5 8.38562 13.5 6.5Z" stroke="currentColor" strokeWidth="1.5"/> </g>
                </svg>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/listaProductos"
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* SVG Productos */}
                  <g id="SVGRepo_iconCarrier"> <path d="M15 12L12 12M12 12L9 12M12 12L12 9M12 12L12 15" stroke="currentColor" strokeWidth="1.30" strokeLinecap="round"/> <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.30" strokeLinecap="round"/> </g>
                </svg>
                Productos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/calendarioPollos"
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* SVG Calendario */}
                  <g id="SVGRepo_iconCarrier"> <path d="M14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C20.1752 21.4816 19.3001 21.7706 18 21.8985" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M7 4V2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M17 4V2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M21.5 9H16.625H10.75M2 9H5.875" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M18 17C18 17.5523 17.5523 18 17 18C16.4477 18 16 17.5523 16 17C16 16.4477 16.4477 16 17 16C17.5523 16 18 16.4477 18 17Z" fill="currentColor"/> <path d="M18 13C18 13.5523 17.5523 14 17 14C16.4477 14 16 13.5523 16 13C16 12.4477 16.4477 12 17 12C17.5523 12 18 12.4477 18 13Z" fill="currentColor"/> <path d="M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17Z" fill="currentColor"/> <path d="M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11.4477 12 12 12C12.5523 12 13 12.4477 13 13Z" fill="currentColor"/> <path d="M8 17C8 17.5523 7.55228 18 7 18C6.44772 18 6 17.5523 6 17C6 16.4477 6.44772 16 7 16C7.55228 16 8 16.4477 8 17Z" fill="currentColor"/> <path d="M8 13C8 13.5523 7.55228 14 7 14C6.44772 14 6 13.5523 6 13C6 12.4477 6.44772 12 7 12C7.55228 12 8 12.4477 8 13Z" fill="currentColor"/> </g>
                </svg>
                Calendario
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/listarClientes"
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* SVG Clientes */}
                  <g id="SVGRepo_iconCarrier"> <circle cx="12" cy="9" r="3" stroke="currentColor" strokeWidth="1.3"/> <path d="M17.9691 20C17.81 17.1085 16.9247 15 11.9999 15C7.07521 15 6.18991 17.1085 6.03076 20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> </g>
                </svg>
                Clientes
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/empleados"
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* SVG Empleados */}
                  <g id="SVGRepo_iconCarrier"> <path d="M22 12C22 15.7712 22 17.6569 20.8284 18.8284C19.6569 20 17.7712 20 14 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C21.4816 5.82475 21.7706 6.69989 21.8985 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> <path d="M9 12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11C8.55228 11 9 11.4477 9 12Z" fill="currentColor"/> <path d="M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12Z" fill="currentColor"/> <path d="M17 12C17 12.5523 16.5523 13 16 13C15.4477 13 15 12.5523 15 12C15 11.4477 15.4477 11 16 11C16.5523 11 17 11.4477 17 12Z" fill="currentColor"/> </g>
                </svg>
                Empleados
              </NavLink>
            </li>
            {/* Enlaces que NO son sub-rutas de /dashboard */}
            <li>
              <NavLink
                to="/dashboard/filtrarPedidos"
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575">
                  {/* SVG Pedidos */}
                  <g id="SVGRepo_iconCarrier"> <path d="M11 6C13.7614 6 16 8.23858 16 11M16.6588 16.6549L21 21M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/> </g>
                </svg>
                Pedidos
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/dashboard/OperativaTienda" // O simplemente /layout si esa es la ruta principal
                className={({ isActive }) =>
                  // NavLink puede marcar como activo si la ruta empieza con /layout
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 15 15" version="1.1" id="warehouse" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor" strokeWidth="0.00015">
                  {/* SVG Op. Tienda */}
                  <g id="SVGRepo_iconCarrier"> <path d="M13.5,5c-0.0762,0.0003-0.1514-0.0168-0.22-0.05L7.5,2L1.72,4.93C1.4632,5.0515,1.1565,4.9418,1.035,4.685 S1.0232,4.1215,1.28,4L7.5,0.92L13.72,4c0.2761,0.0608,0.4508,0.3339,0.39,0.61C14.0492,4.8861,13.7761,5.0608,13.5,5z M5,10H2v3h3 V10z M9,10H6v3h3V10z M13,10h-3v3h3V10z M11,6H8v3h3V6z M7,6H4v3h3V6z"/> </g>
                </svg>
                Op.Tienda
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/layout/comida" // O simplemente /layout si esa es la ruta principal
                className={({ isActive }) =>
                  // NavLink puede marcar como activo si la ruta empieza con /layout
                  `${baseLinkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`
                }
              >
                <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">

                        <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                        <g id="SVGRepo_iconCarrier"> <path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> <path d="M15 18H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> </g>

                        </svg>
                Home
              </NavLink>
            </li>

            {/* Enlace a Logout (probablemente no necesita ser NavLink) */}
            <li>
            <button
              onClick={handleLogout}
              className={`${baseLinkClass} ${inactiveLinkClass} flex items-center gap-2`}
            >
              <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* SVG Logout */}
                <g id="SVGRepo_iconCarrier">
                  <path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              </svg>
              Log out
            </button>
          </li>
          </ul>
          
        </div>

        {/* Main Content Area */}
        <div className="bg-[#F3F3F3] flex-1 p-4 rounded-xl ms-3 me-3 h-full flex flex-col gap-3 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
