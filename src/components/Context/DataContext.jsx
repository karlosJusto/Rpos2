import { createContext, useState, useEffect } from "react";
import { collection, getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useParams } from "react-router-dom";

export const dataContext = createContext();

const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [cart, setCart] = useState([]);
  const [buscar, setBuscar] = useState(""); // Nuevo estado para el término de búsqueda

  // Función para actualizar el stock de un producto
  const actualizarStock = async (id_product, nuevoStock) => {
    const idString = String(id_product);
    // Agregar un console.log para verificar el valor de id_product
   // console.log("ID del producto recibido:", id_product);
    if (!idString) {
      console.error("El ID del producto es inválido");
      return;
    }

    try {
      const productoRef = doc(db, "productos", idString);
      await updateDoc(productoRef, { stock: nuevoStock });
    } catch (error) {
      console.error("Error al actualizar el stock:", error);
    }
  };

  const categoria = useParams().categoria;

  // Usamos onSnapshot para escuchar los cambios en la colección 'productos'
  useEffect(() => {
    const productosRef = collection(db, "productos");
    
    // Establecemos el listener en tiempo real
    const unsubscribe = onSnapshot(productosRef, (querySnapshot) => {
      const productosList = querySnapshot.docs.map((doc) => ({
        id_product: doc.id,
        ...doc.data(),
      }));
      setData(productosList); // Actualizamos el estado con los datos en tiempo real
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  // Función para actualizar el término de búsqueda
  const handleSearch = (e) => {
    setBuscar(e.target.value);
  };

  // Filtrar productos globalmente por el nombre
  const filteredData = data.filter((product) =>
    product.name?.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <dataContext.Provider
      value={{
        data: filteredData, // Pasamos los productos filtrados al contexto
        cart,
        setCart,
        buscar,
        handleSearch, // Pasamos la función de búsqueda
        setBuscar, // Pasar la función setBuscar 
        actualizarStock, // Pasar la función para actualizar el stock
      }}
    >
      {children}
    </dataContext.Provider>
  );
};

export default DataProvider;
