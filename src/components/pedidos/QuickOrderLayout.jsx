import { useContext, useEffect, useMemo, useState } from 'react';
import { dataContext } from '../Context/DataContext';
import Sidebar from './Sidebar';
import Reloj from './Reloj';
import Card from './Card';
import fondo from '../../assets/fondo.jpg';
import logo from '../../assets/logo.png';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState(null);

  useEffect(() => {
    setCart([]);
    setBuscar('');
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

  useEffect(() => {
    if (!recentlyAddedProductId) return undefined;

    const timeoutId = window.setTimeout(() => setRecentlyAddedProductId(null), 450);
    return () => window.clearTimeout(timeoutId);
  }, [recentlyAddedProductId]);

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
    setRecentlyAddedProductId(productId);
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

  const quickCartQuantities = useMemo(() => {
    return quickCart.reduce((acc, item) => {
      acc[item.id] = item.cantidad;
      return acc;
    }, {});
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
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(255, 246, 214, 0.72), rgba(255, 255, 255, 0.18)), url(${fondo})`,
      }}
    >
      <div className="w-[7%] flex-shrink-0">
        <Sidebar />
      </div>

      <div className="w-[70%] flex flex-col">
        <div className="h-[11%] flex-shrink-0">
          <div className="flex h-full items-center justify-between px-[3vw] py-[2vh]">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SuperPollo" className="h-[7vh] w-auto rounded-xl object-contain" />
              <div>
                <h1 className="mb-0 font-nunito text-[1.8vw] font-extrabold text-gray-700">Pedido rápido</h1>
              </div>
            </div>
            <div className="w-[18vw]">
              <Reloj />
            </div>
          </div>
        </div>

        {feedback?.type === 'error' && (
          <div className="px-[3vw] pt-3">
            <div className="rounded-xl border border-red-200 bg-red-100 px-4 py-3 font-nunito font-bold text-red-700">
              {feedback.message}
            </div>
          </div>
        )}

        <div className="p-[1.5vw] pl-[3vw] h-[86%] max-h-[89%] grid grid-cols-5 overflow-y-auto gap-4">
          <Card
            quickMode
            onProductClick={addToQuickCart}
            isProductDisabled={(product) => !canAddOneMoreUnit(product)}
            recentlyAddedProductId={recentlyAddedProductId}
            quickCartQuantities={quickCartQuantities}
          />
        </div>
      </div>

      <div className="w-[23%] flex-shrink-0">
        <aside className="m-[0.8vw] flex h-[calc(100vh-1.6vw)] flex-col overflow-hidden rounded-xl bg-white/92 shadow-2xl backdrop-blur-sm">
          <div className="bg-[#f2ac02] px-3 py-2">
            <div className="flex items-center justify-between">
              <h1 className="mb-0 font-nunito text-lg font-extrabold text-white">Pedido rápido</h1>
              <span className="rounded-full bg-gray-700 px-2 py-0.5 font-nunito text-xs font-extrabold text-white">
                {quickCart.reduce((acc, item) => acc + item.cantidad, 0)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-white/25 px-2 py-1.5 font-nunito text-xs">
              <span className="font-bold text-white">AAgenerico</span>
              <span className="font-extrabold text-white">{selectedSlotTime || '--:--'}</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            {quickCart.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <p className="font-nunito text-gray-500 mb-0">Toca productos para crear el pedido.</p>
              </div>
            ) : (
              <>
                <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-2 border-b border-dashed pb-1.5 font-nunito text-[11px] font-bold uppercase text-gray-500">
                  <span>Producto</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">Importe</span>
                </div>

                <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {quickCart.map((item) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 rounded-md border border-gray-200 px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="mb-0 truncate font-nunito text-sm font-bold leading-tight text-gray-800">{item.name}</p>
                        <p className="mb-0 font-nunito text-[11px] leading-tight text-gray-500">{Number(item.price).toFixed(2)} € ud.</p>
                      </div>

                      <div className="flex items-center justify-end font-nunito text-sm font-extrabold text-gray-700">
                        {(Number(item.price) * item.cantidad).toFixed(2)} €
                      </div>

                      <div className="col-span-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-gray-300">
                          <button
                            type="button"
                            className="px-2 py-0.5 text-sm font-bold text-gray-700"
                            onClick={() => updateItemQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="min-w-[26px] text-center font-nunito text-sm font-extrabold text-gray-800">{item.cantidad}</span>
                          <button
                            type="button"
                            className="px-2 py-0.5 text-sm font-bold text-gray-700"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="font-nunito text-xs font-bold text-red-600 hover:text-red-700"
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
            <div className="mt-2 border-t border-dashed border-gray-300 pt-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-nunito text-lg font-extrabold text-gray-700">
                  Total: {totalPedido.toFixed(2)} €
                </div>
                {quickCart.length > 0 && (
                  <button
                    type="button"
                    className="font-nunito text-xs font-bold text-red-600 hover:text-red-700"
                    onClick={clearQuickCart}
                  >
                    Vaciar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-red-500 bg-white px-2 py-2 font-nunito text-sm font-bold text-red-500 transition-colors hover:border-red-600 hover:text-red-600 disabled:opacity-40"
                  onClick={clearQuickCart}
                  disabled={quickCart.length === 0 || isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-md border border-yellow-500 bg-[#f2ac02] px-2 py-2 font-nunito text-sm font-extrabold text-white shadow-md transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={handleConfirmQuickOrder}
                  disabled={quickCart.length === 0 || isSubmitting}
                >
                  {isSubmitting ? 'Procesando...' : 'Cobrar'}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuickOrderLayout;
