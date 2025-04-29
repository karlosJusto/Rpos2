import { createContext, useState, useEffect } from "react";
import { collection, getDoc, doc, updateDoc, onSnapshot, query,where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useParams } from "react-router-dom";

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');

export const dataContext = createContext();

const DataProvider = ({ children }) => {


  const [orderBeingEdited, setOrderBeingEdited] = useState(null);
  const isEditingOrder = orderBeingEdited !== null;


  const [pedidosConOrigenUno, setPedidosConOrigenUno] = useState(null);
  const [data, setData] = useState([]);
  const [cart, setCart] = useState([]);
  const [buscar, setBuscar] = useState(""); // Nuevo estado para el término de búsqueda

  const [libres, setLibres] = useState(0); // Nuevo estado para 'libres'
  const [pedidos, setPedidos] = useState([]); // Estado para todos los pedidos
  const [dateToPass, setDateToPass] = useState(null);
  const [numeroBarra, setNumeroBarra]=useState(0);
  const [mostrarBarra, setMostrarBarra]=useState(0);

  const [totalProductosDespuesDeLas18, setTotalProductosDespuesDeLas18]=useState(0);
  const [totalbloquesAntesdelas18, setTotalbloquesAntesdelas18]=useState(0);
  const [loading, setLoading] = useState(false); // Estado de carga

  useEffect(() => {


   // Si se pasa una fecha específica, usamos esa fecha; de lo contrario, usamos la fecha actual
   const fechaAUsar = dateToPass ? dayjs(dateToPass).locale('es').tz('Europe/Madrid') : dayjs().locale('es').tz('Europe/Madrid');
         
   // Obtener la hora actual en la zona horaria de Madrid
   const currentTime = dayjs().locale('es').tz('Europe/Madrid');
   const esHoy = currentTime.isSame(fechaAUsar, 'day'); // Comprobamos si la fecha es hoy
 
   // Turno completo (dia entero)
   let fechaIncio = fechaAUsar.hour(0).minute(0).second(0);  // Desde las 18:01
   let fechaFin = fechaAUsar.hour(23).minute(59).second(59);  // Desde las 18:01

    const pedidosRef = collection(db, 'pedidos');
    const pedidosQuery = query(
      pedidosRef,
      where('fechahora', '>=', fechaIncio.format('DD/MM/YYYY HH:mm')),
      where('fechahora', '<=', fechaFin.format('DD/MM/YYYY HH:mm'))
    );


    const unsubscribe = onSnapshot(pedidosQuery, (querySnapshot) => {
      const pedidosArray = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPedidos(pedidosArray); // Actualiza el estado global de pedidos
    });

    return () => unsubscribe();
  }, [dateToPass]); // Se ejecuta al montar y se mantiene suscrito




  // Lógica para calcular pedidosConOrigenUno basada en el estado global de pedidos
  useEffect(() => {
    
    const pedidosOrigenUno = pedidos.filter(pedido => pedido.origen === 1);
    let cantidadPedidosOrigenUno = pedidosOrigenUno.length;
    pedidosOrigenUno.forEach(pedido => {
      const productosConEntregadoIgualACantidad = pedido.productos.some(producto => producto.entregado === producto.cantidad);
      if (productosConEntregadoIgualACantidad) {
        cantidadPedidosOrigenUno -= 1;
      }
    });
    setPedidosConOrigenUno(cantidadPedidosOrigenUno);
  }, [pedidos]); // Se re-ejecuta cada vez que el estado 'pedidos' cambia





  useEffect(() => {
    console.log("NUMERO BARRASSSSSSSSSSSSSSSS: "+numeroBarra);
    const calcularLibres = () => {
      setLoading(true);  // Activamos el spinner
      const currentTime = dayjs().locale('es').tz('Europe/Madrid');
      const antesDelas6pm = currentTime.hour() < 18;

      // Realizamos el cálculo de 'libres' según el turno (mañana o tarde)
      if (antesDelas6pm) {
        setLibres(numeroBarra - totalbloquesAntesdelas18);
      } else {
        setLibres(numeroBarra - totalProductosDespuesDeLas18);
      }

      // Mantener el spinner visible durante 3 segundos
      setTimeout(() => {
        setLoading(false);  // Desactivamos el spinner después de 3 segundos
      }, 0); // 
    };

    calcularLibres();  // Llamamos a la función de cálculo de 'libres'
    if (numeroBarra !== 0)
    {
    guardarEstadisticasDiarias();
    }

}, [numeroBarra, totalProductosDespuesDeLas18, totalbloquesAntesdelas18]);

//escucha de la base de datos cambios en barra
useEffect(() => {
  const numeroBarraRef = doc(db, 'estadisticas_diarias', obtenerFechaFormateada()); // Asumiendo que 'numeroBarra' se guarda en el documento diario
  const unsubscribe = onSnapshot(numeroBarraRef, (docSnapshot) => {
    if (docSnapshot.exists() && docSnapshot.data().enbarra !== undefined) {
      setNumeroBarra(docSnapshot.data().enbarra);
      

    } else {
      console.log("No se encontró el valor de enbarra en el documento diario.");
    }

      //revisar con ibai
      //setMostrarBarra(numeroBarra-(totalbloquesAntesdelas18+totalProductosDespuesDeLas18));
  

   
  });

  return () => unsubscribe(); // Limpiar el listener al desmontar
}, []); // Se ejecuta solo una vez al montar el componente


 // Función para guardar los datos de estadisticas_diarias
 const guardarEstadisticasDiarias = async () => {
  try {
    const fecha = obtenerFechaFormateada();
    const docRef = doc(db, "estadisticas_diarias", fecha);
    
    await updateDoc(docRef, {
      enbarra: numeroBarra,
      libresManana:numeroBarra-totalbloquesAntesdelas18,
      libresTarde: numeroBarra-totalProductosDespuesDeLas18,
      vm: totalbloquesAntesdelas18, //bloquesAntesdelas18,
      vt: totalProductosDespuesDeLas18,
      vd: totalbloquesAntesdelas18+totalProductosDespuesDeLas18,
    });

    console.log("Datos guardados exitosamente para el día", fecha);
  } catch (e) {
    console.error("Error al guardar los datos: ", e);
  }
};

const obtenerFechaFormateada = () => {
  // Configurar el idioma a español
  dayjs.locale('es');

  // Obtener la fecha actual y formatearla en el formato DD-MM-YYYY
  const fechaFormateada = dayjs().format('DD-MM-YYYY');

  

  return fechaFormateada;
};



   /*useEffect(() => {

              // Si se pasa una fecha específica, usamos esa fecha; de lo contrario, usamos la fecha actual
              const fechaAUsar = dateToPass ? dayjs(dateToPass).locale('es').tz('Europe/Madrid') : dayjs().locale('es').tz('Europe/Madrid');
            
              // Obtener la hora actual en la zona horaria de Madrid
              const currentTime = dayjs().locale('es').tz('Europe/Madrid');
              const esHoy = currentTime.isSame(fechaAUsar, 'day'); // Comprobamos si la fecha es hoy
            
              // Turno completo (dia entero)
              let fechaIncio = fechaAUsar.hour(0).minute(0).second(0);  // Desde las 18:01
              let fechaFin = fechaAUsar.hour(23).minute(59).second(59);  // Desde las 18:01
            
              // Creamos la referencia a la colección de pedidos
              const pedidosRef = collection(db, 'pedidos');
            
              // Creamos la consulta para filtrar pedidos por fecha y hora
              const pedidosQuery = query(
                pedidosRef,
                where("fechahora", ">=", fechaIncio.format('DD/MM/YYYY HH:mm')), // Desde el inicio del día
                where("fechahora", "<=", fechaFin.format('DD/MM/YYYY HH:mm')) // Hasta las 18:00 o desde las 18:01
              );
            
              // Usamos `onSnapshot` para escuchar los cambios en la colección
              const unsubscribe = onSnapshot(pedidosQuery, (querySnapshot) => {
                // Mapear los documentos que llegan a la consulta
                const pedidosArray = querySnapshot.docs.map(doc => {
                  const pedido = doc.data();
                  return {
                    id: doc.id,
                    NumeroPedido: pedido.NumeroPedido,
                    cliente: pedido.cliente,
                    direccion: pedido.direccion,
                    productos: pedido.productos.map(producto => ({
                      ...producto,
                      entregado: producto.entregado || 0, // Asegúrate de que 'entregado' esté inicializado
                    })),
                    fechahora: pedido.fechahora,
                    imagen: pedido.imagen,
                    pagado: pedido.pagado,
                    celiaco: pedido.celiaco,
                    troceado: pedido.troceado,
                    alias: pedido.alias,
                    tostado: pedido.tostado,
                    salsa: pedido.sinsalsa,
                    extrasalsa: pedido.extrasalsa,
                    observaciones: pedido.observaciones,
                    origen: pedido.origen,
                  };
                });
            
                // Actualizamos el estado de los pedidos
                setPedidos(pedidosArray);
            
                // Filtramos los nombres de los clientes directamente desde los pedidos obtenidos
                const nombresClientes = pedidosArray.map(pedido => pedido.cliente).filter(cliente => cliente); // Filtra solo los valores válidos
                setClientes(nombresClientes);
            
                // Filtrar los pedidos con origen = 1
                const pedidosConOrigenUno = pedidosArray.filter(pedido => pedido.origen === 1);
                
            
                // Contamos la cantidad de pedidos con origen = 1
                let cantidadPedidosOrigenUno = pedidosConOrigenUno.length;
            
                // Comprobar si hay algún pedido con origen 1 que tenga productos con 'cantidad' === 'entregado'
                pedidosConOrigenUno.forEach(pedido => {
                  const productosConEntregadoIgualACantidad = pedido.productos.some(producto => producto.entregado === producto.cantidad);
                  
                  // Si encontramos algún producto con 'entregado' igual a 'cantidad', restamos 1 a la cantidad de pedidos con origen 1
                  if (productosConEntregadoIgualACantidad) {
                    cantidadPedidosOrigenUno -= 1; // Restamos 1
                  }
                });
            
                // Actualizamos el estado de los pedidos con origen 1
                setPedidosConOrigenUno(cantidadPedidosOrigenUno);
            
                // Mostrar la cantidad de pedidos que quedan (puedes usar esta variable para mostrarla en la UI)
               // console.log(`Cantidad de pedidos con origen 1 restantes: ${cantidadPedidosOrigenUno}`);
            
              }, (error) => {
                console.error("Error al obtener los pedidos: ", error);
              });
            
              // Limpiar la suscripción cuando el componente se desmonta
              return () => unsubscribe();
            
            }, [dateToPass]); // Solo se ejecuta cuando `dateToPass` cambia*/
            




 
  //console.log('*********************carlitos'+pedidosConOrigenUno);

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
        libres, // Pasar el estado 'libres'
        setLibres, // Pasar la función para actualizar 'libres'
        pedidosConOrigenUno,
        setPedidosConOrigenUno,
        pedidos,
        dateToPass,
        setDateToPass,
        numeroBarra,
        setNumeroBarra,
        mostrarBarra,
        setMostrarBarra,
        totalProductosDespuesDeLas18, // Pasar el estado (aunque no lo uses para actualizar desde fuera)
        setTotalProductosDespuesDeLas18, // Pasar la función para actualizar totalProductosDespuesDeLas18
        totalbloquesAntesdelas18, // Pasar el estado (aunque no lo uses para actualizar desde fuera)
        setTotalbloquesAntesdelas18, // Pasar la función para actualizar totalbloquesAntesdelas18
        loading,
        setLoading,

        orderBeingEdited,
        setOrderBeingEdited,
        isEditingOrder, 

        
      }}
    >
      {children}
    </dataContext.Provider>
  );
};

export default DataProvider;
