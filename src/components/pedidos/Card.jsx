import ModalProductos from './ModalProductos';
import singluten from '../../assets/singluten.png';
import vegano from '../../assets/vegano.png';
import vegetariano from '../../assets/vegetariano.png';
import { useState, useContext } from 'react';
import { dataContext } from '../Context/DataContext';
import { useParams } from 'react-router-dom';

const Card = () => {
  const [show, setShow] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleClose = () => setShow(false);
  const handleShow = (product) => {
    setSelectedProduct(product);
    setShow(true);
  };

  const { categoria } = useParams();
  const { data, buscar } = useContext(dataContext);

  // Filtrado por búsqueda
  const filteredBySearch = data.filter((product) =>
    product.name?.toLowerCase().includes(buscar.toLowerCase())
  );

  // Filtrado por categoría (si existe en la URL)
  const dataFiltered = categoria
    ? filteredBySearch.filter((product) => product.categoria === categoria)
    : filteredBySearch;

  // Ordenamos por posición
  const sortedData = [...dataFiltered].sort((a, b) => a.position - b.position);

  // Mientras los datos no estén cargados mostramos loading
  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {sortedData.length > 0 ? (
        sortedData.map((product) => (
          <div key={product.id_product}>
            <div
              className="rounded-xl max-w-[11vw] min-w-[11vw] overflow-hidden bg-gray-100 shadow-xl"
              onClick={() => handleShow(product)}
            >
              <img src={product.imagen_rpos} alt={product.name} className="" />
              <div className="p-[0.5vw] text-[1.125vw]">
                <h1 className="text-center font-nunito font-bold truncate">
                  {product.name}
                </h1>
              </div>
              <div className="flex items-center justify-center gap-3 h-[1.5vw]">
                {product.gluten_free && (
                  <img src={singluten} alt="sin gluten" className="h-[1.5vw] w-[1.5vw]" />
                )}
                {product.vegan && (
                  <img src={vegano} alt="vegano" className="h-[1.5vw] w-[1.5vw]" />
                )}
                {product.vegetarian && (
                  <img src={vegetariano} alt="vegetariano" className="h-[1.5vw] w-[1.5vw]" />
                )}
              </div>
              <div
                className={`flex items-center ${
                  product.id_product === 2 || product.id_product === 48
                    ? 'justify-end'
                    : 'justify-between'
                } p-[0.5vw]`}
              >
                <h2
                  className={`text-gray-100 font-nunito text-[0.85vw] border-1 p-1 bg-gray-600 rounded-[0.375vw] mt-[0.50vw] ${
                    product.id_product === 2 || product.id_product === 48 ? 'hidden' : ''
                  }`}
                >
                  <span
                    className={
                      product.stock === 0 ? 'text-red-500' : 'text-gray-100'
                    }
                  >
                    Stock: {product.stock}
                  </span>
                </h2>

                <h2 className="text-[1.25vw] font-extrabold text-gray-700 font-nunito pt-2">
                  {product.price?.toFixed(2)} €
                </h2>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-500">No se encontraron productos</div>
      )}

      {/* Modal para producto */}
      <ModalProductos
        show={show}
        handleClose={handleClose}
        product={selectedProduct}
        isNuevoProducto={true}
      />
    </>
  );
};

export default Card;
