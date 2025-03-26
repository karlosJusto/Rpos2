import { useState, useContext, useEffect} from 'react';
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
  const navigate = useNavigate();  // Declara el hook useNavigate


  const [mensajeModal, setMensajeModal] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);

  const handleCloseModal = () => {
    setShowModal(false); // Cerrar el modal
  };
  
  const handleCloseModal2 = () => {
    setShowModal2(false); // Cerrar el modal
  };

  // Calcular el total del carrito
  const total = cart.reduce((acc, item) => acc + (item.price || 0) * (item.cantidad || 1), 0);

  // Calcular hora optimizada
  const obtenerHoraRedondeada = () => {
    const now = dayjs(); // Hora actual
    const minutos = now.minute();
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    const nuevaHora = now
      .minute(siguienteBloque)
      .second(0)
      .millisecond(0);
    return nuevaHora.isBefore(now) ? nuevaHora.add(15, 'minute') : nuevaHora;
  };

  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');

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
          console.log("Stock actualizado para el producto ${productData.name || 'sin nombre'}: ${newStock}");

          // Actualizar el carrito con el nuevo stock
          setCart(prevCart =>
            prevCart.map(item =>
              item.id_product === productId
                ? { ...item, stock: newStock }
                : item
            )
          );
        } else {
          console.log("No hay suficiente stock para el producto ${productData.name || 'sin nombre'}");
        }
      } else {
        console.log('Producto no encontrado para el id:', productId);
      }
    } catch (error) {
      console.error('Error al actualizar el stock:', error);
    }
  };


  const validateOrder = async () => {
    const incluyePollo = cart.some(item => item.id_product === 1 || item.id_product === 2); // Suponiendo que el id de pollo es 1
    
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
  
    // Verificar si hay suficiente stock para los productos
    for (const item of cart) {
      const productRef = doc(db, 'productos', item.id_product.toString());
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const currentStock = productData.stock || 0;
  
        if (currentStock < item.cantidad) {
          setMensajeModal(`No hay suficiente stock para el producto ${item.name || 'sin nombre'}. Solo quedan ${currentStock} unidades.`);
          setShowModal2(true);
          return false; // Detener la ejecución si hay falta de stock
        }
      } else {
        setMensajeModal(`Producto no encontrado para el id: ${item.id_product}`);
        setShowModal2(true);
        return false;
      }
    }
  
    // Si no incluye pollo, mostramos el modal y detenemos el flujo
   
  
    return true; // Si todo es correcto, retornamos verdadero
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

      const docRef = doc(db, 'chicken_calendar_daily', dailyDocId);

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
          throw new Error("No se encontró el intervalo con start ${timeSlot}");
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
  const sendToFirestore = async ({confirmado}) => {
    try {

      if (!confirmado)
      {
          const isValid = await validateOrder(); // Ejecutamos la validación
          console.log("Es valido:"+isValid);

          if (!isValid) {
            console.log("entro");
            // Si la validación falla, no seguimos con el proceso
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
        origen: 0, // origen del pedido
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
        total_pedido: cart.reduce((acc, item) => acc + (item.price * item.cantidad || 0), 0).toFixed(2), // Redondeo a 2 decimales
        fechahora_realizado: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      // Guardar o actualizar los datos del cliente en la colección 'clientes'
      await setDoc(doc(db, 'clientes', clienteData.telefono), clienteData, { merge: true });
      console.log('Cliente guardado o actualizado en la colección clientes');

      // Agregar el pedido a la colección "pedidos" y asociarlo al cliente
      await setDoc(doc(db, 'pedidos', nextId.toString()), {
        ...pedidoData,
        idCliente: clienteData.telefono,
      });

      // Actualizar el stock de los productos de forma asincrónica
    // Paso 1: Descontar el stock de pollos enteros (id_product = 1)
await Promise.all(
  cart.map((item) => {
    if (item.id_product === 1) { // Solo descontamos el stock de pollos enteros
      return updateStock(item.id_product, item.cantidad || 1);
    } else {
      return Promise.resolve(); // Si no es pollo entero, no hacemos nada
    }
  })
);

// Paso 2: Descontar el stock de medios pollos (id_product = 2)
await Promise.all(
  cart.map((item) => {
    if (item.id_product === 2) { // Solo descontamos el stock de medios pollos
      const cantidadDeMediosPollos = item.cantidad || 1;  // Tomamos la cantidad de medio pollo
      const cantidadDePollosEnteros = cantidadDeMediosPollos / 2;  // Cada medio pollo equivale a 0.5 pollos enteros
      // Descontamos el stock del pollo entero correspondiente
      return updateStock(1, cantidadDePollosEnteros);
    } else {
      return Promise.resolve(); // Si no es medio pollo, no hacemos nada
    }
  })
);


// Paso 1: Descontar el stock de costilla (id_product 41)
await Promise.all(
  cart.map((item) => {
    if (item.id_product === 41) { // Solo descontamos el stock de pollos enteros (id_product 41)
      return updateStock(item.id_product, item.cantidad || 1);
    } else {
      return Promise.resolve(); // Si no es pollo entero, no hacemos nada
    }
  })
);

// Paso 2: Descontar el stock de media costilla (id_product 48) sobre el stock de la costilla entera entero (id_product 41)
await Promise.all(
  cart.map((item) => {
    if (item.id_product === 48) { // Solo descontamos el stock de medios pollos (id_product 48)
      const cantidadDeMediaCostilla = item.cantidad || 1;  // Tomamos la cantidad de medio pollo
      const cantidadDeCostillaEntera = cantidadDeMediaCostilla / 2;  // Cada medio pollo equivale a 0.5 pollos enteros
      // Descontamos el stock del pollo entero correspondiente
      return updateStock(41, cantidadDeCostillaEntera); // Descontamos de id_product 41
    } else {
      return Promise.resolve(); // Si no es medio pollo, no hacemos nada
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
      setDatosCliente({ // Resetear los datos del cliente
        cliente: '',
        telefono: '',
        fechahora: '',
        observaciones: '',
        pagado: false,
        celiaco: false,
        localidad: '',
      });


           // Redirigir al usuario a la página "Ordenes" después de crear el pedido
     navigate("/ordenes"); // Redirige a la página de ordenes
       
      
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


        {/* Modal confirmaciones */}
     <Modal show={showModal2} mensaje={mensajeModal}  onHide={handleCloseModal2} size="md" backdrop="static" keyboard={false} centered>
       
  

       
       <Modal.Body className="flex flex-col items-center ">
          
         
         
         <div className='p-2'>
         <svg fill="#c81d0c  " width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>

              </svg>



         </div>

         <div>

            <h1 className='font-nunito text-xl font-[2vw] p-2  text-center text-[#808b96]'>{mensajeModal}</h1>
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

       {/* Modal confirmaciones para producto pollo*/}
   <Modal show={showModal} mensaje={mensajeModal}  onHide={handleCloseModal} size="md" backdrop="static" keyboard={false} centered>
       
  

       
       <Modal.Body className="flex flex-col items-center ">
          
         
         
         <div className='p-2'>
         <svg fill="#c81d0c  " width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>

              </svg>



         </div>

         <div>

            <h1 className='font-nunito text-xl font-[2vw] p-2  text-center text-[#808b96]'>{mensajeModal}</h1>
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
                      await sendToFirestore({ confirmado: true }); // Llamada a la función sendToFirestore cuando el botón se presiona
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