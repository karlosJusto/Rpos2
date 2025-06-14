const express = require('express');
const escpos = require('escpos');
// Asegúrate de que escpos-network esté instalado: npm install escpos-network
escpos.Network = require('escpos-network');
// iconv-lite es una dependencia de escpos, usualmente no necesitas importarlo explícitamente aquí
// al menos que lo uses directamente, pero tenerlo instalado es crucial.
const cors = require('cors');
const admin = require('firebase-admin');
// const getPixels = require('get-pixels'); // Eliminado, ya no se procesa QR

// --- Configuración de Firebase Admin ---
// Asegúrate de que el nombre del archivo de clave sea el correcto.
const serviceAccount = require('./nueva_key.json'); // O la clave que estés usando y funcione

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLA_IMPRESION_COLLECTION = 'colaImpresionRpos2';

// --- PRUEBA DE LECTURA INICIAL ---
async function testFirestoreConnection() {
  try {
    const testDocRef = db.collection(COLA_IMPRESION_COLLECTION).limit(1);
    const snapshot = await testDocRef.get();
    if (snapshot.empty) {
      console.log('[TEST CONEXIÓN] Colección de prueba vacía o no accesible, pero la llamada a get() funcionó.');
    } else {
      console.log(`[TEST CONEXIÓN] Se pudo leer de Firestore. Primer doc ID: ${snapshot.docs[0].id}`);
    }
  } catch (e) {
    console.error('[TEST CONEXIÓN] ERROR al intentar leer de Firestore:', e);
  }
}
testFirestoreConnection();
// --- FIN PRUEBA ---

const app = express();
app.use(cors());
app.use(express.json());

const PRINTER_IP = '192.168.1.100'; // ❗ MODIFICA ESTA IP POR LA DE TU IMPRESORA
const PRINTER_PORT = 9100;
const PRINTER_ENCODING = 'CP850'; // CP850 o CP858 para español con € y ñ

const recentlyProcessedByThisNode = new Map();
const NODE_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const NODE_CLEANUP_INTERVAL_MS = NODE_LOCK_DURATION_MS * 2;

console.log(`ℹ️  Servidor de impresión configurado para ${PRINTER_IP}:${PRINTER_PORT} con codificación ${PRINTER_ENCODING}`);
console.log(`ℹ️  Escuchando la colección '${COLA_IMPRESION_COLLECTION}' en Firestore.`);

setInterval(() => {
  const now = Date.now();
  for (const [pedidoId, timestamp] of recentlyProcessedByThisNode.entries()) {
    if (now - timestamp > NODE_LOCK_DURATION_MS) {
      recentlyProcessedByThisNode.delete(pedidoId);
    }
  }
}, NODE_CLEANUP_INTERVAL_MS);

