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
  //const isEditingOrder = orderBeingEdited !== null;
    const isEditingOrder = !!(orderBeingEdited && orderBeingEdited.NumeroPedido);


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
  // --- NUEVO: Estado para la hora seleccionada del calendario del Layout ---
  const [selectedSlotTime, setSelectedSlotTime] = useState(null);
  // --- FIN NUEVO ---
  const [isNumeroBarraInitialized, setIsNumeroBarraInitialized] = useState(false); // Para controlar la carga inicial de numeroBarra

  useEffect(() => {


   // Si se pasa una fecha específica, usamos esa fecha; de lo contrario, usamos la fecha actual
   const fechaAUsar = dateToPass ? dayjs(dateToPass).locale('es').tz('Europe/Madrid') : dayjs().locale('es').tz('Europe/Madrid');
         
   // Obtener la hora actual en la zona horaria de Madrid
   // const currentTime = dayjs().locale('es').tz('Europe/Madrid'); // No se usa directamente aquí
   // const esHoy = currentTime.isSame(fechaAUsar, 'day'); // Comprobamos si la fecha es hoy // No se usa
 
   // Turno completo (dia entero)
   let fechaIncio = fechaAUsar.hour(0).minute(0).second(0);
   let fechaFin = fechaAUsar.hour(23).minute(59).second(59);

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

  // Función interna para agrupar pedidos y calcular pollos por bloques de 15 minutos
  const agruparYCalcularPollosPorBloques = (pedidosDelContexto) => {
    const bloques = {};
    pedidosDelContexto.forEach((pedido) => {
      if (typeof pedido.fechahora !== 'string' || !pedido.fechahora.includes(' ')) {
        // console.warn(`[DataContext][agruparPorBloques] Pedido ${pedido.id || pedido.NumeroPedido} con fechahora inválida: ${pedido.fechahora}`);
        return; 
      }
      const fechaHora = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm', true);
      if (!fechaHora.isValid()) {
          // console.warn(`[DataContext][agruparPorBloques] Pedido ${pedido.id || pedido.NumeroPedido} con fechahora no parseable: ${pedido.fechahora}`);
          return; 
      }

      const hora = fechaHora.format('HH:mm');
      if (!bloques[hora]) {
        bloques[hora] = {
          cantidadProductosId1: 0, // Pollos enteros
          cantidadProductosId2: 0, // Medios pollos
        };
      }
      if (pedido.productos && Array.isArray(pedido.productos)) {
          pedido.productos.forEach((producto) => {
              if (producto.id === 1) bloques[hora].cantidadProductosId1 += (Number(producto.cantidad) || 0);
              if (producto.id === 2) bloques[hora].cantidadProductosId2 += (Number(producto.cantidad) || 0);
              // IDs 39 y 40 también cuentan como 0.5 pollos si es necesario
              if (producto.id === 39 || producto.id === 40) bloques[hora].cantidadProductosId2 += (Number(producto.cantidad) || 0); // Asumiendo que 39 y 40 son equivalentes a medio pollo
          });
      }
    });
    return bloques;
  };

  // useEffect para calcular totalbloquesAntesdelas18 y totalProductosDespuesDeLas18
  useEffect(() => {
    console.log("[LIBRES] Hook de cálculo de totales (Antes/Después 18h) activado. Dependencia: pedidos.");
    if (pedidos && pedidos.length >= 0) { // >= 0 para que se ejecute incluso si pedidos está vacío y ponga los totales a 0
      const bloquesPedidos = agruparYCalcularPollosPorBloques(pedidos);

      const nuevosTotalProductosDespuesDeLas18 = Object.keys(bloquesPedidos)
        .filter(bloque => { const horaBloque = dayjs(bloque, 'HH:mm', true); return horaBloque.isValid() && horaBloque.hour() >= 18; })
        .reduce((total, bloque) => total + (bloquesPedidos[bloque].cantidadProductosId1 || 0) + ((bloquesPedidos[bloque].cantidadProductosId2 || 0) / 2), 0);

      const nuevosTotalbloquesAntesdelas18 = Object.keys(bloquesPedidos)
        .filter(bloque => { const horaBloque = dayjs(bloque, 'HH:mm', true); return horaBloque.isValid() && horaBloque.hour() < 18; })
        .reduce((total, bloque) => total + (bloquesPedidos[bloque].cantidadProductosId1 || 0) + ((bloquesPedidos[bloque].cantidadProductosId2 || 0) / 2), 0);

      // console.log(`[LIBRES] Nuevos totales calculados: Antes18=${nuevosTotalbloquesAntesdelas18}, Despues18=${nuevosTotalProductosDespuesDeLas18}`);
      setTotalProductosDespuesDeLas18(nuevosTotalProductosDespuesDeLas18);
      setTotalbloquesAntesdelas18(nuevosTotalbloquesAntesdelas18);
    }
  }, [pedidos]); // Dependencia: el estado 'pedidos' del DataContext



  // Lógica para calcular pedidosConOrigenUno basada en el estado global de pedidos
  useEffect(() => {
    
    const pedidosOrigenUno = pedidos.filter(pedido => pedido.origen === 1);
    let cantidadPedidosOrigenUno = pedidosOrigenUno.length;
    pedidosOrigenUno.forEach(pedido => {
      const productosConEntregadoIgualACantidad = pedido.productos.every(producto => producto.entregado === producto.cantidad);
      if (productosConEntregadoIgualACantidad) {
        cantidadPedidosOrigenUno -= 1;
      }
    });
    setPedidosConOrigenUno(cantidadPedidosOrigenUno);
  }, [pedidos]); // Se re-ejecuta cada vez que el estado 'pedidos' cambia





  useEffect(() => {
    // console.log("NUMERO BARRASSSSSSSSSSSSSSSS: "+numeroBarra); // Para depuración
    console.log("[LIBRES] Hook de cálculo de 'libres' activado. Dependencias: numeroBarra, totalProductosDespuesDeLas18, totalbloquesAntesdelas18, isNumeroBarraInitialized.");
    const calcularLibres = () => {
      console.log("[LIBRES] Dentro de calcularLibres().");
      // setLoading(true); // Comentado según la última versión, si se necesita, gestionar globalmente
      const currentTime = dayjs().locale('es').tz('Europe/Madrid');
      const antesDelas6pm = currentTime.hour() < 18;
      let libresCalculados;
      // debugger // Eliminado
      console.log(`[LIBRES] Valores para cálculo: numeroBarra = ${numeroBarra}, totalbloquesAntesdelas18 = ${totalbloquesAntesdelas18}, totalProductosDespuesDeLas18 = ${totalProductosDespuesDeLas18}`);
      if (antesDelas6pm) {
        libresCalculados = numeroBarra - totalbloquesAntesdelas18;
        console.log(`[LIBRES] Cálculo para ANTES de las 6 PM: ${numeroBarra} - ${totalbloquesAntesdelas18} = ${libresCalculados}`);
      } else {
        libresCalculados = numeroBarra - totalProductosDespuesDeLas18;
        console.log(`[LIBRES] Cálculo para DESPUÉS de las 6 PM: ${numeroBarra} - ${totalProductosDespuesDeLas18} = ${libresCalculados}`);
      }
      
      // Actualizar 'libres' solo si el valor ha cambiado
      setLibres(currentLibres => {
        // debugger // Eliminado
        if (libresCalculados !== currentLibres) {
          console.log(`[LIBRES] setLibres: valor cambió de ${currentLibres} a ${libresCalculados}. Actualizando estado.`);
          return libresCalculados;
        }
        console.log(`[LIBRES] setLibres: valor no cambió (${libresCalculados}). Estado 'libres' se mantiene en ${currentLibres}.`);
        return currentLibres;
      });
      // setLoading(false); // Comentado
    };

    calcularLibres();  // Llamamos a la función de cálculo de 'libres'

    // Solo guardar si numeroBarra ha sido inicializado desde Firestore/listener
    if (isNumeroBarraInitialized) {
      console.log("[LIBRES] isNumeroBarraInitialized es true. Llamando a guardarEstadisticasDiarias().");
      guardarEstadisticasDiarias();
    } else {
      console.log("[LIBRES] isNumeroBarraInitialized es false. Omitiendo guardarEstadisticasDiarias().");
    }
   
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [numeroBarra, totalProductosDespuesDeLas18, totalbloquesAntesdelas18, isNumeroBarraInitialized]);

// useEffect para calcular y actualizar mostrarBarra
useEffect(() => {
  console.log("[MOSTRAR_BARRA] Hook de cálculo de 'mostrarBarra' activado. Dependencias: pedidos, numeroBarra, dateToPass.");

  if (!pedidos) {
    console.log("[MOSTRAR_BARRA] 'pedidos' no está definido. Omitiendo cálculo.");
    // Si pedidos no está, mostrarBarra debería ser igual a numeroBarra o 0 si numeroBarra tampoco está.
    setMostrarBarra(parseFloat(numeroBarra) || 0);
    return;
  }

  const esHoyReal = !dateToPass || dayjs(dateToPass).isSame(dayjs().tz('Europe/Madrid'), 'day');

  if (!isNumeroBarraInitialized && !esHoyReal) {
    console.log("[MOSTRAR_BARRA] numeroBarra no inicializado para día específico. Omitiendo cálculo hasta que numeroBarra se cargue para dateToPass.");
    return;
  }

  const getTurnoActualContext = () => {
    const now = dayjs().locale('es').tz('Europe/Madrid');
    const today = now.startOf('day'); // Referencia al inicio del día de hoy
    let startTime, endTime;

    // Lógica de turnos consistente con Cocina.jsx:
    // Mañana: 00:01:00 hasta 18:00:00 inclusive
    // Tarde: 18:00:01 hasta 23:59:59 inclusive
    const horaLimiteTardeInicio = today.hour(18).minute(0).second(0).millisecond(1); // 18:00:00.001

    if (now.isBefore(horaLimiteTardeInicio)) { // Turno de mañana
      startTime = today.hour(0).minute(1).second(0).millisecond(0);
      endTime = today.hour(18).minute(0).second(0).millisecond(0);
    } else { // Turno de tarde
      startTime = horaLimiteTardeInicio;
      endTime = today.hour(23).minute(59).second(59).millisecond(999);
    }
    return { startTime, endTime };
  };

  let pedidosFiltradosParaMostrarBarra;

  if (esHoyReal) {
    const { startTime, endTime } = getTurnoActualContext();
    pedidosFiltradosParaMostrarBarra = pedidos.filter((pedido) => {
      if (!pedido.fechahora || typeof pedido.fechahora !== 'string') return false;
      const orderDateTime = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm', 'es', true).tz('Europe/Madrid', true);
      if (!orderDateTime.isValid()) return false;
      return orderDateTime.isBetween(startTime, endTime, null, '[]');
    });
  } else {
    // Para un día específico (pasado o futuro), consideramos todos los pedidos de ese día.
    // 'pedidos' ya está filtrado por dateToPass.
    pedidosFiltradosParaMostrarBarra = pedidos;
  }

  const pollosEntregadosCalculados = pedidosFiltradosParaMostrarBarra.reduce((totalEntregados, pedido) => {
    if (!pedido.productos || !Array.isArray(pedido.productos)) return totalEntregados;
    
    return totalEntregados + pedido.productos.reduce((sumaEntregadosProducto, producto) => {
      const entregadoValor = Number(producto.entregado) || 0;
      if (producto.id === 1) return sumaEntregadosProducto + entregadoValor; // Pollo entero
      if (producto.id === 2) return sumaEntregadosProducto + (entregadoValor * 0.5); // Medio pollo
      return sumaEntregadosProducto;
    }, 0);
  }, 0);

  const currentNumeroBarra = parseFloat(numeroBarra) || 0;
  const nuevoMostrarBarra = currentNumeroBarra - pollosEntregadosCalculados;

  // Actualizar 'mostrarBarra' solo si el valor ha cambiado para evitar bucles
  setMostrarBarra(currentVal => {
    if (nuevoMostrarBarra !== currentVal) return nuevoMostrarBarra;
    return currentVal;
  });
 console.log(`[MOSTRAR_BARRA] Calculado para ${esHoyReal ? 'HOY' : dayjs(dateToPass).format('DD-MM-YYYY')}: ${currentNumeroBarra} (enBarra) - ${pollosEntregadosCalculados} (entregados) = ${nuevoMostrarBarra}. Pedidos considerados: ${pedidosFiltradosParaMostrarBarra.length}`);
}, [pedidos, numeroBarra, dateToPass, setMostrarBarra, isNumeroBarraInitialized]);

// Listener para cambios en 'enbarra' (y otros campos si es necesario) desde Firestore
useEffect(() => {
  const fechaParaEstadisticas = dateToPass
    ? dayjs(dateToPass).tz('Europe/Madrid').format('DD-MM-YYYY')
    : obtenerFechaFormateada(); // Current day if dateToPass is null

  console.log(`[LIBRES] Listener Firestore: Configurando para fecha ${fechaParaEstadisticas}`);
  const docRef = doc(db, 'estadisticas_diarias', fechaParaEstadisticas);
  let initialSnapshotProcessed = false;
  setIsNumeroBarraInitialized(false); // Reset for new date/listener

  // Asegurarse de que numeroBarra se establezca a un valor inicial antes de que el snapshot llegue
  const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      if (data.enbarra !== undefined) {
        // Actualiza numeroBarra en el estado solo si es diferente
        setNumeroBarra(currentNumeroBarra => {
          if (data.enbarra !== currentNumeroBarra) {
            console.log(`[LIBRES] Listener Firestore 'estadisticas_diarias' (${fechaParaEstadisticas}): 'enbarra' (${data.enbarra}) es diferente de numeroBarra actual (${currentNumeroBarra}). Actualizando.`);
            return data.enbarra;
          }
          console.log(`[LIBRES] Listener Firestore 'estadisticas_diarias' (${fechaParaEstadisticas}): 'enbarra' (${data.enbarra}) no cambió. numeroBarra se mantiene en ${currentNumeroBarra}.`);
          return currentNumeroBarra;
        });
      } else {
        console.warn(`DataContext: El campo 'enbarra' no se encontró en el documento ${fechaParaEstadisticas}, aunque el documento existe. Usando numeroBarra = 0.`);
        setNumeroBarra(0);
      }
    } else {
      // El documento no existe. Esto es normal al inicio de un nuevo día antes del login.
      // Login.jsx se encargará de crear el documento con enbarra: 0 si es necesario.
      console.log(`DataContext: Documento estadisticas_diarias para ${fechaParaEstadisticas} no existe aún. Usando numeroBarra = 0.`);
      setNumeroBarra(0);
    }

    // Marcar como inicializado después del primer procesamiento del snapshot (o intento)
    if (!initialSnapshotProcessed) {
      setIsNumeroBarraInitialized(true);
      initialSnapshotProcessed = true;
      console.log(`[LIBRES] Listener Firestore: isNumeroBarraInitialized establecido a true para ${fechaParaEstadisticas}.`);
    }

  }, (error) => {
    console.error(`Error en el listener de estadisticas_diarias para ${fechaParaEstadisticas} en DataContext:`, error);
    setNumeroBarra(0); // Default to 0 on error
    // Incluso si hay un error, marcamos como inicializado para no bloquear otras lógicas indefinidamente.
    if (!initialSnapshotProcessed) {
      setIsNumeroBarraInitialized(true);
      initialSnapshotProcessed = true;
      console.log(`[LIBRES] Listener Firestore: isNumeroBarraInitialized establecido a true (DESPUÉS DE ERROR) para ${fechaParaEstadisticas}.`);
    }
  });

  return () => unsubscribe(); // Limpiar el listener al desmontar
  
}, [dateToPass]); // Dependencia en dateToPass para re-suscribir cuando cambie la fecha


 // Función para guardar los datos de estadisticas_diarias
 const guardarEstadisticasDiarias = async () => {
  console.log("[LIBRES] Dentro de guardarEstadisticasDiarias().");
  try {
    const fecha = obtenerFechaFormateada();
    const docRef = doc(db, "estadisticas_diarias", fecha); // Siempre guarda para el día actual
    
    const docSnap = await getDoc(docRef); // Verificar si el documento existe

    const enBarraActual = numeroBarra; // Usar el valor actual de numeroBarra del estado
    const libresMananaCalc = enBarraActual - totalbloquesAntesdelas18;
    const libresTardeCalc = enBarraActual - totalProductosDespuesDeLas18;
    console.log(`[LIBRES] guardarEstadisticasDiarias - Valores a guardar: enbarra=${enBarraActual}, libresManana=${libresMananaCalc}, libresTarde=${libresTardeCalc}, vm=${totalbloquesAntesdelas18}, vt=${totalProductosDespuesDeLas18}, vd=${totalbloquesAntesdelas18+totalProductosDespuesDeLas18}`);

    if (docSnap.exists()) { // Solo actualizar si el documento ya existe
      await updateDoc(docRef, {
        enbarra: enBarraActual,
        libresManana: libresMananaCalc,
        libresTarde: libresTardeCalc,
        vm: totalbloquesAntesdelas18,
        vt: totalProductosDespuesDeLas18,
        vd: totalbloquesAntesdelas18+totalProductosDespuesDeLas18,
      });
      console.log("[LIBRES] guardarEstadisticasDiarias - Datos actualizados para el día", fecha);
    } else {
      // Si el documento no existe, Login.jsx (o la lógica de inicio de sesión) es responsable de crearlo.
      console.warn(`[LIBRES] guardarEstadisticasDiarias - Documento para HOY (${fecha}) no existe. Login.jsx debería crearlo. No se guardará nada desde aquí.`);
    }

  } catch (e) {
    console.error("Error al guardar los datos de estadísticas diarias: ", e);
  }
};

