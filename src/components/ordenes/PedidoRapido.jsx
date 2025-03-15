import { useState, useContext, useImperativeHandle, forwardRef } from 'react';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import dayjs from 'dayjs';

const PedidoRapido = forwardRef(({ datosCliente }, ref) => {

//obtener hora formateada


const obtenerHoraRedondeada = () => {
  const now = dayjs(); // Hora actual
  
  // Obtener los minutos actuales
  const minutos = now.minute();

  // Redondeamos los minutos al múltiplo más cercano de 15 (xx:00, xx:15, xx:30, xx:45)
  const siguienteBloque = Math.floor(minutos / 15) * 15; // Redondea hacia abajo al múltiplo más cercano de 15 minutos
  
  // Ajustar la hora a 00, 15, 30, 45 minutos
  const nuevaHora = now
    .minute(siguienteBloque) // Ajustamos a los minutos correspondientes (xx:00, xx:15, etc.)
    .second(0)
    .millisecond(0);

  // Si la hora ajustada es antes de la hora actual, avanzamos al siguiente bloque (añadimos 15 minutos)
  return nuevaHora.isBefore(now) ? nuevaHora.add(15, 'minute') : nuevaHora;
};

const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');








//console.log(fechahora);



  const [clienteData, setClienteData] = useState({
    cliente: datosCliente.cliente || 'AAgenerico',
    telefono: datosCliente.telefono || '000000000',
    fechahora:  datosCliente.fechahora || fechahora,
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

      // Aquí se usa un id_product claro (por ejemplo, id_product = 1)
      const productRef = doc(db, 'productos', idProduct.toString()); // Usamos el id del producto directamente
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        console.error('Producto no encontrado en Firestore');
        return;
      }

      const productData = productSnap.data();

      // Crear los datos del pedido rápido
      const productoRapidoData = {
        NumeroPedido: nextId,
        cliente: clienteData.cliente,
        telefono: clienteData.telefono,
        fechahora: datosCliente.fechahora || fechahora,
        observaciones: clienteData.observaciones,
        pagado: clienteData.pagado,
        origen: 0, //origen del pedido
        productos: [{
          id: idProduct, // El id del producto que estamos usando
          nombre: productData.name || 'Producto desconocido', // Nombre del producto desde Firestore
          cantidad: 1, // Cantidad del producto, si es necesario
          //cantidad: idProduct === 1 ? 1 : (idProduct === 2 ? 0.5 : 1),
          alias: productData.alias, // Alias (si aplica)
          observaciones: clienteData.observaciones || '', // Observaciones adicionales
          celiaco: clienteData.celiaco || false, // Si el cliente tiene restricciones para celiacos
          tostado: false, // Si el producto está tostado, si aplica
          salsa: false, // Si no lleva salsa
          extrasalsa: false, // Si lleva extra salsa
          entregado: 1, // Si el producto ha sido entregado
          troceado: false, // Si el producto está troceado
          categoria: productData.categoria || 'No especificado', // Categoría del producto
          precio: (productData.price || 0).toFixed(2), // Precio del producto, asegurándose de que no sea undefined
          total: (productData.price || 0).toFixed(2), // Total para este producto (precio * cantidad)
        }],
        total_pedido: (productData.price || 0).toFixed(2), // Total del pedido
        fechahora_realizado: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), // Fecha y hora de realización
      };

      // Guardar el pedido rápido en Firestore
      await setDoc(doc(db, 'pedidos', nextId.toString()), productoRapidoData);

      // Actualiza el stock de los productos
      await updateStock(idProduct.toString(), 1);// Solo actualizamos el stock del producto 1

      console.log('Pedido rápido realizado con éxito');
    } catch (error) {
      console.error('Error al realizar el pedido rápido:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    hacerPedidoRapido,
  }));

  return <></>; // Este componente no necesita un UI porque solo se usa para ejecutar la lógica
});

export default PedidoRapido;
