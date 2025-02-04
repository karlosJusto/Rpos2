import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import patata from '../../assets/freidora/patata.png';
import pimiento from '../../assets/freidora/pimiento.png';
import croquetas from '../../assets/freidora/croquetas.png';
import singluten from '../../assets/singluten.png'; // Imagen sin gluten

const Freidora = () => {
  const [pedidos, setPedidos] = useState([]);

  // Definimos los IDs y sus imágenes asociadas
  const productosAFiltrar = [
    { id: '10', nombre: 'Patatas Fritas', imagen: patata },
    { id: '3', nombre: 'Pimientos', imagen: pimiento },
    { id: '45', nombre: 'Croquetas', imagen: croquetas }
  ];

  // Fetch orders with the filtered products
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        // Consulta a la colección de pedidos
        const pedidosRef = collection(db, 'pedidos');
        const querySnapshot = await getDocs(pedidosRef);

        // Filtrar los pedidos que contienen productos de interés
        const pedidosList = querySnapshot.docs.map(doc => {
          const pedido = doc.data();

          // Filtramos productos de interés
          const productosFiltrados = productosAFiltrar.map(productoAFiltrar => {
            let productosConFiltro;

            // Si el id es 45 (Croquetas), filtramos por nombre
            if (productoAFiltrar.id === '45') {
              productosConFiltro = pedido.productos.filter(producto =>
                producto.nombre.toLowerCase().includes('croquetas') // Filtrar por nombre
              );
            } else {
              // Si no es "Croquetas", lo filtramos por ID
              productosConFiltro = pedido.productos.filter(producto =>
                producto.id === productoAFiltrar.id
              );
            }

            return { ...productoAFiltrar, productos: productosConFiltro };
          }).filter(item => item.productos.length > 0); // Filtramos solo los productos que hay en el pedido

          if (productosFiltrados.length > 0) {
            return { 
              id: doc.id, 
              productosFiltrados, 
              celiaco: pedido.celiaco, 
              NumeroPedido: pedido.NumeroPedido  // Añadimos el NumeroPedido
            };
          }

          //console.log("Pedidos filtrados:", productosFiltradoss);  // Verifica los pedidos filtrados

          return null;
        }).filter(pedido => pedido !== null);

        setPedidos(pedidosList); // Guardamos los pedidos con productos filtrados en el estado
      } catch (error) {
        console.error("Error al obtener los pedidos: ", error);
      }
    };
    fetchPedidos();
  }, []);

  // Función para renderizar los productos de un pedido
  const renderProductos = (productos, celiaco, numeroPedido) => {
    return productos.map((producto, index) => (
      <div key={index} className="bg-white rounded-lg shadow-lg p-2 w-[80%]">
        <div className="flex flex-row items-center justify-between"> {/* Flex para alinear en fila y separar los elementos */}
          
          {/* Número de Pedido alineado a la izquierda */}
          <h3 className="text-gray-500 font-extrabold bg-[#f2ac02] font-nunito rounded-md p-[0.25vw] text-xs ">{numeroPedido}</h3>
          
          {/* Contenedor para el nombre y cantidad del producto centrado */}
          <div className="flex-1 text-center">
            <h3 className="font-semibold text-md font-nunito">{producto.cantidad} x {producto.nombre}</h3>
          </div>
          
          {/* Si el pedido es para celíaco, mostramos la imagen "Sin Gluten" */}
          {celiaco && (
            <img
              src={singluten}
              alt="Sin Gluten"
              className="ml-4 w-[25px] h-[25px] rounded-full" // Añadir un pequeño margen a la izquierda
            />
          )}
        </div>
      </div>
    ));
  };

  return (
    <div>
      <div className="flex text-center justify-between p-6 ">
        {productosAFiltrar.map((productoAFiltrar) => {
          // Filtramos los pedidos que contienen productos de este tipo
          const pedidosConProducto = pedidos.filter(pedido => 
            pedido.productosFiltrados.some(item => {
              if (productoAFiltrar.id === '45') {
                // Si es "Croquetas", filtrar por nombre
                return item.nombre.toLowerCase().includes('croquetas');
              } else {
                // Para los demás productos, filtrar por id
                return item.id === productoAFiltrar.id;
              }
            })
          );

          // Si hay pedidos con este producto, los renderizamos
          return pedidosConProducto.length > 0 && (
            <div key={productoAFiltrar.id} className="bg-[#F3F3F3] w-[30%] rounded-lg ">
              <div className="pt-2 text-center">
              <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">{productoAFiltrar.nombre}</h1>
                
              </div>
              <div className="flex justify-center pt-2">
                <img
                  src={productoAFiltrar.imagen}
                  alt={productoAFiltrar.nombre}
                  className="p-3 rounded-full bg-white w-24 shadow-md"
                />
              </div>
              <div className="mt-[2.8vh] text-center">
                {/* Contenedor con scroll cuando hay más de 8 productos */}
                <div className="overflow-y-auto h-[420px] bg-[#F3F3F3]">
                  {pedidosConProducto.map((pedido) => (
                    <div key={pedido.id} className="p-1 m-1 ">
                      {/* Filtramos los productos correspondientes para este tipo */}
                      {pedido.productosFiltrados
                        .filter(item => {
                          if (productoAFiltrar.id === '45') {
                            return item.nombre.toLowerCase().includes('croquetas'); // Filtrar por nombre
                          } else {
                            return item.id === productoAFiltrar.id; // Filtrar por id
                          }
                        })
                        .map((item) => (
                          <div key={item.id} className="flex flex-col gap-4 items-center ">
                            {/* Pasamos NumeroPedido, celiaco y productos a la función de renderizado */}
                            {renderProductos(item.productos, pedido.celiaco, pedido.NumeroPedido)}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mx-auto w-full px-4 font-nunito">

            <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
              <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Totales</h1>
            </div>
            
            <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
              <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Anteriores</h1>
            </div>
            
            <div className="bg-[#F3F3F3] w-[30%] rounded-lg h-[30vh]">
              <h1 className="bg-gray-700 p-2 text-white text-center rounded-md">Posteriores</h1>
            </div>

      </div>

    </div>
  );
};

export default Freidora;
