const escpos = require('escpos');
escpos.Network = require('escpos-network'); // <--- ¡Añadir esta línea!

const PRINTER_IP = '192.168.123.100';
const PRINTER_PORT = 9100; // Puerto estándar, ajusta si es necesario

console.log(`Intentando conectar a la impresora en ${PRINTER_IP}:${PRINTER_PORT}...`);

const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
const printer = new escpos.Printer(device);

device.open(function(error){
  if(error){
    console.error(`Error al conectar con la impresora en ${PRINTER_IP}:${PRINTER_PORT}:`, error);
    console.error('Asegúrate de que la impresora esté encendida, conectada a la red y que la IP y el puerto sean correctos.');
    return;
  }
  console.log(`✅ Conectado a la impresora en ${PRINTER_IP}:${PRINTER_PORT}`);
  printer
    .font('a')
    .align('ct')
    .style('b')
    .size(1, 1)
    .text('Prueba de impresion por RED OK')
    .text(`Desde test-usb.cjs (ahora test-network)`)
    .feed(2)
    .cut()
    .close();
  console.log('📄 Comando de impresión de prueba enviado. Revisa tu impresora.');
});