async function ejecutarImpresion(datosParaImprimir) {
  // imagenURL ya no se usa aquí, pero se mantiene en la desestructuración por si el payload lo incluye
  const { ticketCabecera, ticketProductos, ticketPie, imagenURL, numeroPedido } = datosParaImprimir;


  if (numeroPedido) {
    const now = Date.now();
    if (recentlyProcessedByThisNode.has(numeroPedido.toString())) {
      const lastProcessTime = recentlyProcessedByThisNode.get(numeroPedido.toString());
      if (now - lastProcessTime < NODE_LOCK_DURATION_MS) {
        console.log(`[Nodo Local] 🚫 Pedido ${numeroPedido} ya procesado recientemente. Omitiendo.`);
        return { success: false, message: "Procesado recientemente (cerrojo local).", skippedByLocalLock: true };
      }
    }
    recentlyProcessedByThisNode.set(numeroPedido.toString(), now);
  }

  return new Promise((resolve, reject) => {
    const networkDevice = new escpos.Network(PRINTER_IP, PRINTER_PORT);
    const printerOptions = { encoding: PRINTER_ENCODING };
    const printer = new escpos.Printer(networkDevice, printerOptions);

    networkDevice.open(async (error) => {
      if (error) {
        console.error(`❌ Error al conectar con la impresora para pedido ${numeroPedido}:`, error);
        if (numeroPedido) recentlyProcessedByThisNode.delete(numeroPedido.toString());
        reject({ success: false, message: `Error al conectar con la impresora: ${error.message}` });
        return;
      }
      console.log(`✅ Conexión establecida con la impresora para pedido ${numeroPedido}`);

      try {
        // Imprimir la cabecera del ticket
        if (ticketCabecera && ticketCabecera.trim() !== '') {
          console.log(`ℹ️  Imprimiendo cabecera del ticket para pedido ${numeroPedido}...`);
          printer.align('CT').text(ticketCabecera);
        }

        // Imprimir productos usando tableCustom
        if (ticketProductos && ticketProductos.length > 0) {
          console.log(`ℹ️  Imprimiendo tabla de productos para pedido ${numeroPedido}...`);
          printer.align('CT');
          
          const tableData = ticketProductos.map(p => ([
            { text: p.cantidad, align:"CENTER", width:0.15, style: 'B' }, 
            { text: p.descripcion, align:"CENTER", width:0.57 }, 
            { text: p.precio, align:"LEFT", width:0.28 } 
          ]));

          tableData.forEach(rowData => {
            printer.tableCustom(rowData, { size: [1, 1], encoding: PRINTER_ENCODING });
          });
          console.log(`✅ Tabla de productos para pedido ${numeroPedido} enviada.`);
        }

        // Imprimir el pie del ticket
        if (ticketPie && ticketPie.trim() !== '') {
          console.log(`ℹ️  Imprimiendo pie del ticket para pedido ${numeroPedido}...`);
          printer.align('CT').text(ticketPie).feed(1);
          console.log(`✅ Pie del ticket para pedido ${numeroPedido} enviado.`);
        }

        // Función para finalizar la impresión (avanzar, cortar y cerrar)
        // El parámetro imageCommandProcessed ya no es relevante aquí
        const finalizarImpresion = (isErrorFromOp = false, errorMsg = null /*, commandProcessed = false */) => {
          console.log(`ℹ️  Iniciando secuencia de finalización para ${numeroPedido}...`);
          const executeCutAndClose = () => {
            try {
              printer.feed(2).cut().close(closeError => {
                if (closeError) console.error(`⚠️ Error al cerrar conexión para ${numeroPedido}:`, closeError);
                console.log(`🖨️  Secuencia para ${numeroPedido} finalizada. Conexión cerrada.`);
                if (isErrorFromOp || errorMsg) {
                  if (numeroPedido) recentlyProcessedByThisNode.delete(numeroPedido.toString());
                  reject({ success: false, message: errorMsg || "Error durante la impresión." });
                } else {
                  resolve({ success: true, message: "Contenido enviado a la impresora." });
                }
              });
            } catch (finalizeError) {
              console.error(`🛑 Error crítico en finalización (cut/close) para ${numeroPedido}:`, finalizeError);
              if (numeroPedido) recentlyProcessedByThisNode.delete(numeroPedido.toString());
              if (networkDevice && typeof networkDevice.close === 'function') {
                try { networkDevice.close(); } catch (e) { /* ignore */ }
              }
              reject({ success: false, message: `Error crítico al finalizar: ${finalizeError.message}` });
            }
          };
          
          // No hay imagen, así que no hay delay específico para ella.
          // El corte se ejecuta inmediatamente después de los comandos de texto/tabla.
          executeCutAndClose();
        };

        // --- LÓGICA DEL QR ELIMINADA ---
        // Ya no se procesa imagenURL aquí.
        // Si en el futuro necesitas imprimir un QR (ej. Data URL desde el frontend),
        // la lógica iría aquí, y se pasaría true a finalizarImpresion para el delay.
        finalizarImpresion(false, null, false); // No se procesó ninguna imagen (QR)

      } catch (printCommandsError) {
        console.error(`🛑 Error en comandos de impresión para ${numeroPedido}:`, printCommandsError);
        if (numeroPedido) recentlyProcessedByThisNode.delete(numeroPedido.toString());
        if (networkDevice && typeof networkDevice.close === 'function') {
          try { networkDevice.close(); } catch (e) { /* ignore */ }
        }
        reject({ success: false, message: `Error en preparación de impresión: ${printCommandsError.message}` });
      }
    });
  });
}

