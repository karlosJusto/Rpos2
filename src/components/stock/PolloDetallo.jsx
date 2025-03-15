import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase'; // Importa la instancia de Firebase
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'; // Importa las funciones necesarias 
import Table from 'react-bootstrap/Table';

const PolloDetallo = () => {
  const [estadisticas, setEstadisticas] = useState([]); // Estado para almacenar los datos
  const [loading, setLoading] = useState(true); // Estado para manejar el estado de carga

  useEffect(() => {
    // Función para obtener los datos de la colección 'estadisticas_diarias'
    const obtenerEstadisticas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "estadisticas_diarias"));
        
        // Mapeamos los documentos y extraemos los datos
        const datos = querySnapshot.docs.map(doc => {
          // Aquí usamos el nombre del documento como "dia" y los datos del documento
          const data = doc.data();
          return {
            dia: doc.id, // Utilizamos el ID del documento como el "dia"
            ...data // Agregamos los datos del documento al objeto
          };
        });

        // Ordenamos los datos por la fecha del día (aseguramos que 'dia' esté en formato YYYY-MM-DD)
        const datosOrdenados = datos.sort((a, b) => {
          const fechaA = new Date(a.dia); // Convertimos el día en objeto Date
          const fechaB = new Date(b.dia); // Convertimos el día en objeto Date
          return fechaA - fechaB; // Ordenar de los más antiguos a los más recientes
        });

        // Limitamos a los últimos 30 días
        const datosLimitados = datosOrdenados.slice(0, 30);

        setEstadisticas(datosLimitados); // Guarda los datos ordenados y limitados en el estado
      } catch (error) {
        console.error("Error al obtener los datos de Firestore: ", error);
      }
    };

    obtenerEstadisticas(); // Llama a la función al cargar el componente
    setLoading(false); // Cambia el estado de carga
  }, []);

  // Función para manejar el cambio de valores en los inputs
  const handleInputChange = (e, dia, campo) => {
    const value = parseFloat(e.target.value) || 0; // Validamos que el valor sea numérico
    setEstadisticas(prevEstadisticas =>
      prevEstadisticas.map(item =>
        item.dia === dia
          ? { ...item, [campo]: value } // Actualizamos el campo correspondiente solo para este día
          : item
      )
    );
  };

  // Función para actualizar todos los campos en Firebase
  const handleActualizar = async () => {
    try {
      for (const item of estadisticas) {
        const docRef = doc(db, 'estadisticas_diarias', item.dia); // Referencia al documento en Firestore

         // Realizamos los cálculos antes de actualizar el documento
         const stockActualizado = (item.entran || 0) + (item.stock || 0);
         const stockFinal = stockActualizado - (item.vd || 0) - (item.baja || 0) - (item.devueltos || 0);

        // Aquí actualizamos todos los campos para ese día
        await updateDoc(docRef, {
          entran: item.entran,
          baja: item.baja,
          devueltos: item.devueltos,
          stockactualizado: stockActualizado,
          stockfinal: stockFinal,
           // Calculo de total
        });

       //console.log(`Datos del día ${item.dia} actualizados correctamente.`);
       //alert(`Datos del día ${item.dia} actualizados correctamente.`);
      }
      
    } catch (error) {
      console.error("Error al actualizar los datos en Firebase:", error);
    }
  };

  // Si estamos cargando, mostramos un mensaje de carga
  if (loading) {
    return <p className="text-center">Cargando estadísticas...</p>;
  }

  return (
    <div className="container my-4">
      <h2 className="text-center mb-4 font-nunito text-gray-500 text-2xl">Gestion Stock Pollos</h2>
      <Table striped bordered hover size="sm" className='font-nunito'>
        <thead>
          <tr className='text-center'>
            <th>Día</th>
            <th>Quedan</th>
            <th>Entran</th>
            <th>Total</th>
            <th>Salen</th>
            <th>Baja</th>
            <th>Devueltos</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody className='text-center'>
          {/* Mapeamos los datos de las estadisticas y los mostramos en la tabla */}
          {estadisticas.map((item, index) => {
            // Calculamos stockActualizado y stockFinal dentro del JSX para cada fila
              const stockActualizado = (item.entran || 0) + (item.stock || 0);
              const stockFinal = stockActualizado - (item.vd || 0) - (item.baja || 0) - (item.devueltos || 0);

            const isEditable = index >= estadisticas.length - 3; // Solo los últimos 3 días son editables

            return (
              <tr key={index}>
                <td className="table-cell-width capitalize"> {item.diasemana} , {item.dia}</td>
                <td className="table-cell-width w-36 font-extrabold">{item.stock}</td>
                <td className="table-cell-width text-center w-32">
                  <input 
                    type="number" 
                    value={item.entran === 0 ? '0' : item.entran || ''} 
                    onChange={(e) => handleInputChange(e, item.dia, 'entran')} 
                    className="form-control w-24 mx-auto text-center"
                    min="0" // Aseguramos que no pueda ser negativo
                    disabled={!isEditable} // Deshabilitamos la edición si no es uno de los últimos 3 días
                  />
                </td>

                <td className="table-cell-width w-40 font-extrabold">{stockActualizado}</td>
                <td className="table-cell-width w-40">{item.vd || 0}</td>
                <td className="table-cell-width w-32">
                  <input 
                    type="number" 
                    value={item.baja === 0 ? '0' : item.baja || ''} 
                    onChange={(e) => handleInputChange(e, item.dia, 'baja')} 
                    className="form-control w-24 mx-auto text-center"
                    min="0" // Aseguramos que no pueda ser negativo
                    disabled={!isEditable} // Deshabilitamos la edición si no es uno de los últimos 3 días
                  />
                </td>
                <td className="table-cell-width w-40 ">
                  <input 
                    type="number" 
                    value={item.devueltos === 0 ? '0' : item.devueltos || ''} 
                    onChange={(e) => handleInputChange(e, item.dia, 'devueltos')} 
                    className="form-control w-24 mx-auto text-center"
                    min="0" // Aseguramos que no pueda ser negativo
                    disabled={!isEditable} // Deshabilitamos la edición si no es uno de los últimos 3 días
                  />
                </td>
                <td className="table-cell-width w-40 font-extrabold">
                  {stockFinal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className='flex text-center justify-center items-center'>
        <button 
          className="mt-[2vw] w-[10vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none"
          onClick={handleActualizar}
        >
          <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_iconCarrier">
              <path d="M4 18V6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
              <path d="M20 12L20 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
              <path d="M12 10C16.4183 10 20 8.20914 20 6C20 3.79086 16.4183 2 12 2C7.58172 2 4 3.79086 4 6C4 8.20914 7.58172 10 12 10Z"
                stroke="#ffffff" strokeWidth="1.5"></path>
              <path d="M20 12C20 14.2091 16.4183 16 12 16C7.58172 16 4 14.2091 4 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"></path>
              <path d="M20 18C20 20.2091 16.4183 22 12 22C7.58172 22 4 20.2091 4 18" stroke="#ffffff" strokeWidth="1.5"></path>
            </g>
          </svg>
          <span className="ml-[0.5vw] font-nunito text-md">
            Actualizar
          </span>
        </button>
      </div>
    </div>
  );
};

export default PolloDetallo;
