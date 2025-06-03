import React, { useState, useContext, useEffect } from "react";
import { dataContext } from "../Context/DataContext";
import { doc, getDoc, updateDoc, setDoc, runTransaction, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Modal, Button } from "react-bootstrap";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extender dayjs con los plugins necesarios
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);


// --- Función para Actualizar Contadores de Ensaladas/Ensaladillas ---
const updateSaladCounters = async (cartItems) => {
    const todayId = dayjs().format("DD-MM-YYYY");
    const docRef = doc(db, "ensaladas", todayId);
    console.log(`Preparando actualización de contadores de ensaladas para ${todayId}...`);

    let incrementEnsaladaGrande = 0;
    let incrementEnsaladaPequena = 0;
    let incrementEnsaladillaGrande = 0;
    let incrementEnsaladillaPequena = 0;

    cartItems.forEach(item => {
        const itemId = item.id; // Usar item.id consistentemente
        const itemName = item.name || item.nombre || ""; // Aceptar 'nombre' también
        const itemCantidad = item.cantidad ?? 0;

        if (!itemName || typeof itemCantidad !== 'number' || itemCantidad <= 0) {
            console.warn("Item inválido o sin cantidad en updateSaladCounters, omitiendo:", item);
            return;
        }

        const nameLower = itemName.toLowerCase();
        const cantidad = itemCantidad;
        const isPequena = nameLower.includes("1/2") || nameLower.includes("media");

        if (nameLower.includes("ensaladilla")) {
            if (isPequena) incrementEnsaladillaPequena += cantidad;
            else incrementEnsaladillaGrande += cantidad;
        } else if (nameLower.includes("ensalada")) {
             if (isPequena) incrementEnsaladaPequena += cantidad;
             else incrementEnsaladaGrande += cantidad;
        }
    });

    if (incrementEnsaladaGrande === 0 && incrementEnsaladaPequena === 0 && incrementEnsaladillaGrande === 0 && incrementEnsaladillaPequena === 0) {
        console.log("No se encontraron ensaladas/saladillas en el pedido. Omitiendo actualización de contadores.");
        return;
    }

    console.log("Incrementos calculados:", {
        ensaladaG: incrementEnsaladaGrande, ensaladaP: incrementEnsaladaPequena,
        ensaladillaG: incrementEnsaladillaGrande, ensaladillaP: incrementEnsaladillaPequena
    });

    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
                console.log(`Documento ${todayId} no existe en 'ensaladas'. Creando...`);
                const initialData = {
                    ensaladas: {
                        grandes: { pedidas: incrementEnsaladaGrande, preparadas: 0 },
                        pequenas: { pedidas: incrementEnsaladaPequena, preparadas: 0 }
                    },
                    ensaladillas: {
                        grandes: { pedidas: incrementEnsaladillaGrande, preparadas: 0 },
                        pequenas: { pedidas: incrementEnsaladillaPequena, preparadas: 0 }
                    },
                };
                transaction.set(docRef, initialData);
                console.log(`Documento ${todayId} creado con valores iniciales.`);

            } else {
                console.log(`Documento ${todayId} existe. Actualizando contadores...`);
                const updateData = {};
                if (incrementEnsaladaGrande > 0) updateData['ensaladas.grandes.pedidas'] = increment(incrementEnsaladaGrande);
                if (incrementEnsaladaPequena > 0) updateData['ensaladas.pequenas.pedidas'] = increment(incrementEnsaladaPequena);
                if (incrementEnsaladillaGrande > 0) updateData['ensaladillas.grandes.pedidas'] = increment(incrementEnsaladillaGrande);
                if (incrementEnsaladillaPequena > 0) updateData['ensaladillas.pequenas.pedidas'] = increment(incrementEnsaladillaPequena);

                if (Object.keys(updateData).length > 0) {
                    transaction.update(docRef, updateData);
                    console.log(`Contadores 'pedidas' en ${todayId} actualizados.`);
                } else {
                    console.log("No se realizaron actualizaciones (incrementos eran 0 después del cálculo inicial).");
                }
            }
        });
        console.log(`Transacción de contadores de ensaladas para ${todayId} completada con éxito.`);

    } catch (error) {
        console.error(`Error Crítico durante la transacción de contadores de ensaladas (${todayId}):`, error);
    }
};


