import { useContext, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { dataContext } from '../Context/DataContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Tabs from './Tabs';
import Card from './Card';
import fondo from '../../assets/fondo.jpg';
import {
  QUICK_ORDER_STOCK_CONFIG,
  calculateQuickOrderStockRequirements,
  createQuickOrder,
  getRoundedQuickOrderSlot,
} from './quickOrderService';

const QuickOrderLayout = () => {
  const { data, setCart, setBuscar } = useContext(dataContext);

  const [quickCart, setQuickCart] = useState([]);
  const [selectedSlotTime] = useState(getRoundedQuickOrderSlot().format('HH:mm'));
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setCart([]);
    return () => {
      setCart([]);
      setBuscar('');
    };
  }, [setCart, setBuscar]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeoutId = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const buildQuickCartItem = (product) => ({
    id: Number(product.id_product),
    name: product.name,
    alias: product.alias,
    categoria: product.categoria,
    position: product.position,
    price: Number(product.price || 0),
    cantidad: 1,
    imagen: product.imagen_rpos || product.imagen,
  });

  const hasEnoughStockForCart = (candidateCart) => {
    const requirements = calculateQuickOrderStockRequirements(candidateCart);

    return Object.entries(requirements).every(([stockId, requiredAmount]) => {
      const stockProduct = data.find((product) => Number(product.id_product) === Number(stockId));
      return stockProduct && Number(stockProduct.stock || 0) >= Number(requiredAmount);
    });
  };

  const getQuickProductError = (product) => {
    const config = QUICK_ORDER_STOCK_CONFIG[Number(product.id_product)];
    const stockId = config?.stockId ?? Number(product.id_product);
    const stockProduct = data.find((item) => Number(item.id_product) === Number(stockId));
    const stockName = stockProduct?.name || product.name;
    return `No hay stock suficiente para ${stockName}.`;
  };

  const canAddOneMoreUnit = (product) => {
    const productId = Number(product.id_product);
    const existingIndex = quickCart.findIndex((item) => item.id === productId);

    const candidateCart = existingIndex !== -1
      ? quickCart.map((item, index) =>
          index === existingIndex
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      : [...quickCart, buildQuickCartItem(product)];

    return hasEnoughStockForCart(candidateCart);
  };

  const addToQuickCart = (product) => {
    const productId = Number(product.id_product);
    const existingIndex = quickCart.findIndex((item) => item.id === productId);

    const nextCart = existingIndex !== -1
      ? quickCart.map((item, index) =>
          index === existingIndex
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      : [...quickCart, buildQuickCartItem(product)];

    if (!hasEnoughStockForCart(nextCart)) {
      setFeedback({
        type: 'error',
        message: getQuickProductError(product),
      });
      return;
    }

    setQuickCart(nextCart);

    setFeedback({
      type: 'success',
      message: `${product.name} añadido al pedido rápido.`,
    });
  };

  const updateItemQuantity = (productId, delta) => {
    const productInCart = quickCart.find((item) => item.id === productId);
    if (!productInCart) return;

    const nextCart = quickCart
      .map((item) => {
        if (item.id !== productId) return item;
        return { ...item, cantidad: item.cantidad + delta };
      })
      .filter((item) => item.cantidad > 0);

    if (delta > 0 && !hasEnoughStockForCart(nextCart)) {
      setFeedback({
        type: 'error',
        message: `No hay stock suficiente para ${productInCart.name}.`,
      });
      return;
    }

    setQuickCart(nextCart);
  };

  const removeItem = (productId) => {
    setQuickCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearQuickCart = () => {
    setQuickCart([]);
  };

  const totalPedido = useMemo(() => {
    return quickCart.reduce((acc, item) => acc + (Number(item.price || 0) * item.cantidad), 0);
  }, [quickCart]);

  const handleConfirmQuickOrder = async () => {
    try {
      setIsSubmitting(true);

      const result = await createQuickOrder({
        cart: quickCart,
        slotTime: selectedSlotTime,
        empleadoNombre: sessionStorage.getItem('empleadoNombre'),
      });

      setQuickCart([]);
      setShowSummaryModal(false);
      setFeedback({
        type: 'success',
        message: `Pedido rápido ${result.pedidoId} creado para las ${result.fechahora.split(' ')[1]}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo crear el pedido rápido.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex max-w-[2500px] mx-auto h-screen bg-no-repeat bg-cover"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="w-[7%] flex-shrink-0">
        <Sidebar />
      </div>

      <div className="w-[70%] flex flex-col">
        <div className="h-[9%] flex-shrink-0">
          <Navbar />
        </div>

        <div className="h-[9%] flex-shrink-0">
          <Tabs basePath="/pedido-rapido" />
        </div>

        {feedback && (
          <div className="px-[3vw] pt-3">
            <div className={`${feedback.type === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'} rounded-xl border px-4 py-3 font-nunito font-bold`}>
              {feedback.message}
            </div>
          </div>
        )}

        <div className="p-[1.5vw] pl-[3vw] h-[75%] max-h-[82%] grid grid-cols-5 overflow-y-auto gap-4">
          <Card quickMode onProductClick={addToQuickCart} isProductDisabled={(product) => !canAddOneMoreUnit(product)} />
        </div>
      </div>

      <div className="w-[23%] flex-shrink-0">
        <div className="p-[1.2vw]">
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-[#f2ac02] px-5 py-5 text-white font-nunito font-extrabold shadow-lg hover:bg-yellow-600 transition-colors"
          >
            <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.29998 5H21L19.4211 10.2632C19.1368 11.2108 18.9947 11.6846 18.6664 12.0326C18.376 12.3403 18.0035 12.5583 17.5934 12.6619C17.1296 12.779 16.6417 12.6653 15.6657 12.438L8.73354 10.8242C7.78264 10.6029 7.30719 10.4922 6.93215 10.2352C6.60089 10.0082 6.33047 9.70391 6.1452 9.34861C5.93539 8.94613 5.88225 8.46085 5.77597 7.49028L5.5 5M5.5 5L5.10296 3.27938C5.01195 2.88493 4.96645 2.6877 4.85989 2.53948C4.76602 2.40893 4.63821 2.30644 4.48982 2.24254C4.32136 2.17 4.11993 2.17 3.71707 2.17H3"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 19C9 19.5523 8.55228 20 8 20C7.44772 20 7 19.5523 7 19C7 18.4477 7.44772 18 8 18C8.55228 18 9 18.4477 9 19Z"
                fill="white" />
              <path d="M18 19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19C16 18.4477 16.4477 18 17 18C17.5523 18 18 18.4477 18 19Z"
                fill="white" />
            </svg>
            <span>Resumen</span>
            {quickCart.length > 0 && (
              <span className="absolute right-4 top-4 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-gray-700 px-2 text-sm">
                {quickCart.reduce((acc, item) => acc + item.cantidad, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <Modal show={showSummaryModal} onHide={() => setShowSummaryModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="font-nunito font-extrabold text-gray-700">
            Resumen de pedido rápido
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {quickCart.length === 0 ? (
            <p className="font-nunito text-gray-500 mb-0">No has añadido productos todavía.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 font-nunito text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="truncate font-extrabold text-gray-700">AAgenerico</span>
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <span className="text-gray-500">Hora:</span>
                  <span className="font-extrabold text-gray-700">{selectedSlotTime || '--:--'}</span>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-3 border-b border-dashed pb-2 font-nunito text-xs font-bold uppercase tracking-wide text-gray-500">
                <span>Producto</span>
                <span className="text-center">Cant.</span>
                <span className="text-right">Importe</span>
              </div>

              <div className="space-y-2">
                {quickCart.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="mb-0 truncate font-nunito font-bold text-gray-800">{item.name}</p>
                      <p className="mb-0 font-nunito text-xs text-gray-500">{Number(item.price).toFixed(2)} € ud.</p>
                    </div>

                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        type="button"
                        className="px-3 py-1 text-base font-bold text-gray-700"
                        onClick={() => updateItemQuantity(item.id, -1)}
                      >
                        -
                      </button>
                      <span className="min-w-[32px] text-center font-nunito font-extrabold text-gray-800">{item.cantidad}</span>
                      <button
                        type="button"
                        className="px-3 py-1 text-base font-bold text-gray-700"
                        onClick={() => updateItemQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <div className="min-w-[78px] text-right font-nunito font-extrabold text-gray-700">
                        {(Number(item.price) * item.cantidad).toFixed(2)} €
                      </div>
                      <button
                        type="button"
                        className="font-nunito text-sm font-bold text-red-600 hover:text-red-700"
                        onClick={() => removeItem(item.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}
        </Modal.Body>
        <Modal.Footer className="flex flex-col items-stretch gap-3">
          <div className="flex items-center justify-between">
            <div className="font-nunito font-extrabold text-gray-700">
              Total: {totalPedido.toFixed(2)} €
            </div>
            {quickCart.length > 0 && (
              <button
                type="button"
                className="font-nunito text-sm font-bold text-red-600 hover:text-red-700"
                onClick={clearQuickCart}
              >
                Vaciar carrito
              </button>
            )}
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              className="bg-white border-red-500 text-red-500 hover:border-red-600 hover:text-red-600"
              onClick={() => setShowSummaryModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="bg-white border-yellow-500 text-yellow-500 hover:border-yellow-600 hover:text-yellow-600"
              onClick={handleConfirmQuickOrder}
              disabled={quickCart.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Procesando...' : 'Aceptar pedido rápido'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QuickOrderLayout;
