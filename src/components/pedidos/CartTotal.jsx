import React, { useState, useContext } from "react"; // Import React
import { dataContext } from "../Context/DataContext"; // Asegúrate que la ruta sea correcta
import { doc, getDoc, updateDoc, setDoc, runTransaction, FieldValue, increment } from "firebase/firestore"; // *** IMPORTAR increment ***
import { db } from "../firebase/firebase"; // Asegúrate que la ruta sea correcta
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
// Importar plugins de dayjs si los usas para zona horaria, etc.
// import utc from 'dayjs/plugin/utc';
// import timezone from 'dayjs/plugin/timezone';
import { Modal, Button } from "react-bootstrap"; // Asumiendo que usas react-bootstrap
import customParseFormat from "dayjs/plugin/customParseFormat";

// Extender dayjs con los plugins necesarios
dayjs.extend(customParseFormat);
// dayjs.extend(utc);
// dayjs.extend(timezone);
// dayjs.tz.setDefault("Europe/Madrid"); // Establecer zona horaria por defecto si es necesario

// --- Error Personalizado para Límites Excedidos ---
class LimitExceededError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "LimitExceededError";
    this.details = details; // Opcional: para pasar más info si es necesario
  }
}

// --- Helper Function: Convert HH:mm to minutes ---
const convertTimeToMinutes = (timeStr) => {
  try {
      // Validación básica del formato HH:MM
      if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
          console.warn("Formato de tiempo inválido proporcionado a convertTimeToMinutes:", timeStr);
          return -1; // Indicar error
      }
      const parts = timeStr.split(":");
      if (parts.length !== 2) {
          console.warn("Formato de tiempo inválido (no HH:MM):", timeStr);
          return -1;
      }
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      // Validar que sean números y estén en rangos válidos
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
           console.warn("Valores de hora/minuto inválidos en:", timeStr);
           return -1;
      }
      return hours * 60 + minutes; // Calcular minutos desde medianoche
  } catch (e) {
      // Capturar cualquier error inesperado durante la conversión
      console.error("Error inesperado en convertTimeToMinutes para:", timeStr, e);
      return -1;
  }
};


// --- Función para Actualizar Contadores de Ensaladas/Ensaladillas ---
const updateSaladCounters = async (cartItems) => {
    const todayId = dayjs().format("DD-MM-YYYY"); // Documento ID es la fecha actual
    const docRef = doc(db, "ensaladas", todayId);
    console.log(`Preparando actualización de contadores de ensaladas para ${todayId}...`);
  
    let incrementEnsaladaGrande = 0;
    let incrementEnsaladaPequena = 0;
    let incrementEnsaladillaGrande = 0;
    let incrementEnsaladillaPequena = 0;

    // Calcular incrementos basados en el carrito
    cartItems.forEach(item => {
        if (!item || !item.name || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
            console.warn("Item inválido o sin cantidad en updateSaladCounters, omitiendo:", item);
            return; // Saltar item inválido
        }

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


  //si no le pasamos hora es la hora mas 15 rendondeada
  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');
        const nameLower = item.name.toLowerCase();
        const cantidad = item.cantidad;
        const isPequena = nameLower.includes("1/2"); // Determinar tamaño

        // IMPORTANTE: Asume que los nombres distinguen claramente ensaladas de ensaladillas.
        // Si hay ambigüedad (ej. "Ensalada de Ensaladilla"), ajusta esta lógica o usa categorías/IDs.
        if (nameLower.includes("ensaladilla")) {
            if (isPequena) {
                incrementEnsaladillaPequena += cantidad;
            } else {
                incrementEnsaladillaGrande += cantidad;
            }
        } else if (nameLower.includes("ensalada")) { // `else if` para evitar contar dos veces si nombre incluye ambas
             if (isPequena) {
                incrementEnsaladaPequena += cantidad;
            } else {
                incrementEnsaladaGrande += cantidad;
            }
        }
    });

    // Si no hay ensaladas/saladillas en este pedido, no hacer nada
    if (incrementEnsaladaGrande === 0 && incrementEnsaladaPequena === 0 && incrementEnsaladillaGrande === 0 && incrementEnsaladillaPequena === 0) {
        console.log("No se encontraron ensaladas/saladillas en el pedido. Omitiendo actualización de contadores.");
        return;
    }

    console.log("Incrementos calculados:", {
        ensaladaG: incrementEnsaladaGrande, ensaladaP: incrementEnsaladaPequena,
        ensaladillaG: incrementEnsaladillaGrande, ensaladillaP: incrementEnsaladillaPequena
    });

    // Usar transacción para actualizar/crear el documento diario
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);

            if (!docSnap.exists()) {
                // --- Documento NO existe: Crear con estructura inicial + incrementos ---
                console.log(`Documento ${todayId} no existe en 'ensaladas'. Creando...`);
                const initialData = {
                    ensaladas: {
                        grandes: { pedidas: incrementEnsaladaGrande, preparadas: 0 }, // Iniciar preparadas en 0
                        pequenas: { pedidas: incrementEnsaladaPequena, preparadas: 0 }
                    },
                    ensaladillas: {
                        grandes: { pedidas: incrementEnsaladillaGrande, preparadas: 0 },
                        pequenas: { pedidas: incrementEnsaladillaPequena, preparadas: 0 }
                    },
                    // Opcional: añadir timestamp de creación
                    // createdAt: serverTimestamp() // Necesitarías importar serverTimestamp
                };
                transaction.set(docRef, initialData);
                console.log(`Documento ${todayId} creado con valores iniciales.`);

            } else {
                // --- Documento SÍ existe: Actualizar contadores 'pedidas' usando increment ---
                console.log(`Documento ${todayId} existe. Actualizando contadores...`);
                const updateData = {};
                // Usar notación de puntos y FieldValue.increment para actualizaciones atómicas
                if (incrementEnsaladaGrande > 0) updateData['ensaladas.grandes.pedidas'] = increment(incrementEnsaladaGrande);
                if (incrementEnsaladaPequena > 0) updateData['ensaladas.pequenas.pedidas'] = increment(incrementEnsaladaPequena);
                if (incrementEnsaladillaGrande > 0) updateData['ensaladillas.grandes.pedidas'] = increment(incrementEnsaladillaGrande);
                if (incrementEnsaladillaPequena > 0) updateData['ensaladillas.pequenas.pedidas'] = increment(incrementEnsaladillaPequena);

                // Opcional: añadir timestamp de última actualización
                // updateData['lastUpdatedAt'] = serverTimestamp();

                if (Object.keys(updateData).length > 0) {
                    transaction.update(docRef, updateData);
                    console.log(`Contadores 'pedidas' en ${todayId} actualizados.`);
                } else {
                    console.log("No se realizaron actualizaciones (incrementos eran 0 después del cálculo inicial)."); // Caso improbable si ya se filtró antes
                }
            }
        });
        console.log(`Transacción de contadores de ensaladas para ${todayId} completada con éxito.`);

    } catch (error) {
        // Capturar y loguear errores de la transacción específica de ensaladas
        console.error(`Error Crítico durante la transacción de contadores de ensaladas (${todayId}):`, error);
        // Considera si este error debe detener el flujo o solo ser logueado.
        // Por ahora, solo se loguea para no interrumpir el flujo principal si el pedido ya se guardó.
        // Podrías lanzar el error si esta actualización es absolutamente crítica: throw error;
    }
};