// --- Componente Principal ---
const CartTotal = ({ datosCliente, setDatosCliente, orderToEdit }) => { // orderToEdit es orderBeingEdited del contexto, pasado como prop
  // --- Contexto y Navegación ---
  const { cart, setCart, setOrderBeingEdited, isEditingOrder } = useContext(dataContext); // Usar isEditingOrder del contexto
  const navigate = useNavigate();

  // --- Estados del Componente ---
  const [mensajeModal, setMensajeModal] = useState("");
  const [showModal, setShowModal] = useState(false); // Modal de advertencias (continuar/cancelar)
  const [showModal2, setShowModal2] = useState(false); // Modal de errores (solo aceptar)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empleadoNombre, setEmpleadoNombre] = useState(null);

  // --- Handlers para cerrar Modales ---
  const handleCloseModal = () => setShowModal(false);
  const handleCloseModal2 = () => setShowModal2(false);

  // --- Obtener Nombre Empleado ---
  useEffect(() => {
    const nombre = sessionStorage.getItem('empleadoNombre');
    if (nombre) {
      setEmpleadoNombre(nombre);
    } else {
      console.log('No se encontró el nombre del empleado en sessionStorage');
    }
  }, []);

  // Define esOperacionDeActualizacion at the component level
  // It's true if we are in editing mode (isEditingOrder from context is true)
  // AND the orderToEdit prop (which is orderBeingEdited from context) exists AND has a NumeroPedido.
  const esOperacionDeActualizacion = isEditingOrder && orderToEdit && orderToEdit.NumeroPedido != null;

  // --- Calcular Total del Carrito (para display) ---
  const total = cart.reduce(
    (acc, item) => {
      const unitPrice = Number(item?.price === 0 ? (item?.precio ?? 0) : (item?.price ?? item?.precio ?? 0));
      const quantity = Number(item?.cantidad ?? 1);
      if (isNaN(unitPrice) || isNaN(quantity)) {
        console.warn("Item con precio o cantidad inválida en cálculo de total:", item);
        return acc;
      }
      return acc + (unitPrice * quantity);
    },
    0
  );

  // --- Obtener Hora Redondeada por Defecto ---
  const obtenerHoraRedondeada = () => {
    const now = dayjs();
    const minutos = now.minute();
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    let nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    if (now.isSameOrAfter(nuevaHora.add(2, 'minute'))) {
        nuevaHora = nuevaHora.add(15, 'minute');
    }
    return nuevaHora;
  };

  const fechahoraFinalPedido = datosCliente.fechahora || obtenerHoraRedondeada().format("DD/MM/YYYY HH:mm");

  // --- Obtener Siguiente ID de Pedido (transaccional) ---
   const getNextId = async () => {
     const contadorRef = doc(db, "contadorPedidos", "pedidoId");
     try {
         const nextId = await runTransaction(db, async (transaction) => {
             const docSnap = await transaction.get(contadorRef);
             if (!docSnap.exists()) {
                 transaction.set(contadorRef, { id: 1 });
                 console.log("Contador de pedidos inicializado en 1.");
                 return 1;
             }
             const currentId = Number(docSnap.data().id || 0);
             const newId = currentId + 1;
             transaction.update(contadorRef, { id: newId });
             return newId;
         });
         console.log("Siguiente ID de pedido obtenido:", nextId);
         return nextId;
     } catch (error) {
         console.error("Error Crítico al obtener el siguiente ID de pedido:", error);
         throw new Error("No se pudo generar el ID del pedido. Revisa la conexión o configuración.");
     }
   };

  // --- Sanitizar Datos del Cliente ---
  const sanitizeClientData = (data) => ({
    cliente: data.cliente || "",
    telefono: data.telefono || "",
    fechahora: data.fechahora || "",
    observaciones: data.observaciones || "",
    pagado: data.pagado || false,
    celiaco: data.celiaco || false,
    localidad: data.localidad || "",
    img_perfil: data.img_perfil || "",
  });

  // --- Función de Actualizar Stock (Modificada para aceptar cambios +/-) ---
   const updateStock = async (productId, stockChange) => {
     const productIdStr = productId?.toString();
     if (!productIdStr) {
         console.error("ID de producto inválido detectado en updateStock:", productId);
         throw new Error(`Intento de actualizar stock con ID inválido: ${productId}`);
     }
     if (stockChange === 0) {
         console.log(`Intento de actualizar stock para ID ${productIdStr} con cambio 0. No se hará nada.`);
         return;
     }

     const productRef = doc(db, "productos", productIdStr);

     try {
       await runTransaction(db, async (transaction) => {
           const productSnap = await transaction.get(productRef);
           if (!productSnap.exists()) {
               console.error(`Error Crítico: Producto con ID ${productIdStr} no encontrado en Firestore al intentar actualizar stock.`);
               throw new Error(`Producto ID ${productIdStr} no encontrado.`);
           }
           const productData = productSnap.data();
           const currentStock = Number(productData.stock || 0);

            if (isNaN(currentStock)) {
                 console.error(`Error Crítico: El stock para el producto ID ${productIdStr} no es un número válido (${productData.stock}). Se tratará como 0.`);
            }

           const newStock = currentStock - stockChange;

           if (stockChange > 0 && currentStock < stockChange) {
                console.warn(`Stock insuficiente detectado en transacción para ${productData.name || 'ID ' + productIdStr}. Necesario restar: ${stockChange}, Disponible: ${currentStock}`);
                throw new Error(`Stock insuficiente para ${productData.name || 'ID ' + productIdStr}.`);
           }

           const operation = stockChange > 0 ? 'restando' : 'sumando';
           const absChange = Math.abs(stockChange);
           console.log(`Stock: Actualizando ${productIdStr}: ${currentStock} -> ${newStock} (${operation} ${absChange})`);

           transaction.update(productRef, { stock: newStock });
       });
        const action = stockChange > 0 ? 'reducido' : 'incrementado';
        console.log(`Stock actualizado correctamente via transacción para ID: ${productIdStr}, cantidad ${action}: ${Math.abs(stockChange)}`);
     } catch (error) {
       console.error(`Error durante la transacción de actualización de stock para ID ${productIdStr} (cambio: ${stockChange}):`, error);
       throw error;
     }
   };

  // --- Validación Básica del Pedido (Cliente, Pollo, Stock Preliminar) ---
  const validateOrder = async (currentCart) => {
    console.log("Iniciando validación completa del pedido...");
    let mensajesError = "";
    let mensajesAdvertencia = "";

    const clienteData = sanitizeClientData(datosCliente);

    if (!clienteData.telefono) {
      mensajesError += "El teléfono del cliente es obligatorio.\n";
    } else if (!/^\d{9}$/.test(clienteData.telefono)) {
        mensajesError += "El formato del teléfono no es válido (debe tener 9 dígitos).\n";
    }

    console.log("Iniciando validación de stock...");
    const productQuantities = {};

    currentCart.forEach(item => {
       if (!item || item.id == null || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
           console.warn("Item inválido en carrito durante validación de stock:", item);
           return;
       }
       let stockProductId;
       let quantityForStockCheck = item.cantidad;
       const productName = item.name || `Producto ID ${item.id}`;

       if (item.id === 1) stockProductId = 1;
       else if (item.id === 2) { stockProductId = 1; quantityForStockCheck = item.cantidad / 2; }
       else if (item.id === 41) stockProductId = 41;
       else if (item.id === 48) { stockProductId = 41; quantityForStockCheck = item.cantidad / 2; }
       else stockProductId = item.id;

       if (isNaN(quantityForStockCheck) || quantityForStockCheck <= 0) {
           console.warn(`Cantidad inválida calculada para stock check (${item.cantidad} -> ${quantityForStockCheck}) para ${productName}. Omitiendo.`);
           return;
       }
       const stockProductIdStr = stockProductId?.toString();
       if (!stockProductIdStr) {
           console.warn(`No se pudo determinar el ID de stock para ${productName}. Omitiendo.`);
           return;
       }
       if (!productQuantities[stockProductIdStr]) {
           productQuantities[stockProductIdStr] = { required: 0, name: productName };
       }
       productQuantities[stockProductIdStr].required += quantityForStockCheck;
    });

    const productIdsToCheck = Object.keys(productQuantities);
    if (productIdsToCheck.length > 0) {
       console.log("IDs de producto para verificar stock:", productQuantities);
       try {
           const stockCheckPromises = productIdsToCheck.map(async (productIdStr) => {
               const productRef = doc(db, "productos", productIdStr);
               const productSnap = await getDoc(productRef);
               const requiredData = productQuantities[productIdStr];
               if (!productSnap.exists()) {
                   console.error(`Error Crítico Validación: Producto con ID ${productIdStr} no encontrado.`);
                   mensajesError += `El producto '${requiredData.name}' (ID: ${productIdStr}) no se encontró.\n`;
                   return;
               }
               const productData = productSnap.data();
               const currentStock = Number(productData.stock || 0);
               if (isNaN(currentStock)) {
                   console.error(`Error Crítico Validación: Stock inválido para producto ID ${productIdStr} (${productData.stock}).`);
                   mensajesError += `Error interno: Stock inválido para '${requiredData.name}'.\n`;
                   return;
               }
               if (currentStock < requiredData.required) {
                   console.warn(`Stock insuficiente para ${requiredData.name} (ID: ${productIdStr}). Necesario: ${requiredData.required}, Disponible: ${currentStock}`);
                   mensajesError += `Stock insuficiente para ${requiredData.name}.\n`;
               } else {
                   console.log(`Stock OK para ${requiredData.name} (ID: ${productIdStr}). Necesario: ${requiredData.required}, Disponible: ${currentStock}`);
               }
           });
           await Promise.all(stockCheckPromises);
       } catch (error) {
           console.error("Error durante la obtención de datos de stock para validación:", error);
           mensajesError += "Error al verificar el stock. Inténtalo de nuevo.\n";
       }
    } else {
        console.log("No hay productos en el carrito que requieran verificación de stock (o todos eran inválidos).");
    }

    if (!datosCliente.fechahora) {
      const horaRedondeada = obtenerHoraRedondeada().format('HH:mm');
      mensajesAdvertencia += `❗️No has seleccionado hora. La hora del pedido será: ${horaRedondeada}\n`;
    } else {
      const horaPedidoSeleccionada = dayjs(fechahoraFinalPedido, "DD/MM/YYYY HH:mm");
      // Aplicar validación de hora pasada solo si NO se está editando un pedido real
      if(!isEditingOrder || (isEditingOrder && !orderToEdit?.NumeroPedido)){
        if (horaPedidoSeleccionada.isValid() && horaPedidoSeleccionada.isBefore(dayjs().subtract(5, 'minute'))) {
          mensajesError += `La hora seleccionada (${horaPedidoSeleccionada.format('HH:mm')}) ya ha pasado.\n`;
        }
      }
    }

    const incluyePollo = currentCart.some(item => item && (item.id === 1 || item.id === 2));
    if (!incluyePollo) {
      mensajesAdvertencia += "❗️Comprueba... tu pedido no incluye pollo.\n";
    }

    if (mensajesError.trim() !== "") {
      console.log("Validación fallida por errores:", mensajesError.trim());
      setMensajeModal(mensajesError.trim());
      setShowModal2(true);
      return false;
    }
    if (mensajesAdvertencia.trim() !== "") {
       console.log("Validación OK, pero con advertencias:", mensajesAdvertencia.trim());
       setMensajeModal(mensajesAdvertencia.trim());
       setShowModal(true);
       return false;
    }

    console.log("Validación completa del pedido superada con éxito.");
    return true;
  };


  // --- Función Principal para Enviar/Actualizar Pedido ---
  const sendToFirestore = async ({ confirmado }) => {
    // esOperacionDeActualizacion is now defined at the component level,
    // so it's directly usable here and in the JSX.

    console.log(`%c--- Iniciando sendToFirestore --- Confirmado: ${confirmado}, Operación: ${esOperacionDeActualizacion ? 'Actualizar Pedido ID: ' + orderToEdit.NumeroPedido : 'Crear Nuevo Pedido'}, Submitting: ${isSubmitting}`, 'color: blue; font-weight: bold;');

    if (isSubmitting) { console.warn("Submit bloqueado: ya en curso."); return; }
    setIsSubmitting(true);

    const currentCart = [...cart];

    if (!currentCart || currentCart.length === 0) {
        console.warn("Envío cancelado: Carrito vacío.");
        setMensajeModal("El carrito está vacío."); setShowModal2(true); setIsSubmitting(false); return;
    }

    let pedidoId;
    let clienteId = null;

    try {
      if (!confirmado) {
        console.log("Ejecutando validación completa...");
        const isValid = await validateOrder(currentCart);
        if (!isValid) {
          console.log("Validación fallida o esperando confirmación del usuario.");
          if (!showModal && !showModal2) { setIsSubmitting(false); }
          return;
        }
        console.log("Validación completa OK (sin errores bloqueantes).");
      } else {
          console.log("Saltando validación (confirmado por el usuario desde modal de advertencia).");
          if (showModal) handleCloseModal();
      }

      const clienteData = sanitizeClientData(datosCliente);
      const horaPedidoParaGuardar = fechahoraFinalPedido;
      const parsedHoraPedido = dayjs(horaPedidoParaGuardar, "DD/MM/YYYY HH:mm", true);

      if (!parsedHoraPedido.isValid()) {
           throw new Error(`El formato de la fecha/hora final del pedido es inválido: ${horaPedidoParaGuardar}. Use DD/MM/YYYY HH:mm`);
      }
       console.log("Hora final del pedido para guardar, validada:", horaPedidoParaGuardar);

      clienteId = clienteData.telefono;
      if (!clienteId || !/^\d{9}$/.test(clienteId)) {
          throw new Error("El teléfono del cliente es inválido o falta.");
      }
      console.log(`Verificando/Actualizando cliente con ID (teléfono): ${clienteId}`);
      const clienteRef = doc(db, "clientes", clienteId);

      try {
          await runTransaction(db, async (transaction) => {
              const clienteDocSnap = await transaction.get(clienteRef);
              const clientDataToSave = {
                cliente: clienteData.cliente || "Nombre no proporcionado",
                telefono: clienteId,
                localidad: clienteData.localidad || "",
                celiaco: clienteData.celiaco || false,
                observaciones: clienteData.observaciones || "",
                img_perfil: clienteData.img_perfil || "",
                lastOrderDate: serverTimestamp()
              };

              if (!clienteDocSnap.exists()) {
                  console.log(`Cliente ${clienteId} no encontrado. Creando...`);
                  transaction.set(clienteRef, { ...clientDataToSave, fechahora_creacion: serverTimestamp() });
              } else {
                  console.log(`Cliente ${clienteId} encontrado. Actualizando...`);
                  const existingClientData = clienteDocSnap.data();
                  const clientUpdates = { lastOrderDate: serverTimestamp() };
                  if (clienteData.cliente && existingClientData.cliente !== clienteData.cliente) clientUpdates.cliente = clienteData.cliente;
                  if (clienteData.localidad !== undefined && existingClientData.localidad !== clienteData.localidad) clientUpdates.localidad = clienteData.localidad;
                  if (clienteData.observaciones !== undefined && existingClientData.observaciones !== clienteData.observaciones) clientUpdates.observaciones = clienteData.observaciones;
                  if (clienteData.img_perfil && existingClientData.img_perfil !== clienteData.img_perfil) clientUpdates.img_perfil = clienteData.img_perfil;
                  const currentCeliaco = clienteData.celiaco || false;
                  if (existingClientData.celiaco !== currentCeliaco) clientUpdates.celiaco = currentCeliaco;
                  if (Object.keys(clientUpdates).length > 1) {
                    transaction.update(clienteRef, clientUpdates);
                  } else {
                    transaction.update(clienteRef, { lastOrderDate: serverTimestamp() });
                  }
              }
          });
          console.log(`Transacción de cliente ${clienteId} completada.`);
      } catch (clientError) {
          console.error("Error en transacción de cliente:", clientError);
          throw new Error(`No se pudo procesar la información del cliente (${clienteId}). ${clientError.message}`);
      }

      const fechaRealizado = dayjs();
      const esParaOtroDia = !parsedHoraPedido.isSame(fechaRealizado, 'day');
      console.log(`¿Es para otro día?: ${esParaOtroDia}`);

      console.log("Preparando datos del pedido para Firestore...");
      const nowString = fechaRealizado.format("DD/MM/YYYY HH:mm");

      const mappedProducts = currentCart.map((item) => {
            if (!item || item.id == null || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
                 console.error("Item inválido en carrito al mapear productos:", item);
                 throw new Error("Se encontró un item inválido o con cantidad cero en el carrito.");
            }
            const unitPrice = Number(item?.price === 0 ? (item?.precio ?? 0) : (item?.price ?? item?.precio ?? 0));
            if (isNaN(unitPrice)) {
                console.error("Precio unitario inválido para item:", item);
                throw new Error(`Precio inválido para ${item.name || `producto ID ${item.id}`}.`);
            }
            return {
                id: item.id, nombre: item.name || "Sin Nombre", cantidad: item.cantidad,
                alias: item.alias || "", observaciones: item.observaciones || "",
                celiaco: !!(item.celiaco || clienteData.celiaco),
                tostado: !!item.tostado,
                sinsalsa: !!item.sinsalsa, extrasalsa: !!item.extrasalsa, troceado: !!item.troceado,
                entregado: item.entregado || 0, categoria: item.categoria || "No especificada",
                freidora: !!item.freidora, position: item.position ?? null,
                precio: Number(unitPrice).toFixed(2),
                total: (unitPrice * item.cantidad).toFixed(2),
            };
       });

       const totalPedidoCalculado = currentCart.reduce((acc, item) => {
            const unitPrice = Number(item?.price === 0 ? (item?.precio ?? 0) : (item?.price ?? item?.precio ?? 0));
            const quantity = Number(item?.cantidad ?? 1);
            if (isNaN(unitPrice) || isNaN(quantity)) return acc;
            return acc + (unitPrice * quantity);
        }, 0);

      console.log(`%cProcediendo a ${esOperacionDeActualizacion ? 'ACTUALIZAR' : 'CREAR'} pedido... Total: ${totalPedidoCalculado.toFixed(2)}€`, 'color: green; font-weight: bold;');

      if (esOperacionDeActualizacion) {
        pedidoId = orderToEdit.NumeroPedido;
        // No es necesario el if (!pedidoId) aquí porque esOperacionDeActualizacion ya lo valida.
        console.log(`Actualizando Firestore para pedido ID: ${pedidoId}`);
        const pedidoRef = doc(db, "pedidos", pedidoId.toString());
        const updateData = {
          cliente: clienteData.cliente, telefono: clienteData.telefono, localidad: clienteData.localidad,
          celiaco: clienteData.celiaco, idCliente: clienteId, fechahora: horaPedidoParaGuardar,
          observaciones: clienteData.observaciones,
          pagado: clienteData.pagado,
          productos: mappedProducts, total_pedido: totalPedidoCalculado.toFixed(2), paraOtroDia: esParaOtroDia,
          fechahora_modificado: nowString,
          origen: orderToEdit.origen ?? 0,
        };
        await updateDoc(pedidoRef, updateData);
        console.log(`Firestore: Pedido ID ${pedidoId} actualizado.`);
      } else {
        pedidoId = await getNextId();
        console.log(`Creando nuevo pedido en Firestore con ID: ${pedidoId}`);
        const newOrderCreationToken = Math.random().toString(36).substring(2, 10); // Token único para esta creación
        const pedidoData = {
           NumeroPedido: pedidoId, cliente: clienteData.cliente, telefono: clienteData.telefono,
           localidad: clienteData.localidad, celiaco: clienteData.celiaco, idCliente: clienteId,
           fechahora: horaPedidoParaGuardar, observaciones: clienteData.observaciones, pagado: clienteData.pagado,
           productos: mappedProducts, total_pedido: totalPedidoCalculado.toFixed(2), paraOtroDia: esParaOtroDia,
           empleado: empleadoNombre || "No identificado",
           orderCreationToken: newOrderCreationToken, // <-- Token añadido aquí
           webListenerProcessed: false, // <-- Inicializar explícitamente
           origen: orderToEdit?.origen ?? 0, // Si orderToEdit es clientInfo (sin origen), será 0.
           fechahora_realizado: nowString,
        };
        await setDoc(doc(db, "pedidos", pedidoId.toString()), pedidoData);
        console.log(`Firestore: Pedido nuevo ID ${pedidoId} creado.`);
      }
      console.log(`Éxito: Pedido ${pedidoId} ${esOperacionDeActualizacion ? 'actualizado' : 'guardado'} en Firestore.`);

      console.log("Iniciando lógica de actualización de stock...");
      const calculateStockQuantities = (items) => {
          const quantities = {};
          items.forEach(item => {
              const itemId = item.id; // CAMBIO: Usar item.id consistentemente
              const itemCantidad = Number(item.cantidad ?? 0);
              if (!itemId || itemCantidad <= 0 || isNaN(itemCantidad)) {
                console.warn("Item inválido en calculateStockQuantities:", item); return;
              }
              let stockProductId; let quantityForStock = itemCantidad;
              const itemNameLower = item.name?.toLowerCase() || item.nombre?.toLowerCase() || item.alias?.toLowerCase() || "";

              if (itemId === 1) stockProductId = 1;
              else if (itemId === 2 || itemId === 39 || itemId === 40 || itemNameLower.includes("menú")) {
                stockProductId = 1; quantityForStock = itemCantidad * 0.5;
              }
              else if (itemId === 41) stockProductId = 41;
              else if (itemId === 48) {
                stockProductId = 41; quantityForStock = itemCantidad * 0.5;
              }
              else stockProductId = itemId;

              if (stockProductId && quantityForStock > 0 && !isNaN(quantityForStock)) {
                  const stockProductIdStr = stockProductId.toString();
                  quantities[stockProductIdStr] = (quantities[stockProductIdStr] || 0) + quantityForStock;
              } else { console.warn(`Item ${item.name || item.nombre || item.alias || itemId} omitido del cálculo de stock (ID stock: ${stockProductId}, Cantidad stock: ${quantityForStock})`); }
          });
          return quantities;
      };

      const finalParaOtroDia = esParaOtroDia;
      let stockChanges = {};

      if (esOperacionDeActualizacion) {
          console.log("Calculando diferencias de stock para edición...");
          const originalParaOtroDia = orderToEdit.paraOtroDia === true;
          const originalProducts = orderToEdit.productos || [];

          const originalStockQuantities = calculateStockQuantities(originalProducts);
          const finalStockQuantities = calculateStockQuantities(mappedProducts);

          console.log("Cantidades Stock Original (del pedido guardado):", originalStockQuantities);
          console.log("Cantidades Stock Final (del carrito actual):", finalStockQuantities);

          const allProductIds = new Set([...Object.keys(originalStockQuantities), ...Object.keys(finalStockQuantities)]);

          allProductIds.forEach(id => {
            const originalQty = originalStockQuantities[id] || 0;
            const finalQty = finalStockQuantities[id] || 0;
            let change = 0;

            if (!originalParaOtroDia && !finalParaOtroDia) {
                change = finalQty - originalQty;
            } else if (!originalParaOtroDia && finalParaOtroDia) {
                change = -originalQty;
            } else if (originalParaOtroDia && !finalParaOtroDia) {
                change = finalQty;
            }
            if (change !== 0) stockChanges[id] = change;
          });
          console.log("Cambios de stock a aplicar (edición):", stockChanges);
      } else {
          console.log("Calculando stock para pedido nuevo...");
          if (!finalParaOtroDia) {
              console.log("Pedido nuevo para hoy. Se restará stock.");
              const finalStockQuantities = calculateStockQuantities(mappedProducts);
              Object.keys(finalStockQuantities).forEach(id => {
                if (finalStockQuantities[id] > 0) stockChanges[id] = finalStockQuantities[id];
              });
              console.log("Stock a restar (nuevo pedido):", stockChanges);
          } else {
              console.log("Pedido nuevo para otro día. Omitiendo actualización de stock.");
          }
      }

      if (Object.keys(stockChanges).length > 0) {
           const stockUpdatePromises = Object.entries(stockChanges).map(([productId, change]) => updateStock(productId, change));
           console.log(`Ejecutando ${stockUpdatePromises.length} actualizaciones de stock...`);
           try {
               await Promise.all(stockUpdatePromises);
               console.log("Actualización de stock completada.");
           }
           catch (stockError) {
               console.error(`¡ERROR CRÍTICO POST-GUARDADO! Pedido ${pedidoId} guardado, PERO FALLÓ STOCK:`, stockError);
               setMensajeModal(`¡ATENCIÓN GRAVE! Pedido ${pedidoId} guardado, pero falló al actualizar stock (${stockError.message}). REVISIÓN MANUAL INMEDIATA DEL STOCK.`);
               setShowModal2(true);
               setIsSubmitting(false);
               return;
           }
      } else {
          console.log("No se requirieron actualizaciones de stock.");
      }

      console.log("Iniciando actualización de contadores de ensaladas/ensaladillas...");
      try {
        await updateSaladCounters(mappedProducts);
        console.log("Actualización de contadores de ensaladas/ensaladillas intentada.");
      }
      catch (saladError) {
        console.error(`Error no crítico al llamar a updateSaladCounters para pedido ${pedidoId}:`, saladError);
      }

      console.log(`%c---- ÉXITO TOTAL Pedido ID: ${pedidoId} ---- Limpiando estado y navegando...`, 'color: green; font-weight: bold; font-size: 1.1em;');
      setCart([]);
      setDatosCliente({
        cliente: "", telefono: "", fechahora: "", observaciones: "",
        pagado: false, celiaco: false, localidad: "", img_perfil: ""
      });
      setOrderBeingEdited(null);
      navigate("/ordenes");

    } catch (error) {
      console.error("Error general durante sendToFirestore:", error);
      if (!showModal && !showModal2) {
          setMensajeModal(`Error al procesar el pedido: ${error.message}. Revisa los datos e inténtalo de nuevo.`);
          setShowModal2(true);
      } else {
           console.error("Error general ocurrió mientras un modal de validación/advertencia estaba activo. El mensaje del modal actual prevalece.");
           if (showModal) handleCloseModal();
           if (!showModal2) {
                setMensajeModal(`Error al procesar el pedido: ${error.message}. Revisa los datos e inténtalo de nuevo.`);
                setShowModal2(true);
           }
      }
    } finally {
      if (!showModal && !showModal2) {
         console.log("Finally: No hay modales activos, liberando isSubmitting.");
         setIsSubmitting(false);
      } else {
          console.log("Finally: Modal activo detectado (error o advertencia), isSubmitting permanecerá bloqueado hasta que el usuario cierre el modal.");
      }
      console.log("--- Ejecución de sendToFirestore finalizada ---");
    }
  };


  return cart.length > 0 ? (
    <>
      <div className="flex justify-end p-[0.5vw]">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center text-2xl font-extrabold text-gray-700 dark:text-gray-400"
        >
          <span className="text-end">{total.toFixed(2)} €</span>
        </a>
      </div>

      <div className="flex text-center justify-center items-center mt-6 mb-4">
        <button
          onClick={() => { console.log("Click en Botón Generar/Actualizar"); sendToFirestore({ confirmado: false }); }}
          disabled={isSubmitting}
          className={`w-full sm:w-auto min-w-[150px] px-6 py-3 tracking-wide  ${
            esOperacionDeActualizacion ? 'bg-gray-600 hover:bg-gray-700' : 'bg-[#f2ac02] hover:bg-yellow-600'
            } text-white font-bold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 18V6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 12L20 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z"
              stroke="#ffffff" strokeWidth="1.5"></path>
            <path d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
            <path d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18" stroke="#ffffff" strokeWidth="1.5"></path>
          </svg>
          <span className="ml-1 font-nunito text-lg">
            {isSubmitting ? 'Procesando...' : (esOperacionDeActualizacion ? "Actualizar Pedido" : "Generar Pedido")}
          </span>
        </button>

      </div>

      <Modal show={showModal2} onHide={() => { handleCloseModal2(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center p-2">
          <div className='p-1'>
             <svg fill="#c81d0c" width="100px" height="100px" viewBox="0 0 22 22" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                <g id="SVGRepo_iconCarrier">
                <path d="M12.1458333,9.85416667 L12.1458333,6.74047388 C12.1458333,6.4826434 11.9382041,6.28571429 11.6820804,6.28571429 L10.3179196,6.28571429 C10.0656535,6.28571429 9.85416667,6.48931709 9.85416667,6.74047388 L9.85416667,9.85416667 L6.74047388,9.85416667 C6.4826434,9.85416667 6.28571429,10.0617959 6.28571429,10.3179196 L6.28571429,11.6820804 C6.28571429,11.9343465 6.48931709,12.1458333 6.74047388,12.1458333 L9.85416667,12.1458333 L9.85416667,15.2595261 C9.85416667,15.5173566 10.0617959,15.7142857 10.3179196,15.7142857 L11.6820804,15.7142857 C11.9343465,15.7142857 12.1458333,15.5106829 12.1458333,15.2595261 L12.1458333,12.1458333 L15.2595261,12.1458333 C15.5173566,12.1458333 15.7142857,11.9382041 15.7142857,11.6820804 L15.7142857,10.3179196 C15.7142857,10.0656535 15.5106829,9.85416667 15.2595261,9.85416667 L12.1458333,9.85416667 Z" id="Combined-Shape" transform="translate(11.000000, 11.000000) rotate(-45.000000) translate(-11.000000, -11.000000) "/>
                </g>
            </svg>
         </div>
         <p className="font-nunito text-lg  text-center text-gray-700 whitespace-pre-line">{mensajeModal}</p>
         </Modal.Body>
        <Modal.Footer className='no-border'>
          <Button variant="primary" className="mt-5 bg-white  border-yellow-500 hover:text-yellow-600 hover:border-yellow-600 py-2  font-nunito text-yellow-500 rounded-md shadow-sm" onClick={() => { handleCloseModal2(); setIsSubmitting(false); }}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModal} onHide={() => { handleCloseModal(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center p-4">
          <div className='p-2'>
             <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>
             </svg>
         </div>
          <p className="font-nunito text-lg p-2 text-center text-gray-700 whitespace-pre-line">{mensajeModal}</p>
        </Modal.Body>
        <Modal.Footer className="border-t-0 flex justify-around p-4">
          <Button variant="secondary" className=" bg-white font-nunito text-red-500 border-red-500 hover:text-red-700 hover:border-red-700 shadow-sm" onClick={() => { handleCloseModal(); setIsSubmitting(false); }} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
             variant="primary"
             onClick={async () => { await sendToFirestore({ confirmado: true }); }}
             disabled={isSubmitting}
             className={` font-nunito  rounded-md shadow-sm transition-colors duration-200 ${
                 isSubmitting
                 ? 'bg-gray-400 border-gray-400 cursor-not-allowed'
                 : 'bg-white text-yellow-500 border-yellow-500 hover:text-yellow-600 hover:border-yellow-600'
             }`}
            >
            {isSubmitting ? 'Procesando...' : 'Continuar'}
          </Button>
        </Modal.Footer>
      </Modal>

    </>
  ) : (
    <div className="text-center p-4 text-gray-500 italic">
        El carrito está vacío. Añade productos para continuar.
    </div>
  );
};

export default CartTotal;
