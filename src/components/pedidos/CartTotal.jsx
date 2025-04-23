import React, { useState, useContext, useEffect } from "react";
import { dataContext } from "../Context/DataContext";
import { doc, getDoc, updateDoc, setDoc, runTransaction, increment, serverTimestamp } from "firebase/firestore"; // increment y serverTimestamp importados
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Modal, Button } from "react-bootstrap";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// Extender dayjs con los plugins necesarios
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);

// --- Helper Function: Convert HH:mm to minutes ---
// (Sin cambios)
const convertTimeToMinutes = (timeStr) => {
  try {
      if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
          console.warn("Formato de tiempo inválido proporcionado a convertTimeToMinutes:", timeStr);
          return -1;
      }
      const parts = timeStr.split(":");
      if (parts.length !== 2) {
          console.warn("Formato de tiempo inválido (no HH:MM):", timeStr);
          return -1;
      }
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
           console.warn("Valores de hora/minuto inválidos en:", timeStr);
           return -1;
      }
      return hours * 60 + minutes;
  } catch (e) {
      console.error("Error inesperado en convertTimeToMinutes para:", timeStr, e);
      return -1;
  }
};

// --- Función para Actualizar Contadores de Ensaladas/Ensaladillas ---
// (Sin cambios)
const updateSaladCounters = async (cartItems) => {
    const todayId = dayjs().format("DD-MM-YYYY");
    const docRef = doc(db, "ensaladas", todayId);
    console.log(`Preparando actualización de contadores de ensaladas para ${todayId}...`);

    let incrementEnsaladaGrande = 0;
    let incrementEnsaladaPequena = 0;
    let incrementEnsaladillaGrande = 0;
    let incrementEnsaladillaPequena = 0;

    cartItems.forEach(item => {
        if (!item || !item.name || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
            console.warn("Item inválido o sin cantidad en updateSaladCounters, omitiendo:", item);
            return;
        }

        const nameLower = item.name.toLowerCase();
        const cantidad = item.cantidad;
        const isPequena = nameLower.includes("1/2");

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
        // No relanzar para no detener el flujo principal
    }
};


// --- Componente Principal ---
const CartTotal = ({ datosCliente, setDatosCliente, orderToEdit }) => {
  // --- Contexto y Navegación ---
  const { cart, setCart } = useContext(dataContext);
  const navigate = useNavigate();

  // --- Estados del Componente ---
  const [mensajeModal, setMensajeModal] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
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

  // --- Calcular Total del Carrito ---
  const total = cart.reduce(
    (acc, item) => {
      const unitPrice = item?.price === 0
        ? item?.precio ?? 0
        : item?.price ?? item?.precio ?? 0;
      const quantity = item?.cantidad ?? 1;
      return acc + (unitPrice * quantity);
    },
    0
  );

  // --- Obtener Hora Redondeada por Defecto ---
  // (Sin cambios)
  const obtenerHoraRedondeada = () => {
    const now = dayjs();
    const minutos = now.minute();
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    let nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    if (nuevaHora.isBefore(now)) {
         nuevaHora = nuevaHora.add(15, 'minute');
    }
    const diffMinutes = nuevaHora.diff(now, 'minute');
    if (diffMinutes < -2) {
        console.warn("Hora redondeada calculada está en el pasado, ajustando al siguiente bloque.");
        nuevaHora = nuevaHora.add(15, 'minute');
    }
    return nuevaHora;
  };

  // Determina la hora final del pedido
  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format("DD/MM/YYYY HH:mm");

  // --- Obtener Siguiente ID de Pedido (transaccional) ---
  // (Sin cambios)
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
             const newId = docSnap.data().id + 1;
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
  // (Sin cambios)
  const sanitizeClientData = (data) => ({
    cliente: data.cliente || "",
    telefono: data.telefono || "",
    fechahora: data.fechahora || "",
    observaciones: data.observaciones || "",
    pagado: data.pagado || false,
    celiaco: data.celiaco || false,
    localidad: data.localidad || "",
  });

  // --- Función de Actualizar Stock (Robusta y Transaccional) ---
  // (Sin cambios)
   const updateStock = async (productId, cantidadVendida) => {
     const productIdStr = productId?.toString();
     if (!productIdStr) {
         console.error("ID de producto inválido detectado en updateStock:", productId);
         throw new Error(`Intento de actualizar stock con ID inválido: ${productId}`);
     }
     if (cantidadVendida <= 0) {
         console.warn(`Intento de actualizar stock para ID ${productIdStr} con cantidad no positiva: ${cantidadVendida}. No se hará nada.`);
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
           const currentStock = productData.stock;

            if (typeof currentStock !== 'number' || isNaN(currentStock)) {
                 console.error(`Error Crítico: El stock para el producto ID ${productIdStr} no es un número válido (${currentStock}).`);
                 throw new Error(`Stock inválido para producto ID ${productIdStr}.`);
            }

           if (currentStock < cantidadVendida) {
                console.warn(`Stock insuficiente detectado en transacción para ${productData.name || 'ID ' + productIdStr}. Necesario: ${cantidadVendida}, Disponible: ${currentStock}`);
                throw new Error(`Stock insuficiente para ${productData.name || 'ID ' + productIdStr}.`);
           }

           const newStock = currentStock - cantidadVendida;
           console.log(`Stock OK. Actualizando ${productIdStr}: ${currentStock} -> ${newStock}`);
           transaction.update(productRef, { stock: newStock });
       });
        console.log(`Stock actualizado correctamente via transacción para ID: ${productIdStr}, cantidad deducida: ${cantidadVendida}`);
     } catch (error) {
       console.error(`Error durante la transacción de actualización de stock para ID ${productIdStr}:`, error);
       throw error;
     }
   };

  // --- Validación Básica del Pedido (Cliente, Pollo, Stock Preliminar) ---
  // (Sin cambios)
  const validateOrder = async (currentCart) => {
    console.log("Iniciando validación completa del pedido...");
    let mensajesError = "";
    let mensajesAdvertencia = "";

    const clienteData = sanitizeClientData(datosCliente);

    // 1. Validar Teléfono (Esencial para la lógica de cliente)
    if (!clienteData.telefono) {
      mensajesError += "El teléfono del cliente es obligatorio.\n";
    } else if (!/^\d{9}$/.test(clienteData.telefono)) { // Validación básica de formato 9 dígitos
        mensajesError += "El formato del teléfono no es válido (debe tener 9 dígitos).\n";
    }

    // 2. Validación de Stock Preliminar (Sin cambios)
    console.log("Iniciando validación de stock...");
    const productQuantities = {};
    let stockValidationError = false;

    currentCart.forEach(item => {
       if (!item || item.id_product == null || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
           console.warn("Item inválido en carrito durante validación de stock:", item);
           return;
       }

       let stockProductId;
       let quantityForStockCheck = item.cantidad;
       const productName = item.name || `Producto ID ${item.id_product}`;

       if (item.id_product === 1) stockProductId = 1;
       else if (item.id_product === 2) { stockProductId = 1; quantityForStockCheck = item.cantidad / 2; }
       else if (item.id_product === 41) stockProductId = 41;
       else if (item.id_product === 48) { stockProductId = 41; quantityToDeduct = item.cantidad / 2; } // <-- CORREGIDO: Era quantityForStockCheck
       else stockProductId = item.id_product;

       const stockProductIdStr = stockProductId.toString();
       if (!productQuantities[stockProductIdStr]) {
           productQuantities[stockProductIdStr] = { required: 0, name: productName };
       }
       productQuantities[stockProductIdStr].required += quantityForStockCheck;
    });

    const productIdsToCheck = Object.keys(productQuantities);
    if (productIdsToCheck.length > 0) {
       console.log("IDs de producto para verificar stock:", productIdsToCheck);
       try {
           const stockCheckPromises = productIdsToCheck.map(async (productIdStr) => {
               const productRef = doc(db, "productos", productIdStr);
               const productSnap = await getDoc(productRef);
               const requiredData = productQuantities[productIdStr];

               if (!productSnap.exists()) {
                   console.error(`Error Crítico Validación: Producto con ID ${productIdStr} no encontrado.`);
                   mensajesError += `El producto '${requiredData.name}' (ID: ${productIdStr}) no se encontró.\n`;
                   stockValidationError = true; return;
               }

               const productData = productSnap.data();
               const currentStock = productData.stock;

               if (typeof currentStock !== 'number' || isNaN(currentStock)) {
                   console.error(`Error Crítico Validación: Stock inválido para producto ID ${productIdStr} (${currentStock}).`);
                   mensajesError += `Error interno: Stock inválido para '${requiredData.name}'.\n`;
                   stockValidationError = true; return;
               }

               if (currentStock < requiredData.required) {
                   console.warn(`Stock insuficiente para ${requiredData.name} (ID: ${productIdStr}). Necesario: ${requiredData.required}, Disponible: ${currentStock}`);
                   mensajesError += `Stock insuficiente para ${requiredData.name}.\n`;
                   stockValidationError = true;
               } else {
                   console.log(`Stock OK para ${requiredData.name} (ID: ${productIdStr}). Necesario: ${requiredData.required}, Disponible: ${currentStock}`);
               }
           });
           await Promise.all(stockCheckPromises);
       } catch (error) {
           console.error("Error durante la obtención de datos de stock para validación:", error);
           mensajesError += "Error al verificar el stock. Inténtalo de nuevo.\n";
           stockValidationError = true;
       }
    } else {
        console.log("No hay productos en el carrito que requieran verificación de stock.");
    }

    // 3. Validar Hora (Advertencia) (Sin cambios)
    if (!clienteData.fechahora) {
      const horaRedondeada = obtenerHoraRedondeada().format('HH:mm');
      mensajesAdvertencia += `❗️No has seleccionado hora. La hora del pedido será: ${horaRedondeada}\n`;
    }

    // 4. Validar Pollo (Advertencia) (Sin cambios)
    const incluyePollo = currentCart.some(item => item && (item.id_product === 1 || item.id_product === 2));
    if (!incluyePollo) {
      mensajesAdvertencia += "❗️Comprueba... tu pedido no incluye pollo.\n";
    }

    // --- Decisión Final --- (Sin cambios)
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
    console.log(`%c--- Iniciando sendToFirestore ---
    Confirmado (sin pollo/hora): ${confirmado}
    Editando Pedido: ${orderToEdit ? orderToEdit.NumeroPedido : 'No'}
    Estado Submitting Actual: ${isSubmitting}`, 'color: blue; font-weight: bold;');

    if (isSubmitting) {
        console.warn("Submit bloqueado: ya hay un proceso en curso.");
        return;
    }
    setIsSubmitting(true);

    const currentCart = [...cart];

    if (!currentCart || currentCart.length === 0) {
        console.warn("Envío cancelado: Carrito vacío.");
        setMensajeModal("El carrito está vacío."); setShowModal2(true); setIsSubmitting(false); return;
    }

    let pedidoId = orderToEdit ? orderToEdit.NumeroPedido : null;
    let clienteId = null; // Variable para almacenar el ID del cliente (teléfono)

    try {
      // --- PASO 1: Validación Inicial (Cliente, Pollo, Stock) ---
      if (!confirmado) {
        console.log("Ejecutando validación básica...");
        const isValidBasic = await validateOrder(currentCart);
        if (!isValidBasic) {
          console.log("Validación básica fallida o esperando confirmación del usuario.");
          if (!showModal) { setIsSubmitting(false); }
          return;
        }
        console.log("Validación básica OK.");
      } else {
          console.log("Saltando validación básica (confirmado).");
      }

      // Obtener datos del cliente y hora final
      const clienteData = sanitizeClientData(datosCliente);
      const horaPedido = clienteData.fechahora || fechahora;

      // Validar formato final de horaPedido
      if (!dayjs(horaPedido, "DD/MM/YYYY HH:mm", true).isValid()) {
           console.error("Error Crítico: El formato final de horaPedido es inválido:", horaPedido);
           throw new Error(`El formato de la fecha/hora final del pedido es inválido: ${horaPedido}`);
      }
       console.log("Hora final del pedido:", horaPedido);

      // --- PASO 2: Verificar/Crear Cliente (AJUSTADO) ---
      clienteId = clienteData.telefono; // Usamos el teléfono como ID
      if (!clienteId) {
          throw new Error("Falta el teléfono del cliente para verificar/crear el registro.");
      }
      console.log(`Verificando/Creando cliente con ID (teléfono): ${clienteId}`);
      const clienteRef = doc(db, "clientes", clienteId);

      try {
          const clienteDocSnap = await getDoc(clienteRef);

          if (!clienteDocSnap.exists()) {
              // Cliente no existe, crearlo con la nueva estructura
              console.log(`Cliente ${clienteId} no encontrado. Creando nuevo registro...`);
              const newClientData = {
                  cliente: clienteData.cliente || "Nombre no proporcionado", // Nombre del cliente
                  telefono: clienteId,
                  localidad: clienteData.localidad || "",
                  celiaco: clienteData.celiaco || false, // Añadido
                  fechahora: serverTimestamp(), // Fecha de registro (usando el nombre de campo proporcionado)
                  lastOrderDate: serverTimestamp() // Fecha del último pedido (inicialmente la misma que registro)
                  // email: "" // Omitido, no disponible
              };
              await setDoc(clienteRef, newClientData);
              console.log(`Cliente ${clienteId} creado con éxito.`);
          } else {
              // Cliente existe, actualizar campos necesarios
              console.log(`Cliente ${clienteId} encontrado.`);
              const existingClientData = clienteDocSnap.data();
              const clientUpdates = {}; // Objeto para acumular actualizaciones

              // Siempre actualizar la fecha del último pedido
              clientUpdates.lastOrderDate = serverTimestamp();

              // Actualizar 'cliente' (nombre) si ha cambiado y se proporcionó uno nuevo
              if (clienteData.cliente && existingClientData.cliente !== clienteData.cliente) {
                  clientUpdates.cliente = clienteData.cliente;
              }

              // Actualizar 'localidad' si ha cambiado y se proporcionó una nueva
              if (clienteData.localidad && existingClientData.localidad !== clienteData.localidad) {
                  clientUpdates.localidad = clienteData.localidad;
              }

              // Actualizar 'celiaco' si ha cambiado
              const currentCeliaco = clienteData.celiaco || false; // Asegurar que es booleano
              if (existingClientData.celiaco !== currentCeliaco) {
                  clientUpdates.celiaco = currentCeliaco;
              }

              // Realizar la actualización solo si hay cambios (lastOrderDate siempre estará)
              if (Object.keys(clientUpdates).length > 0) {
                  console.log(`Actualizando datos del cliente ${clienteId}:`, clientUpdates);
                  await updateDoc(clienteRef, clientUpdates);
                  console.log(`Datos del cliente ${clienteId} actualizados.`);
              } else {
                   // Esto no debería ocurrir ya que lastOrderDate siempre se actualiza,
                   // pero lo dejamos por si acaso.
                  console.log(`No se requieren actualizaciones para el cliente ${clienteId}.`);
              }
          }
      } catch (clientError) {
          console.error(`Error Crítico al verificar/crear/actualizar cliente ${clienteId}:`, clientError);
          throw new Error(`No se pudo procesar la información del cliente (${clienteId}). ${clientError.message}`);
      }
      // --- FIN PASO 2 ---

      // --- PASO 3: Determinar si es para otro día ---
      const fechaRealizado = dayjs();
      const fechaPedido = dayjs(horaPedido, "DD/MM/YYYY HH:mm");
      const esParaOtroDia = !fechaPedido.isSame(fechaRealizado, 'day');
      console.log(`¿Es para otro día?: ${esParaOtroDia}`);

      // --- PASO 4: Preparar y Guardar/Actualizar Pedido ---
      console.log("Preparando datos del pedido para guardar en Firestore...");
      const nowString = fechaRealizado.format("DD/MM/YYYY HH:mm");

      // Mapeo de productos (sin cambios)
      const mappedProducts = currentCart.map((item) => {
            if (!item || item.id_product == null || typeof item.price !== 'number' || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
                 console.error("Error Crítico: Item inválido encontrado en carrito al preparar para Firestore:", item);
                 throw new Error("Se encontró un item inválido o con cantidad cero en el carrito.");
            }
            return {
                id: item.id_product, nombre: item.name || "Sin Nombre", cantidad: item.cantidad,
                alias: item.alias || "", observaciones: item.observaciones || "",
                celiaco: item.celiaco || clienteData.celiaco || false, tostado: item.tostado || 0,
                salsa: item.sinsalsa || false, extrasalsa: item.extrasalsa || false,
                entregado: item.entregado || 0, troceado: item.troceado || false,
                categoria: item.categoria || "No especificada", freidora: item.freidora || false,
                position: item.position, precio: item.price.toFixed(2),
                total: (item.price * item.cantidad).toFixed(2),
            };
       });

       const totalPedido = currentCart.reduce((acc, item) => acc + ((item?.price || 0) * (item?.cantidad || 1)), 0).toFixed(2);

      console.log(`%cProcediendo a ${orderToEdit ? 'ACTUALIZAR' : 'CREAR'} pedido en Firestore...`, 'color: green; font-weight: bold;');
      if (orderToEdit) { // Actualizar
        if (!pedidoId) { throw new Error("Falta ID para actualizar pedido."); }
        console.log(`Actualizando Firestore para pedido ID: ${pedidoId}`);
        const pedidoRef = doc(db, "pedidos", pedidoId.toString());
        // Añadir idCliente a los datos de actualización
        const updateData = {
          cliente: clienteData.cliente, telefono: clienteData.telefono, fechahora: horaPedido,
          observaciones: clienteData.observaciones, pagado: clienteData.pagado, celiaco: clienteData.celiaco,
          localidad: clienteData.localidad, productos: mappedProducts, total_pedido: totalPedido,
          fechahora_modificado: nowString, paraOtroDia: esParaOtroDia,
          idCliente: clienteId // <-- Mantenido
        };
        await updateDoc(pedidoRef, updateData);
        console.log(`Firestore: Pedido ID ${pedidoId} actualizado.`);

      } else { // Crear
        pedidoId = await getNextId();
        console.log(`Creando nuevo pedido en Firestore con ID: ${pedidoId}`);
        // Añadir idCliente a los datos de creación
        const pedidoData = {
           NumeroPedido: pedidoId, cliente: clienteData.cliente, telefono: clienteData.telefono,
           fechahora: horaPedido, observaciones: clienteData.observaciones, pagado: clienteData.pagado,
           celiaco: clienteData.celiaco, localidad: clienteData.localidad, empleado: empleadoNombre, origen: 0,
           productos: mappedProducts, total_pedido: totalPedido,
           fechahora_realizado: nowString, paraOtroDia: esParaOtroDia,
           idCliente: clienteId // <-- Mantenido
        };
        await setDoc(doc(db, "pedidos", pedidoId.toString()), pedidoData);
        console.log(`Firestore: Pedido nuevo ID ${pedidoId} creado.`);
      }
      console.log(`Éxito: Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'guardado'} en Firestore.`);

      // --- PASO 5: Actualizar Stock (CONDICIONAL) ---
      // (Sin cambios en esta lógica, pero corregido un typo)
      if (!esParaOtroDia) {
          console.log("El pedido es para hoy. Procediendo a actualizar stock...");
          try {
              const stockUpdates = {};
              currentCart.forEach(item => {
                  if (!item || item.cantidad <= 0) return;
                  let stockProductId;
                  let quantityToDeduct = item.cantidad;
                  if (item.id_product === 1) stockProductId = 1;
                  else if (item.id_product === 2) { stockProductId = 1; quantityToDeduct = item.cantidad / 2; }
                  else if (item.id_product === 41) stockProductId = 41;
                  else if (item.id_product === 48) { stockProductId = 41; quantityToDeduct = item.cantidad / 2; } // <-- CORREGIDO typo
                  else stockProductId = item.id_product;
                  if (stockProductId && quantityToDeduct > 0) {
                      const stockProductIdStr = stockProductId.toString();
                      stockUpdates[stockProductIdStr] = (stockUpdates[stockProductIdStr] || 0) + quantityToDeduct;
                  }
              });
              const stockUpdatePromises = Object.entries(stockUpdates).map(([productId, quantity]) =>
                  updateStock(productId, quantity)
              );
              if (stockUpdatePromises.length > 0) {
                   console.log(`Ejecutando ${stockUpdatePromises.length} actualizaciones de stock...`);
                   await Promise.all(stockUpdatePromises);
                   console.log("Actualización de stock completada con éxito.");
              } else {
                   console.log("No se requirieron actualizaciones de stock para este pedido.");
              }
          } catch (stockError) {
              console.error(`¡ERROR CRÍTICO POST-GUARDADO! Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'creado'}, PERO FALLÓ LA ACTUALIZACIÓN DE STOCK:`, stockError);
              setMensajeModal(`¡ATENCIÓN GRAVE! Pedido ${pedidoId} guardado, pero falló al actualizar stock (${stockError.message}). Es necesaria REVISIÓN MANUAL INMEDIATA del inventario.`);
              setShowModal2(true);
              setIsSubmitting(false);
              return;
          }
      } else {
          console.log("El pedido es para otro día. Omitiendo actualización de stock.");
      }

      // --- PASO 6: Actualizar Contadores de Ensaladas/Ensaladillas ---
      // (Sin cambios en esta lógica)
      console.log("Iniciando actualización de contadores de ensaladas/ensaladillas...");
      try {
          await updateSaladCounters(currentCart);
          console.log("Actualización de contadores de ensaladas/ensaladillas intentada.");
      } catch (saladError) {
           console.error(`Error INESPERADO al llamar a updateSaladCounters para pedido ${pedidoId}:`, saladError);
      }

      // --- PASO 7: Limpiar Estado y Navegar (Éxito Total) ---
      // (Sin cambios en esta lógica)
      console.log(`%c---- ÉXITO TOTAL Pedido ID: ${pedidoId} ---- Limpiando estado y navegando...`, 'color: green; font-weight: bold; font-size: 1.1em;');
      setCart([]);
      setDatosCliente({
        cliente: "", telefono: "", fechahora: "", observaciones: "",
        pagado: false, celiaco: false, localidad: "",
      });
      navigate("/ordenes");

    } catch (error) {
      // --- Captura de Errores Generales ---
      console.error("Error general no capturado previamente en sendToFirestore:", error);
      if (!showModal) {
          setMensajeModal(`Error inesperado al procesar el pedido: ${error.message}. Intenta de nuevo o contacta soporte.`);
          setShowModal2(true);
      } else {
           console.error("Error general ocurrió mientras un modal de confirmación estaba activo.");
      }
       setIsSubmitting(false);

    } finally {
      // --- Bloque Finally ---
      if (!showModal) {
         console.log("Finally: No hay modales de confirmación activos, liberando isSubmitting.");
         setIsSubmitting(false);
      } else {
          console.log("Finally: Modal de confirmación activo detectado, isSubmitting permanecerá true.");
      }
      console.log("--- Ejecución de sendToFirestore finalizada ---");
    }
  }; // --- Fin de sendToFirestore ---

  // --- Renderizado del Componente ---
  // (Sin cambios en el JSX)
  return cart.length > 0 ? (
    <>
      {/* Sección del Total */}
      <div className="flex justify-end p-[0.5vw]">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center text-2xl font-extrabold xtext-gray-600 hover:underline dark:text-gray-400"
        >
          <span className="text-end">{total.toFixed(2)} €</span>
        </a>
      </div>

      {/* Botón Principal de Acción */}
      <div className="flex text-center justify-center items-center mt-6 mb-4">
        <button
          onClick={() => { console.log("Click en Botón Generar/Actualizar"); sendToFirestore({ confirmado: false }); }}
          disabled={isSubmitting}
          className={`w-full sm:w-auto min-w-[150px] px-6 py-3 tracking-wide  ${
            orderToEdit ? 'bg-gray-600' : 'bg-[#f2ac02] hover:bg-yellow-600'
            } text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
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
            {isSubmitting ? 'Procesando...' : (orderToEdit ? "Actualizar Pedido" : "Generar Pedido")}
          </span>
        </button>
      </div>

      {/* --- Modales --- */}
      {/* Modal 2: Errores o Información Bloqueante */}
      <Modal show={showModal2} onHide={() => { handleCloseModal2(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center p-4">
          <div className='p-1'>
             <svg fill="#c81d0c" width="100px" height="100px" viewBox="0 0 22 22" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                <g id="SVGRepo_iconCarrier">
                <path d="M12.1458333,9.85416667 L12.1458333,6.74047388 C12.1458333,6.4826434 11.9382041,6.28571429 11.6820804,6.28571429 L10.3179196,6.28571429 C10.0656535,6.28571429 9.85416667,6.48931709 9.85416667,6.74047388 L9.85416667,9.85416667 L6.74047388,9.85416667 C6.4826434,9.85416667 6.28571429,10.0617959 6.28571429,10.3179196 L6.28571429,11.6820804 C6.28571429,11.9343465 6.48931709,12.1458333 6.74047388,12.1458333 L9.85416667,12.1458333 L9.85416667,15.2595261 C9.85416667,15.5173566 10.0617959,15.7142857 10.3179196,15.7142857 L11.6820804,15.7142857 C11.9343465,15.7142857 12.1458333,15.5106829 12.1458333,15.2595261 L12.1458333,12.1458333 L15.2595261,12.1458333 C15.5173566,12.1458333 15.7142857,11.9382041 15.7142857,11.6820804 L15.7142857,10.3179196 C15.7142857,10.0656535 15.5106829,9.85416667 15.2595261,9.85416667 L12.1458333,9.85416667 Z" id="Combined-Shape" transform="translate(11.000000, 11.000000) rotate(-45.000000) translate(-11.000000, -11.000000) "/>
                </g>
            </svg>
         </div>
         <p className="font-nunito text-lg p-2 text-center text-gray-700 whitespace-pre-line">{mensajeModal}</p>
         </Modal.Body>
        <Modal.Footer className='no-border'>
          <Button variant="primary" className="mt-1 bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 py-2 px-5 font-nunito text-white rounded-md shadow-sm" onClick={() => { handleCloseModal2(); setIsSubmitting(false); }}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 1: Confirmación (ej. continuar sin pollo / sin hora) */}
      <Modal show={showModal} onHide={() => { handleCloseModal(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center p-4">
          <div className='p-2'>
             <svg fill="#c81d0c  " width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>
             </svg>
         </div>
          <p className="font-nunito text-lg p-2 text-center text-gray-700">{mensajeModal}</p>
        </Modal.Body>
        <Modal.Footer className="border-t-0 flex justify-around p-4">
          <Button variant="secondary" className="py-2 px-5 bg-white font-nunito text-red-500 border-red-500 hover:text-red-600 hover:border-red-600 shadow-sm" onClick={() => { handleCloseModal(); setIsSubmitting(false); }} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={async () => { handleCloseModal(); await sendToFirestore({ confirmado: true }); }} disabled={isSubmitting} className={`py-2 px-5 bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 font-nunito text-white rounded-md shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
}; // --- Fin del componente CartTotal ---

export default CartTotal;
