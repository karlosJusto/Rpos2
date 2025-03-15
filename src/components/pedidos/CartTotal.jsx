import { useState, useContext } from 'react';
import { dataContext } from '../Context/DataContext';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

const CartTotal = ({ datosCliente }) => {
  const { cart, setCart, setDatosCliente } = useContext(dataContext);

  // Calcular el total del carrito
  const total = cart.reduce((acc, item) => acc + (item.price || 0) * (item.cantidad || 1), 0);

  // Función para obtener el siguiente ID de pedido (secuencial)
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

  // Función para asegurar que los datos del cliente tengan valores válidos
  const sanitizeClientData = (data) => ({
    cliente: data.cliente || '',
    telefono: data.telefono || '',
    fechahora: data.fechahora || '',
    observaciones: data.observaciones || '',
    pagado: data.pagado || false,
    celiaco: data.celiaco || false,
    localidad: data.localidad || '',
  });

  // Función para actualizar el stock del producto
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
        const currentStock = productData.stock || 0;
        const newStock = currentStock - cantidadVendida;
        if (newStock >= 0) {
          await updateDoc(productRef, { stock: newStock });
          console.log(`Stock actualizado para el producto ${productData.name || 'sin nombre'}: ${newStock}`);
          setCart(prevCart =>
            prevCart.map(item =>
              item.id_product === productId
                ? { ...item, stock: newStock }
                : item
            )
          );
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

  // Función para actualizar el daily calendar (chicken_calendar_byday) con el número de "Pollo Asado"
  // Utiliza exactamente el campo fechahora del cliente sin redondear
  const updateChickenCalendarPollo = async (fechahora, cantidad) => {
    try {
      // Parseamos la fecha del pedido con el formato "DD/MM/YYYY HH:mm"
      const orderDate = dayjs(fechahora, 'DD/MM/YYYY HH:mm');
      // El documento diario se identifica con formato "YYYY-MM-DD"
      const dailyDocId = orderDate.format('YYYY-MM-DD');
      // Se toma la hora del pedido, tal como viene en clientData.fechahora (por ejemplo, "17:32")
      const timeSlot = orderDate.format('HH:mm');

      const docRef = doc(db, 'chicken_calendar_byday', dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('Documento diario no existe');
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        console.log("Intervalos del daily calendar:", intervals);
        // Buscar el intervalo cuyo "start" coincida exactamente con el timeSlot obtenido
        const index = intervals.findIndex(interval => interval.start === timeSlot);
        if (index === -1) {
          throw new Error(`No se encontró el intervalo con start ${timeSlot}`);
        }

        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;

        // Validación para no exceder el límite:
        if (current < max) {
          if (current + cantidad <= max) {
            intervals[index].orderedCount = current + cantidad;
          } else {
            throw new Error('La cantidad de Pollo Asado excede el límite permitido en este intervalo');
          }
        } else if (current === max) {
          if (cantidad === 1) {
            intervals[index].orderedCount = current + 1;
          } else {
            throw new Error('Solo se permite pedir 1 Pollo Asado adicional en este intervalo');
          }
        } else {
          throw new Error('El límite de Pollo Asado en este intervalo ya se ha alcanzado');
        }

        transaction.update(docRef, { intervals });
      });
      console.log('Chicken calendar actualizado correctamente para Pollo Asado');
    } catch (error) {
      console.error('Error actualizando chicken calendar para Pollo Asado:', error);
      throw error; // Propagamos el error para impedir que se procese el pedido
    }
  };

  // Función para enviar el pedido a Firestore
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
        empleado: '',
        origen: 0, // Origen del pedido
        productos: cart.map((item) => ({
          id: item.id_product,
          nombre: item.name || '',
          cantidad: item.cantidad || 1,
          observaciones: clienteData.observaciones || '',
          celiaco: item.celiaco || 'No',
          tostado: item.tostado || 'No',
          salsa: item.sinsalsa ? 'SinSalsa' : 'No',
          extrasalsa: item.extrasalsa ? 'ExtraSalsa' : 'No',
          troceado: item.troceado || 'No',
          categoria: item.categoria || 'No',
          precio: (item.price || 0).toFixed(2),
          total: ((item.price || 0) * (item.cantidad || 1)).toFixed(2),
        })),
        total_pedido: cart.reduce((acc, item) => acc + (item.price * item.cantidad || 0), 0).toFixed(2),
        fechahora_realizado: new Date().toLocaleDateString('es-ES') +
          ' ' +
          new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      // 1. Guardar o actualizar los datos del cliente en la colección "clientes"
      await setDoc(doc(db, 'clientes', clienteData.telefono), clienteData, { merge: true });
      console.log('Cliente guardado o actualizado en la colección clientes');

      // 2. Agregar el pedido a la colección "pedidos" y asociarlo al cliente
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteData.telefono,
      });

      // 3. Actualizar el stock de cada producto
      await Promise.all(
        cart.map((item) => {
          if (item.id_product) {
            return updateStock(item.id_product.toString(), item.cantidad || 1);
          } else {
            console.log('Producto sin id_product:', item);
            return Promise.resolve();
          }
        })
      );

      // 4. Si el pedido contiene "Pollo Asado", actualizar el daily calendar
      const polloItem = pedidoData.productos.find(p => p.nombre === 'Pollo Asado');
      if (polloItem) {
        const cantidadPollo = polloItem.cantidad || 1;
        await updateChickenCalendarPollo(pedidoData.fechahora, cantidadPollo);
      }

      console.log('Pedido guardado con éxito');
      setCart([]); // Limpiar el carrito
    } catch (error) {
      console.error('Error al guardar el pedido:', error);
    }
  };

  return cart.length > 0 ? (
    <>
      <div className="flex justify-end p-[0.5vw]">
        <a href="#" className="inline-flex items-center text-2xl font-extrabold text-gray-600 hover:underline dark:text-gray-400">
          <span className="text-end">{total.toFixed(2)} €</span>
        </a>
      </div>
      <div className="flex text-center justify-center items-center">
        <button onClick={sendToFirestore}
          className="mt-[2vw] w-[12vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* SVG omitido para brevedad */}
          </svg>
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
