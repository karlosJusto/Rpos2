import React, { useEffect, useRef } from 'react'; 
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"; 
import Home from "./components/home/Home";
import Login from "./components/login/Login";
import LoginJefe from "./components/login/LoginJefe";
import Terminos from "./components/Terminos";
import DeleteAccount from "./components/DeleteAccount";

import LGFreidora from "./components/freidora/LGFreidora";
import LGBuscadorPedidos from "./components/buscadorPedidos/LGBuscadorPedidos";
import Dashboard from "./components/dashboard/Dashboard";
import Layout from "./components/pedidos/Layout";

import DataProvider from "./components/Context/DataContext";

import LGStock from "./components/stock/LGStock";
import LGScanner from "./components/scanner/LGScanner";
import CrearProductos from "./components/dashboard/CrearProductos";
import ListarClientes from "./components/dashboard/ListarClientes";
import Ordenes from "./components/ordenes/Ordenes";
import Listaproductos from "./components/dashboard/ListaProductos";


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



import GlobalOrderListener from './components/Context/GlobalOrderListener';
import SonidoOnChange from "./components/ordenes/SonidoOnChange.jsx";
import OperativaTienda from './components/dashboard/dashComponents/OperativaTienda.jsx';

function App() {
  console.log("App.jsx: La función del componente App se está ejecutando (render).");

  const AppContent = () => {
    const location = useLocation();
    const rutaActual = location.pathname;

    const mostrarSonidoGlobal = !['/cocina', '/freidora'].includes(rutaActual);

    return (
      <>
        {mostrarSonidoGlobal && <SonidoOnChange />}
        <GlobalOrderListener />
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/loginJefe" element={<LoginJefe />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/deleteAccount" element={<DeleteAccount />} />

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
            <Route path="/dashboard" element={<Dashboard />}> 
              <Route index element={<DashboardHomeContent />} />
              <Route path="empleados" element={<Empleados />} />
              <Route path="listaProductos" element={<Listaproductos />} />
              <Route path="crearProductos" element={<CrearProductos />} />
              <Route path="listarClientes" element={<ListarClientes />} />
              <Route path="calendarioPollos" element={<AdminCalendarioPage />} />
              <Route path="filtrarPedidos" element={<FiltrarPedidosPorFecha />} />
              <Route path="operativaTienda" element={<OperativaTienda />} />
              <Route path="resultados" element={<VistaDeResultados />} />

            </Route>
          </Route>

        </Routes>
      </>
    );
  };

  const initEffectRan = useRef(false);
  useEffect(() => {
    if (import.meta.env.MODE === 'development' && initEffectRan.current) {
       return; 
    }

    initDailyCalendars();

    initEffectRan.current = true;

    return () => {
      console.log("App.jsx: useEffect[initDailyCalendars]");
    };
  }, []); 

  return (
    <DataProvider>
      <BrowserRouter>
        <AppContent /> {}
      </BrowserRouter>
  </DataProvider>
  );
}

export default App;
