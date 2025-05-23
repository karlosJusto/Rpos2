const express = require('express');
const escpos = require('escpos');
// Asegúrate de que escpos-network esté instalado: npm install escpos-network
escpos.Network = require('escpos-network');
// iconv-lite es una dependencia de escpos, usualmente no necesitas importarlo explícitamente aquí
// al menos que lo uses directamente, pero tenerlo instalado es crucial.
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Para parsear JSON en el body de la solicitud

// --- Configuración de la Impresora ---
const PRINTER_IP = '192.168.1.100'; // ❗ MODIFICA ESTA IP POR LA DE TU IMPRESORA
const PRINTER_PORT = 9100;         // Puerto estándar para impresoras ESC/POS en red

// Codificación de caracteres para la impresora.
// 'CP850' o 'CP858' suelen funcionar bien para español (incluyendo '€' y 'ñ').
// Prueba también con 'ISO-8859-15' si tienes problemas.
const PRINTER_ENCODING = 'CP850';

console.log(`ℹ️  Servidor de impresión configurado para ${PRINTER_IP}:${PRINTER_PORT} con codificación ${PRINTER_ENCODING}`);

app.post('/imprimir', (req, res) => {
  const { texto, qrUrl } = req.body; // Recibimos 'texto' y 'qrUrl' del frontend

//qrUrl='https://firebasestorage.googleapis.com/v0/b/superpollorpos.firebasestorage.app/o/qr%2F2329.png?alt=media&token=fe607973-f162-4576-ae52-faa32031cc3e';

  if (!texto && !qrUrl) {
    console.warn('⚠️ Solicitud de impresión recibida sin texto ni URL de QR.');
    return res.status(400).send('No se proporcionó contenido para imprimir (ni texto ni QR).');
  }

  const networkDevice = new escpos.Network(PRINTER_IP, PRINTER_PORT);
  const printerOptions = { encoding: PRINTER_ENCODING };
  const printer = new escpos.Printer(networkDevice, printerOptions);

  networkDevice.open(error => {
    if (error) {
      console.error(`❌ Error al conectar con la impresora en ${PRINTER_IP}:${PRINTER_PORT}:`, error);
      // No es necesario cerrar el dispositivo aquí si 'open' falló, ya que no se estableció la conexión.
      return res.status(500).send(`Error al conectar con la impresora: ${error.message}. Verifique la IP, el puerto y la conexión de red de la impresora.`);
    }

    console.log(`✅ Conexión establecida con la impresora: ${PRINTER_IP}:${PRINTER_PORT}`);

    try {
      // Imprimir la parte textual si existe
      if (texto && texto.trim() !== '') {
        console.log('ℹ️  Imprimiendo texto del recibo...');
        printer
          .align('CT') // Centrar el texto (puedes ajustarlo o quitarlo si el formato viene del frontend)
          .text(texto) // Imprime el texto tal como llega
          .feed(1);    // Avanza un poco el papel después del texto
        console.log('✅ Texto del recibo enviado a la impresora.');
      } else {
        console.log('ℹ️  No se proporcionó texto para imprimir o está vacío.');
      }

      // Función para finalizar la impresión (avanzar, cortar y cerrar)
      // Se le puede pasar un mensaje de error para la respuesta HTTP
      const finalizarImpresion = (errorParaRespuesta = null) => {
        console.log('ℹ️  Iniciando secuencia de finalización de impresión...');
        try {
          printer
            .feed(2) // Avanza más papel antes de cortar
            .cut()   // Corta el papel
            .close(closeError => { // Cierra la conexión con la impresora
              if (closeError) {
                console.error('⚠️ Error al cerrar la conexión con la impresora:', closeError);
              }
              console.log('🖨️  Secuencia de impresión (o intento) finalizada. Conexión cerrada.');

              if (!res.headersSent) {
                if (errorParaRespuesta) {
                  // Si hubo un error específico (ej. del QR), pero el texto pudo imprimirse
                  res.status(500).send(errorParaRespuesta);
                } else {
                  res.send('Contenido enviado a la impresora.');
                }
              }
            });
        } catch (finalizeError) {
            console.error('🛑 Error crítico durante la finalización (cut/close):', finalizeError);
            if (!res.headersSent) {
                res.status(500).send(`Error crítico al finalizar impresión: ${finalizeError.message}`);
            }
            // Intenta cerrar el dispositivo de red si aún está abierto
            if (networkDevice && typeof networkDevice.close === 'function') {
                try { networkDevice.close(); } catch (e) { /* ignorar error de cierre secundario */ }
            }
        }
      };

      // Si hay una URL de QR, intentar imprimirla
      if (qrUrl) {
        console.log(`ℹ️  Intentando imprimir QR desde URL: ${qrUrl}`);
        printer.align('CT'); // Centrar el código QR

        // Ajusta 'size' según necesites para el tamaño del QR. Valores comunes: 3-8.
        // 'type' puede variar según la capacidad de la impresora y la librería.
        // 'png' es una suposición común.
        printer.qrimage(qrUrl, { type: 'png', size: 5 }, function(errQr) {
          if (errQr) {
            console.error('❌ Error al procesar o imprimir el comando QR:', errQr);
            // El texto pudo haberse impreso. Finalizar con un mensaje de error para el QR.
            finalizarImpresion(`Error al imprimir QR: ${errQr.message}. El texto pudo haberse impreso.`);
          } else {
            console.log('✅ Comando QR enviado a la impresora.');
            printer.feed(1); // Avanza papel después del QR
            finalizarImpresion(); // Finalizar exitosamente después del QR
          }
        });
      } else {
        console.log('ℹ️  No se proporcionó URL de QR. Finalizando solo con el texto (si lo hubo).');
        finalizarImpresion(); // Finalizar si no hay QR
      }

    } catch (printCommandsError) {
      console.error('🛑 Error durante la ejecución de comandos de impresión (texto, alineación, etc.):', printCommandsError);
      // Intentar cerrar la conexión de red si ocurrió un error antes de printer.close()
      if (networkDevice && typeof networkDevice.close === 'function') {
        try {
          networkDevice.close();
          console.log('ℹ️  Conexión de red cerrada debido a un error en el proceso de comandos de impresión.');
        } catch (closeErrOnCommandError) {
          console.error("Error al intentar cerrar dispositivo de red después de error en comandos:", closeErrOnCommandError);
        }
      }
      if (!res.headersSent) {
        res.status(500).send(`Error durante la preparación de la impresión: ${printCommandsError.message}`);
      }
    }
  });
});

// Iniciar el servidor
const PORT = 3000; // Puerto en el que escuchará el servidor de impresión
app.listen(PORT, () => {
  console.log(`🟢 Servidor de impresión escuchando en http://localhost:${PORT}`);
  console.log('   Asegúrate de que la IP de la impresora y el puerto sean correctos.');
  console.log('   Y que este servidor sea accesible desde el frontend.');
});
