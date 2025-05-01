import React, { useState } from 'react';
import { db } from "../firebase/firebase"; // Asegúrate de tener correctamente la configuración de Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import pagado from '../../assets/ticket/pagado.png'; // Imagen paid
import metodopago from '../../assets/ticket/metodopago.png'; // Imagen pago
import cliente from '../../assets/ticket/cliente.png'; // Imagen pago
import phone from '../../assets/ticket/phone.png'; // Imagen phone
import pedido from '../../assets/ticket/pedido.png'; // Imagen phone

const BuscadorPedidos = () => {
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [confirmacionTarjeta, setConfirmacionTarjeta] = useState('');
  const [criterio, setCriterio] = useState('telefono');
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

    // Declaramos las imágenes dentro del componente
    const imagenes = {
      telefono: phone,
      nombre: cliente,
      numeroPedido: pedido,
      confirmacionTarjeta: metodopago,
    };

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
            q = query(pedidosRef, where('idTransaction', '==', confirmacionTarjeta));
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

  const empleadoNombre=sessionStorage.getItem('empleadoNombre');
  //console.log(empleadoNombre);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-around gap-4 mb-4 -mt-8">
        {/* Filtros de búsqueda */}
        <div className="w-full sm:w-auto">
          <label htmlFor="criterio" className="block text-[#1C274C] font-extrabold font-nunito text-lg text-center">Buscar por:</label>
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

       {/* Mostrar la imagen basada en el criterio seleccionado */}
       <div className="w-full sm:w-auto text-center">
          <img
            src={imagenes[criterio]} // Aquí se utiliza la imagen importada
            alt="Imagen asociada al criterio"
            className="w-12 h-12 mx-auto mt-4"
          />
        </div>

        {/* Inputs de búsqueda */}
        {criterio === 'telefono' && (
  <div className="w-full sm:w-auto">
    <label htmlFor="telefono" className="block text-[#1C274C] font-extrabold font-nunito text-lg text-center">Teléfono:</label>
    <div className="relative">
      <input
        type="text"
        id="telefono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        className="w-full sm:w-auto p-3 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        placeholder="Ingresa el teléfono"
      />
      {telefono && (
        <button
          onClick={() => setTelefono('')} // Función para borrar el input
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)}

{criterio === 'nombre' && (
  <div className="w-full sm:w-auto">
    <label htmlFor="nombre" className="block text-[#1C274C] font-extrabold font-nunito text-lg text-center">Nombre del Cliente:</label>
    <div className="relative">
      <input
        type="text"
        id="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value.toLowerCase())}
        className="w-full sm:w-auto p-3 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        placeholder="Ingresa el nombre del cliente"
      />
      {nombre && (
        <button
          onClick={() => setNombre('')} // Función para borrar el input
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)}

{criterio === 'numeroPedido' && (
  <div className="w-full sm:w-auto">
    <label htmlFor="numeroPedido" className="block text-[#1C274C] font-extrabold font-nunito text-lg text-center">Número de Pedido:</label>
    <div className="relative">
      <input
        type="text"
        id="numeroPedido"
        value={numeroPedido}
        onChange={(e) => setNumeroPedido(e.target.value)}
        className="w-full text-center sm:w-auto p-3 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        placeholder="Ingresa el número de pedido"
      />
      {numeroPedido && (
        <button
          onClick={() => setNumeroPedido('')} // Función para borrar el input
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)}

{criterio === 'confirmacionTarjeta' && (
  <div className="w-full sm:w-auto">
    <label htmlFor="confirmacionTarjeta" className="block text-[#1C274C] font-extrabold font-nunito text-lg text-center">Confirmación de Tarjeta:</label>
    <div className="relative">
      <input
        type="text"
        id="confirmacionTarjeta"
        value={confirmacionTarjeta}
        onChange={(e) => setConfirmacionTarjeta(e.target.value)}
        className="w-full sm:w-[300px] p-3 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        placeholder="Ingresa la confirmación de tarjeta"
      />
      {confirmacionTarjeta && (
        <button
          onClick={() => setConfirmacionTarjeta('')} // Función para borrar el input
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
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
    <div className="flex items-center justify-center gap-2">
              <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 2a8 8 0 015.292 13.708l4.147 4.147a1 1 0 01-1.414 1.414l-4.147-4.147A8 8 0 1110 2zm0 2a6 6 0 100 12 6 6 0 000-12z"
            clipRule="evenodd"
          />
        </svg>
              Buscar Pedidos
            </div>
          )}
        </button>

      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}

      <div className="mt-6 text-center font-nunito">
  {pedidos.length > 0 ? (
    <div className="space-y-4">
      {[...pedidos]
        .sort((a, b) => b.NumeroPedido - a.NumeroPedido) // <-- Aquí se ordena de mayor a menor
        .map((pedido) => (
          <div key={pedido.id} className="border p-4 rounded-md shadow-md hover:shadow-xl transition mt-4 relative">
            {pedido.pagado && (
              <img
                src={pagado}
                alt="Pago Realizado"
                className="absolute top-60 right-10 w-60 h-60 transform rotate-90"
              />
            )}

                {/* Información del Pedido */}
                <table className="table table-striped table-bordered shadow-sm rounded-lg mb-4 font-nunito">
                  <thead className="thead-dark">
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th>F.Realizado</th>
                      <th>F.Recogida</th>
                      <th>Empleado</th>
                      <th>Origen</th>
                      <th>Nº auto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-light">
                      <td className='font-extrabold'>{pedido.NumeroPedido}</td>
                      <td>{pedido.cliente}</td>
                      <td>{pedido.telefono}</td>
                      <td>{pedido.fechahora_realizado}</td>
                      <td>{pedido.fechahora}</td>
                      <td>{pedido.empleado}</td>
                      <td>{pedido.origen === 1 ? 'Online' : 'Tienda'}</td>
                      <td className='text-[0.9vw] '>{pedido.idTransaction}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabla de Productos Comprados */}
                <div>
                  <h5 className="font-semibold text-lg text-yellow-500 pb-2">Productos Comprados</h5>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedido.productos.map((producto, index) => (
                        <tr key={index}>
                          <td>{producto.nombre}</td>
                          <td>{producto.cantidad}</td>
                          <td>{producto.precio} €</td>
                          <td>{producto.total} €</td>
                        </tr>
                      ))}
                      {/* Fila de Total Pedido */}
                      <tr className="font-extrabold">
                        <td colSpan="3" className="text-right">Total Pedido:</td>
                        <td>{pedido.productos.reduce((acc, item) => acc + parseFloat(item.total), 0).toFixed(2)} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tabla del Código QR */}
                <div className="mt-6">
                  <h5 className="font-semibold text-lg text-yellow-500 pb-2">Código QR del Pedido</h5>
                  <table className="table table-sm border-none">
                    <tbody>
                      <tr>
                        <td colSpan="2" className="text-center p-3 pb-1 border-0">
                          <img src={pedido.codigoQR} alt={`Código QR del Pedido ${pedido.NumeroPedido}`} className="w-28 h-28 mx-auto" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
