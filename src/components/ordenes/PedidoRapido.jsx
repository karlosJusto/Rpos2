import { useState, useContext, useImperativeHandle, forwardRef, useEffect } from 'react';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import dayjs from 'dayjs';
import { Modal, Button } from "react-bootstrap"; // Asumiendo que usas react-bootstrap

const PedidoRapido = forwardRef(({ datosCliente }, ref) => {

  const [showModal2, setShowModal2] = useState(false); // Visibilidad Modal Error/Aviso Genérico
  const handleCloseModal2 = () => setShowModal2(false);




  // Obtener hora formateada
  const obtenerHoraRedondeada = () => {
    const now = dayjs();
    const minutos = now.minute();
    let nuevoBloque;

    if (minutos >= 0 && minutos <= 15) {
      nuevoBloque = now.startOf('hour').add(15, 'minute');
    } else if (minutos >= 16 && minutos <= 30) {
      nuevoBloque = now.startOf('hour').add(30, 'minute');
    } else if (minutos >= 31 && minutos <= 45) {
      nuevoBloque = now.startOf('hour').add(45, 'minute');
    } else if (minutos >= 46 && minutos <= 59) {
      nuevoBloque = now.add(1, 'hour').startOf('hour');
    }

    return nuevoBloque.isBefore(now) ? nuevoBloque.add(15, 'minute') : nuevoBloque;
  };

  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');
  const [empleadoNombre, setEmpleadoNombre] = useState(null);

  useEffect(() => {
    const nombre = sessionStorage.getItem('empleadoNombre');
    if (nombre) {
      setEmpleadoNombre(nombre);
    } else {
      console.log('No se encontró el nombre del empleado en sessionStorage');
    }
  }, []);

  const [clienteData, setClienteData] = useState({
    cliente: datosCliente.cliente || 'AAgenerico',
    telefono: datosCliente.telefono || '000000000',
    fechahora: datosCliente.fechahora || fechahora,
    observaciones: datosCliente.observaciones || 'Pedido Rapido',
    pagado: datosCliente.pagado || false,
    celiaco: datosCliente.celiaco || false,
    localidad: datosCliente.localidad || 'Mungia',
  });

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

  const updateStock = async (productId, cantidadVendida) => {
    try {
      const productRef = doc(db, 'productos', productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const productData = productSnap.data();
        const currentStock = productData.stock || 0;
        const newStock = currentStock - cantidadVendida;

        if (newStock >= 0) {
          await updateDoc(productRef, { stock: newStock });
        } else {
          console.log(`No hay suficiente stock para el producto ${productData.name}`);
        }
      } else {
        console.log('Producto no encontrado para el id:', productId);
      }
    } catch (error) {
      console.error('Error al actualizar el stock:', error);
    }
  };

  const hacerPedidoRapido = async (idProduct) => {
    try {
      const nextId = await getNextId();

      const productRef = doc(db, 'productos', idProduct.toString());
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        console.error('Producto no encontrado en Firestore');
        return;
      }

      const productData = productSnap.data();

      // Determinar la cantidad a descontar del stock y el producto a descontar
      let cantidadDescontar = 1;
      let productoStockId = idProduct.toString();

      if (idProduct === 2) {
        cantidadDescontar = 0.5;
        productoStockId = '1'; // Siempre descontar del producto con id 1
      }

      // Verificar si hay suficiente stock
      const productStockRef = doc(db, 'productos', productoStockId);
      const productStockSnap = await getDoc(productStockRef);

      if (productStockSnap.exists()) {
        const productStockData = productStockSnap.data();
        const currentStock = productStockData.stock || 0;

        if (cantidadDescontar > currentStock) {
          
          setShowModal2(true); // Mostrar el modal con los errores
          //alert(`No hay suficiente stock para ${productStockData.name}. Stock disponible: ${currentStock}`);
          return; // Cancelar la venta
        }
      } else {
        console.log('Producto no encontrado para el id:', productoStockId);
        return; // Cancelar la venta si no se encuentra el producto de stock
      }

      const productoRapidoData = {
        NumeroPedido: nextId,
        cliente: clienteData.cliente,
        empleado: empleadoNombre,
        telefono: clienteData.telefono,
        fechahora: datosCliente.fechahora || fechahora,
        observaciones: clienteData.observaciones,
        pagado: clienteData.pagado,
        origen: 0,
        productos: [{
          id: idProduct,
          nombre: productData.name || 'Producto desconocido',
          cantidad: 1,
          alias: productData.alias,
          observaciones: clienteData.observaciones || '',
          celiaco: clienteData.celiaco || false,
          tostado: false,
          salsa: false,
          extrasalsa: false,
          entregado: 1,
          troceado: false,
          categoria: productData.categoria || 'No especificado',
          precio: (productData.price || 0).toFixed(2),
          total: (productData.price || 0).toFixed(2),
        }],
        total_pedido: (productData.price || 0).toFixed(2),
        fechahora_realizado: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      await setDoc(doc(db, 'pedidos', nextId.toString()), productoRapidoData);
      await updateStock(productoStockId, cantidadDescontar);

      console.log('Pedido rápido realizado con éxito');
    } catch (error) {
      console.error('Error al realizar el pedido rápido:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    hacerPedidoRapido,
  }));

   
  

   
    
    

  return <>
  
   {/* Modal 2: Errores o Información General */}
   <Modal show={showModal2} onHide={() => { handleCloseModal2(); }} size="md" backdrop="static" keyboard={false} centered>
        
        <Modal.Body className="flex flex-col items-center p-4">
          {/* Puedes añadir un icono de error aquí */}
          <div className='p-1'>
         <svg fill="#c81d0c" width="100px" height="100px" viewBox="0 0 22 22" version="1.1" xmlns="http://www.w3.org/2000/svg">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier">

              <path d="M12.1458333,9.85416667 L12.1458333,6.74047388 C12.1458333,6.4826434 11.9382041,6.28571429 11.6820804,6.28571429 L10.3179196,6.28571429 C10.0656535,6.28571429 9.85416667,6.48931709 9.85416667,6.74047388 L9.85416667,9.85416667 L6.74047388,9.85416667 C6.4826434,9.85416667 6.28571429,10.0617959 6.28571429,10.3179196 L6.28571429,11.6820804 C6.28571429,11.9343465 6.48931709,12.1458333 6.74047388,12.1458333 L9.85416667,12.1458333 L9.85416667,15.2595261 C9.85416667,15.5173566 10.0617959,15.7142857 10.3179196,15.7142857 L11.6820804,15.7142857 C11.9343465,15.7142857 12.1458333,15.5106829 12.1458333,15.2595261 L12.1458333,12.1458333 L15.2595261,12.1458333 C15.5173566,12.1458333 15.7142857,11.9382041 15.7142857,11.6820804 L15.7142857,10.3179196 C15.7142857,10.0656535 15.5106829,9.85416667 15.2595261,9.85416667 L12.1458333,9.85416667 Z" id="Combined-Shape" transform="translate(11.000000, 11.000000) rotate(-45.000000) translate(-11.000000, -11.000000) "/>

              </g>

          </svg>



         </div>
          <p className="font-nunito text-xl p-2 text-center text-gray-700">No hay suficiente stock de Pollo para pedido Rápido.</p>
        </Modal.Body>
        <Modal.Footer className='no-border'>
          {/* Botón Aceptar: Cierra el modal y asegura que isSubmitting es false */}
          <Button variant="primary" className="mt-1 bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 py-2 px-5 font-nunito text-white rounded-md shadow-sm" onClick={() => { handleCloseModal2(); }}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>
  
  
  
  </>;
});

export default PedidoRapido;