

import { BrowserRouter, Routes,Route } from "react-router-dom"
import Home from "./components/home/Home"
import Login from "./components/login/Login"
import LoginJefe from "./components/login/LoginJefe"
import LGOrdenes from "./components/ordenes/LGOrdenes"
import LGFreidora from "./components/freidora/LGFreidora"
import BuscadorPedidos from "./components/buscadorPedidos/LGBuscadorPedidos"
import Dashboard from "./components/dashboard/Dashboard"
import Scanner from "./components/scanner/Scanner"
import Layout from "./components/pedidos/Layout"

import DataProvider from "./components/Context/DataContext"



import LGStock from "./components/stock/LGStock"
import LGBuscadorPedidos from "./components/buscadorPedidos/LGBuscadorPedidos"
import LGScanner from "./components/scanner/LGScanner"
import CrearProductos from "./components/dashboard/CrearProductos"
import ListarClientes from "./components/dashboard/ListarClientes"
import Ordenes from "./components/ordenes/Ordenes"
import Listaproductos from "./components/dashboard/ListaProductos"
import CalendarioPollos from "./components/dashboard/Calendario/CalendarioPollos"
import CalendarTabs from "./components/dashboard/Calendario/CalendarioTabs"

import Empleados from "./components/dashboard/Empleados"
import CrudEmpleados from "./components/dashboard/CrearEmpleado"
import { OrderProvider } from './components/Context/OrderProviderContext';
import Cocina from "./components/cocina/Cocina"
import AdminCalendarioPage from "./components/dashboard/Calendario/AdminCalendarioPage"




function App() {
  

  return (
   
    <DataProvider>
      <OrderProvider>
     <BrowserRouter >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/loginJefe" element={<LoginJefe />} />
        <Route path="/layout" element={<Layout />}/>
        <Route path="/layout/:categoria" element={<Layout />}/>
        <Route path="/ordenes" element={<Ordenes/>} />
        <Route path="/freidora" element={<LGFreidora />} />
        <Route path="/cocina" element={<Cocina />} />
        <Route path="/buscadorPedidos" element={<LGBuscadorPedidos />} />
        <Route path="/stock" element={<LGStock />} />
        <Route path="/scanner" element={<LGScanner />} />
       

        {/* Solo acceso administrador */}

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/crearProductos" element={<CrearProductos />} />
        <Route path="/dashboard/listaProductos" element={<Listaproductos />} />
        <Route path="/dashboard/listarClientes" element={<ListarClientes />} />
        <Route path="/dashboard/calendarioPollos" element={<AdminCalendarioPage />} />
        <Route path="/dashboard/empleados" element={<Empleados />} />
        <Route path="/dashboard/crearempleado" element={<CrudEmpleados />} />

       

      </Routes>    
     </BrowserRouter>
      </OrderProvider>
    </DataProvider>
   
    
  )
}

export default App