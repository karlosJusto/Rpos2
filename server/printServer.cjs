const escpos = require('escpos');
// iconv-lite es una dependencia de escpos para la codificación de caracteres.
// Asegurarse de que esté instalado (normalmente lo está como dependencia de escpos).
require('iconv-lite');

// --- Configuración de la Impresora de Red ---
const PRINTER_IP = '192.168.1.30'; // MODIFICA ESTA IP POR LA DE TU IMPRESORA
const PRINTER_PORT = 9100; // Puerto estándar para impresoras de red Epson (RAW/JetDirect)

/**
 * Imprime un recibo con los datos proporcionados a través de una conexión de red.
 * @param {object} receiptData - Datos del recibo.
 * @param {string} receiptData.storeName - Nombre de la tienda.
 * @param {array} receiptData.items - Array de objetos, cada uno con { name: string, quantity: number, price: number }.
 * @param {number} receiptData.subtotal - Subtotal de la venta.
 * @param {number} receiptData.tax - Impuesto aplicado.
 * @param {number} receiptData.total - Total de la venta.
 * @param {string} [receiptData.footerMessage] - Mensaje opcional al pie del recibo.
 */
function printReceipt(receiptData) {
  let networkDevice;
  try {
    console.log(`Intentando conectar con impresora de red en: ${PRINTER_IP}:${PRINTER_PORT}`);
    networkDevice = new escpos.Network(PRINTER_IP, PRINTER_PORT);
  } catch (e) {
    console.error("Error al inicializar el dispositivo de red:", e);
    console.error(`Asegúrate de que la impresora esté conectada a la red, encendida, y accesible en la IP ${PRINTER_IP} y puerto ${PRINTER_PORT}.`);
    console.error("Verifica también que no haya un firewall bloqueando la conexión.");
    return; // Salir de la función si no se puede inicializar el dispositivo
  }

  const options = { encoding: "CP850" /* o CP437, o la que necesites para tus caracteres */ };
  const printer = new escpos.Printer(networkDevice, options);

  networkDevice.open(function (error) {
    if (error) {
      console.error("Error al abrir la conexión de red con la impresora:", error);
      // En caso de error al abrir, el 'device' podría necesitar ser cerrado explícitamente si no lo maneja 'printer.close()'
      // Sin embargo, printer.close() usualmente maneja el cierre del dispositivo subyacente.
      return; // Salir si no se puede abrir la conexión
    }

    console.log("Conexión de red con impresora abierta, enviando comandos...");

    try {
      printer
        .font('a')
        .align('ct') // Centrar
        .style('bu') // Negrita y subrayado
        .size(1, 1)  // Doble alto y doble ancho
        .text(receiptData.storeName || 'Mi Tienda Genérica')
        .text('--------------------------------')
        .style('normal')
        .size(0,0) // Tamaño normal
        .align('lt'); // Alinear a la izquierda

      receiptData.items.forEach(item => {
        const itemName = item.name.padEnd(20, ' '); 
        const itemPrice = item.price.toFixed(2);
        const itemQuantity = item.quantity.toString();
        const itemTotal = (item.quantity * item.price).toFixed(2);
        
        const lineStart = `${itemName.substring(0,20)} ${itemQuantity} x ${itemPrice} = `;
        const lineEnd = `${itemTotal}`;
        // Ajusta el '32' si el ancho de tu papel/fuente es diferente
        const spacesNeeded = Math.max(0, 32 - (lineStart.length + lineEnd.length)); 
        printer.text(lineStart + ' '.repeat(spacesNeeded) + lineEnd);
      });

      printer
        .text('--------------------------------')
        .align('rt') // Alinear a la derecha
        .text(`Subtotal: ${receiptData.subtotal.toFixed(2)}`)
        .text(`Impuesto: ${receiptData.tax.toFixed(2)}`)
        .style('b') // Negrita para el total
        .text(`TOTAL: ${receiptData.total.toFixed(2)}`)
        .style('normal')
        .feed(2); // Avanzar 2 líneas

      if (receiptData.footerMessage) {
        printer.align('ct').text(receiptData.footerMessage).feed(1);
      }

      printer
        .feed(2) // Más espacio antes de cortar
        .cut()   // Cortar el papel
        .close(function() { 
          console.log("Impresión completada y conexión de red cerrada.");
        });

    } catch (printError) {
      console.error("Error durante la secuencia de impresión:", printError);
      // Intentar cerrar la impresora si ocurrió un error durante la impresión
      if (printer) {
        printer.close(() => {
          console.log("Conexión de red con impresora cerrada después de un error de impresión.");
        });
      }
    }
  });
}

// --- Ejemplo de Uso ---
// Esto es para probar. En una aplicación real, llamarías a printReceipt 
// desde otra parte de tu código (por ejemplo, un manejador de rutas de Express).
const sampleReceiptData = {
  storeName: "Rpos2 Tienda (Red)",
  items: [
    { name: "Producto Alfa", quantity: 2, price: 10.50 },
    { name: "Producto Beta Largo", quantity: 1, price: 25.00 },
    { name: "Otro Item", quantity: 3, price: 7.75 },
  ],
  subtotal: 69.25,
  tax: 11.08,
  total: 80.33,
  footerMessage: "¡Gracias por su compra! (Red)"
};

// Descomenta la siguiente línea para probar la impresión cuando ejecutes `node server/printServer.cjs`
printReceipt(sampleReceiptData);

// Si quieres usar esta función desde otro módulo (por ejemplo, un servidor Express):
module.exports = { printReceipt };
