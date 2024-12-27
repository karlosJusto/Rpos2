import React, { useState } from 'react';
import { db } from "../firebase/firebase"; // Asegúrate de tener correctamente la configuración de Firebase
import { collection, query, where, getDocs } from "firebase/firestore";

const BuscadorPedidos = () => {
  // Estados para teléfono, nombre del cliente, los pedidos encontrados y el estado de carga
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para buscar los pedidos del cliente por nombre o teléfono
  const buscarPedidos = async () => {
    if (!telefono && !nombre) {
      setError('Por favor, ingresa un número de teléfono o nombre de cliente.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Referencia a la colección de pedidos
      const pedidosRef = collection(db, 'pedidos');
      
      // Si se ingresa un teléfono, buscaremos por ese campo
      let q;
      if (telefono) {
        q = query(pedidosRef, where('idCliente', '==', telefono));
      } else if (nombre) {
        // Si se ingresa un nombre, buscamos por el campo 'cliente'
        q = query(pedidosRef, where('cliente', '==', nombre));
      }

      // Ejecutamos la consulta
      const querySnapshot = await getDocs(q);

      // Guardamos los resultados en el estado `pedidos`
      if (querySnapshot.empty) {
        setPedidos([]);
      } else {
        const pedidosList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPedidos(pedidosList);
      }
    } catch (err) {
      console.error('Error al buscar los pedidos: ', err);
      setError('Ocurrió un error al buscar los pedidos.');
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Buscar Pedidos de Cliente</h1>
      
      {/* Input para ingresar el nombre del cliente */}
      <div className="mb-4">
        <label htmlFor="nombre" className="block text-gray-700">Nombre del Cliente</label>
        <input
          type="text"
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="Ingresa el nombre del cliente"
        />
      </div>

      {/* Input para ingresar el teléfono */}
      <div className="mb-4">
        <label htmlFor="telefono" className="block text-gray-700">Número de Teléfono del Cliente</label>
        <input
          type="text"
          id="telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="Ingresa el número de teléfono"
        />
      </div>

      {/* Botón para buscar */}
      <button 
        onClick={buscarPedidos}
        className="w-full bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-500"
        disabled={loading}
      >
        {loading ? 'Buscando...' : 'Buscar Pedidos'}
      </button>

      {/* Mensaje de error si hay algún problema */}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {/* Mostrar los pedidos encontrados */}
      <div className="mt-6">
        {pedidos.length > 0 ? (
          <ul>
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="border-b py-3">
                <h3 className="font-semibold">Pedido #{pedido.NumeroPedido}</h3>
                <p><strong>Fecha:</strong> {pedido.fechahora_realizado}</p>
                <p><strong>Estado:</strong> {pedido.pagado ? 'Pagado' : 'Pendiente'}</p>
                <p><strong>Total:</strong> {pedido.productos.reduce((acc, item) => acc + parseFloat(item.total), 0).toFixed(2)} €</p>

                {/* Mostrar los productos comprados */}
                <div className="mt-4">
                  <h4 className="font-semibold">Productos Comprados:</h4>
                  <ul>
                    {pedido.productos.map((producto, index) => (
                      <li key={index} className="py-2">
                        <p><strong>Nombre:</strong> {producto.nombre}</p>
                        <p><strong>Cantidad:</strong> {producto.cantidad}</p>
                        <p><strong>Precio Unitario:</strong> {producto.precio} €</p>
                        <p><strong>Total:</strong> {producto.total} €</p>
                        {/* Agregar más detalles si lo deseas */}
                        {producto.tostado && <p><strong>Tostado:</strong> Sí</p>}
                        {producto.salsa && <p><strong>Salsa:</strong> {producto.salsa}</p>}
                        {producto.celiaco && <p><strong>Celíaco:</strong> Sí</p>}
                        {producto.troceado && <p><strong>Troceado:</strong> Sí</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No se encontraron pedidos para este cliente.</p>
        )}
      </div>
    </div>
  );
};

export default BuscadorPedidos;
