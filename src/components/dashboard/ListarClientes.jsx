// src/components/dashboard/ListarClientes.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase/firebase';
import { Modal, Button, Form } from 'react-bootstrap';

import tienda from '../../assets/tienda.png';
import web from '../../assets/web.png';

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
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Siempre se guardará en minúsculas
  const [clientePage, setClientePage] = useState(1); 
  const [lastClienteDoc, setLastClienteDoc] = useState(null); 

  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); 
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [pedidoPage, setPedidoPage] = useState(1);
  const [lastPedidoDoc, setLastPedidoDoc] = useState(null);
  const [hasMorePedidos, setHasMorePedidos] = useState(true); 

  const [showModificarClienteModal, setShowModificarClienteModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [clienteParaAccion, setClienteParaAccion] = useState(null); 
  const [formDataCliente, setFormDataCliente] = useState({
    cliente: '',
    telefono: '',
    localidad: '',
    email: '',
  });
  const [mensajeAccion, setMensajeAccion] = useState(""); 

  const clientesPorPagina = 10;
  const pedidosPorPagina = 5; 

  const obtenerClientes = async () => {
    setLoading(true);
    try {
      const clientesRef = collection(db, 'clientes');
      let querySnapshot;
      let clientesList;

      if (search) {
        // BÚSQUEDA ACTIVA: Traer todos los clientes y filtrar en el cliente
        console.log("[obtenerClientes] Búsqueda activa:", search, "Trayendo todos los clientes para filtrar.");
        const qAll = query(clientesRef, orderBy('cliente')); // Ordenar para consistencia
        querySnapshot = await getDocs(qAll);
        const todosLosClientes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        clientesList = todosLosClientes.filter(cliente => 
          (cliente.cliente || "").toLowerCase().includes(search) // 'search' ya está en minúsculas
        );
        console.log("[obtenerClientes] Clientes filtrados:", clientesList.length);
        setLastClienteDoc(null); // No hay paginación de Firestore para resultados de búsqueda
      } else {
        // SIN BÚSQUEDA: Paginación normal
        console.log("[obtenerClientes] Sin búsqueda. Página:", clientePage);
        let qPaginated;
        const baseQuery = query(clientesRef, orderBy('cliente'));
        if (clientePage === 1) {
            qPaginated = query(baseQuery, limit(clientesPorPagina));
        } else if (lastClienteDoc) {
            qPaginated = query(baseQuery, startAfter(lastClienteDoc), limit(clientesPorPagina));
        } else {
            // Si clientePage > 1 pero no hay lastClienteDoc (ej. después de una búsqueda),
            // forzar a la primera página para evitar errores.
            console.warn("[obtenerClientes] Condición de paginación inesperada, volviendo a página 1.");
            setClientePage(1); // Esto disparará otro render y useEffect, pero es más seguro.
            // Para evitar una llamada extra, podríamos simplemente no hacer nada aquí y esperar el re-render.
            // O, si es la primera carga después de limpiar búsqueda, hacer la consulta de la página 1.
            // Por ahora, lo dejamos así, el setClientePage(1) lo corregirá.
            setLoading(false); // Evitar que el loader se quede activo
            return; 
        }
        querySnapshot = await getDocs(qPaginated);
        clientesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("[obtenerClientes] Clientes paginados:", clientesList.length);

        if (querySnapshot.docs.length > 0) {
            setLastClienteDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        } else {
            setLastClienteDoc(null);
        }
      }
      setClientes(clientesList);
    } catch (error) {
      console.error('Error al obtener clientes: ', error);
      setClientes([]);
      setLastClienteDoc(null);
    } finally {
      setLoading(false);
    }
  };

  const obtenerPedidos = async (idCliente, page = 1, lastVisible = null) => {
    if (!idCliente) return;
    console.log(`[obtenerPedidos] Solicitando pedidos para idCliente: ${idCliente}, página: ${page}`);
    setLoadingPedidos(true);
    if (page === 1) {
        setPedidos([]); // Limpiar pedidos solo si es la primera página del modal
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
      const nuevosPedidos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log(`[obtenerPedidos] Pedidos encontrados para ${idCliente} (página ${page}):`, nuevosPedidos.length);

      if (querySnapshot.docs.length > 0) {
        setLastPedidoDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMorePedidos(querySnapshot.docs.length === pedidosPorPagina);
      } else {
        setLastPedidoDoc(null);
        setHasMorePedidos(false);
      }
      // Si es la página 1, reemplaza. Si no, concatena (o decide si siempre reemplazar)
      //setPedidos(prev => page === 1 ? nuevosPedidos : [...prev, ...nuevosPedidos]);
      setPedidos(nuevosPedidos);

    } catch (error) {
      console.error('Error al obtener pedidos: ', error);
      setHasMorePedidos(false);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // useEffect para cargar clientes
  useEffect(() => {
    console.log(`[useEffect principal] Disparado. Search: "${search}", Page: ${clientePage}`);
    obtenerClientes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, clientePage]); // Depender de search y clientePage


  useEffect(() => {
    if (showPedidosModal && clienteSeleccionado?.id) {
      // Cuando se abre el modal o cambia el cliente seleccionado, o cambia la página de pedidos
      // se llama a obtenerPedidos.
      // Si es la primera página del modal (pedidoPage === 1), lastPedidoDoc se ignora (o es null).
      console.log("[useEffect showPedidosModal] Abriendo modal/cambiando página de pedidos para cliente:", clienteSeleccionado.id, "Página:", pedidoPage);
      obtenerPedidos(clienteSeleccionado.id, pedidoPage, pedidoPage > 1 ? lastPedidoDoc : null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPedidosModal, clienteSeleccionado, pedidoPage]); // Quitar lastPedidoDoc de aquí para evitar bucles si se actualiza en obtenerPedidos

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    console.log("[handleSearchChange] Nuevo término de búsqueda (minúsculas):", searchTerm);
    setSearch(searchTerm);
    setClientePage(1); // Resetear la página a 1 cuando cambia el término de búsqueda
    setLastClienteDoc(null); // También resetear el cursor
  };

  const handleClientePageChange = (newPage) => {
    if (newPage < 1) return;
    // Solo permitir cambiar de página si no hay una búsqueda activa
    if (!search) {
        setClientePage(newPage);
    }
  };

  const handleClienteClick = (cliente) => {
    console.log("[handleClienteClick] Cliente seleccionado:", cliente);
    setClienteSeleccionado(cliente);
    setPedidoPage(1); // Resetear a la primera página de pedidos
    setLastPedidoDoc(null); // Resetear el cursor de pedidos
    setHasMorePedidos(true); // Asumir que hay más pedidos al principio
    setShowPedidosModal(true);
  };

  const handleClosePedidosModal = () => {
    setShowPedidosModal(false);
    setClienteSeleccionado(null);
    setPedidos([]);
    setPedidoPage(1);
    setLastPedidoDoc(null);
    setHasMorePedidos(true);
  };

  const handlePedidoPageChange = (newPage) => {
    if (newPage < 1 || (newPage > pedidoPage && !hasMorePedidos)) return; 
    
    if (newPage < pedidoPage) {
        // Para ir a una página anterior, necesitaríamos una lógica más compleja
        // para obtener el cursor correcto. Por ahora, simplificamos reseteando
        // a la primera página si se intenta ir muy atrás o recargando la página actual.
        // La forma más simple es recargar desde la primera página del modal.
        console.warn("[handlePedidoPageChange] Paginación hacia atrás en modal no implementada de forma óptima. Recargando desde pág 1 del modal.");
        setPedidoPage(1);
        setLastPedidoDoc(null);
    } else {
        setPedidoPage(newPage);
    }
    // La carga de datos se hará por el useEffect que escucha pedidoPage
  };

  const handleOpenModificarModal = (cliente) => {
    setClienteParaAccion(cliente);
    setFormDataCliente({
      cliente: cliente.cliente || '',
      telefono: cliente.telefono || '',
      localidad: cliente.localidad || '',
      email: cliente.email || '',
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
      });
      setMensajeAccion("Cliente actualizado con éxito.");
      obtenerClientes(); // Recargar la vista actual (sea búsqueda o paginada)
      setTimeout(() => { 
        handleCloseModificarModal();
      }, 1500);
    } catch (error) {
      console.error("Error al actualizar cliente: ", error);
      setMensajeAccion("Error al actualizar cliente. Inténtalo de nuevo.");
    }
  };

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
      // y no estamos en una búsqueda, podríamos querer retroceder una página.
      if (clientes.length === 1 && clientePage > 1 && !search) { 
        setClientePage(clientePage - 1); 
      } else {
        obtenerClientes(); // Recargar la vista actual
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
       <h2 className="text-2xl text-center mb-1 font-extrabold text-gray-700">Lista de Clientes</h2>
      <p className='text-center text-gray-500 text-sm'>Mostramos el listado de todos los clientes registrados.</p>
      <p className='text-center text-gray-500 text-sm mb-4'>Haz clic en el ID para ver sus pedidos.</p>

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
              onClick={() => setSearch('')} // Limpia el estado 'search'
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

      {loading && <p className="text-center text-gray-500 my-4">Cargando clientes...</p>}

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
                    <td className="px-4 py-2 text-center">
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

      {/* Paginación Clientes (se oculta si hay una búsqueda activa) */}
      {!loading && !search && (clientes.length > 0 || clientePage > 1) && (
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

      <Modal show={showPedidosModal} onHide={handleClosePedidosModal} centered size="xl">
        <Modal.Body>
            <div className='text-center text-2xl text-gray-700 text-bold p-3 mb-2'>
            <h1> Pedidos de: {clienteSeleccionado?.cliente || 'Cliente'} (ID: {clienteSeleccionado?.id || ''})</h1>
            </div>
          {loadingPedidos ? (
            <p className="text-center text-gray-500">Cargando pedidos...</p>
          ) : pedidos.length > 0 ? (
            <>
              <div className="overflow-x-auto shadow-md rounded-lg mb-4">
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

              {(pedidoPage > 1 || hasMorePedidos) && (
                 <div className="flex justify-center items-center mt-4 gap-4">
                    <button
                      onClick={() => handlePedidoPageChange(pedidoPage - 1)}
                      disabled={pedidoPage === 1 || loadingPedidos}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow hover:bg-yellow-600 transition flex items-center gap-2"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-5 h-5"><path d="M10.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L7.414 12l3.293 3.293zM19.707 17.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L16.414 12l3.293 3.293z"/></svg>
                    </button>
                    <span className="text-gray-700">Página {pedidoPage}</span>
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
              <Button variant="danger" className='bg-white text-yellow-500  border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 hover:text-yellow-600 transition' onClick={handleClosePedidosModal}>
                Cerrar
              </Button>
          </div>
        </Modal.Body>
      </Modal>

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
