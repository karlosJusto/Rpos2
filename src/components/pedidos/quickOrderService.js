import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

dayjs.extend(customParseFormat);

export const QUICK_ORDER_STOCK_CONFIG = {
  1: { stockId: 1, stockMultiplier: 1 },
  2: { stockId: 1, stockMultiplier: 0.5 },
  39: { stockId: 1, stockMultiplier: 0.5 },
  40: { stockId: 1, stockMultiplier: 1 },
  41: { stockId: 41, stockMultiplier: 1 },
  48: { stockId: 41, stockMultiplier: 0.5 },
  50: { stockId: 50, stockMultiplier: 1 },
  20: { stockId: 20, stockMultiplier: 1 },
};

const DEFAULT_CLIENT = {
  cliente: 'AAgenerico',
  telefono: '000000000',
  observaciones: 'Pedido Rapido',
  localidad: 'Mungia',
  pagado: false,
  celiaco: false,
  origen: 0,
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

export const calculateQuickOrderStockRequirements = (cart) => {
  return cart.reduce((acc, item) => {
    const productId = Number(item.id);
    const quantity = Number(item.cantidad || 0);
    if (!productId || quantity <= 0) return acc;

    const config = QUICK_ORDER_STOCK_CONFIG[productId];
    const stockId = config?.stockId ?? productId;
    const stockAmount = quantity * (config?.stockMultiplier ?? 1);

    acc[stockId] = (acc[stockId] || 0) + stockAmount;
    return acc;
  }, {});
};

export const getRoundedQuickOrderSlot = () => {
  const now = dayjs();
  const currentMinutes = now.minute();
  const roundedMinutes = Math.ceil(currentMinutes / 15) * 15;

  if (roundedMinutes === 60) {
    return now.add(1, 'hour').minute(0).second(0).millisecond(0);
  }

  const rounded = now.minute(roundedMinutes).second(0).millisecond(0);
  return rounded.isBefore(now) ? rounded.add(15, 'minute') : rounded;
};

export const createQuickOrder = async ({ cart, slotTime, empleadoNombre }) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('El carrito está vacío.');
  }

  const slotDate = dayjs(
    `${dayjs().format('DD/MM/YYYY')} ${slotTime || getRoundedQuickOrderSlot().format('HH:mm')}`,
    'DD/MM/YYYY HH:mm',
    true
  );

  if (!slotDate.isValid()) {
    throw new Error('La hora seleccionada no es válida.');
  }

  const stockRequirements = calculateQuickOrderStockRequirements(cart);
  const totalPedido = cart.reduce((acc, item) => {
    return acc + (Number(item.price || 0) * Number(item.cantidad || 0));
  }, 0);

  return runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'contadorPedidos', 'pedidoId');
    const counterSnap = await transaction.get(counterRef);

    const nextId = counterSnap.exists()
      ? Number(counterSnap.data().id || 0) + 1
      : 1;

    transaction.set(counterRef, { id: nextId }, { merge: true });

    for (const [stockId, amount] of Object.entries(stockRequirements)) {
      const productRef = doc(db, 'productos', String(stockId));
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`No se encontró el producto de stock ${stockId}.`);
      }

      const productData = productSnap.data();
      const currentStock = Number(productData.stock || 0);

      if (currentStock < amount) {
        throw new Error(`Stock insuficiente para ${productData.name || `ID ${stockId}`}.`);
      }

      transaction.update(productRef, { stock: currentStock - amount });
    }

    const productos = cart.map((item) => {
      const quantity = Number(item.cantidad || 0);
      const unitPrice = Number(item.price || 0);

      return {
        id: Number(item.id),
        nombre: item.name || 'Producto sin nombre',
        cantidad: quantity,
        alias: item.alias || '',
        observaciones: DEFAULT_CLIENT.observaciones,
        celiaco: false,
        tostado: false,
        sinsalsa: false,
        extrasalsa: false,
        entregado: quantity,
        troceado: false,
        categoria: item.categoria || 'No especificada',
        position: item.position ?? null,
        precio: formatMoney(unitPrice),
        total: formatMoney(unitPrice * quantity),
      };
    });

    const orderRef = doc(db, 'pedidos', String(nextId));
    const orderPayload = {
      NumeroPedido: nextId,
      ...DEFAULT_CLIENT,
      empleado: empleadoNombre || 'No identificado',
      fechahora: slotDate.format('DD/MM/YYYY HH:mm'),
      fechahora_realizado: dayjs().format('DD/MM/YYYY HH:mm'),
      fecha_filtro: slotDate.format('DD-MM-YYYY'),
      productos,
      total_pedido: formatMoney(totalPedido),
      webListenerProcessed: false,
      paraOtroDia: false,
      orderCreationToken: `quick-${Date.now()}-${nextId}`,
      createdAt: serverTimestamp(),
    };

    transaction.set(orderRef, orderPayload);

    return {
      pedidoId: nextId,
      fechahora: orderPayload.fechahora,
    };
  });
};
