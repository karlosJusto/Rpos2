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


// --- Función para Actualizar Contadores de Ensaladas/Ensaladillas ---
// (Sin cambios, pero consciente de las advertencias mencionadas en sendToFirestore)
const updateSaladCounters = async (cartItems) => {
    const todayId = dayjs().format("DD-MM-YYYY");
    const docRef = doc(db, "ensaladas", todayId);
    console.log(`Preparando actualización de contadores de ensaladas para ${todayId}...`);

    let incrementEnsaladaGrande = 0;
    let incrementEnsaladaPequena = 0;
    let incrementEnsaladillaGrande = 0;
    let incrementEnsaladillaPequena = 0;

    cartItems.forEach(item => {
        // Usar item.id o item.id_product según el contexto (carrito vs pedido guardado)
        const itemId = item.id_product ?? item.id;
        const itemName = item.name || ""; // Nombre del producto
        const itemCantidad = item.cantidad ?? 0;

        if (!itemName || typeof itemCantidad !== 'number' || itemCantidad <= 0) {
            console.warn("Item inválido o sin cantidad en updateSaladCounters, omitiendo:", item);
            return;
        }

        const nameLower = itemName.toLowerCase();
        const cantidad = itemCantidad;
        // Asumir que '1/2' o 'media' indica pequeña
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
                // Crear con estructura anidada correcta
                const initialData = {
                    ensaladas: {
                        grandes: { pedidas: incrementEnsaladaGrande, preparadas: 0 },
                        pequenas: { pedidas: incrementEnsaladaPequena, preparadas: 0 }
                    },
                    ensaladillas: {
                        grandes: { pedidas: incrementEnsaladillaGrande, preparadas: 0 },
                        pequenas: { pedidas: incrementEnsaladillaPequena, preparadas: 0 }
                    },
                    // lastUpdated: serverTimestamp() // Opcional
                };
                transaction.set(docRef, initialData);
                console.log(`Documento ${todayId} creado con valores iniciales.`);

            } else {
                console.log(`Documento ${todayId} existe. Actualizando contadores...`);
                const updateData = {};
                // Usar notación de puntos para actualizar campos anidados con increment
                if (incrementEnsaladaGrande > 0) updateData['ensaladas.grandes.pedidas'] = increment(incrementEnsaladaGrande);
                if (incrementEnsaladaPequena > 0) updateData['ensaladas.pequenas.pedidas'] = increment(incrementEnsaladaPequena);
                if (incrementEnsaladillaGrande > 0) updateData['ensaladillas.grandes.pedidas'] = increment(incrementEnsaladillaGrande);
                if (incrementEnsaladillaPequena > 0) updateData['ensaladillas.pequenas.pedidas'] = increment(incrementEnsaladillaPequena);

                // Solo actualizar si hay algo que cambiar
                if (Object.keys(updateData).length > 0) {
                    // updateData['lastUpdated'] = serverTimestamp(); // Opcional: marcar actualización
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
        // No relanzar para no detener el flujo principal del pedido, pero loguear claramente.
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
      // Consider setting a default or handling this case if empleadoNombre is critical
    }
  }, []);

  // --- Calcular Total del Carrito (para display) ---
  const total = cart.reduce(
    (acc, item) => {
      // Using the more robust price check consistently
      const unitPrice = item?.price === 0
        ? item?.precio ?? 0
        : item?.price ?? item?.precio ?? 0;
      const quantity = item?.cantidad ?? 1; // Default to 1 if cantidad is missing/falsy
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
    // Ajuste si la hora redondeada ya pasó (con un margen de 2 minutos)
    // Usar isSameOrAfter para incluir la hora actual como válida si coincide con el bloque
    if (now.isSameOrAfter(nuevaHora.add(2, 'minute'))) { // Si ahora es 2 min o más DESPUÉS de la hora redondeada
        console.warn("Hora redondeada calculada está en el pasado reciente, ajustando al siguiente bloque.");
        nuevaHora = nuevaHora.add(15, 'minute');
    }
    return nuevaHora;
  };

  // Determina la hora final del pedido
  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format("DD/MM/YYYY HH:mm");

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
             // Asegurarse de que id es un número antes de incrementar
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
  });

  // --- Función de Actualizar Stock (Modificada para aceptar cambios +/-) ---
   const updateStock = async (productId, stockChange) => {
     const productIdStr = productId?.toString();
     if (!productIdStr) {
         console.error("ID de producto inválido detectado en updateStock:", productId);
         throw new Error(`Intento de actualizar stock con ID inválido: ${productId}`);
     }
     // Permitir cambios de 0 (aunque no hagan nada) y negativos (para sumar stock)
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
           // Usar || 0 para manejar stock undefined o null
           const currentStock = Number(productData.stock || 0);

            if (isNaN(currentStock)) {
                 console.error(`Error Crítico: El stock para el producto ID ${productIdStr} no es un número válido (${productData.stock}). Se tratará como 0.`);
                 // Considerar lanzar error si un stock inválido es inaceptable
                 // throw new Error(`Stock inválido para producto ID ${productIdStr}.`);
            }

           // Calcular nuevo stock: Restar el cambio (si el cambio es -1, se suma 1)
           const newStock = currentStock - stockChange;

           // Validar stock *solo si estamos intentando restar* (stockChange > 0)
           if (stockChange > 0 && currentStock < stockChange) {
                console.warn(`Stock insuficiente detectado en transacción para ${productData.name || 'ID ' + productIdStr}. Necesario restar: ${stockChange}, Disponible: ${currentStock}`);
                throw new Error(`Stock insuficiente para ${productData.name || 'ID ' + productIdStr}.`);
           }

           // Loguear la operación
           const operation = stockChange > 0 ? 'restando' : 'sumando';
           const absChange = Math.abs(stockChange);
           console.log(`Stock: Actualizando ${productIdStr}: ${currentStock} -> ${newStock} (${operation} ${absChange})`);

           transaction.update(productRef, { stock: newStock });
       });
        const action = stockChange > 0 ? 'reducido' : 'incrementado';
        console.log(`Stock actualizado correctamente via transacción para ID: ${productIdStr}, cantidad ${action}: ${Math.abs(stockChange)}`);
     } catch (error) {
       console.error(`Error durante la transacción de actualización de stock para ID ${productIdStr} (cambio: ${stockChange}):`, error);
       throw error; // Re-lanzar para que sendToFirestore lo maneje
     }
   };

  // --- Validación Básica del Pedido (Cliente, Pollo, Stock Preliminar) ---
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

    // 2. Validación de Stock Preliminar
    console.log("Iniciando validación de stock...");
    const productQuantities = {};
    let stockValidationError = false;

    currentCart.forEach(item => {
       // Validar item básico
       if (!item || item.id_product == null || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
           console.warn("Item inválido en carrito durante validación de stock:", item);
           return; // Omitir item inválido
       }

       let stockProductId;
       let quantityForStockCheck = item.cantidad;
       const productName = item.name || `Producto ID ${item.id_product}`;

       // Lógica específica de stock (Pollo entero/medio, Patatas fritas grande/media)
       if (item.id_product === 1) stockProductId = 1; // Pollo entero
       else if (item.id_product === 2) { stockProductId = 1; quantityForStockCheck = item.cantidad / 2; } // Medio pollo usa 0.5 de stock de pollo
       else if (item.id_product === 41) stockProductId = 41; // Patatas Fritas Grandes
       else if (item.id_product === 48) { stockProductId = 41; quantityForStockCheck = item.cantidad / 2; } // Patatas Fritas Medianas usan 0.5 de stock de patatas grandes
       else stockProductId = item.id_product; // Otros productos usan su propio ID

       // Asegurarse de que quantityForStockCheck sea válido
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
                   stockValidationError = true; return;
               }

               const productData = productSnap.data();
               const currentStock = Number(productData.stock || 0); // Tratar stock inválido como 0

               if (isNaN(currentStock)) {
                   console.error(`Error Crítico Validación: Stock inválido para producto ID ${productIdStr} (${productData.stock}).`);
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
        console.log("No hay productos en el carrito que requieran verificación de stock (o todos eran inválidos).");
    }

    // 3. Validar Hora (Advertencia y Error)
    if (!clienteData.fechahora) {
      const horaRedondeada = obtenerHoraRedondeada().format('HH:mm');
      mensajesAdvertencia += `❗️No has seleccionado hora. La hora del pedido será: ${horaRedondeada}\n`;
    } else {
      // Validar que la hora seleccionada no sea en el pasado (con un margen)
      const horaPedidoSeleccionada = dayjs(clienteData.fechahora, "DD/MM/YYYY HH:mm");
      if (horaPedidoSeleccionada.isValid() && horaPedidoSeleccionada.isBefore(dayjs().subtract(5, 'minute'))) {
          mensajesError += `La hora seleccionada (${horaPedidoSeleccionada.format('HH:mm')}) ya ha pasado.\n`;
      }
    }

    // 4. Validar Pollo (Advertencia)
    const incluyePollo = currentCart.some(item => item && (item.id_product === 1 || item.id_product === 2));
    if (!incluyePollo) {
      mensajesAdvertencia += "❗️Comprueba... tu pedido no incluye pollo.\n";
    }

    // --- Decisión Final ---
    if (mensajesError.trim() !== "") {
      console.log("Validación fallida por errores:", mensajesError.trim());
      setMensajeModal(mensajesError.trim());
      setShowModal2(true); // Mostrar modal de error
      return false; // Bloquea la continuación
    }
    if (mensajesAdvertencia.trim() !== "") {
       console.log("Validación OK, pero con advertencias:", mensajesAdvertencia.trim());
       setMensajeModal(mensajesAdvertencia.trim());
       setShowModal(true); // Mostrar modal de advertencia/confirmación
       return false; // Espera confirmación del usuario
    }

    console.log("Validación completa del pedido superada con éxito.");
    return true; // Permite la continuación
  };


  // --- Función Principal para Enviar/Actualizar Pedido ---
  const sendToFirestore = async ({ confirmado }) => {
    console.log(`%c--- Iniciando sendToFirestore ---
    Confirmado (sin pollo/hora): ${confirmado}
    Editando Pedido: ${orderToEdit ? orderToEdit.NumeroPedido : 'No'}
    Estado Submitting Actual: ${isSubmitting}`, 'color: blue; font-weight: bold;');

    // Doble check para evitar envíos múltiples
    if (isSubmitting) {
        console.warn("Submit bloqueado: ya hay un proceso en curso.");
        return;
    }
    setIsSubmitting(true); // Bloquear botón

    // Usar una copia fresca del carrito actual
    const currentCart = [...cart];

    // Validar carrito no vacío
    if (!currentCart || currentCart.length === 0) {
        console.warn("Envío cancelado: Carrito vacío.");
        setMensajeModal("El carrito está vacío."); setShowModal2(true); setIsSubmitting(false); return;
    }

    let pedidoId = orderToEdit ? orderToEdit.NumeroPedido : null;
    let clienteId = null; // Variable para almacenar el ID del cliente (teléfono)

    try {
      // --- PASO 1: Validación Inicial (Cliente, Pollo, Stock, Hora) ---
      // Solo ejecutar si no viene de una confirmación de advertencia
      if (!confirmado) {
        console.log("Ejecutando validación completa...");
        const isValid = await validateOrder(currentCart);
        // Si la validación falla (ya sea por error o por advertencia pendiente), detenerse.
        if (!isValid) {
          console.log("Validación fallida o esperando confirmación del usuario.");
          // Si no se mostró ningún modal (lo cual sería raro aquí), desbloquear.
          if (!showModal && !showModal2) {
              setIsSubmitting(false);
          }
          return; // Detener ejecución
        }
        console.log("Validación completa OK.");
      } else {
          console.log("Saltando validación (confirmado por el usuario).");
          // Asegurarse de que el modal de confirmación se cierre si aún está abierto
          if (showModal) handleCloseModal();
      }

      // Obtener datos del cliente y hora final (re-evaluar por si se usó la hora por defecto)
      const clienteData = sanitizeClientData(datosCliente);
      // Usar la hora del estado 'fechahora' que ya tiene el valor por defecto calculado si es necesario
      const horaPedido = fechahora;

      // Validar formato final de horaPedido ANTES de continuar
      const parsedHoraPedido = dayjs(horaPedido, "DD/MM/YYYY HH:mm", true); // true for strict parsing
      if (!parsedHoraPedido.isValid()) {
           console.error("Error Crítico: El formato final de horaPedido es inválido:", horaPedido);
           throw new Error(`El formato de la fecha/hora final del pedido es inválido: ${horaPedido}. Use DD/MM/YYYY HH:mm`);
      }
       console.log("Hora final del pedido validada:", horaPedido);

      // --- PASO 2: Verificar/Crear/Actualizar Cliente ---
      clienteId = clienteData.telefono; // Usamos el teléfono como ID
      if (!clienteId || !/^\d{9}$/.test(clienteId)) { // Re-validar teléfono por si acaso
          throw new Error("El teléfono del cliente es inválido o falta.");
      }
      console.log(`Verificando/Actualizando cliente con ID (teléfono): ${clienteId}`);
      const clienteRef = doc(db, "clientes", clienteId);

      try {
          await runTransaction(db, async (transaction) => {
              const clienteDocSnap = await transaction.get(clienteRef);

              if (!clienteDocSnap.exists()) {
                  // Cliente no existe, crearlo
                  console.log(`Cliente ${clienteId} no encontrado. Creando nuevo registro...`);
                  const newClientData = {
                      cliente: clienteData.cliente || "Nombre no proporcionado",
                      telefono: clienteId,
                      localidad: clienteData.localidad || "",
                      celiaco: clienteData.celiaco || false,
                      fechahora: serverTimestamp(), // Fecha de registro
                      lastOrderDate: serverTimestamp() // Fecha del último pedido
                  };
                  transaction.set(clienteRef, newClientData);
                  console.log(`Cliente ${clienteId} creado con éxito en transacción.`);
              } else {
                  // Cliente existe, actualizar campos necesarios
                  console.log(`Cliente ${clienteId} encontrado. Preparando actualización...`);
                  const existingClientData = clienteDocSnap.data();
                  const clientUpdates = {
                      lastOrderDate: serverTimestamp() // Siempre actualizar la fecha del último pedido
                  };

                  // Actualizar 'cliente' (nombre) si cambió y no está vacío
                  if (clienteData.cliente && existingClientData.cliente !== clienteData.cliente) {
                      clientUpdates.cliente = clienteData.cliente;
                  }
                  // Actualizar 'localidad' si cambió
                  if (clienteData.localidad !== undefined && existingClientData.localidad !== clienteData.localidad) {
                      clientUpdates.localidad = clienteData.localidad;
                  }
                  // Actualizar 'celiaco' si cambió
                  const currentCeliaco = clienteData.celiaco || false;
                  if (existingClientData.celiaco !== currentCeliaco) {
                      clientUpdates.celiaco = currentCeliaco;
                  }

                  console.log(`Actualizando datos del cliente ${clienteId} en transacción:`, clientUpdates);
                  transaction.update(clienteRef, clientUpdates);
                  console.log(`Datos del cliente ${clienteId} actualizados en transacción.`);
              }
          });
          console.log(`Transacción de cliente ${clienteId} completada.`);
      } catch (clientError) {
          console.error(`Error Crítico durante la transacción del cliente ${clienteId}:`, clientError);
          throw new Error(`No se pudo procesar la información del cliente (${clienteId}). ${clientError.message}`);
      }
      // --- FIN PASO 2 ---

      // --- PASO 3: Determinar si es para otro día ---
      const fechaRealizado = dayjs(); // Hora actual
      // Usar la hora parseada y validada previamente
      const esParaOtroDia = !parsedHoraPedido.isSame(fechaRealizado, 'day');
      console.log(`¿Es para otro día?: ${esParaOtroDia} (Pedido: ${parsedHoraPedido.format('DD/MM')}, Hoy: ${fechaRealizado.format('DD/MM')})`);

      // --- PASO 4: Preparar y Guardar/Actualizar Pedido ---
      console.log("Preparando datos del pedido para guardar en Firestore...");
      const nowString = fechaRealizado.format("DD/MM/YYYY HH:mm"); // Fecha/hora de realización/modificación

      // Mapeo de productos con correcciones booleanas y de precio
      const mappedProducts = currentCart.map((item) => {
            // Validar cada item antes de mapear
            if (!item || item.id_product == null || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
                 console.error("Error Crítico: Item inválido encontrado en carrito al preparar para Firestore:", item);
                 throw new Error("Se encontró un item inválido o con cantidad cero en el carrito.");
            }
            // Usar la lógica de precio consistente
            const unitPrice = item?.price === 0
                ? item?.precio ?? 0
                : item?.price ?? item?.precio ?? 0;

            return {
                id: item.id_product,
                nombre: item.name || "Sin Nombre",
                cantidad: item.cantidad,
                alias: item.alias || "",
                observaciones: item.observaciones || "",
                // --- FIX: Convertir a Boolean ---
                celiaco: !!(item.celiaco || clienteData.celiaco), // Asegurar boolean, hereda de cliente si no está en item
                tostado: !!item.tostado,
                sinsalsa: !!item.sinsalsa, // Usar sinsalsa y convertir a boolean
                extrasalsa: !!item.extrasalsa,
                troceado: !!item.troceado,
                // --- Fin Fix ---
                entregado: item.entregado || 0, // Mantener como número (0, 1, etc?) o convertir a boolean si aplica? Asumimos número por ahora.
                categoria: item.categoria || "No especificada",
                freidora: !!item.freidora, // Asegurar boolean
                position: item.position ?? null, // Usar null como default si no existe
                precio: Number(unitPrice).toFixed(2), // Asegurar que es número antes de toFixed
                total: (unitPrice * item.cantidad).toFixed(2),
            };
       });

       // --- FIX: Calcular total_pedido usando la misma lógica robusta ---
       const totalPedido = currentCart.reduce((acc, item) => {
            const unitPrice = item?.price === 0
                ? item?.precio ?? 0
                : item?.price ?? item?.precio ?? 0;
            const quantity = item?.cantidad ?? 1;
            return acc + (unitPrice * quantity);
        }, 0).toFixed(2);
       // --- Fin Fix ---

      console.log(`%cProcediendo a ${orderToEdit ? 'ACTUALIZAR' : 'CREAR'} pedido en Firestore... Total: ${totalPedido}€`, 'color: green; font-weight: bold;');

      if (orderToEdit) { // --- Actualizar Pedido Existente ---
        if (!pedidoId) { throw new Error("Falta ID para actualizar pedido."); }
        console.log(`Actualizando Firestore para pedido ID: ${pedidoId}`);
        const pedidoRef = doc(db, "pedidos", pedidoId.toString());

        // --- FIX: Incluir origen y asegurar que todos los campos necesarios se actualizan ---
        const updateData = {
          // Datos del cliente (actualizados)
          cliente: clienteData.cliente,
          telefono: clienteData.telefono, // Teléfono es el ID de cliente, no debería cambiar pero lo incluimos
          localidad: clienteData.localidad,
          celiaco: clienteData.celiaco, // Celiaco general del pedido/cliente
          idCliente: clienteId, // ID del cliente (teléfono)

          // Datos del pedido
          fechahora: horaPedido, // Hora de recogida/entrega
          observaciones: clienteData.observaciones,
          pagado: clienteData.pagado,
          productos: mappedProducts, // Lista de productos actualizada
          total_pedido: totalPedido, // Total calculado actualizado
          paraOtroDia: esParaOtroDia, // Actualizar si la fecha cambió

          // Metadatos
          fechahora_modificado: nowString, // Marcar hora de modificación
          origen: orderToEdit.origen ?? 0, // --- FIX: Preservar origen original ---
          // empleado: empleadoNombre, // ¿Actualizar empleado que modifica? Opcional.
        };
        // --- Fin Fix ---

        await updateDoc(pedidoRef, updateData);
        console.log(`Firestore: Pedido ID ${pedidoId} actualizado.`);

      } else { // --- Crear Pedido Nuevo ---
        pedidoId = await getNextId(); // Obtener nuevo ID
        console.log(`Creando nuevo pedido en Firestore con ID: ${pedidoId}`);

        const pedidoData = {
           NumeroPedido: pedidoId,
           // Datos del cliente
           cliente: clienteData.cliente,
           telefono: clienteData.telefono,
           localidad: clienteData.localidad,
           celiaco: clienteData.celiaco, // Celiaco general del pedido/cliente
           idCliente: clienteId, // ID del cliente (teléfono)

           // Datos del pedido
           fechahora: horaPedido, // Hora de recogida/entrega
           observaciones: clienteData.observaciones,
           pagado: clienteData.pagado,
           productos: mappedProducts, // Lista de productos
           total_pedido: totalPedido, // Total calculado
           paraOtroDia: esParaOtroDia,

           // Metadatos
           empleado: empleadoNombre || "No identificado", // Empleado que crea
           origen: 0, // Origen por defecto para nuevos pedidos desde esta app
           fechahora_realizado: nowString, // Hora de creación
           // fechahora_modificado: null, // No aplica en creación
        };
        await setDoc(doc(db, "pedidos", pedidoId.toString()), pedidoData);
        console.log(`Firestore: Pedido nuevo ID ${pedidoId} creado.`);
      }
      console.log(`Éxito: Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'guardado'} en Firestore.`);

      // --- PASO 5: Actualizar Stock (LÓGICA DIFERENCIAL Y CONDICIONAL) ---
      console.log("Iniciando lógica de actualización de stock...");

      // Helper para calcular cantidades de stock requeridas por producto base
      const calculateStockQuantities = (items) => {
          const quantities = {};
          items.forEach(item => {
              // Usar item.id o item.id_product según el contexto
              const itemId = item.id_product ?? item.id;
              const itemCantidad = item.cantidad ?? 0;

              if (!itemId || itemCantidad <= 0) {
                  console.warn("Item inválido o sin cantidad en calculateStockQuantities, omitiendo:", item);
                  return;
              }

              let stockProductId;
              let quantityForStock = itemCantidad;

              // Lógica específica de stock (Pollo/Medio, Patatas/Media)
              if (itemId === 1) stockProductId = 1;
              else if (itemId === 2) { stockProductId = 1; quantityForStock = itemCantidad / 2; }
              else if (itemId === 41) stockProductId = 41;
              else if (itemId === 48) { stockProductId = 41; quantityForStock = itemCantidad / 2; }
              else stockProductId = itemId; // Otros productos usan su propio ID

              if (stockProductId && quantityForStock > 0 && !isNaN(quantityForStock)) {
                  const stockProductIdStr = stockProductId.toString();
                  quantities[stockProductIdStr] = (quantities[stockProductIdStr] || 0) + quantityForStock;
              } else {
                  console.warn(`Item ${item.name || itemId} omitido del cálculo de stock (ID o cantidad inválida: ${stockProductId}, ${quantityForStock})`);
              }
          });
          return quantities;
      };

      const finalParaOtroDia = esParaOtroDia; // Estado final de la fecha
      let stockChanges = {}; // Mapa para guardar los cambios finales a aplicar { productId: change }

      if (orderToEdit) { // --- Lógica para EDITAR Pedido ---
          console.log("Calculando diferencias de stock para edición...");
          // Asegurarse de que paraOtroDia exista en el pedido original, si no, asumir false (era para hoy)
          const originalParaOtroDia = orderToEdit.paraOtroDia === true; // Convertir a booleano explícito
          const originalProducts = orderToEdit.productos || [];

          const originalStockQuantities = calculateStockQuantities(originalProducts);
          const finalStockQuantities = calculateStockQuantities(currentCart);

          console.log("Cantidades Stock Original:", originalStockQuantities);
          console.log("Cantidades Stock Final:", finalStockQuantities);

          // Determinar qué stock necesita ajuste
          if (!originalParaOtroDia && !finalParaOtroDia) {
              // Caso A: Era para hoy, sigue siendo para hoy -> Aplicar diferencia
              console.log("Caso Stock A: Hoy -> Hoy. Calculando diferencias...");
              const allProductIds = new Set([...Object.keys(originalStockQuantities), ...Object.keys(finalStockQuantities)]);
              allProductIds.forEach(id => {
                  const originalQty = originalStockQuantities[id] || 0;
                  const finalQty = finalStockQuantities[id] || 0;
                  const change = finalQty - originalQty; // Positivo si se añade, negativo si se quita
                  if (change !== 0) {
                      // El cambio se aplica como está (positivo resta stock, negativo suma stock)
                      stockChanges[id] = change;
                  }
              });
              console.log("Cambios netos a aplicar:", stockChanges);

          } else if (!originalParaOtroDia && finalParaOtroDia) {
              // Caso B: Era para hoy, ahora es para otro día -> Revertir stock original
              console.log("Caso Stock B: Hoy -> Otro Día. Revirtiendo stock original...");
              Object.keys(originalStockQuantities).forEach(id => {
                  const originalQty = originalStockQuantities[id];
                  if (originalQty > 0) {
                      stockChanges[id] = -originalQty; // Negativo para sumar stock (revertir)
                  }
              });
              console.log("Cambios (reversión) a aplicar:", stockChanges);

          } else if (originalParaOtroDia && !finalParaOtroDia) {
              // Caso C: Era para otro día, ahora es para hoy -> Aplicar stock final
              console.log("Caso Stock C: Otro Día -> Hoy. Aplicando stock final...");
              Object.keys(finalStockQuantities).forEach(id => {
                  const finalQty = finalStockQuantities[id];
                  if (finalQty > 0) {
                      stockChanges[id] = finalQty; // Positivo para restar stock (aplicación inicial)
                  }
              });
               console.log("Cambios (aplicación inicial) a aplicar:", stockChanges);

          } else { // originalParaOtroDia && finalParaOtroDia
              // Caso D: Era para otro día, sigue siendo para otro día -> No hacer nada con el stock
              console.log("Caso Stock D: Otro Día -> Otro Día. Sin cambios de stock.");
          }

      } else { // --- Lógica para CREAR Pedido Nuevo ---
          console.log("Calculando stock para pedido nuevo...");
          if (!finalParaOtroDia) {
              // Solo restar stock si es para hoy
              console.log("Pedido nuevo para hoy. Calculando stock a restar...");
              const finalStockQuantities = calculateStockQuantities(currentCart);
              Object.keys(finalStockQuantities).forEach(id => {
                  const finalQty = finalStockQuantities[id];
                  if (finalQty > 0) {
                      stockChanges[id] = finalQty; // Positivo para restar
                  }
              });
              console.log("Stock a restar:", stockChanges);
          } else {
              console.log("Pedido nuevo para otro día. Omitiendo actualización de stock.");
          }
      }

      // --- Aplicar los cambios de stock calculados ---
      const stockUpdatePromises = Object.entries(stockChanges).map(([productId, change]) =>
          updateStock(productId, change) // Llamar a updateStock con el cambio (+/-)
      );

      if (stockUpdatePromises.length > 0) {
           console.log(`Ejecutando ${stockUpdatePromises.length} actualizaciones de stock...`);
           try {
               await Promise.all(stockUpdatePromises);
               console.log("Actualización de stock completada con éxito.");
           } catch (stockError) {
               // Error CRÍTICO post-guardado. El pedido está en Firestore pero el stock falló.
               console.error(`¡ERROR CRÍTICO POST-GUARDADO! Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'creado'}, PERO FALLÓ LA ACTUALIZACIÓN DE STOCK:`, stockError);
               setMensajeModal(`¡ATENCIÓN GRAVE! Pedido ${pedidoId} guardado, pero falló al actualizar stock (${stockError.message}). Es necesaria REVISIÓN MANUAL INMEDIATA del inventario y posiblemente del pedido.`);
               setShowModal2(true); // Usar modal de error
               setIsSubmitting(false); // Permitir cerrar modal
               return; // Detener ejecución aquí
           }
      } else {
           console.log("No se requirieron actualizaciones de stock para este pedido/edición.");
      }
      // --- FIN PASO 5 ---

      // --- PASO 6: Actualizar Contadores de Ensaladas/Ensaladillas ---
      // Considerar si esta lógica también debería ser diferencial o condicional a 'paraOtroDia'
      // Por ahora, se actualiza basado en el carrito final, independientemente de la fecha o edición.
      console.log("Iniciando actualización de contadores de ensaladas/ensaladillas...");
      try {
          // Pasar el carrito actual (que tiene id_product, name, cantidad)
          await updateSaladCounters(currentCart);
          console.log("Actualización de contadores de ensaladas/ensaladillas intentada.");
      } catch (saladError) {
           // Loguear pero no detener el flujo principal por esto
           console.error(`Error no crítico al llamar a updateSaladCounters para pedido ${pedidoId}:`, saladError);
      }

      // --- PASO 7: Limpiar Estado y Navegar (Éxito Total) ---
      console.log(`%c---- ÉXITO TOTAL Pedido ID: ${pedidoId} ---- Limpiando estado y navegando...`, 'color: green; font-weight: bold; font-size: 1.1em;');
      setCart([]); // Limpiar carrito
      setDatosCliente({ // Resetear datos del cliente
        cliente: "", telefono: "", fechahora: "", observaciones: "",
        pagado: false, celiaco: false, localidad: "",
      });
      navigate("/ordenes"); // Navegar a la lista de órdenes

    } catch (error) {
      // --- Captura de Errores Generales (Validación, Cliente, Guardado Firestore) ---
      console.error("Error general durante el proceso de sendToFirestore:", error);
      // Mostrar error en el modal de errores si no hay otro modal ya activo
      if (!showModal && !showModal2) {
          setMensajeModal(`Error al procesar el pedido: ${error.message}. Revisa los datos e inténtalo de nuevo.`);
          setShowModal2(true);
      } else {
           console.error("Error general ocurrió mientras un modal estaba activo o justo después.");
           // Podríamos intentar cerrar modales existentes y mostrar el nuevo error
           if (showModal) handleCloseModal();
           if (!showModal2) { // Solo mostrar si no hay ya un modal de error
                setMensajeModal(`Error al procesar el pedido: ${error.message}. Revisa los datos e inténtalo de nuevo.`);
                setShowModal2(true);
           }
      }
       // No navegar, permitir al usuario corregir

    } finally {
      // --- Bloque Finally: Asegurar que isSubmitting se resetee ---
      // Solo resetear si no hay un modal activo esperando acción del usuario
      if (!showModal && !showModal2) {
         console.log("Finally: No hay modales activos, liberando isSubmitting.");
         setIsSubmitting(false);
      } else {
          console.log("Finally: Modal activo detectado, isSubmitting permanecerá bloqueado hasta que el modal se cierre.");
          // El cierre del modal (handleCloseModal/handleCloseModal2) se encargará de poner setIsSubmitting(false)
      }
      console.log("--- Ejecución de sendToFirestore finalizada ---");
    }
  }; // --- Fin de sendToFirestore ---


  // --- Renderizado del Componente ---
  // (JSX sin cambios, respetando estilos originales)
  return cart.length > 0 ? (
    <>
      {/* Sección del Total */}
      <div className="flex justify-end p-[0.5vw]">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center text-2xl font-extrabold xtext-gray-600 hover:underline dark:text-gray-400" // Manteniendo clase original (con typo xtext-gray-600)
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
            orderToEdit ? 'bg-gray-600' : 'bg-[#f2ac02] hover:bg-yellow-600' // Manteniendo estilos originales
            } text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`} // Manteniendo estilos originales
        >
          {/* SVG sin cambios */}
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
      {/* Modal 2: Errores o Información Bloqueante (Sin cambios en estructura/estilo) */}
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
         {/* Usar whitespace-pre-line para respetar saltos de línea en mensajes de error */}
         <p className="font-nunito text-lg p-2 text-center text-gray-700 whitespace-pre-line">{mensajeModal}</p>
         </Modal.Body>
        <Modal.Footer className='no-border'> {/* Manteniendo clase original */}
          <Button variant="primary" className="mt-1 bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 py-2 px-5 font-nunito text-white rounded-md shadow-sm" onClick={() => { handleCloseModal2(); setIsSubmitting(false); }}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 1: Confirmación (ej. continuar sin pollo / sin hora) (Sin cambios en estructura/estilo) */}
      <Modal show={showModal} onHide={() => { handleCloseModal(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center p-4">
          <div className='p-2'>
             {/* Manteniendo color original */}
             <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>
             </svg>
         </div>
          {/* Usar whitespace-pre-line para respetar saltos de línea en mensajes de advertencia */}
          <p className="font-nunito text-lg p-2 text-center text-gray-700 whitespace-pre-line">{mensajeModal}</p>
        </Modal.Body>
        <Modal.Footer className="border-t-0 flex justify-around p-4"> {/* Manteniendo clase original */}
          {/* Botón Cancelar */}
          <Button variant="secondary" className="py-2 px-5 bg-white font-nunito text-red-500 border-red-500 hover:text-red-600 hover:border-red-600 shadow-sm" onClick={() => { handleCloseModal(); setIsSubmitting(false); }} disabled={isSubmitting}> {/* Manteniendo clase original */}
            Cancelar
          </Button>
          {/* Botón Continuar */}
          <Button
             variant="primary"
             onClick={async () => {
                 // No cerrar modal aquí, sendToFirestore lo hará si tiene éxito o falla
                 // handleCloseModal(); // <- Comentado
                 await sendToFirestore({ confirmado: true });
                 // setIsSubmitting se maneja dentro de sendToFirestore y sus modales/finally
             }}
             disabled={isSubmitting} // Deshabilitar mientras procesa
             className={`py-2 px-5 font-nunito text-white rounded-md shadow-sm transition-colors duration-200 ${
                 isSubmitting
                 ? 'bg-gray-400 border-gray-400 cursor-not-allowed' // Estilo deshabilitado genérico
                 : 'bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600' // Estilo original
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
}; // --- Fin del componente CartTotal ---

export default CartTotal;