// --- Listener de Firestore para la cola de impresión ---
const listener = db.collection(COLA_IMPRESION_COLLECTION)
  .where('estado', '==', 'pendiente')
  .onSnapshot(async (querySnapshot) => {
    console.log(`[LISTENER ACTIVADO] Timestamp: ${new Date().toISOString()}. Cambios: ${querySnapshot.docChanges().length}, Documentos en snapshot: ${querySnapshot.size}`);
    console.log(`📄 Firestore Snapshot: ${querySnapshot.docChanges().length} cambios detectados con estado 'pendiente'.`);
    for (const change of querySnapshot.docChanges()) {
      if (change.type === 'added' || (change.type === 'modified' && change.doc.data().estado === 'pendiente')) {
        const docId = change.doc.id;
        const docData = change.doc.data();
        const docRef = db.collection(COLA_IMPRESION_COLLECTION).doc(docId);
        console.log(`⏳ Procesando pedido ${docId} de la cola...`);

        try {
          await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(docRef);
            if (!freshDoc.exists) throw "El documento ya no existe.";
            if (freshDoc.data().estado !== 'pendiente') {
              console.log(`Pedido ${docId} ya no está 'pendiente' (estado: ${freshDoc.data().estado}). Omitiendo.`);
              return;
            }
            transaction.update(docRef, {
              estado: 'procesando',
              timestampInicioProcesamiento: admin.firestore.FieldValue.serverTimestamp(),
              servidorProcesadorId: `node-printer-${process.pid}`
            });
          });
          console.log(`🔄 Pedido ${docId} marcado como 'procesando'.`);

          // Asegurarse de que los nombres de campo coincidan con lo que envía el frontend
          const datosParaImprimir = {
            ticketCabecera: docData.ticketCabecera,
            ticketProductos: docData.ticketProductos,
            ticketPie: docData.ticketPie,
            // imagenURL: docData.imagenURL, // Se recibe pero no se usa para imprimir
            numeroPedido: docId
          };

          const resultadoImpresion = await ejecutarImpresion(datosParaImprimir);

          if (resultadoImpresion.skippedByLocalLock) {
            console.log(`[Firestore Update] Pedido ${docId} omitido por cerrojo local.`);
            return;
          }

          if (resultadoImpresion.success) {
            await docRef.update({
              estado: 'impreso',
              timestampFinalizado: admin.firestore.FieldValue.serverTimestamp(),
              mensajeResultado: resultadoImpresion.message
            });
            console.log(`✅ Pedido ${docId} marcado como 'impreso'.`);
          } else {
            await docRef.update({
              estado: 'error_impresion',
              timestampFinalizado: admin.firestore.FieldValue.serverTimestamp(),
              mensajeError: resultadoImpresion.message,
              intentosFallidos: admin.firestore.FieldValue.increment(1)
            });
            console.error(`❌ Pedido ${docId} marcado como 'error_impresion': ${resultadoImpresion.message}`);
          }
        } catch (processingError) {
          console.error(`🔥 ERROR DURANTE PROCESAMIENTO del pedido ${docId} en ${new Date().toISOString()}:`);
          console.error("   Tipo de Error: Error en transacción o ejecución de impresión.");
          console.error("   Mensaje:", processingError.message);
          if (processingError.code) console.error("   Código:", processingError.code);
          console.error("   Stack:", processingError.stack);
        }
      }
    }
  }, (error) => {
    console.error(`🚫 ERROR GRAVE EN EL LISTENER de Firestore para ${COLA_IMPRESION_COLLECTION} en ${new Date().toISOString()}:`);
    console.error("   Mensaje de Error:", error.message);
    if (error.code) console.error("   Código de Error:", error.code);
    console.error("   Stack de Error:", error.stack);
  });

app.get('/health', (req, res) => {
  res.status(200).send('Servidor de impresión (Firestore listener) está activo.');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🟢 Servidor (para health check) escuchando en http://localhost:${PORT}`);
  console.log('   El listener de Firestore ya está activo y procesando la cola de impresión.');
});

process.on('SIGINT', () => {
  console.log('🔌 Desconectando listener de Firestore y cerrando servidor...');
  if (listener) listener();
  process.exit(0);
});
