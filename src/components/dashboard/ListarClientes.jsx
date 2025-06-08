// src/components/dashboard/ListarClientes.jsx
import React, { useState, useEffect } from 'react';
// Add doc, updateDoc, deleteDoc
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/firebase';
import { Modal, Button, Form } from 'react-bootstrap'; // Add Form for the modal

import tienda from '../../assets/tienda.png';
import web from '../../assets/web.png';
// SVGs for edit/delete icons (can be inlined or imported)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#eab308" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

  const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="#EF4444" 
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7h12M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
    />
  </svg>
);

const ListarClientes = () => {
  // Estados para clientes
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientePage, setClientePage] = useState(1); // Renombrado para claridad
  const [lastClienteDoc, setLastClienteDoc] = useState(null); // Renombrado

  // Estados para pedidos (dentro del modal)
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // For viewing orders
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  // *** 1. Estados para paginación de pedidos ***
  const [pedidoPage, setPedidoPage] = useState(1);
  const [lastPedidoDoc, setLastPedidoDoc] = useState(null);
  const [hasMorePedidos, setHasMorePedidos] = useState(true); // Para saber si hay más páginas

  // *** Estados para Modificar y Eliminar Cliente ***
  const [showModificarClienteModal, setShowModificarClienteModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [clienteParaAccion, setClienteParaAccion] = useState(null); // Cliente para modificar o eliminar
  const [formDataCliente, setFormDataCliente] = useState({
    cliente: '',
    telefono: '',
    localidad: '',
    email: '',
    // img_perfil: null, // Omitir por ahora para simplificar
  });
  const [mensajeAccion, setMensajeAccion] = useState(""); // Para mensajes en modales de acción

  const clientesPorPagina = 10;
  const pedidosPorPagina = 5; // Define cuántos pedidos mostrar por página en el modal

  // --- Funciones para obtener datos ---
  const obtenerClientes = async (resetPaginacion = false) => {
    // ... (obtenerClientes sin cambios)
    setLoading(true);
    try {
      const clientesRef = collection(db, 'clientes');
      let q;
      let baseQuery = query(clientesRef, orderBy('cliente'));
      if (search) {
        baseQuery = query(baseQuery, where('cliente', '>=', search), where('cliente', '<=', search + '\uf8ff'));
      }
      // Usa clientePage y lastClienteDoc
      if (!resetPaginacion && clientePage > 1 && lastClienteDoc) {
        q = query(baseQuery, startAfter(lastClienteDoc), limit(clientesPorPagina));
      } else {
        q = query(baseQuery, limit(clientesPorPagina));
      }
      const querySnapshot = await getDocs(q);
      const clientesList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (querySnapshot.docs.length > 0) {
        setLastClienteDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setLastClienteDoc(null);
      }
      setClientes(clientesList);
    } catch (error) { console.error('Error al obtener clientes: ', error); }
    finally { setLoading(false); }
  };

  // *** 2. Modificar obtenerPedidos para paginación ***
  const obtenerPedidos = async (idCliente, page = 1, lastVisible = null) => {
    // ... (obtenerPedidos sin cambios)
    if (!idCliente) return;
    setLoadingPedidos(true);
    // No limpiar pedidos si estamos paginando, solo al inicio
    if (page === 1) {
        setPedidos([]);
    }

    try {
      const pedidosRef = collection(db, 'pedidos');
      let q;
      const baseQuery = query(pedidosRef, where('idCliente', '==', idCliente), orderBy('NumeroPedido', 'desc'));

      if (page > 1 && lastVisible) {
        q = query(baseQuery, startAfter(lastVisible), limit(pedidosPorPagina));
      } else {
        q = query(baseQuery, limit(pedidosPorPagina));
      }

      const querySnapshot = await getDocs(q);
      const pedidosList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Actualizar el último documento visible para la paginación
      if (querySnapshot.docs.length > 0) {
        setLastPedidoDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMorePedidos(querySnapshot.docs.length === pedidosPorPagina); // Hay más si se llenó la página
      } else {
        setLastPedidoDoc(null);
        setHasMorePedidos(false); // No hay más páginas
      }

      // Si es la página 1, reemplaza los pedidos. Si no, añade a los existentes (opcional, depende de cómo quieras la paginación)
      // Por simplicidad, reemplazaremos siempre al cambiar de página
      setPedidos(pedidosList);

    } catch (error) {
      console.error('Error al obtener pedidos: ', error);
      setHasMorePedidos(false); // Asume que no hay más en caso de error
    } finally {
      setLoadingPedidos(false);
    }
  };

  // --- useEffects ---
  useEffect(() => { obtenerClientes(true); }, [search]);
  useEffect(() => { obtenerClientes(false); }, [clientePage]); // Depende de clientePage

  // useEffect para cargar pedidos (ahora depende de pedidoPage también)
  useEffect(() => {
    if (showPedidosModal && clienteSeleccionado?.id) {
      // Llama a obtenerPedidos con la página actual y el último doc de pedidos
      obtenerPedidos(clienteSeleccionado.id, pedidoPage, lastPedidoDoc);
    }
  }, [showPedidosModal, clienteSeleccionado, pedidoPage]); // Añadido pedidoPage

  // --- Handlers ---
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setClientePage(1); // Resetea página de clientes
    setLastClienteDoc(null);
  };

  const handleClientePageChange = (newPage) => {
    if (newPage < 1) return;
    setClientePage(newPage);
  };

  const handleClienteClick = (cliente) => {
    setClienteSeleccionado(cliente);
    // *** 3. Resetear paginación de pedidos al abrir modal ***
    setPedidoPage(1);
    setLastPedidoDoc(null);
    setHasMorePedidos(true); // Asume que hay más al principio
    setShowPedidosModal(true);
  };

  const handleClosePedidosModal = () => {
    setShowPedidosModal(false);
    setClienteSeleccionado(null);
    setPedidos([]);
    // Resetear estados de paginación de pedidos al cerrar
    setPedidoPage(1);
    setLastPedidoDoc(null);
    setHasMorePedidos(true);
  };

  // *** 5. Handler para paginación de pedidos ***
  const handlePedidoPageChange = (newPage) => {
    // ... (handlePedidoPageChange sin cambios)
    if (newPage < 1) return; // No ir a páginas negativas

    // Si vamos hacia atrás, reseteamos lastPedidoDoc.
    // Esto es una simplificación: recargará la página anterior desde el principio,
    // no necesariamente continuando desde donde lo dejó la página siguiente.
    if (newPage < pedidoPage) {
        setLastPedidoDoc(null);
        console.warn("Paginación hacia atrás: Recargando página anterior desde el inicio (simplificado).");
        // *** ELIMINA ESTE RETURN ***
        // return;
    }

    // Actualiza el estado de la página de pedidos
    setPedidoPage(newPage);

    // La carga de datos se hará por el useEffect que escucha pedidoPage
    // y usará lastPedidoDoc (que será null si vamos hacia atrás)
  };

  // --- Handlers para Modificar Cliente ---
  const handleOpenModificarModal = (cliente) => {
    setClienteParaAccion(cliente);
    setFormDataCliente({
      cliente: cliente.cliente || '',
      telefono: cliente.telefono || '',
      localidad: cliente.localidad || '',
      email: cliente.email || '',
      // img_perfil: cliente.img_perfil || null, // Omitir por ahora
    });
    setMensajeAccion("");
    setShowModificarClienteModal(true);
  };

  const handleCloseModificarModal = () => {
    setShowModificarClienteModal(false);
    setClienteParaAccion(null);
    setFormDataCliente({ cliente: '', telefono: '', localidad: '', email: '' });
    setMensajeAccion("");
  };

  const handleFormChangeCliente = (e) => {
    const { name, value } = e.target;
    setFormDataCliente(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarClienteModificado = async () => {
    if (!clienteParaAccion || !clienteParaAccion.id) {
      setMensajeAccion("Error: No se ha seleccionado un cliente para modificar.");
      return;
    }
    if (!formDataCliente.cliente || !formDataCliente.telefono) {
        setMensajeAccion("Nombre y teléfono son obligatorios.");
        return;
    }

    setMensajeAccion("Guardando cambios...");
    try {
      const clienteRef = doc(db, 'clientes', clienteParaAccion.id);
      await updateDoc(clienteRef, {
        cliente: formDataCliente.cliente,
        telefono: formDataCliente.telefono,
        localidad: formDataCliente.localidad,
        email: formDataCliente.email,
        // img_perfil: formDataCliente.img_perfil, // Si se implementa
      });
      setMensajeAccion("Cliente actualizado con éxito.");
      obtenerClientes(clientePage === 1); // Recargar clientes, resetear paginación si estamos en la primera página
      setTimeout(() => { // Cerrar modal después de un breve mensaje
        handleCloseModificarModal();
      }, 1500);
    } catch (error) {
      console.error("Error al actualizar cliente: ", error);
      setMensajeAccion("Error al actualizar cliente. Inténtalo de nuevo.");
    }
  };

  // --- Handlers para Eliminar Cliente ---
  const handleOpenEliminarModal = (cliente) => {
    setClienteParaAccion(cliente);
    setMensajeAccion("");
    setShowConfirmDeleteModal(true);
  };

  const handleCloseEliminarModal = () => {
    setShowConfirmDeleteModal(false);
    setClienteParaAccion(null);
    setMensajeAccion("");
  };

  const handleConfirmarEliminarCliente = async () => {
    if (!clienteParaAccion || !clienteParaAccion.id) {
      setMensajeAccion("Error: No se ha seleccionado un cliente para eliminar.");
      return;
    }
    setMensajeAccion("Eliminando cliente...");
    try {
      await deleteDoc(doc(db, 'clientes', clienteParaAccion.id));
      setMensajeAccion("Cliente eliminado con éxito.");
      // Si el cliente eliminado era el último de la página actual y no es la primera página,
      // podríamos querer retroceder una página.
      if (clientes.length === 1 && clientePage > 1) {
        setClientePage(clientePage - 1); // Esto disparará el useEffect para obtenerClientes
      } else {
        obtenerClientes(clientePage === 1); // Recargar clientes
      }
      setTimeout(() => {
        handleCloseEliminarModal();
      }, 1500);
    } catch (error) {
      console.error("Error al eliminar cliente: ", error);
      setMensajeAccion("Error al eliminar cliente. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="container mx-auto p-2 font-nunito">
      {/* ... (Título, búsqueda, tabla de clientes - sin cambios) ... */}
       <h2 className="text-2xl text-center mb-1 font-extrabold text-gray-700">Lista de Clientes</h2>
      <p className='text-center text-gray-500 text-sm'>Mostramos el listado de todos los clientes registrados.</p>
      <p className='text-center text-gray-500 text-sm mb-4'>Haz clic en el ID para ver sus pedidos.</p>

      {/* Barra de búsqueda */}
      <div className="mb-4 flex justify-center mt-3">
        <div className="relative w-full md:w-1/2">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar cliente por nombre..."
            className="px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 w-full shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              aria-label="Limpiar búsqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && <p className="text-center text-gray-500 my-4">Cargando clientes...</p>}

      {/* Tabla de Clientes */}
      {!loading && (
        <div className="overflow-x-auto shadow-md rounded-lg font-nunito">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-700 text-white uppercase">
              <th className="px-4 py-3 text-center">Foto</th>
                <th className="px-4 py-3 text-center">Nombre</th>
                <th className="px-4 py-3 text-center">Teléfono</th>
                <th className="px-4 py-3 text-center">Localidad</th>
                <th className="px-4 py-3 text-center">Correo</th>
                <th className="px-4 py-3 text-center">ID Cliente</th>
                <th className="px-4 py-3 text-center">Acciones</th> 
              </tr>
            </thead>
            <tbody>
              {clientes.length > 0 ? (
                clientes.map((cliente, index) => (
                  <tr key={cliente.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                     <td className="px-4 py-2 text-center">
                        {cliente.img_perfil ? (
                          <img
                            src={cliente.img_perfil}
                            alt="Perfil"
                            className="w-8 h-8 rounded-full mx-auto object-cover"
                          />
                        ) : (
                          <span className="font-bold">-</span>
                        )}
                      </td>
                    <td className="px-4 py-2 text-center font-bold">{cliente.cliente || '-'}</td>
                    <td className="px-4 py-2 text-center">{cliente.telefono || '-'}</td>
                    <td className="px-4 py-2 text-center">{cliente.localidad || '-'}</td>
                    <td className="px-4 py-2 text-center">{cliente.email || '-'}</td>
                    <td
                      className="px-4 py-2 text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-center"
                      onClick={() => handleClienteClick(cliente)}
                      title={`Ver pedidos de ${cliente.cliente}`}
                    >
                      {cliente.id}
                    </td>
                    <td className="px-4 py-2 text-center"> {/* Celda para botones */}
                      <button
                        onClick={() => handleOpenModificarModal(cliente)}
                        className="p-1 text-blue-600 hover:text-blue-800 mr-2"
                        title="Modificar cliente"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleOpenEliminarModal(cliente)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Eliminar cliente"
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="text-center py-4 text-gray-500">No se encontraron clientes {search ? `con el nombre "${search}"` : ''}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación Clientes */}
      {!loading && (clientes.length > 0 || clientePage > 1) && ( // Sin cambios
        <div className="flex justify-center items-center mt-6 gap-4">
          <button onClick={() => handleClientePageChange(clientePage - 1)} disabled={clientePage === 1} className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M10.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L7.414 12l3.293 3.293zM19.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L16.414 12l3.293 3.293z"/></svg>
            Anterior
          </button>
          <span className="text-gray-700">Página {clientePage}</span>
          <button onClick={() => handleClientePageChange(clientePage + 1)} disabled={!lastClienteDoc || clientes.length < clientesPorPagina} className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2">
            Siguiente
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M13.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L16.586 12l-3.293-3.293zM4.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L7.586 12 4.293 8.707z"/></svg>
          </button>
        </div>
      )}


      {/* Modal de Pedidos */}
      <Modal show={showPedidosModal} onHide={handleClosePedidosModal} centered size="xl"> {/* Sin cambios significativos, solo el nombre del cliente */}
        
        <Modal.Body>
            <div className='text-center text-2xl text-gray-700 text-bold p-3 mb-2'>
            <h1> Pedidos de: {clienteSeleccionado?.cliente || 'Cliente'} (ID: {clienteSeleccionado?.id || ''})</h1> {/* Nombre del cliente */}
            </div>
        

          {loadingPedidos ? (
            <p className="text-center text-gray-500">Cargando pedidos...</p>
          ) : pedidos.length > 0 ? (
            <>
              <div className="overflow-x-auto shadow-md rounded-lg mb-4"> {/* Margen inferior para separar de paginación */}
                <table className="min-w-full table-auto text-sm">
                  <thead>
                    <tr className="bg-gray-700 text-white uppercase">
                      <th className="px-4 py-3 text-center">Nº Pedido</th>
                      <th className="px-4 py-3 text-center">Fecha Recogida</th>
                      <th className="px-4 py-3 text-center">Total</th>
                      <th className="px-4 py-3 text-center">Pagado</th>
                      <th className="px-4 py-3 text-center">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((pedido, index) => (
                      <tr key={pedido.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                        <td className="px-4 py-2 text-center font-medium">{pedido.NumeroPedido}</td>
                        <td className="px-4 py-2 text-center">{pedido.fechahora}</td>
                        <td className="px-4 py-2 text-center font-extrabold">
                          {!isNaN(parseFloat(pedido.total_pedido)) ? parseFloat(pedido.total_pedido).toFixed(2) : '0.00'} €
                        </td>
                        <td className="px-4 py-2 text-center">
                          {pedido.pagado ? (
                            <svg className="w-5 h-5 mx-auto text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-5 h-5 mx-auto text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {pedido.origen === 1 ? (
                            <img  src={web} alt="Pedido Web" className="w-5 h-5 mx-auto" title="Pedido Web" />
                          ) : (
                            <img  src={tienda} alt="Pedido en Tienda" className="w-5 h-5 mx-auto" title="Pedido en Tienda" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* *** 4. Controles de Paginación para Pedidos *** */}
              {(pedidoPage > 1 || hasMorePedidos) && ( // Mostrar solo si hay más de una página o si hay más por cargar
                 <div className="flex justify-center items-center mt-4 gap-4">
                    {/* Botón Anterior (simplificado, solo funciona si no estás en la página 1) */}
                    <button
                      onClick={() => handlePedidoPageChange(pedidoPage - 1)}
                      disabled={pedidoPage === 1 || loadingPedidos}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M10.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L7.414 12l3.293 3.293zM19.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L16.414 12l3.293 3.293z"/></svg>
                     
                    </button>
                    <span className="text-gray-700">Página {pedidoPage}</span>
                    {/* Botón Siguiente */}
                    <button
                      onClick={() => handlePedidoPageChange(pedidoPage + 1)}
                      disabled={!hasMorePedidos || loadingPedidos}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2 font-nunito"
                    >
                     
                      <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M13.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L16.586 12l-3.293-3.293zM4.293 6.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L7.586 12 4.293 8.707z"/></svg>
                    </button>
                  </div>
              )}

            </>
          ) : (
            <p className="text-center text-gray-500 mt-4">No se encontraron pedidos para este cliente.</p>
          )}

          <div className='p-2 mt-2 flex justify-end items-center'>
              {/* Botón Cerrar */}
              <Button variant="danger" className='bg-white text-yellow-500  border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 hover:text-yellow-600 transition' onClick={handleClosePedidosModal}>
                Cerrar
              </Button>
          </div>


        </Modal.Body>
      
      </Modal>

      {/* Modal para Modificar Cliente */}
      <Modal show={showModificarClienteModal} onHide={handleCloseModificarModal} centered>
       
        <Modal.Body>

            <div>
              <h1 className='text-gray-700 text-xl font-nunito font-bold text-center mb-4'>Modificar Cliente</h1>
            </div>

          {mensajeAccion && <p className={`text-sm font-bold font-nunito mb-3 text-center ${mensajeAccion.includes("Error") || mensajeAccion.startsWith("Nombre y teléfono") ? "text-red-600" : "text-green-700"}`}>{mensajeAccion}</p>}
          <Form>
            <Form.Group className="mb-3" controlId="formClienteNombre">
              <Form.Label className="text-gray-500 text-sm font-extrabold font-nunito ms-2">Nombre</Form.Label>
              <Form.Control type="text" name="cliente" value={formDataCliente.cliente} onChange={handleFormChangeCliente} placeholder="Nombre del cliente" className="font-nunito text-sm"/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formClienteTelefono">
              <Form.Label className="text-gray-500 text-sm font-extrabold font-nunito ms-2">Teléfono (No modificable)</Form.Label>
              <Form.Control type="text" readOnly disabled name="telefono" value={formDataCliente.telefono} onChange={handleFormChangeCliente} placeholder="Teléfono" className="font-nunito text-sm" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formClienteLocalidad">
              <Form.Label className="text-gray-500 text-sm font-extrabold font-nunito ms-2">Localidad</Form.Label>
             <div className="relative">
                <Form.Control
                  as="select"
                  name="localidad"
                  value={formDataCliente.localidad}
                  onChange={handleFormChangeCliente}
                  className="font-nunito text-sm appearance-none pr-8"
                >
                  <option value="">Seleccionar localidad (opcional)</option>
                  <option value="Mungia">Mungia</option>
                  <option value="Larrauri">Larrauri</option>
                  <option value="Laukariz">Laukariz</option>
                  <option value="Markaida">Markaida</option>
                  <option value="Fruiz">Fruiz</option>
                  <option value="Gatica">Gatica</option>
                  <option value="Derio">Derio</option>
                  <option value="Otros">Otros...</option>
                </Form.Control>

                  {/* Flecha SVG */}
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formClienteEmail">
              <Form.Label className="text-gray-500 text-sm font-extrabold font-nunitob ms-2">Email</Form.Label>
              <Form.Control type="email" name="email" value={formDataCliente.email} onChange={handleFormChangeCliente} placeholder="Email (opcional)" className="font-nunito text-sm"/>
            </Form.Group>
            {/* Podríamos añadir input para img_perfil aquí si se decide implementar */}
          </Form>

          <div className='items-center justify-center flex gap-6 mt-5 mb-3'>

             <Button variant="secondary" onClick={handleCloseModificarModal}  className=" shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700">
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardarClienteModificado}  className="shadow-md bg-white text-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:text-yellow-600 hover:border-yellow-600 p-2 font-nunito">
            Actualizar 
          </Button>


          </div>
        </Modal.Body>
  
      </Modal>

      {/* Modal para Confirmar Eliminación de Cliente */}
      <Modal show={showConfirmDeleteModal} onHide={handleCloseEliminarModal} centered>
      
        <Modal.Body>

           <div>
              <h1 className='text-gray-700 text-xl font-nunito font-bold text-center mb-4'>Confirmar Eliminación</h1>
            </div>

          {mensajeAccion && <p className={`text-sm font-bold font-nunito mb-3 text-center ${mensajeAccion.includes("Error") ? "text-red-600" : "text-green-700"}`}>{mensajeAccion}</p>}
          <p className="text-gray-600 font-nunito text-center">
            ¿Estás seguro de que deseas eliminar al cliente <strong className="text-gray-800">{clienteParaAccion?.cliente}</strong>? Esta acción no se puede deshacer.
          </p>

          <div className='items-center justify-center flex gap-6 mt-5 mb-3'>

            <Button variant="secondary" onClick={handleCloseEliminarModal} className=" shadow-md bg-white border-gray-500 hover:bg-gray-300 hover:border-gray-700 p-2 font-nunito text-gray-500 hover:text-gray-700">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmarEliminarCliente} className=" shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700">
            Sí, Eliminar
          </Button>


          </div>

          
        </Modal.Body>

      </Modal>
    </div>
  );
};

export default ListarClientes;
