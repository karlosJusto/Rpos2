import { useState, useContext, useImperativeHandle, forwardRef } from 'react';
import { dataContext } from '../Context/DataContext';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import dayjs from 'dayjs';

const PedidoRapido = forwardRef(({ datosCliente }, ref) => {
  const { cart, setCart } = useContext(dataContext);

  // Establecer el estado de los datos del cliente
  const [clienteData, setClienteData] = useState({
    cliente: 'AAgenerico',
    telefono: '000000000',
    fechahora: dayjs().add(15, 'minute').format('DD/MM/YYYY HH:mm'),
    observaciones: 'Pedido Rapido',
    pagado: false,
    celiaco: false,
    localidad: 'Mungia',
  });

  // Función para obtener el siguiente número de pedido
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

  // Función para actualizar el stock de los productos
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
          console.log(`Stock actualizado para el producto ${productData.name}: ${newStock}`);
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

  // Función para realizar el pedido
  const hacerPedido = async () => {
    try {
      const nextId = await getNextId();

      const clienteDataSanitized = {
        cliente: clienteData.cliente || datosCliente.cliente,
        telefono: clienteData.telefono || datosCliente.telefono,
        fechahora: clienteData.fechahora || datosCliente.fechahora,
        observaciones: clienteData.observaciones || datosCliente.observaciones,
        pagado: clienteData.pagado || datosCliente.pagado,
        celiaco: clienteData.celiaco || datosCliente.celiaco,
        localidad: clienteData.localidad || datosCliente.localidad,
      };

      if (!clienteDataSanitized.telefono || !clienteDataSanitized.cliente) {
        console.error('El nombre y teléfono del cliente son obligatorios');
        return;
      }

      // Paso 1: Obtener los precios de los productos desde Firestore
      const productosConPrecios = await Promise.all(
        cart.map(async (item) => {
          const productRef = doc(db, 'productos', item.id_product);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();
            return {
              ...item,
              precio: (productData.price || 0).toFixed(2),
             // total: ((productData.price || 0) * item.cantidad).toFixed(2),
            };
          } else {
            console.error(`Producto con id ${item.id_product} no encontrado`);
            return null;
          }
        })
      );

      console.log(productosConPrecios);

      // Filtrar productos nulos (por si no se encuentra el producto)
      const productosValidos = productosConPrecios.filter(item => item !== null);

      if (productosValidos.length === 0) {
        console.error('No se han encontrado productos válidos.');
        return;
      }

      // Calcular el total del pedido
      const totalPedido = productosValidos.reduce((acc, item) => acc + parseFloat(item.total), 0).toFixed(2);

      // Crear los datos del pedido con los productos obtenidos
      const pedidoData = {
        NumeroPedido: nextId,
        cliente: clienteDataSanitized.cliente,
        telefono: clienteDataSanitized.telefono,
        fechahora: clienteDataSanitized.fechahora,
        observaciones: clienteDataSanitized.observaciones,
        pagado: clienteDataSanitized.pagado,
        celiaco: clienteDataSanitized.celiaco,
        productos: productosValidos,
        total_pedido: totalPedido,
        fechahora_realizado: new Date().toLocaleString(),
      };

      // Paso 2: Guardar los datos del cliente en Firestore
      await setDoc(doc(db, 'clientes', clienteDataSanitized.telefono), clienteDataSanitized, { merge: true });

      // Paso 3: Guardar el pedido en Firestore
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteDataSanitized.telefono,
      });

      // Paso 4: Actualizar el stock de los productos
      await Promise.all(
        productosValidos.map((item) => {
          return updateStock(item.id_product.toString(), item.cantidad || 1);
        })
      );

      // Limpiar el carrito después de realizar el pedido
      setCart([]);
      console.log('Pedido realizado con éxito');
    } catch (error) {
      console.error('Error al realizar el pedido:', error);
    }
  };

  // Exponer la función hacerPedido a través de ref
  useImperativeHandle(ref, () => ({
    hacerPedido,
  }));

  return <></>;
});

export default PedidoRapido;