// --- Componente Principal ---
const CartTotal = ({ datosCliente, setDatosCliente, orderToEdit }) => {
  // --- Contexto y Navegación ---
  const { cart, setCart } = useContext(dataContext);
  const navigate = useNavigate();

  // --- Estados del Componente ---
  const [mensajeModal, setMensajeModal] = useState(""); // Mensaje para modales genéricos
  const [showModal, setShowModal] = useState(false); // Visibilidad Modal Confirmación Sin Pollo
  const [showModal2, setShowModal2] = useState(false); // Visibilidad Modal Error/Aviso Genérico
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado de procesamiento
  const [showLimitModal, setShowLimitModal] = useState(false); // Visibilidad Modal Límite Excedido
  const [limitWarning, setLimitWarning] = useState(""); // Mensaje específico para Modal Límite Excedido

  // --- Handlers para cerrar Modales ---
  const handleCloseModal = () => setShowModal(false);
  const handleCloseModal2 = () => setShowModal2(false);
  const handleCloseLimitModal = () => setShowLimitModal(false);

  // --- Calcular Total del Carrito ---
  const total = cart.reduce(
    // Suma segura, tratando valores nulos o inválidos como 0
    (acc, item) => acc + ((item?.price || 0) * (item?.cantidad || 1)),
    0
  );

  // --- Obtener Hora Redondeada por Defecto ---
  const obtenerHoraRedondeada = () => {
    const now = dayjs(); // Considera usar dayjs.tz() si configuraste zona horaria
    const minutos = now.minute();
    // Redondear hacia abajo al último 1/4 hora y sumar 15 minutos para asegurar que sea futuro o actual bloque
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    let nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    // Si la hora resultante es estrictamente anterior a la actual, añade 15 min
    if (nuevaHora.isBefore(now)) {
         nuevaHora = nuevaHora.add(15, 'minute');
    }
    // Caso especial: Si redondea a :00 y ya pasó, debe ir a :15
    // Esto se maneja ahora con la comprobación isBefore

    // Asegurarse que la hora final no sea en el pasado inmediato
    const diffMinutes = nuevaHora.diff(now, 'minute');
     // Permitir un pequeño margen (ej. 2 minutos) para horas muy cercanas al cálculo
    if (diffMinutes < -2) {
        console.warn("Hora redondeada calculada está en el pasado, ajustando al siguiente bloque.");
        nuevaHora = nuevaHora.add(15, 'minute');
    }

    return nuevaHora;
  };
  // Determina la hora final del pedido: usa la del cliente si existe, si no, calcula la redondeada.
  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format("DD/MM/YYYY HH:mm");

  // --- Obtener Siguiente ID de Pedido (transaccional) ---
   const getNextId = async () => {
     const contadorRef = doc(db, "contadorPedidos", "pedidoId"); // Referencia al documento contador
     try {
         // Usar transacción para garantizar lectura y escritura atómicas del contador
         const nextId = await runTransaction(db, async (transaction) => {
             const docSnap = await transaction.get(contadorRef); // Leer contador DENTRO de transacción
             if (!docSnap.exists()) { // Si no existe, inicializar
                 transaction.set(contadorRef, { id: 1 });
                 console.log("Contador de pedidos inicializado en 1.");
                 return 1;
             }
             // Si existe, incrementar y actualizar
             const newId = docSnap.data().id + 1;
             transaction.update(contadorRef, { id: newId });
             return newId;
         });
         console.log("Siguiente ID de pedido obtenido:", nextId);
         return nextId;
     } catch (error) {
         // Capturar y loguear errores durante la obtención del ID
         console.error("Error Crítico al obtener el siguiente ID de pedido:", error);
         // Es crucial detener el proceso si no se puede obtener un ID fiable
         throw new Error("No se pudo generar el ID del pedido. Revisa la conexión o configuración.");
     }
   };

  // --- Sanitizar Datos del Cliente ---
  // Asegura que los campos del objeto datosCliente existan y tengan valores por defecto si son nulos/undefined.
  const sanitizeClientData = (data) => ({
    cliente: data.cliente || "",
    telefono: data.telefono || "",
    fechahora: data.fechahora || "", // La hora final se determina en 'fechahora'
    observaciones: data.observaciones || "",
    pagado: data.pagado || false, // Default a no pagado
    celiaco: data.celiaco || false, // Default a no celiaco
    localidad: data.localidad || "",
  });

  // --- Función de Actualizar Stock (Robusta y Transaccional) ---
   const updateStock = async (productId, cantidadVendida) => {
     // Validación temprana de parámetros
     // Permitir ID de producto como string o número, pero convertir a string para la referencia
     const productIdStr = productId?.toString();
     if (!productIdStr) {
         console.error("ID de producto inválido detectado en updateStock:", productId);
         throw new Error(`Intento de actualizar stock con ID inválido: ${productId}`);
     }

     if (cantidadVendida <= 0) {
         console.warn(`Intento de actualizar stock para ID ${productIdStr} con cantidad no positiva: ${cantidadVendida}. No se hará nada.`);
         return; // No continuar si la cantidad no es positiva
     }

     const productRef = doc(db, "productos", productIdStr); // Usar ID como string

     try {
       // Usar transacción para garantizar la atomicidad de la lectura y escritura del stock
       await runTransaction(db, async (transaction) => {
           // Leer el estado actual del producto DENTRO de la transacción
           const productSnap = await transaction.get(productRef);
           if (!productSnap.exists()) {
               // Error grave si el producto no se encuentra durante la transacción
               console.error(`Error Crítico: Producto con ID ${productIdStr} no encontrado en Firestore al intentar actualizar stock.`);
               throw new Error(`Producto con ID ${productIdStr} no encontrado para actualizar stock.`);
           }
           const productData = productSnap.data();
           const currentStock = productData.stock; // Stock actual

            // Validar que el stock sea un número
            if (typeof currentStock !== 'number' || isNaN(currentStock)) {
                 console.error(`Error Crítico: El stock para el producto ID ${productIdStr} no es un número válido (${currentStock}).`);
                 throw new Error(`Stock inválido para el producto ${productData.name || 'ID ' + productIdStr}.`);
            }

           // Validar si hay suficiente stock DENTRO de la transacción
           if (currentStock < cantidadVendida) {
                console.warn(`Stock insuficiente detectado en transacción para ${productData.name || 'ID ' + productIdStr}. Necesario: ${cantidadVendida}, Disponible: ${currentStock}`);
                // Lanzar error para abortar la transacción y el proceso
                throw new Error(`Stock insuficiente para ${productData.name || 'ID ' + productIdStr}. Solo quedan ${currentStock}.`);
           }

           // Calcular y actualizar el nuevo stock
           const newStock = currentStock - cantidadVendida;
           console.log(`Stock OK. Actualizando ${productIdStr}: ${currentStock} -> ${newStock}`);
           transaction.update(productRef, { stock: newStock }); // Escribir el nuevo stock
       });
       // Si la transacción se completa con éxito
        console.log(`Stock actualizado correctamente via transacción para ID: ${productIdStr}, cantidad deducida: ${cantidadVendida}`);
     } catch (error) {
       // Capturar y loguear errores de la transacción
       console.error(`Error durante la transacción de actualización de stock para ID ${productIdStr}:`, error);
       // Re-lanzar el error para que la función llamante (sendToFirestore) lo maneje
       throw error;
     }
   };

  // --- Validación Básica del Pedido (Cliente, Pollo, Stock Preliminar) ---
   const validateOrder = async (currentCart) => {
     console.log("Iniciando validación básica del pedido...");
     // 1. Validar datos del cliente
     const clienteData = sanitizeClientData(datosCliente);
     if (!clienteData.telefono) {
       console.warn("Validación fallida: Teléfono del cliente es obligatorio.");
       setMensajeModal("El teléfono del cliente es obligatorio.");
       setShowModal2(true); return false;
     }
     console.log("Datos cliente OK (teléfono presente).");

     // 2. Validar si incluye pollo (muestra advertencia/confirmación)
     const incluyePollo = currentCart.some(item => item && (item.id_product === 1 || item.id_product === 2));
     if (!incluyePollo) {
       console.warn("Validación: Pedido no incluye pollo. Mostrando confirmación.");
       setMensajeModal("Comprueba... tu pedido no incluye pollo.");
       setShowModal(true); // Mostrar modal para que el usuario confirme
       return false; // Esperar confirmación
     }
     console.log("Validación OK (incluye pollo).");

     // 3. Validación rápida (no transaccional) de stock para items clave (opcional pero útil)
     console.log("Iniciando validación preliminar de stock...");
     try {
        // Define los IDs de los productos cuyo stock quieres verificar aquí
        const idsConStockCritico = [1, 41, 50]; // Ejemplo: Pollo entero, Costilla entera, Codillo

        for (const idToCheck of idsConStockCritico) {
             // Obtener referencia del producto (convertir ID a string)
             const productRef = doc(db, "productos", idToCheck.toString());

             // Calcular la cantidad total necesaria para este ID de stock, considerando items relacionados
             let cantidadNecesaria = 0;
             if (idToCheck === 1) { // Stock de pollos (ID 1) afectado por ID 1 y ID 2
                 cantidadNecesaria = currentCart.reduce((sum, i) => {
                    if (i?.id_product === 1) return sum + (i.cantidad || 0);
                    if (i?.id_product === 2) return sum + (i.cantidad || 0) / 2; // Medio pollo = 0.5 stock
                    return sum;
                 }, 0);
             } else if (idToCheck === 41) { // Stock de costillas (ID 41) afectado por ID 41 y ID 48
                 cantidadNecesaria = currentCart.reduce((sum, i) => {
                    if (i?.id_product === 41) return sum + (i.cantidad || 0);
                    if (i?.id_product === 48) return sum + (i.cantidad || 0) / 2; // Media costilla = 0.5 stock
                    return sum;
                 }, 0);
             } else { // Otros IDs con stock propio (ej. ID 50)
                 cantidadNecesaria = currentCart.reduce((sum, i) => {
                    if (i?.id_product === idToCheck) return sum + (i.cantidad || 0);
                    return sum;
                 }, 0);
             }

            // Si se necesita este item, verificar su stock
            if (cantidadNecesaria > 0) {
                const productSnap = await getDoc(productRef); // Lectura no transaccional

                if (productSnap.exists()) {
                    const productData = productSnap.data();
                    const currentStock = productData.stock;
                    // Validar stock leído
                    if (typeof currentStock !== 'number' || isNaN(currentStock)){
                         console.warn(`Stock inválido encontrado para ID ${idToCheck} en validación preliminar.`);
                         // Podrías lanzar error o continuar, dependiendo de la criticidad
                         continue; // Saltar a la siguiente verificación
                    }

                    if (currentStock < cantidadNecesaria) {
                        // Si el stock preliminar no es suficiente, fallar validación
                        console.warn(`Validación preliminar fallida: Stock insuficiente para ID ${idToCheck}. Necesario: ${cantidadNecesaria}, Disponible: ~${currentStock}`);
                        setMensajeModal(`Stock preliminar insuficiente para ${productData.name || 'ID ' + idToCheck}. Necesitas ${cantidadNecesaria.toFixed(1)}, disponibles ~${currentStock}.`);
                        setShowModal2(true);
                        return false;
                    } else {
                         console.log(`Validación preliminar stock OK para ID ${idToCheck}. Necesario: ${cantidadNecesaria.toFixed(1)}, Disponible: ~${currentStock}`);
                    }
                } else {
                     // Si el producto no existe en la BD, fallar validación
                     console.error(`Validación fallida: Producto con ID ${idToCheck} no encontrado.`);
                     setMensajeModal(`Producto (ID: ${idToCheck}) no encontrado para validar stock.`);
                     setShowModal2(true);
                     return false;
                }
            }
        }
        console.log("Validación preliminar de stock OK.");
     } catch (error) {
         // Capturar errores durante la lectura de stock preliminar
         console.error("Error durante validación preliminar de stock:", error);
         setMensajeModal(`Error al verificar stock preliminar: ${error.message}`);
         setShowModal2(true);
         return false;
     }

     // Si todas las validaciones básicas (cliente, pollo, stock preliminar) pasan
     console.log("Validación básica del pedido completada con éxito.");
     return true;
   };

  // --- Función Auxiliar para Validar Disponibilidad de Calendario ---
  const validateCalendarAvailability = async (productType, fechahora, cantidad) => {
    // Log inicial y validación de cantidad
    console.log(`Validando calendario para ${productType} a las ${fechahora} (Cantidad: ${cantidad})`);
    if (cantidad <= 0) { console.log("Cantidad 0, validación de calendario omitida."); return; }

    // Validar y parsear fecha/hora
    const orderDate = dayjs(fechahora, "DD/MM/YYYY HH:mm", true); // Parseo estricto
    if (!orderDate.isValid()) {
      console.error("Formato de fecha/hora inválido en validación calendario:", fechahora);
      throw new Error("Formato de fecha/hora inválido para validación de calendario: " + fechahora);
    }

    // Determinar colección y nombre del producto
    const dailyDocId = orderDate.format("YYYY-MM-DD"); // Cambiado a formato estándar ISO para ID
    let collectionName = "", productName = "";
    switch (productType) {
        case 'pollo': collectionName = "chicken_calendar_daily"; productName = "Pollos"; break;
        case 'costilla': collectionName = "costilla_calendar_daily"; productName = "Costillas"; break;
        case 'codillo': collectionName = "codillo_calendar_daily"; productName = "Codillos"; break;
        default: throw new Error(`Tipo de producto desconocido para validar calendario: ${productType}`);
    }
    const docRef = doc(db, collectionName, dailyDocId); // Referencia al documento diario

    try {
        // Leer el documento (lectura no transaccional para validación)
        console.log(`Leyendo documento: ${collectionName}/${dailyDocId}`);
        const docSnap = await getDoc(docRef);

        // Validar existencia del documento y estructura de intervalos
        if (!docSnap.exists()) { throw new Error(`Calendario diario (${dailyDocId}) para ${productName} no existe.`); }
        const data = docSnap.data();
        const intervals = data.intervals;
        if (!Array.isArray(intervals) || intervals.length === 0) { throw new Error(`No hay intervalos definidos para ${productName} el ${dailyDocId}.`); }

        // Encontrar el intervalo correspondiente a la hora del pedido
        const requestedMinutes = orderDate.hour() * 60 + orderDate.minute();
        let foundIntervalIndex = -1;
         for (let i = 0; i < intervals.length; i++) {
              const interval = intervals[i];
              if (!interval?.start || !interval?.end) continue; // Saltar si el intervalo no tiene start/end
              const startMin = convertTimeToMinutes(interval.start);
              const endMin = convertTimeToMinutes(interval.end);
              // Incluye startMin, excluye endMin
              if (startMin !== -1 && endMin !== -1 && requestedMinutes >= startMin && requestedMinutes < endMin) {
                  foundIntervalIndex = i;
                  break;
               }
         }
        if (foundIntervalIndex === -1) { throw new Error(`Hora ${orderDate.format("HH:mm")} fuera de horario para ${productName}.`); }

        // --- Validación de Límite ---
        const intervalIndex = foundIntervalIndex;
        const current = intervals[intervalIndex].orderedCount || 0;
        const max = intervals[intervalIndex].maxAllowed;
        const intervalLabel = `${intervals[intervalIndex].start}-${intervals[intervalIndex].end}`;

        // Validar que 'max' sea un número
        if (typeof max !== 'number' || isNaN(max)) { throw new Error(`Límite (maxAllowed) mal configurado para ${productName} en ${intervalLabel}.`); }

        // Comprobar si se excede el límite y lanzar error específico si es así
        if (current + cantidad > max) {
            console.warn(`Límite excedido para ${productName} en ${intervalLabel}: ${current} + ${cantidad} > ${max}`);
            throw new LimitExceededError(
                `El límite de ${productName} (${max}) en ${intervalLabel} se excedería (Actual: ${current}, Pedido: ${cantidad.toFixed(1)}).`,
                { productType, interval: intervalLabel, current, pedido: cantidad, max }
            );
        }

        // Si pasa todas las validaciones
        console.log(`Validación de calendario OK para ${productType} en ${intervalLabel}.`);

    } catch (error) {
        // Loguear errores que no sean de límite excedido
        if (!(error instanceof LimitExceededError)) {
            console.error(`Error inesperado durante validación de calendario ${productName} (${fechahora}):`, error);
        }
        // Re-lanzar siempre el error
        throw error;
    }
  }

// --- Función Base para ACTUALIZAR Calendario (MODIFICADA para override UNIVERSAL) ---
  const updateCalendarBase = async (collectionName, productName, fechahora, cantidad, ignoreLimit = false) => {
    // Omitir si la cantidad es cero o negativa
    if (cantidad <= 0) {
        console.log(`Actualización de calendario ${productName} omitida (cantidad <= 0)`);
        return;
    }

    // Validar fecha/hora
    const orderDate = dayjs(fechahora, "DD/MM/YYYY HH:mm", true); // Parseo estricto
    if (!orderDate.isValid()) {
        console.error(`Fecha/hora inválida (${fechahora}) al intentar actualizar calendario ${productName}`);
        throw new Error(`Fecha/hora inválida al actualizar calendario ${productName}`);
    }

    // Referencia al documento diario (usar YYYY-MM-DD)
    const dailyDocId = orderDate.format("YYYY-MM-DD");
    const docRef = doc(db, collectionName, dailyDocId);

    try {
        // Ejecutar dentro de una transacción Firestore para atomicidad
        await runTransaction(db, async (transaction) => {
            // Leer estado actual DENTRO de la transacción
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists()) {
                 console.error(`Error Crítico: Documento diario ${dailyDocId} ${productName} no existe DENTRO de la transacción.`);
                 throw new Error(`Documento diario ${dailyDocId} ${productName} no existe (en update).`);
            }

            // Validar estructura de datos leída
            const data = docSnap.data();
            let intervals = data.intervals; // Hacer una copia modificable si es necesario (no en este caso)
            if (!Array.isArray(intervals)) {
                console.error(`Error Crítico: 'intervals' no es un array en ${collectionName}/${dailyDocId}.`);
                throw new Error(`Estructura de calendario inválida para ${productName} el ${dailyDocId}.`);
            }

            // Encontrar intervalo correspondiente a la hora del pedido
            const requestedMinutes = orderDate.hour() * 60 + orderDate.minute();
            let foundIntervalIndex = -1;
             for (let i = 0; i < intervals.length; i++) { // Búsqueda de intervalo
                 const interval = intervals[i];
                 if (!interval?.start || !interval?.end) continue; // Saltar intervalo inválido
                 const startMin = convertTimeToMinutes(interval.start);
                 const endMin = convertTimeToMinutes(interval.end);
                 if (startMin !== -1 && endMin !== -1 && requestedMinutes >= startMin && requestedMinutes < endMin) {
                     foundIntervalIndex = i;
                     break; // Intervalo encontrado
                 }
             }
            // Validar si se encontró el intervalo
            if (foundIntervalIndex === -1) {
                 console.error(`Error Crítico: Intervalo no encontrado para ${productName} (${orderDate.format("HH:mm")}) DENTRO de la transacción.`);
                 throw new Error(`Intervalo no encontrado para ${productName} (en update).`);
            }

            // Obtener datos del intervalo encontrado
            const intervalIndex = foundIntervalIndex;
            const current = intervals[intervalIndex].orderedCount || 0; // Conteo actual
            const max = intervals[intervalIndex].maxAllowed; // Límite configurado
            const intervalLabel = `${intervals[intervalIndex].start}-${intervals[intervalIndex].end}`; // Para logs

            // Validar que 'max' sea un número válido (dentro de la transacción)
            if (typeof max !== 'number' || isNaN(max)) {
                throw new Error(`Límite (maxAllowed) mal configurado para ${productName} en ${intervalLabel} (update).`);
            }

            // --- Lógica Central de Actualización SIMPLIFICADA ---
            const finalOrderedCount = current + cantidad; // Calcular siempre el conteo final

            if (finalOrderedCount > max) { // Si se supera el límite...
                if (ignoreLimit) { // ...y se pidió ignorar...
                    // *** SIEMPRE actualizar, para TODOS los productos, superando el límite ***
                    console.warn(`%cOVERRIDE UNIVERSAL: Límite de ${productName} (${max}) excedido en ${intervalLabel}, pero se ignoró. Incrementando contador a ${finalOrderedCount}.`, 'color: red; font-weight:bold;');
                    // Actualizar directamente el array de intervalos (Firestore maneja la actualización del campo)
                    intervals[intervalIndex].orderedCount = finalOrderedCount; // Establecer el nuevo conteo
                    transaction.update(docRef, { intervals: intervals }); // Guardar el array modificado
                } else {
                    // Si se supera y NO se ignora (Salvaguarda - no debería ocurrir si validación OK)
                    console.error(`Salvaguarda Transacción: Límite de ${productName} (${max}) excedido en ${intervalLabel} y NO se indicó ignorar.`);
                    throw new Error(`Límite de ${productName} (${max}) ya alcanzado o excedido (update).`);
                }
            } else {
                // Si NO se supera el límite, actualizar normalmente
                console.log(`Actualizando contador para ${productName} - Intervalo ${intervalLabel}: ${current} -> ${finalOrderedCount}`);
                // Actualizar directamente el array de intervalos
                intervals[intervalIndex].orderedCount = finalOrderedCount; // Establecer nuevo conteo
                transaction.update(docRef, { intervals: intervals }); // Guardar el array modificado
            }

        }); // Fin de runTransaction

        // Log de éxito de la transacción (si no hubo errores)
        console.log(`${productName} calendar transaction completed successfully.`);

    } catch (error) {
        // Capturar y loguear errores de la transacción
        console.error(`Error durante la transacción de update ${productName} calendar:`, error);
        // Re-lanzar para que sendToFirestore lo maneje
        throw error;
    }
};

