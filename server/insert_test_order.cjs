const admin = require('firebase-admin');
const serviceAccount = require('./nueva_key.json'); // Ajusta la ruta si hace falta

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function insertarPedidoPrueba() {
  const numeroPedido = (Math.floor(Math.random() * 9000) + 1000).toString(); // Random 4 dígitos
  const pedido = {
    estado: 'pendiente',
    numeroPedido: numeroPedido,
    qrUrl: `https://firebasestorage.googleapis.com/v0/b/superpollorpos.firebasestorage.app/o/qr%2F${numeroPedido}.png?alt=media&token=7e2a5ac6-4dd0-4b27-864c-bbd648f9568f`,
    textoTicket: `--- PEDIDO ${numeroPedido} --- Cliente: Test Cliente Tel: 000000000 Hora Recogida: ${new Date().toLocaleString()} Obs: Pedido de prueba ------------------------ PRODUCTOS: [1x] - Producto Test - 10.00 ------------------------ TOTAL PEDIDO: 10.00 ------------------------ `,
    timestampSolicitud: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('colaImpresionRpos2').doc(numeroPedido).set(pedido);
    console.log(`✅ Pedido de prueba insertado con número: ${numeroPedido}`);
  } catch (error) {
    console.error('❌ Error al insertar pedido de prueba:', error);
  }
}

insertarPedidoPrueba();
