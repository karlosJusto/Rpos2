import { useState, useContext, useEffect } from 'react';
import { dataContext } from '../Context/DataContext';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Link, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { Offcanvas, Button, Nav, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

const CartTotal = ({ datosCliente, setDatosCliente }) => {
  const { cart, setCart } = useContext(dataContext);
  const navigate = useNavigate();

  const [mensajeModal, setMensajeModal] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseModal = () => {
    setShowModal(false);
  };
  
  const handleCloseModal2 = () => {
    setShowModal2(false);
  };

  // Calcula el total del carrito
  const total = cart.reduce((acc, item) => acc + (item.price || 0) * (item.cantidad || 1), 0);

  // Función para redondear la hora actual al siguiente bloque de 15 minutos
  const obtenerHoraRedondeada = () => {
    const now = dayjs();
    const minutos = now.minute();
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    const nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    return nuevaHora.isBefore(now) ? nuevaHora.add(15, 'minute') : nuevaHora;
  };

  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');

  // Función para obtener el siguiente ID de pedido
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

  // Asegura que los datos del cliente tengan valores válidos
  const sanitizeClientData = (data) => ({
    cliente: data.cliente || '',
    telefono: data.telefono || '',
    fechahora: data.fechahora || '',
    observaciones: data.observaciones || '',
    pagado: data.pagado || false,
    celiaco: data.celiaco || false,
    localidad: data.localidad || '',
  });

  // Función para actualizar el stock de un producto
  const updateStock = async (productId, cantidadVendida) => {
    try {
      if (productId == null || typeof productId !== 'number') {
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
          console.log(`Stock actualizado para ${productData.name || 'sin nombre'}: ${newStock}`);
          setCart(prevCart =>
            prevCart.map(item =>
              item.id_product === productId
                ? { ...item, stock: newStock }
                : item
            )
          );
        } else {
          console.log(`No hay suficiente stock para ${productData.name || 'sin nombre'}`);
        }
      } else {
        console.log('Producto no encontrado para el id:', productId);
      }
    } catch (error) {
      console.error('Error al actualizar el stock:', error);
    }
  };

  // Helper: Convierte "HH:mm" a minutos
  const convertTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper: Encuentra el índice del intervalo cuyo "start" sea el más cercano al tiempo target
  const findClosestIntervalIndex = (intervals, targetTime) => {
    const targetMinutes = convertTimeToMinutes(targetTime);
    let closestIndex = 0;
    let smallestDiff = Infinity;
    intervals.forEach((interval, index) => {
      const intervalMinutes = convertTimeToMinutes(interval.start);
      const diff = Math.abs(intervalMinutes - targetMinutes);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = index;
      }
    });
    return closestIndex;
  };

  // Validación del pedido
  const validateOrder = async () => {
    const incluyePollo = cart.some(item => item.id_product === 1 || item.id_product === 2);
    const clienteData = sanitizeClientData(datosCliente);
  
    if (!clienteData.telefono) {
      setMensajeModal("El teléfono del cliente es obligatorio.");
      setShowModal2(true);
      return false;
    }
  
    if (!clienteData.fechahora) {
      setMensajeModal("No has seleccionado hora para el pedido.");
      setShowModal2(true);
      return false;
    }
  
    if (!incluyePollo) {
      setMensajeModal("Comprueba...tu pedido no incluye pollo.");
      setShowModal(true);
      return false;
    }
  
    // Verificar stock de cada producto
    for (const item of cart) {
      const productRef = doc(db, 'productos', item.id_product.toString());
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const currentStock = productData.stock || 0;
        if (currentStock < item.cantidad) {
          setMensajeModal(`No hay suficiente stock para ${item.name || 'sin nombre'}. Solo quedan ${currentStock} unidades.`);
          setShowModal2(true);
          return false;
        }
      } else {
        setMensajeModal(`Producto no encontrado para el id: ${item.id_product}`);
        setShowModal2(true);
        return false;
      }
    }
  
    return true;
  };

  // Función para actualizar el daily calendar para Pollo Asado
  const updateChickenCalendarPollo = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, 'DD/MM/YYYY HH:mm');
      const dailyDocId = orderDate.format('YYYY-MM-DD');
      const timeSlot = orderDate.format('HH:mm');
      const docRef = doc(db, 'chicken_calendar_daily', dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('Documento diario no existe');
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        console.log("Intervalos del chicken calendar:", intervals);
        let index = intervals.findIndex(interval => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
          console.log(`No se encontró el intervalo exacto para ${timeSlot}. Usando el más cercano: ${intervals[index].start} - ${intervals[index].end}`);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error('El límite de Pollo Asado en este intervalo ya se ha alcanzado');
        }
        transaction.update(docRef, { intervals });
      });
      console.log('Chicken calendar actualizado correctamente para Pollo Asado');
    } catch (error) {
      console.error('Error actualizando chicken calendar para Pollo Asado:', error);
      throw error;
    }
  };

  // Función para actualizar el daily calendar para Costilla
  const updateCostillaCalendar = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, 'DD/MM/YYYY HH:mm');
      const dailyDocId = orderDate.format('YYYY-MM-DD');
      const timeSlot = orderDate.format('HH:mm');
      const docRef = doc(db, 'costilla_calendar_daily', dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('Documento diario de costilla no existe');
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        console.log("Intervalos del costilla calendar:", intervals);
        let index = intervals.findIndex(interval => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
          console.log(`No se encontró el intervalo exacto para ${timeSlot} en Costilla. Usando el más cercano: ${intervals[index].start} - ${intervals[index].end}`);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error('El límite de Costilla en este intervalo ya se ha alcanzado');
        }
        transaction.update(docRef, { intervals });
      });
      console.log('Costilla calendar actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando costilla calendar:', error);
      throw error;
    }
  };

  // Función para actualizar el daily calendar para Codillo
  const updateCodilloCalendar = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, 'DD/MM/YYYY HH:mm');
      const dailyDocId = orderDate.format('YYYY-MM-DD');
      const timeSlot = orderDate.format('HH:mm');
      const docRef = doc(db, 'codillo_calendar_daily', dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error('Documento diario de codillo no existe');
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        console.log("Intervalos del codillo calendar:", intervals);
        let index = intervals.findIndex(interval => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
          console.log(`No se encontró el intervalo exacto para ${timeSlot} en Codillo. Usando el más cercano: ${intervals[index].start} - ${intervals[index].end}`);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error('El límite de Codillo en este intervalo ya se ha alcanzado');
        }
        transaction.update(docRef, { intervals });
      });
      console.log('Codillo calendar actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando codillo calendar:', error);
      throw error;
    }
  };

  // Función para enviar el pedido a Firestore (con control de múltiples envíos)
  const sendToFirestore = async ({ confirmado }) => {
    if (isSubmitting) return; // Evitar envíos múltiples
    setIsSubmitting(true);
    try {
      if (!confirmado) {
        const isValid = await validateOrder();
        console.log("Es valido:" + isValid);
        if (!isValid) {
          return;
        }
      }

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
        fechahora: clienteData.fechahora || fechahora,
        observaciones: clienteData.observaciones || '',
        pagado: clienteData.pagado || false,
        empleado: '',
        origen: 0,
        productos: cart.map((item) => ({
          id: item.id_product,
          nombre: item.name || '',
          cantidad: item.cantidad || 1,
          alias: item.alias,
          observaciones: clienteData.observaciones || '',
          celiaco: item.celiaco,
          tostado: item.tostado,
          salsa: item.sinsalsa,
          extrasalsa: item.extrasalsa,
          entregado: item.entregado || 0,
          troceado: item.troceado,
          categoria: item.categoria || 'No',
          precio: (item.price || 0).toFixed(2),
          total: ((item.price || 0) * (item.cantidad || 1)).toFixed(2),
        })),
        total_pedido: cart.reduce((acc, item) => acc + (item.price * item.cantidad || 0), 0).toFixed(2),
        fechahora_realizado:
          new Date().toLocaleDateString('es-ES') +
          ' ' +
          new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      // Guardar o actualizar los datos del cliente
      await setDoc(doc(db, 'clientes', clienteData.telefono), clienteData, { merge: true });
      console.log('Cliente guardado o actualizado en la colección clientes');

      // Agregar el pedido a la colección "pedidos"
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteData.telefono,
      });

      // Actualizar stock de productos
      // Pollos enteros (id_product === 1)
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 1) {
            return updateStock(item.id_product, item.cantidad || 1);
          } else {
            return Promise.resolve();
          }
        })
      );
      // Medios pollos (id_product === 2)
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 2) {
            const cantidadDeMediosPollos = item.cantidad || 1;
            const cantidadDePollosEnteros = cantidadDeMediosPollos / 2;
            return updateStock(1, cantidadDePollosEnteros);
          } else {
            return Promise.resolve();
          }
        })
      );
      // Costilla: producto entero (id_product === 41)
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 41) {
            return updateStock(item.id_product, item.cantidad || 1);
          } else {
            return Promise.resolve();
          }
        })
      );
      // Media costilla (id_product === 48) se descuenta sobre el stock de la costilla entera (id_product === 41)
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 48) {
            const cantidadDeMediaCostilla = item.cantidad || 1;
            const cantidadDeCostillaEntera = cantidadDeMediaCostilla / 2;
            return updateStock(41, cantidadDeCostillaEntera);
          } else {
            return Promise.resolve();
          }
        })
      );

      // Actualizar daily calendar según los productos
      // Pollo Asado (se identifica por nombre "Pollo Asado")
      const polloItem = pedidoData.productos.find(p => p.nombre === 'Pollo Asado');
      if (polloItem) {
        const cantidadPollo = polloItem.cantidad || 1;
        await updateChickenCalendarPollo(pedidoData.fechahora, cantidadPollo);
      }

      // Costilla (se identifican por id 41 o 48)
      const costillaItems = pedidoData.productos.filter(p => p.id === 41 || p.id === 48);
      if (costillaItems.length > 0) {
        let cantidadCostilla = 0;
        costillaItems.forEach(p => {
          if (p.id === 41) {
            cantidadCostilla += p.cantidad;
          } else if (p.id === 48) {
            cantidadCostilla += p.cantidad / 2;
          }
        });
        await updateCostillaCalendar(pedidoData.fechahora, cantidadCostilla);
      }

      // Codillo (se identifica por nombre que incluya "codillo" o por id 50, ajustar según corresponda)
      const codilloItems = pedidoData.productos.filter(p => 
        p.nombre.toLowerCase().includes('codillo') || p.id === 50
      );
      if (codilloItems.length > 0) {
        const cantidadCodillo = codilloItems.reduce((sum, p) => sum + p.cantidad, 0);
        await updateCodilloCalendar(pedidoData.fechahora, cantidadCodillo);
      }

      console.log('Pedido guardado con éxito');
      setCart([]);
      setDatosCliente({
        cliente: '',
        telefono: '',
        fechahora: '',
        observaciones: '',
        pagado: false,
        celiaco: false,
        localidad: '',
      });

      navigate("/ordenes");
      
    } catch (error) {
      console.error('Error al guardar el pedido:', error);
    } finally {
      setIsSubmitting(false);
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
        <button onClick={() => sendToFirestore({ confirmado: false })}
          className="mt-[2vw] w-[10vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 18V6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 12L20 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z"
              stroke="#ffffff" strokeWidth="1.5"></path>
            <path d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18" stroke="#ffffff" strokeWidth="1.5"></path>
          </svg>
          <span className="ml-[0.5vw] font-nunito text-md">
            Generar Pedido
          </span>
        </button>
      </div>

      {/* Modal de error o validación */}
      <Modal show={showModal2} onHide={handleCloseModal2} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center">
          <div className='p-2'>
            <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.04-8.24 3.08-10.04 1.04-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.04-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.08 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.08 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.08-1.48 0.28-0.36 0.04-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.04-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/>
              </g>
            </svg>
          </div>
          <div>
            <h1 className='font-nunito text-xl p-2 text-center text-[#808b96]'>{mensajeModal}</h1>
          </div>
        </Modal.Body>
        <Modal.Footer className='no-border'>
          <Button
            variant="primary"
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-2 font-nunito"
            onClick={handleCloseModal2}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para validación de pedido (ej. falta pollo) */}
      <Modal show={showModal} onHide={handleCloseModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center">
          <div className='p-2'>
            <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.04-8.24 3.08-10.04 1.04-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.04-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.08 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.08 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.08-1.48 0.28-0.36 0.04-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.04-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/>
              </g>
            </svg>
          </div>
          <div>
            <h1 className='font-nunito text-xl p-2 text-center text-[#808b96]'>{mensajeModal}</h1>
          </div>
        </Modal.Body>
        <Modal.Footer className='no-border p-4'>
          <Button
            variant="secondary"
            className="p-3 bg-white font-nunito text-red-500 border-red-500 hover:text-red-600 hover:border-red-600"
            onClick={handleCloseModal}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await sendToFirestore({ confirmado: true });
            }}
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito"
          >
            Continuar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  ) : (
    <h1></h1>
  );
};

export default CartTotal;
