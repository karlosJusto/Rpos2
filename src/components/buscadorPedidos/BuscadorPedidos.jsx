import React, { useState } from 'react';
import { db } from "../firebase/firebase"; // Asegúrate de tener correctamente la configuración de Firebase
import { collection, query, where, getDocs } from "firebase/firestore";

const BuscadorPedidos = () => {
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [confirmacionTarjeta, setConfirmacionTarjeta] = useState('');
  const [criterio, setCriterio] = useState('telefono');
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para buscar los pedidos
  const buscarPedidos = async () => {
    setLoading(true);
    setError(null);

    // Validación de entrada
    if (!telefono && !nombre && !numeroPedido && !confirmacionTarjeta) {
      setError('Por favor, ingresa un teléfono, nombre de cliente, número de pedido o confirmación de tarjeta.');
      setLoading(false);
      return;
    }

    try {
      const pedidosRef = collection(db, 'pedidos');
      let q;

      // Crear la consulta según el criterio seleccionado
      switch (criterio) {
        case 'telefono':
          if (telefono) {
            q = query(pedidosRef, where('idCliente', '==', telefono));
          }
          break;

        case 'nombre':
          if (nombre) {
            q = query(pedidosRef, where('cliente', '==', nombre));
          }
          break;

        case 'numeroPedido':
          if (numeroPedido) {
            const numeroPedidoInt = parseInt(numeroPedido, 10);
            if (isNaN(numeroPedidoInt)) {
              setError("El número de pedido debe ser un valor numérico.");
              setLoading(false);
              return;
            }
            q = query(pedidosRef, where('NumeroPedido', '==', numeroPedidoInt));
          }
          break;

        case 'confirmacionTarjeta':
          if (confirmacionTarjeta) {
            q = query(pedidosRef, where('confirmacionTarjeta', '==', confirmacionTarjeta));
          }
          break;

        default:
          break;
      }

      if (!q) {
        setError('Por favor, ingresa un valor válido para la búsqueda.');
        setLoading(false);
        return;
      }

      // Ejecución de la consulta
      const querySnapshot = await getDocs(q);

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
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="w-full sm:w-auto">
          <label htmlFor="criterio" className="block text-gray-700 font-nunito text-xl">Buscar por:</label>
          <select
            id="criterio"
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
            className="w-full sm:w-auto p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="telefono">Teléfono</option>
            <option value="nombre">Nombre del Cliente</option>
            <option value="numeroPedido">Número de Pedido</option>
            <option value="confirmacionTarjeta">Confirmación de Tarjeta</option>
          </select>
        </div>
        <div className='pl-2 pr-2 pt-2'>
          hola
        </div>

        {criterio === 'telefono' && (
          <div className="w-full sm:w-auto">
            <label htmlFor="telefono" className="block text-gray-700">Teléfono</label>
            <input
              type="text"
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full sm:w-auto p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Ingresa el teléfono"
            />
          </div>
        )}

        {criterio === 'nombre' && (
          <div className="w-full sm:w-auto">
            <label htmlFor="nombre" className="block text-gray-700">Nombre del Cliente</label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full sm:w-auto p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Ingresa el nombre del cliente"
            />
          </div>
        )}

        {criterio === 'numeroPedido' && (
          <div className="w-full sm:w-auto">
            <label htmlFor="numeroPedido" className="block text-gray-700">Número de Pedido</label>
            <input
              type="text"
              id="numeroPedido"
              value={numeroPedido}
              onChange={(e) => setNumeroPedido(e.target.value)}
              className="w-full sm:w-auto p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Ingresa el número de pedido"
            />
          </div>
        )}

        {criterio === 'confirmacionTarjeta' && (
          <div className="w-full sm:w-auto">
            <label htmlFor="confirmacionTarjeta" className="block text-gray-700">Confirmación de Tarjeta</label>
            <input
              type="text"
              id="confirmacionTarjeta"
              value={confirmacionTarjeta}
              onChange={(e) => setConfirmacionTarjeta(e.target.value)}
              className="w-full sm:w-auto p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Ingresa la confirmación de tarjeta"
            />
          </div>
        )}
      </div>

      <button
        onClick={buscarPedidos}
        className="w-full bg-yellow-500 text-white py-3 rounded-md shadow-md hover:bg-yellow-600 disabled:bg-gray-300"
        disabled={loading}
      >
        {loading ? (
          <div className="flex justify-center items-center">
            <div className="spinner-border animate-spin border-t-2 border-b-2 border-yellow-500 w-6 h-6 rounded-full"></div>
          </div>
        ) : (
          'Buscar Pedidos'
        )}
      </button>

      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}

      <div className="mt-6 text-center">
        {pedidos.length > 0 ? (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="border p-4 rounded-md shadow-md hover:shadow-xl transition">
                <h3 className="font-semibold text-xl text-yellow-500 pb-2">Pedido #{pedido.NumeroPedido}</h3>
                <p><strong>Cliente:</strong> {pedido.cliente} | {pedido.telefono}</p>
                <p><strong>Fecha Realizado:</strong> {pedido.fechahora_realizado}</p>
                <p><strong>Fecha Recogida:</strong> {pedido.fechahora}</p>
               
                <p><strong>Estado:</strong> {pedido.pagado ? 'Pagado' : 'Pendiente'}</p>
                <p className=''><strong>Total Pedido:</strong> {pedido.productos.reduce((acc, item) => acc + parseFloat(item.total), 0).toFixed(2)} €</p>

                <div className="mt-4">
                  <h4 className="font-semibold">Productos Comprados:</h4>
                  <ul>
                    {pedido.productos.map((producto, index) => (
                      <li key={index} className="py-2">
                        <p><strong>Nombre:</strong> {producto.nombre}</p>
                        <p><strong>Cantidad:</strong> {producto.cantidad}</p>
                        <p><strong>Precio Unitario:</strong> {producto.precio} €</p>
                        <p><strong>Total:</strong> {producto.total} €</p>
                        
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No se encontraron pedidos para este cliente.</p>
        )}
      </div>
    </div>
  );
};

export default BuscadorPedidos;
