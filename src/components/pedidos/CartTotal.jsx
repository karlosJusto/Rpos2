import { useState, useContext, useEffect } from 'react';
import { dataContext } from '../Context/DataContext';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const CartTotal = ({ datosCliente  }) => {

  const { cart, setCart, setDatosCliente } = useContext(dataContext);

  // Calcular el total
  const total = cart.reduce((acc, item) => acc + (item.price || 0) * (item.cantidad || 1), 0);

  // Función para obtener el número de pedido secuencial
  const getNextId = async () => {
    const contadorRef = doc(db, 'contadorPedidos', 'pedidoId');
    const docSnap = await getDoc(contadorRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const nextId = data.id + 1;
      await updateDoc(contadorRef, { id: nextId });
      return nextId;
    } else {
      await setDoc(contadorRef, { id: 1 });
      return 1;
    }
  };

  // Función para asegurarse de que los datos no sean undefined
  const sanitizeClientData = (data) => {
    return {
      cliente: data.cliente || '',
      telefono: data.telefono || '',
      fechahora: data.fechahora || '',
      observaciones: data.observaciones || '',
      pagado: data.pagado || false,
      celiaco: data.celiaco || false,
      localidad: data.localidad || '',
    };
  };

  // Función para actualizar el stock en Firebase
  const updateStock = async (productId, cantidadVendida) => {
    try {
      if (!productId || typeof productId !== 'string') {
        console.error('ID de producto inválido:', productId);
        return;
      }

      const productRef = doc(db, 'productos', productId.toString());
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const productData = productSnap.data();
        
       // console.log('Datos del producto:', productData);

        const currentStock = productData.stock || 0;
        const newStock = currentStock - cantidadVendida;

        if (newStock >= 0) {
          await updateDoc(productRef, { stock: newStock });
          console.log(`Stock actualizado para el producto ${productData.name || 'sin nombre'}: ${newStock}`);

          // Actualizar el carrito con el nuevo stock
          setCart(prevCart => prevCart.map(item =>
            item.id_product === productId
              ? { ...item, stock: newStock }
              : item
          ));
        } else {
          console.log(`No hay suficiente stock para el producto ${productData.name || 'sin nombre'}`);
        }
      } else {
        console.log('Producto no encontrado para el id:', productId);
      }
    } catch (error) {
      console.error('Error al actualizar el stock:', error);
    }
  };

  // Función para enviar los datos a Firestore
  const sendToFirestore = async () => {
    try {
      const nextId = await getNextId(); 
      const clienteData = sanitizeClientData(datosCliente);

      if (!clienteData.telefono) {
        console.error('El teléfono del cliente es obligatorio');
        return;
      }

      const pedidoData = {
        NumeroPedido: nextId,
        cliente: clienteData.cliente || '',
        telefono: clienteData.telefono || '',
        fechahora: clienteData.fechahora || dayjs().add(15, 'minute').format('DD/MM/YYYY HH:mm'),
        observaciones: clienteData.observaciones || '',
        pagado: clienteData.pagado || false,
        celiaco: clienteData.celiaco || false,
        empleado:  '',
        origen: 0, //origen del pedido
        productos: cart.map((item) => ({
          id: item.id_product, // Verifica que sea item.id_product
          nombre: item.name || '',
          cantidad: item.cantidad || 1,  // Valor por defecto si no hay cantidad
          //nombre_corto: item.alias, //prueba de alias
          observaciones: clienteData.observaciones || '',
          celiaco: item.celiaco || 'No',
          tostado: item.tostado || 'No',
          salsa: item.sinsalsa ? 'SinSalsa' : 'No',
          extrasalsa: item.extrasalsa ? 'ExtraSalsa' : 'No',
          troceado: item.troceado || 'No',
          categoria: item.categoria || 'No',
          precio: (item.price || 0).toFixed(2), // Asegúrate que price no sea undefined
          total: ((item.price || 0) * (item.cantidad || 1)).toFixed(2),
        })),
        // Calcular el total del pedido sumando los totales de todos los productos
        total_pedido: cart.reduce((acc, item) => {
          return acc + (item.price * item.cantidad || 0);
        }, 0).toFixed(2), // Redondea el resultado a 2 decimales
        

        fechahora_realizado: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      

      //console.log('Datos del pedido:', pedidoData);

      // 1. Guardar o actualizar los datos del cliente en la colección 'clientes'
      await setDoc(doc(db, 'clientes', clienteData.telefono), clienteData, { merge: true });
      console.log('Cliente guardado o actualizado con éxito en la colección clientes');

      // 2. Agregar el pedido a la colección "pedidos" y asociarlo al cliente
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteData.telefono,
      });

      // 3. Actualizar el stock de los productos de forma asincrónica
      await Promise.all(
        cart.map((item) => {
          if (item.id_product) {
            return updateStock(item.id_product.toString(), item.cantidad || 1);
          } else {
            console.log(`Producto sin id_product:`, item);
            return Promise.resolve(); // Asegura que la promesa se resuelva incluso si no hay id_product
          }
        })
      );

      console.log('Pedido guardado con éxito');
      setCart([]); // Limpiar el carrito

    } catch (error) {
      console.error('Error al guardar el pedido:', error);
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
};

export default CartTotal;
