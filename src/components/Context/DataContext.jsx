import { createContext, useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useParams } from "react-router-dom";

export const dataContext = createContext();

const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [cart, setCart] = useState([]);
  const [buscar, setBuscar] = useState(""); // Nuevo estado para el término de búsqueda

  // Función para actualizar el stock de un producto
  const actualizarStock = async (id_product, nuevoStock) => {
    // Asegurarse de que el id_product se convierte a string
    const idString = String(id_product);  // Conversión a cadena
    if (!idString) {
      console.error("El ID del producto es inválido");
      return;
    }

    try {
      const productoRef = doc(db, "productos", idString); // Usamos 'idString' aquí
      await updateDoc(productoRef, { stock: nuevoStock });
      
      // Recargar los productos después de la actualización
      const productosRef = collection(db, "productos");
      const querySnapshot = await getDocs(productosRef);
      const productosList = querySnapshot.docs.map((doc) => ({
        id_product: doc.id,
        ...doc.data(),
      }));
      setData(productosList); // Actualiza el estado con los productos recargados
    } catch (error) {
      console.error("Error al actualizar el stock:", error);
    }
  };

  const categoria = useParams().categoria;

  useEffect(() => {
    const productosRef = collection(db, "productos");

    getDocs(productosRef)
      .then((resp) => {
        setData(
          resp.docs.map((doc) => {
            return { ...doc.data(), id: doc.id };
          })
        );
      })
      .catch((error) => {
        console.error("Error al obtener productos: ", error);
      });
  }, []);

  // Función para actualizar el término de búsqueda
  const handleSearch = (e) => {
    setBuscar(e.target.value);
  };

  // Filtrar productos globalmente por el nombre
  const filteredData = data.filter((product) =>
    product.name.toLowerCase().includes(buscar.toLowerCase()) // Filtra globalmente por el nombre
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