// Las funciones específicas no cambian, siguen usando la base:
const updateChickenCalendarPollo = (fechahora, cantidad, ignoreLimit = false) => updateCalendarBase("chicken_calendar_daily", "Pollo", fechahora, cantidad, ignoreLimit);
const updateCostillaCalendar = (fechahora, cantidad, ignoreLimit = false) => updateCalendarBase("costilla_calendar_daily", "Costilla", fechahora, cantidad, ignoreLimit);
const updateCodilloCalendar = (fechahora, cantidad, ignoreLimit = false) => updateCalendarBase("codillo_calendar_daily", "Codillo", fechahora, cantidad, ignoreLimit);


  // --- Función Principal para Enviar/Actualizar Pedido ---
  const sendToFirestore = async ({ confirmado, ignoreCalendarLimits = false }) => {
    // Log inicial detallado
    console.log(`%c--- Iniciando sendToFirestore ---
    Confirmado (sin pollo): ${confirmado}
    Ignorar Límites Calendario: ${ignoreCalendarLimits}
    Editando Pedido: ${orderToEdit ? orderToEdit.NumeroPedido : 'No'}
    Estado Submitting Actual: ${isSubmitting}`, 'color: blue; font-weight: bold;');
    // Prevenir doble submit (más robusto)
    if (isSubmitting) {
        console.warn("Submit bloqueado: ya hay un proceso en curso (isSubmitting=true).");
        return;
    }
    setIsSubmitting(true); // Marcar inicio de proceso

    // Copia inmutable del carrito para esta ejecución
    const currentCart = [...cart];

    // Validar carrito vacío
    if (!currentCart || currentCart.length === 0) {
        console.warn("Envío cancelado: Carrito vacío.");
        setMensajeModal("El carrito está vacío."); setShowModal2(true); setIsSubmitting(false); return;
    }

    // Obtener ID del pedido si se está editando
    let pedidoId = orderToEdit ? orderToEdit.NumeroPedido : null;

    try {
      // --- PASO 1: Validación Inicial (Cliente, Pollo, Stock Preliminar) ---
      // Solo si no es una re-llamada confirmada (por pollo o límite)
      if (!confirmado && !ignoreCalendarLimits) {
        console.log("Ejecutando validación básica...");
        const isValidBasic = await validateOrder(currentCart); // Ejecutar validaciones
        if (!isValidBasic) {
          console.log("Validación básica fallida o esperando confirmación del usuario.");
          // Si se mostró un modal (showModal=true), isSubmitting queda true esperando al usuario.
          // Si no, liberar isSubmitting aquí.
          if (!showModal) { setIsSubmitting(false); }
          return; // Detener el flujo
        }
        console.log("Validación básica OK.");
      } else {
          console.log("Saltando validación básica (confirmado o ignorando límites).");
      }

      // Obtener datos del cliente y hora final del pedido
      const clienteData = sanitizeClientData(datosCliente);
      const horaPedido = clienteData.fechahora || fechahora; // Usar hora del cliente o la calculada

      // Validar formato final de horaPedido ANTES de usarla
      if (!dayjs(horaPedido, "DD/MM/YYYY HH:mm", true).isValid()) {
           console.error("Error Crítico: El formato final de horaPedido es inválido:", horaPedido);
           throw new Error(`El formato de la fecha/hora final del pedido es inválido: ${horaPedido}`);
      }
       console.log("Hora final del pedido:", horaPedido);


      // --- PASO 2: Validación de Límites de Calendario ---
      // Solo si no se ha indicado ignorar los límites explícitamente
      if (!ignoreCalendarLimits) {
          console.log("Iniciando validación de límites de calendario...");
          try {
             // Calcular cantidades totales para cada tipo de calendario
             // Pollo (ID 1 y 2 = 1 unidad c/u)
             let cantidadPolloTotalCal = currentCart.reduce((sum, item) => { if (item && (item.id_product === 1 || item.id_product === 2)) return sum + (item.cantidad || 0); return sum; }, 0);
             // Costilla (ID 41=1, ID 48=0.5)
             let cantidadCostillaTotalCal = currentCart.reduce((sum, item) => { if (item && (item.id_product === 41 || item.id_product === 48)) return sum + (item.id_product === 41 ? (item.cantidad || 0) : (item.cantidad || 0) / 2); return sum; }, 0);
             // Codillo (Nombre o ID 50 = 1 unidad)
             let cantidadCodilloCal = currentCart.reduce((sum, item) => { if (item && (item.name?.toLowerCase().includes("codillo") || item.id_product === 50)) return sum + (item.cantidad || 0); return sum; }, 0);

             // Ejecutar validaciones solo si la cantidad es > 0
             if (cantidadPolloTotalCal > 0) await validateCalendarAvailability('pollo', horaPedido, cantidadPolloTotalCal);
             if (cantidadCostillaTotalCal > 0) await validateCalendarAvailability('costilla', horaPedido, cantidadCostillaTotalCal);
             if (cantidadCodilloCal > 0) await validateCalendarAvailability('codillo', horaPedido, cantidadCodilloCal);

            console.log("Validación de calendarios completada (sin exceder límites o errores).");

          } catch (validationError) {
            // --- Manejo Específico de Errores de Validación ---
            if (validationError instanceof LimitExceededError) {
              // Mostrar modal de confirmación para ignorar límite
              console.warn("Límite de calendario excedido detectado:", validationError.message);
              setLimitWarning(validationError.message + " ¿Deseas continuar igualmente?");
              setShowLimitModal(true); // Mostrar modal específico
              setIsSubmitting(false); // Liberar para interacción del usuario
              return; // Esperar decisión
            } else {
              // Otro error durante la validación (doc no existe, hora fuera rango, etc.)
              console.error("Error durante validación de calendario (no de límite):", validationError);
              setMensajeModal(validationError.message || "Error durante la validación del calendario.");
              setShowModal2(true); // Mostrar modal de error genérico
              setIsSubmitting(false); // Liberar
              return; // Detener
            }
          }
      } else {
          // Si se indicó ignorar límites, loguear y continuar
          console.log("Saltando validación de límites de calendario (ignoreCalendarLimits = true).");
      }

      // --- PASO 3: Preparar y Guardar/Actualizar Pedido en Firestore ---
      // Si se llega aquí, las validaciones pasaron o se ignoraron los límites.
      console.log("Preparando datos del pedido para guardar en Firestore...");
      const nowString = dayjs().format("DD/MM/YYYY HH:mm"); // Hora actual para registros

      // Mapear productos del carrito a formato Firestore (con validación robusta)
      const mappedProducts = currentCart.map((item) => {
            // Validar cada item antes de mapearlo
            if (!item || item.id_product == null || typeof item.price !== 'number' || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
                 console.error("Error Crítico: Item inválido encontrado en carrito al preparar para Firestore:", item);
                 throw new Error("Se encontró un item inválido o con cantidad cero en el carrito. No se puede guardar el pedido.");
            }
            // Devolver objeto formateado
            return {
                id: item.id_product, // Mantener como número o string según esté en BD productos
                nombre: item.name || "Sin Nombre",
                cantidad: item.cantidad,
                alias: item.alias || "",
                observaciones: item.observaciones || "",
                celiaco: item.celiaco || clienteData.celiaco || false,
                tostado: item.tostado || 0,
                salsa: item.sinsalsa || false,
                extrasalsa: item.extrasalsa || false,
                entregado: item.entregado || 0,
                troceado: item.troceado || false,
                categoria: item.categoria || "No especificada",
                // Guardar precios como strings formateados a 2 decimales
                precio: item.price.toFixed(2),
                total: (item.price * item.cantidad).toFixed(2),
            };
       });

       // Calcular total final del pedido
       const totalPedido = currentCart.reduce((acc, item) => acc + ((item?.price || 0) * (item?.cantidad || 1)), 0).toFixed(2);

      // Decidir si crear o actualizar
      console.log(`%cProcediendo a ${orderToEdit ? 'ACTUALIZAR' : 'CREAR'} pedido en Firestore...`, 'color: green; font-weight: bold;');
      if (orderToEdit) { // --- Actualizar Pedido Existente ---
        if (!pedidoId) { throw new Error("Falta ID para actualizar pedido."); }
        console.log(`Actualizando Firestore para pedido ID: ${pedidoId}`);
        const pedidoRef = doc(db, "pedidos", pedidoId.toString());
        const updateData = {
          cliente: clienteData.cliente, telefono: clienteData.telefono, fechahora: horaPedido,
          observaciones: clienteData.observaciones, pagado: clienteData.pagado, celiaco: clienteData.celiaco,
          localidad: clienteData.localidad, productos: mappedProducts, total_pedido: totalPedido,
          fechahora_modificado: nowString,
          // No actualizar fechahora_realizado, empleado, origen al editar (a menos que sea necesario)
        };
        await updateDoc(pedidoRef, updateData);
        console.log(`Firestore: Pedido ID ${pedidoId} actualizado.`);

      } else { // --- Crear Pedido Nuevo ---
        pedidoId = await getNextId(); // Obtener ID aquí, justo antes de crear
        console.log(`Creando nuevo pedido en Firestore con ID: ${pedidoId}`);
        const pedidoData = {
           NumeroPedido: pedidoId, cliente: clienteData.cliente, telefono: clienteData.telefono,
           fechahora: horaPedido, observaciones: clienteData.observaciones, pagado: clienteData.pagado,
           celiaco: clienteData.celiaco, localidad: clienteData.localidad, empleado: "", origen: 0, // Valores por defecto
           productos: mappedProducts, total_pedido: totalPedido, fechahora_realizado: nowString,
           // No incluir fechahora_modificado al crear
        };
        await setDoc(doc(db, "pedidos", pedidoId.toString()), pedidoData);
        console.log(`Firestore: Pedido nuevo ID ${pedidoId} creado.`);
      }
      // Log de éxito del guardado/actualización
      console.log(`Éxito: Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'guardado'} en Firestore.`);


      // --- PASO 4: Actualizar Stock (POST-Guardado/Actualización de Pedido) ---
      console.log("Iniciando proceso de actualización de stock...");
      try {
          const stockUpdatePromises = []; // Array para promesas de actualización

          // Calcular cantidades totales a deducir por ID de stock
          // Pollo (ID 1/2 afectan stock ID 1)
          let stockPollos = currentCart.reduce((sum, item) => { if (item?.id_product === 1) return sum + (item.cantidad || 0); if (item?.id_product === 2) return sum + (item.cantidad || 0) / 2; return sum; }, 0);
          if (stockPollos > 0) { stockUpdatePromises.push(updateStock(1, stockPollos)); }

          // Costilla (ID 41/48 afectan stock ID 41)
          let stockCostillas = currentCart.reduce((sum, item) => { if (item?.id_product === 41) return sum + (item.cantidad || 0); if (item?.id_product === 48) return sum + (item.cantidad || 0) / 2; return sum; }, 0);
          if (stockCostillas > 0) { stockUpdatePromises.push(updateStock(41, stockCostillas)); }

          // Otros items con stock individual (ej. ID 50 - Codillo)
           const otrosItemsConStockIds = [50]; // Definir IDs aquí
           currentCart.forEach(item => {
                if (item && item.cantidad > 0 && otrosItemsConStockIds.includes(item.id_product)) {
                     // Pasar id_product directamente (updateStock lo convierte a string si es necesario)
                     stockUpdatePromises.push(updateStock(item.id_product, item.cantidad));
                }
           });

          // Ejecutar todas las actualizaciones de stock en paralelo
          if (stockUpdatePromises.length > 0) {
              console.log(`Ejecutando ${stockUpdatePromises.length} actualizaciones de stock...`);
              await Promise.all(stockUpdatePromises);
              console.log("Actualización de stock completada con éxito.");
          } else {
              console.log("No se requirieron actualizaciones de stock para este pedido.");
          }

      } catch (stockError) {
          // Error CRÍTICO: Pedido guardado, pero stock falló.
          console.error(`¡ERROR CRÍTICO POST-GUARDADO! Pedido ${pedidoId} ${orderToEdit ? 'actualizado' : 'creado'}, PERO FALLÓ LA ACTUALIZACIÓN DE STOCK:`, stockError);
          // Notificar al usuario de la inconsistencia grave
          setMensajeModal(`¡ATENCIÓN GRAVE! Pedido ${pedidoId} guardado, pero falló al actualizar stock (${stockError.message}). Es necesaria REVISIÓN MANUAL INMEDIATA del inventario.`);
          setShowModal2(true); // Mostrar modal de error
          setIsSubmitting(false); // Liberar estado, pero la situación requiere intervención
          return; // Detener el proceso aquí
      }


      // --- PASO 5: Actualizar Contadores de Calendario (POST-Guardado y Stock OK) ---
      console.log(`Iniciando actualización de calendarios (ignorar límite: ${ignoreCalendarLimits})...`);
      try {
          // Calcular cantidades para CADA tipo de calendario
          let cantPolloCal = currentCart.reduce((sum, item) => { if (item && (item.id_product === 1 || item.id_product === 2)) return sum + (item.cantidad || 0); return sum; }, 0);
          let cantCostillaCal = currentCart.reduce((sum, item) => { if (item && (item.id_product === 41 || item.id_product === 48)) return sum + (item.id_product === 41 ? (item.cantidad || 0) : (item.cantidad || 0) / 2); return sum; }, 0);
          let cantCodilloCal = currentCart.reduce((sum, item) => { if (item && (item.name?.toLowerCase().includes("codillo") || item.id_product === 50)) return sum + (item.cantidad || 0); return sum; }, 0);

          // Crear array de promesas para actualizaciones de calendario
          const calendarUpdatePromises = [];
          if (cantPolloCal > 0) { calendarUpdatePromises.push(updateChickenCalendarPollo(horaPedido, cantPolloCal, ignoreCalendarLimits)); }
          if (cantCostillaCal > 0) { calendarUpdatePromises.push(updateCostillaCalendar(horaPedido, cantCostillaCal, ignoreCalendarLimits)); }
          if (cantCodilloCal > 0) { calendarUpdatePromises.push(updateCodilloCalendar(horaPedido, cantCodilloCal, ignoreCalendarLimits)); }

          // Ejecutar actualizaciones de calendario en paralelo
          if (calendarUpdatePromises.length > 0) {
               console.log(`Ejecutando ${calendarUpdatePromises.length} actualizaciones de calendario...`);
               await Promise.all(calendarUpdatePromises);
               console.log("Actualización de calendarios completada (ver logs individuales para detalles).");
          } else {
               console.log("No se requirieron actualizaciones de calendario para este pedido.");
          }

      } catch(calendarError) {
           // Error CRÍTICO: Pedido y stock OK, pero fallo al actualizar contadores.
           console.error(`¡ERROR CRÍTICO POST-STOCK! Pedido ${pedidoId} guardado, stock OK, PERO FALLÓ ACTUALIZACIÓN CALENDARIO:`, calendarError);
           // Notificar de la inconsistencia grave
           setMensajeModal(`¡ATENCIÓN GRAVE! Pedido ${pedidoId} procesado, pero falló la actualización del calendario (${calendarError.message}). Es necesaria REVISIÓN MANUAL del calendario.`);
           setShowModal2(true); // Mostrar modal de error
           setIsSubmitting(false); // Liberar estado, requiere intervención
           return; // Detener
      }

      // --- PASO 5.5: Actualizar Contadores de Ensaladas/Ensaladillas (NUEVO) ---
      console.log("Iniciando actualización de contadores de ensaladas/ensaladillas...");
      try {
          // Llamar a la nueva función pasando el carrito actual
          await updateSaladCounters(currentCart);
          console.log("Actualización de contadores de ensaladas/ensaladillas intentada (ver logs anteriores para éxito/error).");
          // No se maneja error aquí porque la función interna ya lo loguea y decidimos no detener el flujo por ello.
      } catch (saladError) {
           // Este catch es por si updateSaladCounters lanzara un error inesperado (aunque no debería si se maneja internamente)
           console.error(`Error INESPERADO al llamar a updateSaladCounters para pedido ${pedidoId}:`, saladError);
           // No mostrar modal adicional, ya que el error principal se logueó dentro de la función.
      }


      // --- PASO 6: Limpiar Estado y Navegar (Éxito Total) ---
      // Si se llega aquí, todo el proceso fue exitoso (o los errores no críticos fueron solo logueados)
      console.log(`%c---- ÉXITO TOTAL Pedido ID: ${pedidoId} ---- Limpiando estado y navegando...`, 'color: green; font-weight: bold; font-size: 1.1em;');
      setCart([]); // Vaciar carrito del estado global
      setDatosCliente({ // Resetear datos del formulario
        cliente: "", telefono: "", fechahora: "", observaciones: "",
        pagado: false, celiaco: false, localidad: "",
      });
      navigate("/ordenes"); // Navegar a la página de órdenes (ajusta la ruta si es necesario)
      // isSubmitting se liberará en el bloque finally

    } catch (error) {
      // --- Captura de Errores Generales / Inesperados ---
      console.error("Error general no capturado previamente en sendToFirestore:", error);
      // Mostrar modal de error genérico SOLO si no hay otro modal de confirmación activo
      if (!showLimitModal && !showModal) {
          setMensajeModal(`Error inesperado al procesar el pedido: ${error.message}. Intenta de nuevo o contacta soporte.`);
          setShowModal2(true);
      } else {
          // Si ya hay un modal activo, el error podría ser confuso para el usuario. Loguearlo es importante.
           console.error("Error general ocurrió mientras un modal de confirmación estaba activo (o debería estarlo).");
      }
      // Asegurar que isSubmitting se libera en caso de error general no manejado específicamente
      // (Aunque el finally lo hará, ponerlo aquí puede ser una doble seguridad)
       setIsSubmitting(false);


    } finally {
      // --- Bloque Finally: Siempre se ejecuta ---
      // Asegurar que isSubmitting se desactive, A MENOS que un modal esté activo esperando acción del usuario.
      // Esto previene que el botón se rehabilite mientras el usuario está en medio de una decisión en un modal.
      if (!showLimitModal && !showModal) {
         console.log("Finally: No hay modales activos, liberando isSubmitting.");
         setIsSubmitting(false);
      } else {
          console.log("Finally: Modal activo detectado, isSubmitting permanecerá true hasta interacción.");
      }
      console.log("--- Ejecución de sendToFirestore finalizada ---");
    }
  }; // --- Fin de sendToFirestore ---


  // --- Renderizado del Componente ---
  return cart.length > 0 ? ( // Renderizar contenido solo si el carrito no está vacío
    <>
      {/* Sección del Total */}
      <div className="flex justify-end p-[0.5vw]">
        <a
          href="#"
          onClick={(e) => e.preventDefault()} // Mejor práctica para enlaces placeholder
          className="inline-flex items-center text-2xl font-extrabold text-gray-600 hover:underline dark:text-gray-400"
        >
          <span className="text-end">{total.toFixed(2)} €</span>
        </a>
      </div>

      {/* Botón Principal de Acción */}
      <div className="flex text-center justify-center items-center mt-6 mb-4">
        <button
          // Llama a sendToFirestore con estado inicial
          onClick={() => { console.log("Click en Botón Generar/Actualizar"); sendToFirestore({ confirmado: false, ignoreCalendarLimits: false }); }}
          // Deshabilitar si está procesando
          disabled={isSubmitting}
          // Clases CSS (ajusta según tu framework o estilos)
          className={`w-full sm:w-auto min-w-[150px] px-6 py-3 tracking-wide bg-[#f2ac02] text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          {/* Icono opcional - Descomentar si quieres un spinner */}
          {/* isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> */}
          <span className="ml-1 font-nunito text-lg">
            {/* Texto dinámico del botón */}
            {isSubmitting ? 'Procesando...' : (orderToEdit ? "Actualizar Pedido" : "Generar Pedido")}
          </span>
        </button>
      </div>

      {/* --- Modales --- */}

      {/* Modal 2: Errores o Información General */}
      <Modal show={showModal2} onHide={() => { handleCloseModal2(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
         <Modal.Header closeButton>
             <Modal.Title className="font-nunito text-xl text-center text-[#e74c3c]">Error / Aviso</Modal.Title>
         </Modal.Header>
        <Modal.Body className="flex flex-col items-center p-4">
          {/* Puedes añadir un icono de error aquí */}
          <div className="text-red-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-nunito text-lg p-2 text-center text-gray-700">{mensajeModal}</p>
        </Modal.Body>
        <Modal.Footer className="border-t-0 justify-center">
          {/* Botón Aceptar: Cierra el modal y asegura que isSubmitting es false */}
          <Button variant="primary" className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 py-2 px-4 font-nunito text-white rounded-md shadow-sm" onClick={() => { handleCloseModal2(); setIsSubmitting(false); }}>
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 1: Confirmación (ej. continuar sin pollo) */}
      <Modal show={showModal} onHide={() => { handleCloseModal(); setIsSubmitting(false); }} size="md" backdrop="static" keyboard={false} centered>
         <Modal.Header closeButton>
             <Modal.Title className="font-nunito text-xl text-center text-orange-600">Confirmación Requerida</Modal.Title>
         </Modal.Header>
        <Modal.Body className="flex flex-col items-center p-4">
          {/* Icono de pregunta/aviso */}
          <div className="text-orange-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-nunito text-lg p-2 text-center text-gray-700">{mensajeModal}</p>
          <p className="font-nunito text-md text-center text-gray-500 mt-2">¿Deseas continuar igualmente?</p>
        </Modal.Body>
        <Modal.Footer className="border-t-0 flex justify-around p-4">
          {/* Botón Cancelar: Cierra modal y libera isSubmitting */}
          <Button variant="secondary" className="py-2 px-5 bg-white font-nunito text-red-600 border border-red-500 hover:bg-red-50 rounded-md shadow-sm" onClick={() => { handleCloseModal(); setIsSubmitting(false); }} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* Botón Continuar: Cierra modal y llama a sendToFirestore con confirmado=true */}
          <Button variant="primary" onClick={async () => { handleCloseModal(); await sendToFirestore({ confirmado: true, ignoreCalendarLimits: false }); }} disabled={isSubmitting} className={`py-2 px-5 bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 font-nunito text-white rounded-md shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isSubmitting ? 'Procesando...' : 'Continuar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal 3: Confirmación de Límite Excedido */}
      <Modal show={showLimitModal} onHide={() => { handleCloseLimitModal(); setIsSubmitting(false); }} size="lg" backdrop="static" keyboard={false} centered>
         <Modal.Header closeButton>
             <Modal.Title className="font-nunito text-xl text-center text-red-600">¡Límite Excedido!</Modal.Title>
         </Modal.Header>
        <Modal.Body className="flex flex-col items-center p-4">
           {/* Icono de Advertencia */}
           <div className="p-2 text-red-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
           </div>
          <div>
            {/* Muestra el mensaje específico del límite excedido */}
            <p className="font-nunito text-lg p-2 text-center text-gray-700">{limitWarning}</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-t-0 flex justify-around p-4">
          {/* Botón Cancelar Pedido: Cierra modal y libera isSubmitting */}
          <Button variant="secondary" className="py-2 px-5 bg-white font-nunito text-gray-700 border border-gray-400 hover:bg-gray-100 rounded-md shadow-sm" onClick={() => { handleCloseLimitModal(); setIsSubmitting(false); }} disabled={isSubmitting}>
            Cancelar Pedido
          </Button>
          {/* Botón Continuar Ignorando Límite: Cierra modal y llama a sendToFirestore con ignoreCalendarLimits=true */}
          <Button variant="danger" onClick={async () => { handleCloseLimitModal(); await sendToFirestore({ confirmado: true, ignoreCalendarLimits: true }); }} disabled={isSubmitting} className={`py-2 px-5 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 font-nunito text-white rounded-md shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
             {isSubmitting ? 'Procesando...' : 'Continuar (Ignorar Límite)'}
          </Button>
        </Modal.Footer>
      </Modal>

    </>
  ) : (
    // Renderizado cuando el carrito está vacío
    <div className="text-center p-4 text-gray-500 italic">
        El carrito está vacío. Añade productos para continuar.
    </div>
  );
}; // --- Fin del componente CartTotal ---

export default CartTotal;