import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

import singluten from '../../assets/singluten.png';
import vegano from '../../assets/vegano.png';
import vegetariano from '../../assets/vegetariano.png';

import { useState, useContext, useEffect } from 'react';
import { dataContext } from '../Context/DataContext';

// Helper para verificar si un valor representa "verdadero" (ej. 1 o true)
const isTrueValue = (value) => value === 1 || value === true;

// Función auxiliar para comparar si dos productos son exactamente iguales en opciones
const sonOpcionesIguales = (producto1, producto2) => {
  // Asegurar que ambos productos están definidos para evitar errores
  if (!producto1 || !producto2) {
    // console.log("sonOpcionesIguales: Uno o ambos productos son undefined/null");
    return false;
  }

  const opcionesCoinciden =
    isTrueValue(producto1.extrasalsa) === isTrueValue(producto2.extrasalsa) &&
    isTrueValue(producto1.sinsalsa) === isTrueValue(producto2.sinsalsa) &&
    isTrueValue(producto1.tostado) === isTrueValue(producto2.tostado) &&
    isTrueValue(producto1.troceado) === isTrueValue(producto2.troceado) &&
    // Compara productoDoble como string '1' o su ausencia/falsedad
    (String(producto1.productoDoble) === '1') === (String(producto2.productoDoble) === '1') &&
    isTrueValue(producto1.celiaco) === isTrueValue(producto2.celiaco);

  // console.log(`sonOpcionesIguales: Comparando producto1 (ID: ${producto1.id}, ID_CART: ${producto1.id_cart}) con producto2 (ID: ${producto2.id}, ID_CART: ${producto2.id_cart}). Coinciden: ${opcionesCoinciden}`);
  return opcionesCoinciden;
};