const obtenerFechaFormateada = () => {
  dayjs.locale('es');
  // Asegurar que la fecha se obtenga con la zona horaria correcta
  const fechaFormateada = dayjs().tz('Europe/Madrid').format('DD-MM-YYYY');
  return fechaFormateada;
};

// Modificación del useEffect que calcula 'libres'
useEffect(() => {
  console.log("[LIBRES] Hook de cálculo de 'libres' activado. Deps: numeroBarra, totals, isNumeroBarraInitialized, dateToPass.");
  const calcularLibres = () => {
    console.log("[LIBRES] Dentro de calcularLibres().");

    const esHoyReal = !dateToPass || dayjs(dateToPass).isSame(dayjs().tz('Europe/Madrid'), 'day');
    let libresCalculados;

    if (esHoyReal) {
      // Logic for today: use current time to determine shift
      const currentTime = dayjs().locale('es').tz('Europe/Madrid');
      const antesDelas6pm = currentTime.hour() < 18;
      libresCalculados = antesDelas6pm
        ? numeroBarra - totalbloquesAntesdelas18
        : numeroBarra - totalProductosDespuesDeLas18;
      console.log(`[LIBRES] Cálculo para HOY (${antesDelas6pm ? 'MAÑANA' : 'TARDE'}): ${numeroBarra} - ${antesDelas6pm ? totalbloquesAntesdelas18 : totalProductosDespuesDeLas18} = ${libresCalculados}`);
    } else {
      // Logic for a specific past/future day selected via dateToPass:
      // Calculate libres based on total orders for the entire selected day.
      libresCalculados = numeroBarra - (totalbloquesAntesdelas18 + totalProductosDespuesDeLas18);
      console.log(`[LIBRES] Cálculo para DÍA ESPECÍFICO (${dayjs(dateToPass).format('DD-MM-YYYY')}): ${numeroBarra} - (${totalbloquesAntesdelas18} + ${totalProductosDespuesDeLas18}) = ${libresCalculados}`);
    }

    setLibres(currentLibres => {
      if (libresCalculados !== currentLibres) {
        console.log(`[LIBRES] setLibres: valor cambió de ${currentLibres} a ${libresCalculados}. Actualizando estado.`);
        return libresCalculados;
      }
      console.log(`[LIBRES] setLibres: valor no cambió (${libresCalculados}). Estado 'libres' se mantiene en ${currentLibres}.`);
      return currentLibres;
    });
  };

  if (isNumeroBarraInitialized) { // Solo calcular si numeroBarra (para la fecha actual o dateToPass) ha sido cargado/intentado cargar.
    calcularLibres();
  } else {
    console.log("[LIBRES] isNumeroBarraInitialized es false. Omitiendo calcularLibres(). 'libres' podría no estar actualizado para la fecha seleccionada.");
  }

  const esHoyParaGuardar = !dateToPass || dayjs(dateToPass).isSame(dayjs().tz('Europe/Madrid'), 'day');
  if (isNumeroBarraInitialized && esHoyParaGuardar) { // Solo guardar si estamos en el día actual y numeroBarra está inicializado
    guardarEstadisticasDiarias();
  }
}, [numeroBarra, totalProductosDespuesDeLas18, totalbloquesAntesdelas18, isNumeroBarraInitialized, dateToPass, setLibres]);


   /*useEffect(() => { // Bloque de código comentado por el usuario

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
                // const nombresClientes = pedidosArray.map(pedido => pedido.cliente).filter(cliente => cliente); // Variable no usada globalmente
                // setClientes(nombresClientes); // setClientes no está definido en este DataProvider
            
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

  // const categoria = useParams().categoria; // useParams solo funciona en componentes renderizados por una Ruta.

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
        totalProductosDespuesDeLas18, 
        setTotalProductosDespuesDeLas18, 
        totalbloquesAntesdelas18, 
        setTotalbloquesAntesdelas18, 
        loading,
        setLoading, // Pasar setLoading para que otros componentes puedan indicar carga

        orderBeingEdited,
        setOrderBeingEdited,
        isEditingOrder, 

        // --- NUEVO: Pasar estado y actualizador para la hora del slot ---
        selectedSlotTime,
        setSelectedSlotTime,
        // --- FIN NUEVO ---
        
      }}
    >
      {children}
    </dataContext.Provider>
  );
};

export default DataProvider;
