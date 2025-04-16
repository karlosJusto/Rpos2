import { useState, useContext, useImperativeHandle, forwardRef, useEffect } from 'react';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import dayjs from 'dayjs';

const PedidoRapido = forwardRef(({ datosCliente }, ref) => {
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
          alert(`No hay suficiente stock para ${productStockData.name}. Stock disponible: ${currentStock}`);
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

  return <></>;
});

export default PedidoRapido;