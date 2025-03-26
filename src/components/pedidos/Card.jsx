import ModalProductos from './ModalProductos';
import singluten from '../../assets/singluten.png';
import vegano from '../../assets/vegano.png';
import vegetariano from '../../assets/vegetariano.png';
import { useState, useContext, useEffect } from 'react';
import { dataContext } from '../Context/DataContext';
import { useParams } from 'react-router-dom';

const Card = () => {
  // Estado para el modal
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  //const handleShow = (product) => setShow(product);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const handleShow = (product) => {
    setSelectedProduct(product);
    setShow(true);
  };

  const { categoria } = useParams(); // Obtenemos la categoría desde la URL
  const { data, buscar, setData } = useContext(dataContext); // Accedemos a los productos y al término de búsqueda

  // Asegurarnos de que los datos estén disponibles antes de hacer el filtrado
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data && data.length > 0) {
      setLoading(false); // Los productos están cargados, se puede proceder con el filtrado
    }
  }, [data]);

  // Si estamos cargando, mostramos un spinner o algún indicador
  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="w-16 h-16 border-4 border-t-4 border-yellow-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filtrar los productos por el término de búsqueda global
  const filteredDataBySearch = data.filter((product) =>
    product.name.toLowerCase().includes(buscar.toLowerCase()) // Filtro global por nombre
  );

  // Filtrar por categoría si es necesario
  const data_filter = categoria
    ? filteredDataBySearch.filter(product => product.categoria === categoria)
    : filteredDataBySearch;

  // Ordenar los productos por la propiedad 'position'
  data_filter.sort((a, b) => a.position - b.position);

  //console.log('Data: ', data);
  //console.log('Filtered Data by Search: ', filteredDataBySearch);
  //console.log('Filtered Data by Category: ', data_filter); 


  return (
    <>
      {data_filter.length > 0 ? (
        data_filter.map((product) => (
          <div  key={product.id_product} product={product}>    
            {/* Tarjeta del producto */}
            <div
              className="rounded-xl max-w-[11vw] min-w-[11vw] overflow-hidden bg-gray-100 shadow-xl"
              onClick={() => handleShow(product)}
            >
              <img src={product.imagen_rpos} alt={product.name} className="" />
              <div className="p-[0.5vw] text-[1.125vw]">
                <h1 className="text-center font-nunito font-bold truncate">{product.name}</h1>
              </div>
              <div className="flex items-center justify-center gap-3 h-[1.5vw]">
                {product.gluten_free && (
                  <img src={singluten} alt="sin gluten" className="h-[1.5vw] w-[1.5vw] object-cover" />
                )}
                {product.vegan && (
                  <img src={vegano} alt="vegano" className="h-[1.5vw] w-[1.5vw] object-cover" />
                )}
                {product.vegetarian && (
                  <img src={vegetariano} alt="vegetariano" className="h-[1.5vw] w-[1.5vw] object-cover" />
                )}
              </div>
              <div className={`flex items-center ${product.id_product === 2 || product.id_product === 48 ? 'justify-end' : 'justify-between'} p-[0.5vw]`}>
                <h2 className={`text-gray-100 font-nunito text-[0.85vw] border-1 p-1 bg-gray-600 rounded-[0.375vw] mt-[0.50vw] ${product.id_product === 2 || product.id_product === 48 ? 'hidden' : ''}`}>
                  <span className={product.stock === 0 ? 'text-red-500' : 'text-gray-100'}>
                    Stock: {product.stock}
                  </span>
                </h2>
                
                <h2 className="text-[1.25vw] font-extrabold text-gray-700 font-nunito pt-2">
                  {product.price.toFixed(2)} €
                </h2>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className=" flex text-center justify-center text-gray-500">No se encontraron productos</div>
      )}
      <ModalProductos show={show} handleClose={handleClose} product={selectedProduct} isNuevoProducto={true} />
    </>
  );
};

export default Card;
