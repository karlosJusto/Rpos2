import React, { useState, useEffect } from 'react'; // Asegúrate de importar estos hooks
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "firebase/firestore";
import { db } from '../firebase/firebase';

const ListarClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Para la búsqueda
  const [page, setPage] = useState(1); // Para la paginación
  const [lastDoc, setLastDoc] = useState(null); // Documento para la paginación
  const [pedidos, setPedidos] = useState([]); // Estado para los pedidos del cliente seleccionado
  const [loadingPedidos, setLoadingPedidos] = useState(false); // Estado para indicar si estamos cargando los pedidos

  const clientesPorPagina = 10; // Número de clientes por página

  // Función para obtener los clientes de Firebase con paginación y búsqueda
  const obtenerClientes = async () => {
    setLoading(true); // Indicamos que estamos cargando
    try {
      const clientesRef = collection(db, 'clientes');
      let q;

      if (search) {
        // Si hay búsqueda, usamos where para filtrar por cliente
        q = query(
          clientesRef,
          where('cliente', '>=', search),
          where('cliente', '<=', search + '\uf8ff'), // Esto asegura que busquemos por el texto exacto
          orderBy('cliente'),
          limit(clientesPorPagina)
        );
      } else {
        // Si no hay búsqueda, mostramos todos los clientes paginados
        q = query(
          clientesRef,
          orderBy('cliente'),
          limit(clientesPorPagina)
        );
      }

      // Si estamos en una página posterior a la primera, paginamos con startAfter
      if (page > 1 && lastDoc) {
        q = query(q, startAfter(lastDoc)); // Continuamos desde el último documento
      }

      const querySnapshot = await getDocs(q);
      const clientesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Clientes obtenidos: ', clientesList); // Verifica los datos de clientes

      setClientes(clientesList);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setLoading(false); // Terminamos de cargar
    } catch (error) {
      console.error('Error al obtener clientes: ', error);
      setLoading(false);
    }
  };

  // Función para obtener los pedidos de un cliente
  const obtenerPedidos = async (id_cliente) => {
    setLoadingPedidos(true); // Indicamos que estamos cargando los pedidos
    try {
      const pedidosRef = collection(db, 'pedidos');
      const q = query(pedidosRef, where('id_cliente', '==', id_cliente)); // Filtramos por el id_cliente

      const querySnapshot = await getDocs(q);
      const pedidosList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Pedidos obtenidos para el cliente', id_cliente, ':', pedidosList); // Verifica los pedidos obtenidos

      setPedidos(pedidosList);
      setLoadingPedidos(false); // Terminamos de cargar los pedidos
    } catch (error) {
      console.error('Error al obtener pedidos: ', error);
      setLoadingPedidos(false);
    }
  };

  // useEffect para cargar los clientes cuando cambia la búsqueda o la página
  useEffect(() => {
    obtenerClientes();
  }, [search, page]);

  if (loading) {
    return <p className="text-center">Cargando clientes...</p>;
  }

  // Manejador de búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Restablecer a la primera página cuando cambiamos la búsqueda
  };

  // Manejador de paginación
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Manejador de clic en id_cliente para obtener los pedidos
  const handleClienteClick = (id_cliente) => {
    obtenerPedidos(id_cliente); // Llamamos a la función para obtener los pedidos del cliente
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center mb-4">Lista de Clientes</h2>

      {/* Barra de búsqueda */}
      <div className="mb-4 flex justify-center">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar cliente..."
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 w-1/2"
        />
      </div>

      {/* Tabla de Clientes */}
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Cliente</th>
            <th className="px-4 py-2 text-left">Teléfono</th>
            <th className="px-4 py-2 text-left">Localidad</th>
            <th className="px-4 py-2 text-left">ID Cliente</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id} className="border-b">
              <td className="px-4 py-2">{cliente.cliente}</td>
              <td className="px-4 py-2">{cliente.telefono}</td>
              <td className="px-4 py-2">{cliente.localidad}</td>
              <td
                className="px-4 py-2 text-blue-500 cursor-pointer"
                onClick={() => handleClienteClick(cliente.id)} // Clic en el id_cliente
              >
                {cliente.id} {/* Este es el id_cliente */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mostrar los pedidos del cliente seleccionado */}
      {pedidos.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-xl font-semibold">Pedidos de este Cliente</h3>
          {loadingPedidos ? (
            <p>Cargando pedidos...</p>
          ) : (
            <table className="min-w-full table-auto mt-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Pedido ID</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-4 py-2">{pedido.id}</td>
                    <td className="px-4 py-2">{pedido.fecha}</td>
                    <td className="px-4 py-2">{pedido.estado}</td>
                    <td className="px-4 py-2">{pedido.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <p>No se encontraron pedidos para este cliente.</p>
      )}

      {/* Paginación */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:bg-gray-300"
        >
          Anterior
        </button>
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={clientes.length < clientesPorPagina}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:bg-gray-300"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default ListarClientes;


