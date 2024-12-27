import { useState, useContext } from 'react';
import { dataContext } from '../Context/DataContext'
import { collection, addDoc, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

const CartTotal = ({ datosCliente }) => {
  const { cart, setCart, setDatosCliente } = useContext(dataContext); // Añadimos las funciones setCart y setDatosCliente

  // Calcular el total
  const total = cart.reduce((acc, item) => acc + item.price * item.cantidad, 0);

  //console.log(cart);

  // Función para obtener el numero pedido secuencial
  const getNextId = async () => {
    const contadorRef = doc(db, "contadorPedidos", "pedidoId"); // Documento donde guardamos el contador
    const docSnap = await getDoc(contadorRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const nextId = data.id + 1; // Incrementamos el contador
      await updateDoc(contadorRef, { id: nextId }); // Actualizamos el contador
      return nextId;
    } else {
      // Si no existe, creamos el documento con ID 1
      await setDoc(contadorRef, { id: 1 });
      return 1; // El primer ID
    }
  };

  // Función para asegurarse de que los datos no sean undefined
  const sanitizeClientData = (data) => {
    return {
      cliente: data.cliente || '',
      telefono: data.telefono || '',
      fechahora: data.fechahora || '',
      
      pagado: data.pagado || false,
      celiaco: data.celiaco || false,
      localidad: data.localidad || '', // Si 'localidad' está undefined, asignamos un string vacío
      //direccion: data.direccion || '', // Lo mismo para 'direccion'
    };
  };

  // Función para enviar los datos a Firestore
  const sendToFirestore = async () => {
    try {
      const nextId = await getNextId(); // Obtenemos el siguiente ID único

      // Preparamos los datos del cliente asegurándonos de que no haya valores undefined
      const clienteData = sanitizeClientData(datosCliente);

      // Prepara los datos del pedido
      const pedidoData = {
        NumeroPedido: nextId, // Usamos el ID secuencial
        cliente: clienteData.cliente,
        telefono: clienteData.telefono,
        fechahora: clienteData.fechahora,
        //observaciones: clienteData.observaciones,
        pagado: clienteData.pagado,
        celiaco: clienteData.celiaco,
        productos: cart.map((item) => ({
          id: item.id,
          nombre: item.name,
          cantidad: item.cantidad,
          observaciones: clienteData.observaciones || '',
          celiaco: item.celiaco || 'No',  // Si es celiaco

          tostado: item.tostado || 'No',  // Si el producto tiene tostado
          salsa: item.sinsalsa ? 'Sin Salsa' : (item.sinsalsa ? 'Extra Salsa' : 'Normal'), // Si es sin salsa o extra salsa
          extrasalsa: item.extrasalsa ? 'Sin Salsa' : (item.extrasalsa ? 'Extra Salsa' : 'Normal'), // Si es sin salsa o extra salsa
          troceado: item.troceado || 'No',  // Si el producto es troceado
          
          
          precio: (item.price).toFixed(2),
          total: (item.price * item.cantidad).toFixed(2),
        })),
        // Formateamos la fecha y hora que se realiza el pedido.
        fechahora_realizado: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      console.log('Datos del pedido:', pedidoData);

      // 1. Guardar o actualizar los datos del cliente en la colección 'clientes'
      await setDoc(doc(db, 'clientes', clienteData.telefono), clienteData, { merge: true });

      console.log('Cliente guardado o actualizado con éxito en la colección clientes');

      // 2. Agregar el pedido a la colección "pedidos" y asociarlo al cliente
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteData.telefono, // Relacionamos el pedido con el cliente usando su número de teléfono
      });

      // Mostrar confirmación de que el pedido fue guardado
      console.log('Pedido guardado con éxito en la colección pedidos');

      // Limpiar los datos del carrito y del cliente
      setCart([]);  // Limpiar el carrito
      

    } catch (error) {
      console.error('Error al guardar el pedido: ', error);
    }
  };

  return cart.length > 0 ? (
    <>
      <div className='flex justify-end p-[0.5vw]'>
        <a href="#" className="inline-flex items-center text-2xl font-extrabold text-gray-600 hover:underline dark:text-gray-400">
          <span className='text-end'>{total.toFixed(2)} €</span>
        </a>
      </div>

      <div className='flex text-center justify-center items-center'>
        <button onClick={sendToFirestore}
          className="mt-[2vw] w-[12vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0">
          </g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier">
            <path d="M4 18V6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 12L20 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z"
              stroke="#ffffff" strokeWidth="1.5"></path>
            <path d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18" stroke="#ffffff" strokeWidth="1.5"></path>
          </g></svg>
          <span className="ml-[0.5vw] font-nunito text-lg">
            Generar Pedido
          </span>
        </button>
      </div>
    </>
  ) : (
    <h1></h1>
  );
}

export default CartTotal;
