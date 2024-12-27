

import { BrowserRouter, Routes,Route } from "react-router-dom"
import Home from "./components/home/Home"
import Login from "./components/login/Login"
import Ordenes from "./components/ordenes/Ordenes"
import Freidora from "./components/freidora/Freidora"
import BuscadorPedidos from "./components/buscadorPedidos/BuscadorPedidos"
import Stock from "./components/stock/Stock"
import Dashboard from "./components/dashboard/Dashboard"
import Scanner from "./components/scanner/Scanner"
import Layout from "./components/pedidos/Layout"

import DataProvider from "./components/Context/DataContext"



function App() {
  

  return (
   
    <DataProvider>
     <BrowserRouter >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/layout" element={<Layout />}/>
        <Route path="/layout/:categoria" element={<Layout />}/>
        <Route path="/ordenes" element={<Ordenes />} />
        <Route path="/freidora" element={<Freidora />} />
        <Route path="/buscadorPedidos" element={<BuscadorPedidos />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/scanner" element={<Scanner />} />
       

        {/* Solo acceso admin */}

        <Route path="/dashboard" element={<Dashboard />} />

       

      </Routes>    
     </BrowserRouter>
    </DataProvider>
   
    
  )
}

export default App