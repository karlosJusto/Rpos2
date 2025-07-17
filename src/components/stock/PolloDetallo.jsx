import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../firebase/firebase';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import Table from 'react-bootstrap/Table';
import dayjs from 'dayjs';

const PolloDetallo = () => {
  const [estadisticas, setEstadisticas] = useState([]);
  const [loading, setLoading] = useState(true);
  // Ref para controlar que la actualización automática se ejecute solo una vez por carga
  const isUpdateTriggered = useRef(false);

  // EFECTO 1: Se suscribe a los cambios en Firestore en tiempo real para obtener los datos.
  useEffect(() => {
    setLoading(true);
    const estadisticasRef = collection(db, "estadisticas_diarias");
    const unsubscribe = onSnapshot(estadisticasRef, (querySnapshot) => {
      const datos = querySnapshot.docs.map(doc => ({
        dia: doc.id,
        ...doc.data()
      }));

      const datosOrdenados = datos.sort((a, b) => {
        const fechaA = dayjs(a.dia, 'DD-MM-YYYY');
        const fechaB = dayjs(b.dia, 'DD-MM-YYYY');
        return fechaA.isAfter(fechaB) ? 1 : -1;
      });

      const datosLimitados = datosOrdenados.slice(-8);
      setEstadisticas(datosLimitados);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener los datos de Firestore en tiempo real: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // FUNCIÓN PARA ACTUALIZAR: Lógica para recalcular y guardar en Firebase.
  // Se envuelve en useCallback para optimización y evitar re-creaciones innecesarias.
  const handleActualizar = useCallback(async () => {
    try {
      const hoy = dayjs();
      const fechasPermitidas = [
        hoy.format('DD-MM-YYYY'),
        hoy.subtract(1, 'day').format('DD-MM-YYYY'),
        hoy.subtract(2, 'day').format('DD-MM-YYYY')
      ];

      let stockFinal = 0;
      let stock_anterior = -1000000000000;

      for (const item of estadisticas) {
        if (!fechasPermitidas.includes(item.dia)) {
          continue;
        }

        console.log("**** Procesando Día para corrección: " + item.dia);
        const docRef = doc(db, 'estadisticas_diarias', item.dia);

        if (stock_anterior === -1000000000000) {
          stock_anterior = item.stock_anterior || 0;
        }

        const stockActualizado = (item.entran || 0) + stock_anterior;
        stockFinal = stockActualizado - (item.vd || 0) - (item.baja || 0) - (item.devueltos || 0);

        await updateDoc(docRef, {
          entran: item.entran,
          baja: item.baja,
          devueltos: item.devueltos,
          stock_anterior: stock_anterior,
          stock: stockFinal,
        });

        stock_anterior = stockFinal;
      }

      const docRef = doc(db, 'productos', '1');
      await updateDoc(docRef, {
        stock: stockFinal
      });

      console.log("Actualización de datos completada.");
      // Se elimina window.location.reload() para evitar un bucle infinito.
      // La vista se actualiza sola gracias a onSnapshot.

    } catch (error) {
      console.error("Error al actualizar los datos en Firebase:", error);
    }
  }, [estadisticas]); // Se ejecuta si 'estadisticas' cambia

  // EFECTO 2: Lanza la función de actualización automática UNA SOLA VEZ al cargar los datos.
  useEffect(() => {
    if (estadisticas.length > 0 && !isUpdateTriggered.current) {
      console.log("Lanzando corrección automática al cargar el componente...");
      handleActualizar();
      // Se marca como 'true' para que no se vuelva a ejecutar
      isUpdateTriggered.current = true;
    }
  }, [estadisticas, handleActualizar]);

  // FUNCIÓN PARA MANEJAR CAMBIOS EN LOS INPUTS
  const handleInputChange = (e, dia, campo) => {
    const value = parseFloat(e.target.value) || 0;
    setEstadisticas(prevEstadisticas =>
      prevEstadisticas.map(item =>
        item.dia === dia
          ? { ...item, [campo]: value }
          : item
      )
    );
  };

  // RENDERIZADO: Muestra "Cargando..." mientras se obtienen los datos.
  if (loading) {
    return <p className="text-center">Cargando estadísticas...</p>;
  }

  // RENDERIZADO: Muestra la tabla y el botón.
  return (
    <div className="container my-4">
      <h2 className="text-center mb-4 font-nunito text-gray-500 text-2xl -mt-8">Gestion Stock Pollos</h2>
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
          {estadisticas.map((item, index) => {
            const stockActualizado = (item.entran || 0) + (item.stock_anterior || 0);
            const stockFinal = stockActualizado - (item.vd || 0) - (item.baja || 0) - (item.devueltos || 0);
            const isEditable = index >= estadisticas.length - 3;
            const isMonday = item.diasemana && item.diasemana.toLowerCase() === 'lunes';

            return (
              // Se usa React.Fragment para poder devolver un array de elementos
              <React.Fragment key={`fragment-${item.dia}`}>
                {isMonday && (
                  <tr key={`separator-${item.dia}`} className="separator-row">
                    <td colSpan="8" className="text-center py-2">
                      <span className="text-yellow-500 "></span>
                    </td>
                  </tr>
                )}
                <tr key={item.dia} className="table-row">
                  <td className="table-cell-width capitalize"> {item.diasemana} , {item.dia}</td>
                  <td className="table-cell-width w-36 font-extrabold">{item.stock_anterior}</td>
                  <td className="table-cell-width text-center w-32">
                    <input
                      type="number"
                      value={item.entran === 0 ? '' : item.entran || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'entran')}
                      className="form-control w-24 mx-auto text-center"
                      min="0"
                      disabled={!isEditable}
                    />
                  </td>
                  <td className="table-cell-width w-40 font-extrabold">{stockActualizado}</td>
                  <td className="table-cell-width w-40">{item.vd || 0}</td>
                  <td className="table-cell-width w-32">
                    <input
                      type="number"
                      value={item.baja === 0 ? '' : item.baja || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'baja')}
                      className="form-control w-24 mx-auto text-center"
                      min="0"
                      disabled={!isEditable}
                    />
                  </td>
                  <td className="table-cell-width w-40 ">
                    <input
                      type="number"
                      value={item.devueltos === 0 ? '' : item.devueltos || ''}
                      onChange={(e) => handleInputChange(e, item.dia, 'devueltos')}
                      className="form-control w-24 mx-auto text-center"
                      min="0"
                      disabled={!isEditable}
                    />
                  </td>
                  <td className="table-cell-width w-40 font-extrabold">
                    {stockFinal}
                  </td>
                </tr>
              </React.Fragment>
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