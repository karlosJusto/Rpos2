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

import Empleados from "./components/dashboard/Empleados";
import CrudEmpleados from "./components/dashboard/CrearEmpleado";
import { OrderProvider } from './components/Context/OrderProviderContext';
import Cocina from "./components/cocina/Cocina";
import AdminCalendarioPage from "./components/dashboard/Calendario/AdminCalendarioPage";

import React, { useEffect } from 'react';
import { initDailyCalendars } from './components/dashboard/Calendario/initDailyCalendars.jsx';

// --- 1. IMPORTA EL NUEVO COMPONENTE LISTENER ---
// Ajusta la ruta según donde hayas creado el archivo GlobalOrderListener.jsx
import GlobalOrderListener from './components/Context/GlobalOrderListener';
import SonidoOnChange from "./components/ordenes/SonidoOnChange.jsx";
import HeaderFinal from "./components/cocina/components/HeaderFinal.jsx";

function App() {
  // Este useEffect para inicializar calendarios se mantiene
  useEffect(() => {
    initDailyCalendars();
  }, []);

  return (
    // DataProvider envuelve todo
    <DataProvider>
      {/* OrderProvider envuelve lo necesario para pedidos */}
      <SonidoOnChange /> {/* Coloca el componente de sonido aquí */}
      <OrderProvider>
        {/* --- 2. RENDERIZA EL LISTENER AQUÍ --- */}
        {/* Se monta una vez y permanece mientras OrderProvider esté montado */}
        <GlobalOrderListener />

        {/* BrowserRouter gestiona las rutas */}
        <BrowserRouter>
          <Routes>
            {/* Tus rutas públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/loginJefe" element={<LoginJefe />} />

            {/* Rutas principales de la operativa */}
            <Route path="/layout" element={<Layout />} />
            <Route path="/layout/:categoria" element={<Layout />} />
            <Route path="/ordenes" element={<Ordenes />} /> {/* Ruta para Ordenes */}
            <Route path="/freidora" element={<LGFreidora />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="/buscadorPedidos" element={<LGBuscadorPedidos />} />
            <Route path="/stock" element={<LGStock />} />
            <Route path="/scanner" element={<LGScanner />} />

            {/* Rutas del Dashboard (Solo acceso administrador) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/crearProductos" element={<CrearProductos />} />
            <Route path="/dashboard/listaProductos" element={<Listaproductos />} />
            <Route path="/dashboard/listarClientes" element={<ListarClientes />} />
            <Route path="/dashboard/calendarioPollos" element={<AdminCalendarioPage />} /> {/* Ruta para AdminCalendarioPage */}
            <Route path="/dashboard/empleados" element={<Empleados />} />
            <Route path="/dashboard/crearempleado" element={<CrudEmpleados />} />

            {/* Puedes añadir una ruta por defecto o para páginas no encontradas si quieres */}
            {/* <Route path="*" element={<NotFound />} /> */}

            

          </Routes>
        </BrowserRouter>
      </OrderProvider>
    </DataProvider>
  );
}

export default App;