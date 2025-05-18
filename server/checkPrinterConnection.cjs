const net = require('net');

const printerIP = '192.168.1.30';  // Cambia por la IP de tu impresora
const printerPort = 9100;          // Puerto típico de impresoras térmicas en red

const socket = new net.Socket();
const timeout = 3000; // milisegundos

console.log(`Intentando conectar a la impresora en ${printerIP}:${printerPort}...`);

socket.setTimeout(timeout);

socket.on('connect', () => {
  console.log('✅ Conexión exitosa: la impresora está respondiendo.');
  socket.destroy(); // Cierra la conexión
});

socket.on('timeout', () => {
  console.error('⏰ Tiempo de espera agotado. La impresora no respondió.');
  socket.destroy();
});

socket.on('error', (err) => {
  console.error('❌ Error al conectar con la impresora:', err.message);
});

socket.connect(printerPort, printerIP);
