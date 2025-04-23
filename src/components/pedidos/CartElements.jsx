import { useState, useContext, useEffect } from 'react';
import ModalProductos from './ModalProductos';
import { dataContext } from '../Context/DataContext';
import ElementsCantidad from './ElementsCantidad';

const CartElements = () => {
  const { cart, setCart } = useContext(dataContext);
  const [show, setShow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleShow = (product) => {
    setSelectedProduct(product);
    setShow(true);
  };

  const handleClose = () => setShow(false);
  const isTrueValue = (value) => value === 1 || value === true;

  return (
    <>
      {cart.map((product, index) => {
        // Unificamos la propiedad de precio usando "precio" o "price"
        const precioProducto = product.precio ?? product.price;
        return (
          <ul className="my-[1vh] space-y-3" key={product.id_cart}>
            <li onClick={() => handleShow(product)}>
              <a
                href="#"
                className="flex items-center p-[0.80vh] font-bold text-gray-100 rounded-lg group hover:shadow bg-gray-600 hover:bg-gray-500"
              >
                <img src={product.imagen} alt={product.name} className="w-[2vw]" />
                <ElementsCantidad cantidad={product.cantidad} />
                <span className="font-extrabold font-nunito text-gray-100 flex-1 ms-[0.75vw] whitespace-nowrap truncate">
                  {product.name} <br />
                  {/* extras */}
                  <span className="text-[0.60vw] font-nunito text-gray-400">
                  { isTrueValue(product.extrasalsa) && <span>Extra Salsa, </span>}
                    { isTrueValue(product.sinsalsa) && <span>Sin salsa, </span>}
                    { isTrueValue(product.tostado) && <span>Tostado, </span>}
                    { isTrueValue(product.troceado) && <span>Troceado, </span>}
                    { isTrueValue(product.celiaco) && <span>Celiaco</span>}
                  </span>
                </span>
                <span className="inline-flex items-center justify-center px-[0.5vw] py-[0.125vw] ms-[0.75vw] text-md font-medium text-gray-500 bg-gray-200 rounded dark:bg-gray-700 dark:text-gray-400">
                  {(precioProducto * product.cantidad).toFixed(2)}<span>€</span>
                </span>
              </a>
            </li>
          </ul>
        );
      })}
      <ModalProductos
        show={show}
        handleClose={handleClose}
        product={selectedProduct}
        isNuevoProducto={false}
      />
    </>
  );
};

export default CartElements;