const ModalProductos = ({ show, handleClose, product, isNuevoProducto }) => {
  const { cart, setCart } = useContext(dataContext);

  // Estados para los valores de los checkbox y switch
  const [sinsalsa, setSinsalsa] = useState(false);
  const [extrasalsa, setExtrasalsa] = useState(false);
  const [tostado, setTostado] = useState(false);
  const [troceado, setTroceado] = useState(false);
  const [celiaco, setCeliaco] = useState(false);
  const [clickCount, setClickCount] = useState(1);

  // Al cargar el modal, inicializamos las opciones con los valores del producto
  useEffect(() => {
    // console.log("ModalProductos useEffect: show=", show, "product=", product, "isNuevoProducto=", isNuevoProducto);
    if (show && product) {
      setClickCount(isNuevoProducto ? 1 : product.cantidad || 1);
      setSinsalsa(product.sinsalsa || false);
      setExtrasalsa(product.extrasalsa || false);
      setTostado(product.tostado || false);
      setTroceado(product.troceado || false);
      setCeliaco(product.celiaco || false);
      // console.log("ModalProductos useEffect: Estado local actualizado:", { clickCount: isNuevoProducto ? 1 : product.cantidad || 1, sinsalsa: product.sinsalsa || false, extrasalsa: product.extrasalsa || false, tostado: product.tostado || false, troceado: product.troceado || false, celiaco: product.celiaco || false });
    } else if (!show) {
      // Resetear estado si el modal se cierra, para asegurar limpieza
      // console.log("ModalProductos useEffect: Reseteando estado local por cierre de modal.");
      setClickCount(1);
      setSinsalsa(false);
      setExtrasalsa(false);
      setTostado(false);
      setTroceado(false);
      setCeliaco(false);
    }
  }, [product, isNuevoProducto, show]);

  // Helper para verificar flags como 'cocina' que pueden ser "1", 1 o true
  const isCocinaFlagSet = (value) => String(value) === "1" || value === true || value === 1;

  const buyProducts = (baseProductInfo) => {
    console.log("buyProducts: Iniciando. baseProductInfo:", baseProductInfo, "isNuevoProducto:", isNuevoProducto);
    console.log("buyProducts: Estado local del modal:", { clickCount, sinsalsa, extrasalsa, tostado, troceado, celiaco });

    // Determinar el ID del tipo de producto correctamente.
    // Si es nuevo, el ID viene de 'id_product'. Si se edita desde el carrito, ya debería ser 'id'.
    const productId = isNuevoProducto ? baseProductInfo.id_product : baseProductInfo.id;

    if (!baseProductInfo || typeof productId === 'undefined') {
        console.error("buyProducts: ¡ERROR CRÍTICO! El ID del producto (type ID) es undefined. No se puede continuar.", { baseProductInfo, productId });
        alert("Error: No se pudo procesar el producto. Falta información esencial (ID).");
        handleClose();
        return;
    }

    const configuredProductDetails = {
      id: productId, // Usar el productId determinado
      name: baseProductInfo.name,
      price: baseProductInfo.price ?? baseProductInfo.precio,
      imagen: baseProductInfo.imagen,
      description: baseProductInfo.description,
      productoDoble: baseProductInfo.productoDoble,
      // Opciones configurables desde el modal
      cantidad: clickCount,
      sinsalsa,
      extrasalsa,
      tostado,
      troceado,
      celiaco,
      freidora: baseProductInfo.freidora || false,
      //Otras propiedades que quieras mantener en el carrito
      categoria: baseProductInfo.categoria,
      alias: baseProductInfo.alias,
      position: baseProductInfo.position,
       botonCeliaco: baseProductInfo.botonCeliaco || false,
    };
    console.log("buyProducts: configuredProductDetails:", configuredProductDetails);

    if (isNuevoProducto) {
      console.log("buyProducts: Es un producto nuevo. Buscando coincidencias en el carrito...");
      setCart((prevCart) => {
        console.log("buyProducts (setCart para nuevo): Carrito anterior:", prevCart);
        const indiceExistente = prevCart.findIndex(
          (item) => {
            const idMatches = item.id === configuredProductDetails.id;
            const optionsMatch = sonOpcionesIguales(item, configuredProductDetails);
            // console.log(`buyProducts (findIndex): Comparando item.id=${item.id} con configured.id=${configuredProductDetails.id} (Match: ${idMatches}). Opciones coinciden: ${optionsMatch}`);
            return idMatches && optionsMatch;
          }
        );

        if (indiceExistente !== -1) {
          console.log(`buyProducts: Producto existente encontrado en índice ${indiceExistente}. Sumando cantidad.`);
          return prevCart.map((item, index) =>
            index === indiceExistente
              ? { ...item, cantidad: item.cantidad + configuredProductDetails.cantidad }
              : item
          );
        } else {
          console.log("buyProducts: No se encontró producto idéntico. Añadiendo como nuevo.");
          const newCartItem = {
            ...configuredProductDetails,
            id_cart: Date.now().toString() + Math.random().toString(36).substr(2, 9), // ID único para la línea del carrito
          };
          console.log("buyProducts: Nuevo ítem a añadir:", newCartItem);
          return [...prevCart, newCartItem];
        }
      });
    } else {
      console.log("buyProducts: Modificando producto existente. ID_CART del producto a modificar:", baseProductInfo.id_cart);
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id_cart === baseProductInfo.id_cart
            ? { ...configuredProductDetails, id_cart: baseProductInfo.id_cart } // Mantener el id_cart original
            : item
        )
      );
    }

    // El reseteo de los estados locales del modal ya se maneja en el useEffect al cambiar 'show'
    handleClose();
  };

  const deleteProduct = (productToDelete) => {
    console.log("deleteProduct: Eliminando producto con id_cart:", productToDelete?.id_cart);
    if (!productToDelete?.id_cart) {
        console.error("deleteProduct: No se puede eliminar, falta id_cart.");
        return;
    }
    const updatedCart = cart.filter((item) => item.id_cart !== productToDelete.id_cart);
    setCart(updatedCart);
    handleClose();
  };

  const sumar = () => setClickCount(clickCount + 1);
  const restar = () => { if (clickCount > 1) setClickCount(clickCount - 1); };

  if (show && !product) {
    console.warn("ModalProductos: Se intenta mostrar el modal pero 'product' es undefined/null.");
    return null;
  }

  return (
    <>
      <Modal
        show={show}
        onHide={handleClose}
        size="lg"
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton className="border-none" onClick={handleClose} />
        <Modal.Body>
          <div className='flex -mt-6 '>
            <img src={product?.imagen} alt={product?.name || "producto"} className='w-52 h-42 object-cover pr-7' />
            <div>
              <h1 className='font-nunito text-3xl font-extrabold text-gray-900 pb-3'>{product?.name}</h1>
              <h3 className='font-nunito text-lg text-gray-400 '>{product?.description}</h3>
              <div className='border-b-2 pt-3'></div>
            </div>
          </div>

          <div className="flex ms-[30px] gap-3 p-3">
            {isCocinaFlagSet(product?.gluten_free) && (
              <img src={singluten} alt="sin gluten" className="h-[1.5vw] w-[1.5vw]" />
            )}
            {isCocinaFlagSet(product?.vegan) && (
              <img src={vegano} alt="vegano" className="h-[1.5vw] w-[1.5vw]" />
            )}
            {isCocinaFlagSet(product?.vegetarian) && (
              <img src={vegetariano} alt="vegetariano" className="h-[1.5vw] w-[1.5vw]" />
            )}
          </div>

          <div className='flex gap-2 pl-2 justify-center '>
            <span onClick={restar} className='w-12 h-10 text-5xl text-center cursor-pointer select-none'>-</span>
            <span className='w-12 h-10 text-5xl text-center'>{clickCount}</span>
            <span onClick={sumar} className='w-12 h-10 text-5xl text-center cursor-pointer select-none'>+</span>
          </div>

          <div className="p-2 text-left border-b-2 mt-4 ">
            <h4 className="text-2xl font-extrabold font-nunito">
              Opciones
            </h4>
          </div>

          {(product?.name === "Pollo Asado" || product?.name === "1/2 Pollo Asado") && (
            <div className='text-center flex justify-center gap-10 font-nunito text-lg p-[2vw] pt-[5vh]'>
              <div className="form-check form-switch ">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="sinsalsa"
                  checked={sinsalsa}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSinsalsa(true);
                      setExtrasalsa(false);
                    } else {
                      setSinsalsa(false);
                    }
                  }}
                />
                <label className="form-check-label font-nunito font-bold" htmlFor="sinsalsa">Sin salsa</label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="extrasalsa"
                  checked={extrasalsa}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setExtrasalsa(true);
                      setSinsalsa(false);
                    } else {
                      setExtrasalsa(false);
                    }
                  }}
                />
                <label className="form-check-label font-nunito font-bold" htmlFor="extrasalsa">Extra Salsa</label>
              </div>
            </div>
          )}

          <div className='text-center justify-center items-center font-nunito p-4'>
            {(product?.name === "Pollo Asado" || product?.name === "1/2 Pollo Asado") && (
              <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
                <input
                  className="form-check-input m-1"
                  type="checkbox"
                  id="tostado"
                  name="tostado"
                  checked={tostado}
                  onChange={(e) => setTostado(e.target.checked)}
                />
                <label className="form-check-label text-lg font-nunito text-gray-900 font-bold" htmlFor="tostado">Tostado</label>
              </div>
            )}

            {(product?.name === "Pollo Asado" || product?.name === "1/2 Pollo Asado") && (
              <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
                <input
                  className="form-check-input m-1"
                  type="checkbox"
                  id="troceado"
                  name="troceado"
                  checked={troceado}
                  onChange={(e) => setTroceado(e.target.checked)}
                />
                <label className="form-check-label text-lg font-nunito text-gray-900 font-bold" htmlFor="troceado">Troceado</label>
              </div>
            )}

            {product && product.botonCeliaco && (
              <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
                <input
                  className="form-check-input m-1"
                  type="checkbox"
                  id="celiaco"
                  name="celiaco"
                  checked={celiaco}
                  onChange={(e) => setCeliaco(e.target.checked)}
                />
                <label className="form-check-label text-lg font-nunito text-gray-900 font-bold" htmlFor="celiaco">Celiaco</label>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className='border-none'>
          {!isNuevoProducto && (
            <Button
              variant="danger"
              onClick={() => deleteProduct(product)}
              className="shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700"
            >
              Eliminar
            </Button>
          )}

          {isNuevoProducto && (
            <Button
              variant="secondary"
              onClick={handleClose}
              className=" shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700"
            >
              Cancelar
            </Button>
          )}

          <Button
            variant="warning" // Mantenido 'warning' para consistencia visual
            onClick={() => buyProducts(product)}
            className="shadow-md bg-white text-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:text-yellow-600 hover:border-yellow-600 p-2 font-nunito"
          >
            {isNuevoProducto ? 'Agregar' : 'Modificar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalProductos;
