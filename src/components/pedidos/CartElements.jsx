import { useState, useContext } from 'react'; // No necesitas useEffect aquí
import ModalProductos from './ModalProductos';
import { dataContext } from '../Context/DataContext';
import ElementsCantidad from './ElementsCantidad';

const CartElements = () => {
  const { cart, setCart } = useContext(dataContext);
  const [show, setShow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Estado para el producto a editar



  //console.log("CARRITO****************");
  //console.log(JSON.stringify(cart)); 

  // Función para ABRIR el modal y seleccionar el producto
  const handleShow = (product) => {
    //console.log("Abriendo modal para editar:", JSON.stringify(product));
    setSelectedProduct(product); // Guarda el producto específico que se clickeó
    setShow(true);             // Muestra el modal
  };

  // Función para CERRAR el modal y limpiar la selección
  const handleClose = () => {
    setShow(false);
    setSelectedProduct(null); // IMPORTANTE: Limpiar el producto seleccionado al cerrar
  };

  // Helper para verificar valores booleanos/numéricos (sin cambios)
  const isTrueValue = (value) => value === 1 || value === true;

  // Función para ELIMINAR producto del carrito (sin cambios)
  const eliminarProducto = (id_cart) => {
    console.log("Eliminando producto con id_cart:", id_cart);
    // Asegúrate de que id_cart existe antes de filtrar
    if (!id_cart) {
        console.error("Intento de eliminar producto sin id_cart");
        return; // Evita errores si id_cart es undefined
    }
    const nuevoCarrito = cart.filter((p) => p.id_cart !== id_cart);
    setCart(nuevoCarrito);
  };

  return (
    <>
      {cart.map((product, index) => {
        // Asegurar que el precio sea un número, default a 0 si no existe
        const precioProducto = Number(product.precio ?? product.price ?? 0);
        // Crear una key única y robusta
        const uniqueKey = product.id_cart || `cart-item-${index}-${product.id || product.id_product || Date.now()}`;

        // Verificar si el producto tiene un id_cart válido
        if (!product.id_cart) {
            console.warn("Producto en carrito sin id_cart:", product);
            // Podrías asignar uno temporal aquí si es necesario, pero idealmente debería venir con uno
        }

        return (
          // Usar la key única
          <ul className="my-[1vh] space-y-3" key={uniqueKey}>
            {/* Hacer el LI clickable y añadir cursor-pointer */}
            <li className="relative group cursor-pointer" onClick={() => handleShow(product)}>
              {/* Cambiado <a> por <div> */}
              <div
                className="flex items-center p-[0.80vh] font-bold text-gray-100 rounded-lg group hover:shadow bg-gray-600 hover:bg-gray-500"
              >
                 <img src={product.imagen} alt={product.name} className="w-[2vw]" />
                <ElementsCantidad cantidad={product.cantidad} />
                <span className="font-extrabold font-nunito text-gray-100 flex-1 ms-[0.75vw] whitespace-nowrap truncate">
                  {product.name} <br />
                  {(() => {
                    const opcionesMostradas = [];
                    if (isTrueValue(product.extrasalsa)) opcionesMostradas.push("Extra Salsa");
                    if (isTrueValue(product.sinsalsa)) opcionesMostradas.push("Sin salsa");
                    if (isTrueValue(product.tostado)) opcionesMostradas.push("Tostado");
                    if (isTrueValue(product.troceado)) opcionesMostradas.push("Troceado");
                    // Nueva lógica para "Producto Doble"
                    if (product.productoDoble === '1' && product.cantidad % 2 === 0) {
                      opcionesMostradas.push("Producto Doble");
                    }
                    if (isTrueValue(product.celiaco)) opcionesMostradas.push("Celiaco");

                    if (opcionesMostradas.length > 0) {
                      return <span className="text-[0.60vw] font-nunito text-gray-400">{opcionesMostradas.join(", ")}</span>;
                    }
                    return null;
                  })()}
                </span>
                {/* Total del producto */}
                <span className="inline-flex items-center justify-center px-[0.5vw] py-[0.125vw] ms-[0.75vw] text-md font-medium text-gray-500 bg-gray-200 rounded dark:bg-gray-700 dark:text-gray-400">

                  {(precioProducto * product.cantidad).toFixed(2)}<span>€</span>
                </span>
              </div>

              {/* Botón eliminar producto (sin cambios funcionales, pero con verificación de id_cart) */}
              <button
                className="absolute top-[-8px] right-[-8px] bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600 z-10"
                onClick={(e) => {
                  e.stopPropagation(); // Prevenir que el click en el botón active el onClick del LI
                  if (product.id_cart) { // Solo eliminar si hay id_cart
                    eliminarProducto(product.id_cart);
                  } else {
                    console.error("No se puede eliminar: producto sin id_cart", product);
                  }
                }}
                aria-label="Eliminar producto" // Mejor accesibilidad
              >
                ×
              </button>
            </li>
          </ul>
        );
      })}

      {/* Renderizar ModalProductos SOLO si hay un producto seleccionado */}
      {selectedProduct && (
         <ModalProductos
           show={show}
           handleClose={handleClose}
           product={selectedProduct}
           // Al editar desde el carrito, NUNCA es un producto nuevo en términos de añadir vs modificar
           isNuevoProducto={false}
         />
      )}
    </>
  );
};

export default CartElements;