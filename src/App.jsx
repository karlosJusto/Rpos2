import React, { useEffect, useRef } from 'react'; // <-- Import useRef
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/home/Home";
import Login from "./components/login/Login";
import LoginJefe from "./components/login/LoginJefe";
// LGOrdenes no se usa en las rutas, quizá sea un componente interno o un error?
// import LGOrdenes from "./components/ordenes/LGOrdenes";
import LGFreidora from "./components/freidora/LGFreidora";
// LGBuscadorPedidos se importa dos veces, eliminamos una
import LGBuscadorPedidos from "./components/buscadorPedidos/LGBuscadorPedidos";
import Dashboard from "./components/dashboard/Dashboard";
// Scanner no se usa directamente en las rutas, quizá LGScanner sí?
// import Scanner from "./components/scanner/Scanner";
import Layout from "./components/pedidos/Layout";

import DataProvider from "./components/Context/DataContext";

import LGStock from "./components/stock/LGStock";
import LGScanner from "./components/scanner/LGScanner";
import CrearProductos from "./components/dashboard/CrearProductos";
import ListarClientes from "./components/dashboard/ListarClientes";
import Ordenes from "./components/ordenes/Ordenes"; // <-- Usado en ruta /ordenes
import Listaproductos from "./components/dashboard/ListaProductos";

// CalendarioPollos no se usa directamente, quizá AdminCalendarioPage sí?
// import CalendarioPollos from "./components/dashboard/Calendario/CalendarioPollos";
// CalendarTabs no se usa directamente
// import CalendarTabs from "./components/dashboard/Calendario/CalendarioTabs";


import CrudEmpleados from "./components/dashboard/CrearEmpleado";
import { OrderProvider } from './components/Context/OrderProviderContext';
import Cocina from "./components/cocina/Cocina";
import AdminCalendarioPage from "./components/dashboard/Calendario/AdminCalendarioPage";

import { initDailyCalendars } from './components/dashboard/Calendario/initDailyCalendars.jsx';

import ProtectedRoute from './components/login/ProtectedRoute.jsx';
import Empleados from './components/dashboard/Empleados.jsx';
import DashboardHomeContent from './components/dashboard/dashComponents/DashboardHomeContent.jsx';
import FiltrarPedidosPorFecha from './components/dashboard/dashComponents/FiltrarPedidosPorFecha.jsx';
import VistaDeResultados from './components/dashboard/dashComponents/VistaDeResultados.jsx'; 



// --- 1. IMPORTA EL NUEVO COMPONENTE LISTENER ---
// Ajusta la ruta según donde hayas creado el archivo GlobalOrderListener.jsx
import GlobalOrderListener from './components/Context/GlobalOrderListener';
import SonidoOnChange from "./components/ordenes/SonidoOnChange.jsx";
import OperativaTienda from './components/dashboard/dashComponents/OperativaTienda.jsx';
// HeaderFinal no se usa directamente en las rutas, ¿es un componente interno?
// import HeaderFinal from "./components/cocina/components/HeaderFinal.jsx";

function App() {
  // Ref to track if the init effect has run its core logic
  const initEffectRan = useRef(false); // <-- Add useRef

  // useEffect for initializing calendars, preventing StrictMode double run
  useEffect(() => {
    // Check if we are in development and if the effect has already run once
    if (import.meta.env.MODE === 'development' && initEffectRan.current) {
       console.log("App.jsx useEffect [init]: StrictMode re-run detected, skipping initDailyCalendars.");
       return; // Skip the second run in development Strict Mode
    }

    // Run the initialization logic
    console.log("App.jsx useEffect [init]: Running initDailyCalendars...");
    initDailyCalendars();

    // Mark that the effect's core logic has run
    initEffectRan.current = true;

    // Cleanup function (optional, but good practice)
    return () => {
      console.log("App.jsx useEffect [init]: Cleanup.");
      // No specific cleanup needed for initDailyCalendars itself,
      // but we keep the structure. We don't reset the ref here
      // for a one-time initialization.
    };
  }, []); // Empty dependency array ensures it runs only on initial mount

  return (
    // DataProvider envuelve todo
    <DataProvider>
    <SonidoOnChange />
    <OrderProvider>
      <GlobalOrderListener />
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/loginJefe" element={<LoginJefe />} />

          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            {/* Rutas fuera del Dashboard */}
            <Route path="/layout" element={<Layout />} />
            <Route path="/layout/:categoria" element={<Layout />} />
            <Route path="/ordenes" element={<Ordenes />} />
            <Route path="/freidora" element={<LGFreidora />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="/buscadorPedidos" element={<LGBuscadorPedidos />} />
            <Route path="/stock" element={<LGStock />} />
            <Route path="/scanner" element={<LGScanner />} />

            {/* --- Rutas del Dashboard Anidadas --- */}
            <Route path="/dashboard" element={<Dashboard />}> {/* El Layout del Dashboard */}
              {/* Ruta Index: Muestra el contenido principal por defecto */}
              <Route index element={<DashboardHomeContent />} />
              {/* Sub-ruta para Empleados */}
              <Route path="empleados" element={<Empleados />} />
              {/* Otras sub-rutas del dashboard */}
              <Route path="listaProductos" element={<Listaproductos />} />
              <Route path="crearProductos" element={<CrearProductos />} />
              <Route path="listarClientes" element={<ListarClientes />} />
              <Route path="calendarioPollos" element={<AdminCalendarioPage />} />
              <Route path="filtrarPedidos" element={<FiltrarPedidosPorFecha />} />
              <Route path="operativaTienda" element={<OperativaTienda />} />
              <Route path="resultados" element={<VistaDeResultados />} />

              {/* Nota: La ruta para crear empleado ya está manejada por el modal dentro de Empleados.jsx, no necesita ruta propia aquí */}
              {/* <Route path="crearempleado" element={<CrudEmpleados />} /> */}
            </Route>
          </Route>

          {/* Ruta para página no encontrada (opcional) */}
          {/* <Route path="*" element={<NotFound />} /> */}

        </Routes>
      </BrowserRouter>
    </OrderProvider>
  </DataProvider>
  );
}

export default App;
