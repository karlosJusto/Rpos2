
import dinero from '../../assets/dinero.png';
import singluten from '../../assets/singluten.png';
import fire_new from '../../assets/fire_new.png';
import tijera_new from '../../assets/tijera_new.png';

import Layout from '../pedidos/Layout';
import GenerarQRCodeInvisible from './GenerarQRCodeInvisible';



import { useState, useContext, useEffect, useRef} from 'react';
import { dataContext } from '../Context/DataContext';
import { doc, setDoc, updateDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

import { collection, getDocs, query, where } from 'firebase/firestore';
import RelojDistinto from './RelojDistinto';
import { Offcanvas, Button, Nav, Modal } from 'react-bootstrap';


import { Link } from 'react-router-dom';
import { DemoContainer, DemoItem } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import PedidoRapido from './PedidoRapido';

import dayjs from 'dayjs';
import 'dayjs/locale/es'; // Para trabajar con el locale en español
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC
import customParseFormat from 'dayjs/plugin/customParseFormat';





const Ordenes = () => {

  //ajustamos la hora
  const obtenerHoraRedondeada = () => {
    const now = dayjs(); // Hora actual
    
    // Obtener los minutos actuales
    const minutos = now.minute();
  
    // Redondeamos los minutos al múltiplo más cercano de 15 (xx:00, xx:15, xx:30, xx:45)
    const siguienteBloque = Math.floor(minutos / 15) * 15; // Redondea hacia abajo al múltiplo más cercano de 15 minutos
    
    // Ajustar la hora a 00, 15, 30, 45 minutos
    const nuevaHora = now
      .minute(siguienteBloque) // Ajustamos a los minutos correspondientes (xx:00, xx:15, etc.)
      .second(0)
      .millisecond(0);
  
    // Si la hora ajustada es antes de la hora actual, avanzamos al siguiente bloque (añadimos 15 minutos)
    return nuevaHora.isBefore(now) ? nuevaHora.add(15, 'minute') : nuevaHora;
  };
  
  const fechahora = obtenerHoraRedondeada().format('DD/MM/YYYY HH:mm');

  // Usamos los plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

//usamos la refencia del otro componente
const pedidoRapidoRef = useRef();

//pedidos rapidos pasandole el id producto 1 o 2
const handlePedidoRapido = (idProduct) => {
  // Llamamos a la función hacerPedidoRapido sin la comprobación del carrito
  pedidoRapidoRef.current.hacerPedidoRapido(idProduct);
};



  // Configurar dayjs para usar el idioma español
   dayjs.locale('es');


  
  const [show, setShow] = useState(false);
  const [numeroBarra, setNumeroBarra]=useState(0);
  const [isColorChanged, setIsColorChanged] = useState(false); // Estado para controlar si el color del div cambió
  const [vm, setVm] = useState(0); // Estado para 'VM'


 
  // Datos del cliente para pasar a PedidoRapido
  const [datosCliente, setDatosCliente] = useState({
    cliente: 'AAgenerico',
    telefono: '000000000',
    fechahora: fechahora,
    observaciones: 'Pedido Rapido',
    pagado: false,
    celiaco: false,
    localidad: 'Mungia',
  });

  

  const [selectedDate, setSelectedDate] = useState(dayjs('DD/MM/YYYY'));

  // Estado para la fecha que será pasada al otro componente
  const [dateToPass, setDateToPass] = useState(null);

  //console.log(selectedDate);

    // Función para manejar el cambio de la fecha en el StaticDatePicker
    const handleDateChange = (newDate) => {
      setSelectedDate(newDate);
    };

  const handleAccept = () => {
    setDateToPass(selectedDate);  // Pasa la fecha seleccionada a otro componente
    setIsColorChanged(true);
    handleCloseModal();  // Cierra el modal
  };

  // Estilo del div que cambiará dependiendo de si el color ha cambiado
  const divStyle = isColorChanged
    ? 'w-[8vw] h-[10vh] bg-[#75adab]'  // Color de fondo si se ha hecho clic
    : 'w-[8vw] h-[10vh] bg-[#f2ac02]'; // Color de fondo inicial

  //modal

  const [showModal, setShowModal] = useState(false);
  const handleCloseModal = () => setShowModal(false);
  const handleShowModal= () => setShowModal(true);
  const [loading, setLoading] = useState(false); // Estado de carga
 

  //cierre turno fuerza recarga pagina

  const [showModal2, setShowModal2] = useState(false);
  const handleCloseModal2 = () => {
    setShowModal2(false); // Cerrar el modal
    window.location.reload(); // Recargar la página
  };

  useEffect(() => {
    // Configuramos un intervalo para comprobar la hora cada minuto
    const interval = setInterval(() => {
      const currentTime = dayjs().locale('es').tz('Europe/Madrid'); // Obtener la hora actual en España
      const targetTime = currentTime.hour(18).minute(0).second(0);  // Establecer la hora objetivo: 18:00:00

      // Si la hora actual es igual a las 18:00
      if (currentTime.isSame(targetTime, 'minute')) {
        setShowModal2(true);  // Mostrar el modal
        clearInterval(interval); // Detener el intervalo una vez que se ha abierto el modal
      }
    }, 60000);  // Comprobamos cada minuto

    // Limpiamos el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, []);




  //origen pedidos, 0 tienda 1 online

  const [pedidosConOrigenUno, setPedidosConOrigenUno] = useState(0);



  // Filtrar los pedidos con origen=1
  const contarPedidosOrigen = () => {
    const cantidad = pedidos.filter(pedido => pedido.origen === 1).length;
    setPedidosConOrigenUno(cantidad);
    // Imprimir en consola la cantidad total de pedidos y la cantidad con origen = 1
    console.log(`Total de pedidos encontrados: ${pedidosArray.length}`);
    console.log(`Pedidos con origen = 1: ${contarPedidosOrigen}`);
    
  };



  //abre modal borrado, editado y mensaje
  const [showModal1, setShowModal1] = useState(false);
  const handleCloseModal1 = () => setShowModal1(false);

   //selecciona el pedido para pasar al modal
   const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  // Función para abrir el modal y pasar el número de pedido
  const handleShowModal1 = (numeroPedido) => {
    setPedidoSeleccionado(numeroPedido);
    setShowModal1(true);  // Abre el modal
  };

  // Función para borrar el pedido
  const borrarOrden = async (numeroPedido) => {
    const numeroPedidoStr = numeroPedido.toString();
    try {
      const pedidoRef = doc(db, "pedidos", numeroPedidoStr); // Buscar el documento con el numero de pedido
      await deleteDoc(pedidoRef); // Elimina el pedido
      console.log(`Pedido ${numeroPedido} eliminado exitosamente.`);
      handleCloseModal1(); // Cierra el modal después de borrar
    } catch (error) {
      console.error("Error al borrar el pedido: ", error);
    }
  };


 
  




  // Función para alternar el estado del offcanvas
  const toggleOffcanvas = () => setShow(!show);
  const [pedidos, setPedidos] = useState([]); // Estado para almacenar todos los pedidos




  const theme = createTheme({
    palette: {
      primary: {
        main: '#f2ac02', // Cambiar a cualquier color que desees.
      },
    },
  });


          
           // Función para manejar los cambios en el input
                const handleInputChange = (e) => {
                  const value = e.target.value;  // Obtener el valor del input
                  console.log("value: "+value);
                  const aux=value === "" ? "" : parseFloat(value) + pollosEntregados;

                  // Verificar si el valor es un número válido
                  if (value === "" || !isNaN(value)) { 
                    setNumeroBarra(aux);  // Actualizar el estado solo si es un número o está vacío
                  }
                };

              // Función que suma 5 a la variable 'numero'
              const sumarCinco = () => {
                setNumeroBarra((prevNumero) => parseFloat(prevNumero) + 5); // Sumamos la cantidad al valor actual
              };
            
            // Función para sumar 4 a la variable 'numero'
            const sumarCuatro = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) + 4); // Usamos el valor previo
            };
            
            // Función para restar 5 a la variable 'numero'
            const restarCinco = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) - 5); // Usamos el valor previo
            };
            
            // Función para restar 4 a la variable 'numero'
            const restarCuatro = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) - 4); // Usamos el valor previo
            };

            // Función sumar 1 a la variable 'numero'
            const sumarUno = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) + 1); // Usamos el valor previo
            };

            // Función restar 1 a la variable 'numero'
            const restarUno = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) - 1); // Usamos el valor previo
            };

            // Función sumar 1/2 a la variable 'numero'
            const sumaMedio = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) + 0.5); // Usamos el valor previo
            };

            // Función restar 1/2 a la variable 'numero'
            const restaMedio = () => {
              setNumeroBarra((prevNumero) => parseFloat(prevNumero) - 0.5);  // Usamos el valor previo
            };

          
            //Clicks para entregados
            const handleClick = async (numeroPedido, productoId, maxCantidad) => {
              console.log('------------->>>>', numeroPedido);
            
              // Encontramos el pedido que contiene el producto
              const pedido = pedidos.find(pedido => pedido.NumeroPedido === numeroPedido); // Comparamos directamente como números
              if (!pedido) {
                console.error('No se encontró el pedido con NumeroPedido:', numeroPedido);
                return;
              }
            
              // Buscamos el producto dentro de ese pedido
              const producto = pedido.productos.find(producto => producto.id === productoId); // Comparamos directamente como números
              if (!producto) {
                console.error('No se encontró el producto con id:', productoId);
                return;
              }
            
              console.log('+++++++++++++++++' + productoId);
            
              // Ahora obtenemos el valor actual de 'entregado' directamente desde Firestore
              const numeroPedidoStr = numeroPedido.toString();
              const pedidoRef = doc(db, 'pedidos', numeroPedidoStr); // Referencia al pedido
              try {
                const pedidoDoc = await getDoc(pedidoRef);
            
                if (!pedidoDoc.exists()) {
                  console.error('No se encontró el pedido en Firestore:', numeroPedidoStr);
                  return;
                }
            
                const productosFirestore = pedidoDoc.data().productos;
            
                // Buscamos el producto en Firestore
                const productoFirestore = productosFirestore.find(p => p.id === productoId);
                if (!productoFirestore) {
                  console.error('No se encontró el producto en Firestore:', productoId);
                  return;
                }
            
                // Recuperamos el valor actual de 'entregado' desde Firestore
                const entregadoActual = productoFirestore.entregado || 0;
            
                // Verificar si ya se alcanzó la cantidad máxima
                let nuevoEntregado = entregadoActual + 1;
            
                // Si el contador llega al máximo, reiniciamos a 0
                if (nuevoEntregado > maxCantidad) {
                  nuevoEntregado = 0;
                }
            
                // Actualizamos el producto correspondiente en Firestore
                const productosActualizados = productosFirestore.map(p =>
                  p.id === productoId
                    ? { ...p, entregado: nuevoEntregado } // Actualizamos solo el producto afectado
                    : p
                );
            
                // Guardamos los cambios en Firestore
                await updateDoc(pedidoRef, {
                  productos: productosActualizados,
                });
            
                console.log('Producto actualizado en Firestore con éxito');
              } catch (error) {
                console.error('Error al actualizar el pedido en Firestore:', error);
              }
            };
            
            
            
            
            
    
            useEffect(() => {

             

                // Si se pasa una fecha específica, usamos esa fecha; de lo contrario, usamos la fecha actual
                const fechaAUsar = dateToPass ? dayjs(dateToPass).locale('es').tz('Europe/Madrid') : dayjs().locale('es').tz('Europe/Madrid');


                // Obtener la hora actual en la zona horaria de Madrid
                const currentTime = dayjs().locale('es').tz('Europe/Madrid');
                const esHoy = currentTime.isSame(fechaAUsar, 'day'); // Comprobamos si la fecha es hoy

               

                // Turno completo (dia entero)
                let fechaIncio = fechaAUsar.hour(0).minute(0).second(0);  // Desde las 18:01
                let fechaFin= fechaAUsar.hour(23).minute(59).second(59);  // Desde las 18:01

                //Si no viene del calendario seleccionar turno
     
                /*
                if (!dateToPass) { 
                       // Verifica si la hora actual es antes de las 18:00
                       const isBefore6PM = currentTime.hour() < 18;
                       if (isBefore6PM)
                         fechaFin = fechaAUsar.hour(17).minute(59).second(59);
                       else
                         fechaIncio = fechaAUsar.hour(18).minute(0).second(1);
                   
                } */




                 //console.log("**********fechaIncio:"+fechaIncio.format('DD/MM/YYYY HH:mm'));
                 //console.log("**********fechaFin:"+fechaFin.format('DD/MM/YYYY HH:mm'));


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
                          entregado: producto.entregado || 0 // Asegúrate de que 'entregado' esté inicializado
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

                    //search pedidos

                  // Filtramos los nombres de los clientes directamente desde los pedidos obtenidos
                  const nombresClientes = pedidosArray.map(pedido => pedido.cliente).filter(cliente => cliente); // Filtra solo los valores válidos
                  setClientes(nombresClientes);



                   
                    
                   
               


                    
              
                    // Filtrar los pedidos con origen = 0
                    const cantidadPedidosOrigenCero = pedidosArray.filter(pedido => pedido.origen === 1).length;
                    setPedidosConOrigenUno(cantidadPedidosOrigenCero);  // Actualizamos el estado de los pedidos con origen = 1
                            }, (error) => {
                              console.error("Error al obtener los pedidos: ", error);
                            });
                        
                            // Limpiar la suscripción cuando el componente se desmonta
                            return () => unsubscribe();
                      }, [dateToPass]); // Solo se ejecuta cuando `dateToPass` cambia


           

            // Función para obtener la fecha en formato DD-MM-YYYY
                const obtenerFechaFormateada = () => {
                  // Configurar el idioma a español
                  dayjs.locale('es');

                  // Obtener la fecha actual y formatearla en el formato DD-MM-YYYY
                  const fechaFormateada = dayjs().format('DD-MM-YYYY');

                  

                  return fechaFormateada;
                };

          


      // Función para agrupar los pedidos por franjas horarias de 15 minutos y contar la cantidad de productos por franja
      const agruparPorBloques15Minutos = (pedidos) => {
        const bloques = {};
        

        pedidos.forEach((pedido) => {
          const fechaHora = dayjs(pedido.fechahora, 'DD/MM/YYYY HH:mm');

       // Formateamos la fecha y hora en franjas de 15 minutos
              const hora = fechaHora.format('HH:mm');
             // console.log('Hora:' + hora);

              if (!bloques[hora]) {
                bloques[hora] = {
                  pedidos: [],
                  cantidadProductos: 0,
                  productos: [], // Guardaremos los productos y su cantidad
                  //categorias: {}, // Guardaremos las categorías de los productos
                  cantidadProductosId1: 0, // Guardamos el conteo de productos con id_product=1  Pollo
                  cantidadProductosId20: 0, // Guardamos el conteo de productos con id_product=20 Codillo
                  cantidadProductosId2: 0, // Guardamos el conteo de productos con id_product=2 1/2 Pollo
                  cantidadProductosId41: 0, //Guardamos el conteo de productos con id_product=41 Costilla
                  cantidadProductosId48: 0, //Guardamos el conteo de productos con id_product=49 1/2 Costilla



                };
              }

              // Agregar el pedido a la franja horaria
              bloques[hora].pedidos.push(pedido);

              // Contamos la cantidad de productos en este pedido
              pedido.productos.forEach((producto) => {
                bloques[hora].cantidadProductos += producto.cantidad;


            // Verificar si el producto ya existe en el array de productos
             const productoExistente = bloques[hora].productos.find(p => p.nombre === producto.alias);
             if (productoExistente) {
              // Si el producto existe, actualizar la cantidad
                 productoExistente.cantidad += producto.cantidad;
                 productoExistente.entregado += producto.entregado;
             } else {
            
                bloques[hora].productos.push({nombre: producto.alias, cantidad: producto.cantidad, categoria: producto.categoria, entregado:producto.entregado});
             }
                
                // Si el producto tiene id_product=1, sumamos su cantidad
                if (producto.id === 1) {
                  bloques[hora].cantidadProductosId1 += producto.cantidad;
                }
                // Si el producto tiene id_product=2, sumamos su cantidad
                if (producto.id === 2) {
                  bloques[hora].cantidadProductosId2 += producto.cantidad;
                }
                 // Si el producto tiene id_product=20, sumamos su cantidad
                 if (producto.id === 20) {
                  bloques[hora].cantidadProductosId20 += producto.cantidad;
                }
                // Si el producto tiene id_product=41, sumamos su cantidad
                if (producto.id === 41) {
                  bloques[hora].cantidadProductosId41 += producto.cantidad;
                }
                // Si el producto tiene id_product=48, sumamos su cantidad
                if (producto.id === 48) {
                  bloques[hora].cantidadProductosId48 += producto.cantidad;
                }
               
              });
            });

            return bloques;
          };

          // Agrupar los pedidos por bloques de 15 minutos
          const bloquesPedidos = agruparPorBloques15Minutos(pedidos);

         // console.log('bloque pedidos'+bloquesPedidos);

          // Cálculo de productos después de las 18:00
        const bloquesDespuesDeLas18 = Object.keys(bloquesPedidos)
        .filter(bloque => dayjs(bloque, 'HH:mm').hour() >= 18)  // Filtrar solo bloques después de las 18:00
        .reduce((total, bloque) => {
          // Sumar productos con id = 1 y id = 2 (con ajuste para id = 2)
          return total + bloquesPedidos[bloque].cantidadProductosId1 + bloquesPedidos[bloque].cantidadProductosId2 / 2;
        }, 0);

        // Guardar el resultado en una variable
        const totalProductosDespuesDeLas18 = bloquesDespuesDeLas18;

        // Cálculo de productos hasta las 18:00

        const bloquesAntesdelas18 = Object.keys(bloquesPedidos)
        .filter(bloque => dayjs(bloque, 'HH:mm').hour() < 18)  // Filtrar solo bloques después de las 18:00
        .reduce((total, bloque) => {
          // Sumar productos con id = 1 y id = 2 (con ajuste para id = 2)
          return total + bloquesPedidos[bloque].cantidadProductosId1 + bloquesPedidos[bloque].cantidadProductosId2 / 2;
         
        }, 0 );

        console.log("Bloque pedidos");
        console.log(bloquesPedidos);

        console.log("bloquesAntesdelas18 pedidos");
        console.log(bloquesAntesdelas18);

        console.log("bloquesDespueselas18 pedidos");
        console.log(bloquesDespuesDeLas18);

        

        

        //console.log("Total productos antes de las 18:00 (VM):", bloquesAntesdelas18);

        // Guardar el resultado en una variable
        const totalbloquesAntesdelas18 = bloquesAntesdelas18;

        

        // Sumar los totales antes y después de las 18:00
       const totalProductos = totalProductosDespuesDeLas18 + totalbloquesAntesdelas18;

       


       
       useEffect(() => {
        // Función para obtener el valor de numeroBarra desde la base de datos
        const cargarNumeroBarra = async () => {
          try {
            const fecha = obtenerFechaFormateada();  // Asegúrate de tener esta función definida
            const docRef = doc(db, "estadisticas_diarias", fecha);
            const docSnap = await getDoc(docRef);
    
            if (docSnap.exists()) {
              const data = docSnap.data();
              setNumeroBarra(data.enbarra);  // Asignamos el valor de 'enbarra' a estado
              setVm(data.vm); 
            } else {
              //console.log("No hay datos para la fecha:", fecha);
              
              // Si no existe, puedes dejar el valor en 0 o asignar un valor predeterminado
              setNumeroBarra(0);
            }
          } catch (e) {
            console.error("Error al cargar los datos de numeroBarra: ", e);
          }
        };
    
        cargarNumeroBarra();  // Llamamos a la función cuando el componente se monta
      }, []);  // Solo se ejecuta una vez cuando el componente se monta

      //console.log("Pedidos mañana:", vm);

    
      // Función para guardar los datos de estadisticas_diarias
      const guardarEstadisticasDiarias = async () => {
        try {
          const fecha = obtenerFechaFormateada();
          const docRef = doc(db, "estadisticas_diarias", fecha);
          
          await updateDoc(docRef, {
            enbarra: numeroBarra,
            libresManana:numeroBarra-totalbloquesAntesdelas18,
            libresTarde: numeroBarra-totalProductosDespuesDeLas18,
            vm: bloquesAntesdelas18,
            vt: totalProductosDespuesDeLas18,
            vd: totalProductos,
          });
    
          console.log("Datos guardados exitosamente para el día", fecha);
        } catch (e) {
          console.error("Error al guardar los datos: ", e);
        }
      };

      // Llamar a guardarEstadisticasDiarias cada vez que el valor de numeroBarra cambie
  useEffect(() => {
    if (numeroBarra !== 0) {
      guardarEstadisticasDiarias();
    }
  }, [numeroBarra]);  // Se ejecuta cada vez que 'numeroBarra' cambie



        const [libres, setLibres] = useState(0);  // Estado para 'libres'

        
       

  
        // Cuando el numeroBarra o totalProductosDespuesDeLas18 cambien, recalculamos 'libres'
        useEffect(() => {
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
        }, [numeroBarra, totalProductosDespuesDeLas18, totalbloquesAntesdelas18]);
          


      
          //search clientes 
          const [clientes, setClientes] = useState([]);
          // Estado para el término de búsqueda
          const [searchTerm, setSearchTerm] = useState('');

          

          // Función para manejar el cambio en el input de búsqueda
          const handleSearchChange = (e) => {
            setSearchTerm(e.target.value);
            //console.log(e.target.value);
          };


          const [totales, setTotales] = useState({
            totalProductosId1: 0,
            totalProductosId2: 0,
            totalProductosId20: 0,
            totalProductosId41: 0,
            totalProductosId48: 0,
          });

          useEffect(() => {
            const horaActual = dayjs().locale('es').tz('Europe/Madrid');
            const horaFin = horaActual.add(45, 'minutes');
        
            // Calculamos los totales de productos
            const nuevosTotales = Object.keys(bloquesPedidos).reduce(
              (acc, bloque) => {
                const horaBloque = dayjs(bloque, 'HH:mm');
                if (horaBloque.isBetween(horaActual, horaFin, null, '[)')) {
                  acc.totalProductosId1 += bloquesPedidos[bloque].cantidadProductosId1;
                  acc.totalProductosId2 += bloquesPedidos[bloque].cantidadProductosId2;
                  acc.totalProductosId20 += bloquesPedidos[bloque].cantidadProductosId20;
                  acc.totalProductosId41 += bloquesPedidos[bloque].cantidadProductosId41;
                  acc.totalProductosId48 += bloquesPedidos[bloque].cantidadProductosId48;
                }
                return acc;
              },
              {
                totalProductosId1: 0,
                totalProductosId2: 0,
                totalProductosId20: 0,
                totalProductosId41: 0,
                totalProductosId48: 0,
              }
            );
        
            // Solo actualizamos el estado si los totales han cambiado
            if (
              nuevosTotales.totalProductosId1 !== totales.totalProductosId1 ||
              nuevosTotales.totalProductosId2 !== totales.totalProductosId2 ||
              nuevosTotales.totalProductosId20 !== totales.totalProductosId20 ||
              nuevosTotales.totalProductosId41 !== totales.totalProductosId41 ||
              nuevosTotales.totalProductosId48 !== totales.totalProductosId48
            ) {
              setTotales(nuevosTotales);
            }
          }, [bloquesPedidos, totales]); // Añadimos `totales` como dependencia para evitar ciclos infinitos


         // console.log(totales.totalProductosId41);




    let bloquesFiltrados = bloquesPedidos;

    if (!dateToPass) { 
      const currentTime = dayjs().locale('es').tz('Europe/Madrid'); // Obtener la hora actual en España
      const isBefore6PM = currentTime.hour() < 18; // Verificar si es antes de las 18:00

      if (isBefore6PM) {
        // Filtramos los bloques antes de las 18:00
        bloquesFiltrados = Object.keys(bloquesPedidos)
          .filter((hora) => {
            const [hour, minute] = hora.split(":");
            const time = new Date();
            time.setHours(parseInt(hour), parseInt(minute), 0);
            return time.getHours() < 18;
          })
          .reduce((acc, hora) => {
            acc[hora] = bloquesPedidos[hora];
            return acc;
          }, {});
      } else {
        // Filtramos los bloques después de las 18:00
        bloquesFiltrados = Object.keys(bloquesPedidos)
          .filter((hora) => {
            const [hour, minute] = hora.split(":");
            const time = new Date();
            time.setHours(parseInt(hour), parseInt(minute), 0);
            return time.getHours() >= 18;
          })
          .reduce((acc, hora) => {
            acc[hora] = bloquesPedidos[hora];
            return acc;
          }, {});
      }
    }



    console.log("bloquesFiltrados");
    console.log(bloquesFiltrados);


    


    const pollosEntregados = Object.values(bloquesFiltrados).reduce((total, bloque) => {
      // Filtrar los pedidos dentro de cada bloque
      const entregadosPorBloque = bloque.pedidos.reduce((sumaEntregados, pedido) => {
        // Filtrar los productos con id_product 1
        const productosDePollo = pedido.productos.filter(producto => producto.id === 1 || producto.id === 2);
        
        // Sumar la cantidad entregada de los productos de pollo (id_product === 1)
        const entregados = productosDePollo.reduce((totalEntregado, producto) => {
          if (producto.id === 1) {  // Si es id_product 1, sumamos el valor de 'entregado' directamente
            return totalEntregado + producto.entregado;
          } else if (producto.id === 2) { // Si es id_product 2, sumamos el valor de 'entregado' multiplicado por 0.5
            return totalEntregado + (producto.entregado*0.5);
          }
          return totalEntregado;
        }, 0);
        
        
        // Sumar los entregados de este pedido a la suma total
        return sumaEntregados + entregados;
      }, 0);
    
      // Sumar la cantidad de entregados del bloque
      return total + entregadosPorBloque;
    }, 0); // Empezamos con 0 como valor inicial de la suma
    
    
    console.log("pollosEntregados: "+pollosEntregados);

    let mostraBarra=numeroBarra-pollosEntregados;

          
          
          


          

         
          
          
        



  return (

    <>
    <div className="flex justify-center items-center w-full p-[0.5vh] mt-[6vh] mb-1" >
          {/* Contenedor principal con un grid de 12 columnas */}
          <div className="grid grid-cols-12 gap-2 w-full fixed top-0 bg-white p-2">
            
                    <div className="flex w-full gap-2" >
                        <div className="w-1/2 h-[10vh] bg-[#f2ac02] flex justify-center items-center rounded-xl shadow-md" onClick={toggleOffcanvas}>
                          <svg width="2.3vw" height="2.3vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                          <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                          <g id="SVGRepo_iconCarrier"> <path d="M20 7L4 7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> <path d="M20 12L4 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> <path d="M20 17L4 17" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/> </g>

                          </svg>
                         </div>
                    
                      
                      <div className="w-1/2 h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md">
                          {/* Icono en la parte superior */}
                          <svg fill="#FFFFFF" height="2vw" width="2vw" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve">

                          <g id="SVGRepo_bgCarrier" strokeWidth="5"/>

                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                          <g id="SVGRepo_iconCarrier"> <g> <g> <path d="M499.2,409.6H12.8c-7.074,0-12.8,5.726-12.8,12.8s5.726,12.8,12.8,12.8h486.4c7.074,0,12.8-5.726,12.8-12.8 S506.274,409.6,499.2,409.6z"/> </g> </g> <g> <g> <path d="M460.8,76.8H51.2c-14.14,0-25.6,11.46-25.6,25.6v256c0,14.14,11.46,25.6,25.6,25.6h409.6c14.14,0,25.6-11.46,25.6-25.6 v-256C486.4,88.26,474.94,76.8,460.8,76.8z M460.8,358.4H51.2v-256h409.6V358.4z"/> </g> </g> <g> <g> <path d="M353.57,164.233c-4.813-6.673-12.544-10.633-20.77-10.633H194.441l-61.688-24.678c-6.528-2.654-14.012,0.546-16.64,7.125 c-2.628,6.554,0.572,14.003,7.134,16.623l55.953,22.383V256c0,14.14,11.46,25.6,25.6,25.6h102.4 c11.017,0,20.804-7.049,24.286-17.502l25.6-76.8C359.689,179.49,358.383,170.906,353.57,164.233z M307.2,256H204.8v-76.8h128 L307.2,256z"/> </g> </g> <g> <g> <circle cx="204.8" cy="307.2" r="25.6"/> </g> </g> <g> <g> <circle cx="307.2" cy="307.2" r="25.6"/> </g> </g> </g>

                          </svg>
                          
                          {/* Texto debajo del ícono */}
                          <p className="text-white text-[0.90vw] text-center bg-green-700 rounded-md py-1 px-3 mt-2">{pedidosConOrigenUno}</p>
                       </div>

          </div>



         <div className='w-[8vw] h-[10vh] bg-[#f2ac02]  rounded-xl shadow-md'>

            <div className="flex justify-center items-center h-1/2" onClick={() => handlePedidoRapido(1)}>
            <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4">1P</button>
            </div>
            
            
            <div className="flex justify-center items-center h-1/2" onClick={() => handlePedidoRapido(2)}>
            <button type='button' className="text-white text-center text-[1.8vw] font-nunito ">1/2P</button>
            </div>
        
         </div>

         


        <div className='w-[8vw] h-[10vh] bg-gray-700 rounded-xl shadow-md'>

         <div className="flex justify-center items-center h-1/2" onClick={restarCinco}>
         <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4">-5</button>
         </div>
        
        
         <div className="flex justify-center items-center h-1/2" onClick={restarCuatro}>
         <button type='button' className="text-white text-center text-[1.8vw] font-nunito">-4</button>
         </div>
       </div>


            <div className='w-[8vw] h-[10vh]  bg-gray-700 rounded-xl shadow-md'>
              
                <div className="flex justify-center items-center h-1/2" onClick={sumarCinco} >
                <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4"  >+5</button>
                </div>
                
                
                <div className="flex justify-center items-center h-1/2" onClick={sumarCuatro}>
                <button type='number' className="text-white text-center text-[1.8vw] font-nunito">+4</button>
                </div>

          </div>





          <div className={`w-[8vw] h-[10vh] ${mostraBarra < 0 ? 'bg-[#cb4335]' : 'bg-gray-500'} flex flex-col justify-center items-center rounded-xl shadow-md`}>
            <input
              type="text"
              value={mostraBarra}
              onChange={handleInputChange}
              className="text-white text-center font-nunito bg-transparent border-none focus:outline-none w-full h-full text-[2.5vw] max-w-full max-h-[7.4vh]" 
            />
            <p className="text-white text-center text-[2w] font-nunito pb-[1vh] ">En barra</p>
          </div>


     


      <div className='w-[8vw] h-[10vh]  bg-gray-700 rounded-xl shadow-md'>
         <div className="flex justify-center items-center h-1/2" onClick={sumarUno}>
         <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4">+1</button>
         </div>
        
        
         <div className="flex justify-center items-center h-1/2" onClick={sumaMedio}>
         <button type='button' className="text-white text-center text-[1.8vw] font-nunito">+1/2</button>
         </div> 
      </div>



      <div className='w-[8vw] h-[10vh]  bg-gray-700 rounded-xl shadow-md'>
        
      <div className="flex justify-center items-center h-1/2"  onClick={restarUno}>
      <button type='button' className="text-white text-center text-[1.8vw] font-nunito border-b-4">-1</button>
         </div>
        
        
         <div className="flex justify-center items-center h-1/2" onClick={restaMedio}>
         <button type='button' className="text-white text-center text-[1.8vw] font-nunito">-1/2</button>
         </div>
        
      </div>


      <div className={`w-[8vw] h-[10vh] ${libres < 0 ? 'bg-[#cb4335]' : 'bg-[#f2ac02]'} flex flex-col justify-center items-center rounded-xl shadow-md`}>
      {loading ? (
        // Spinner (SVG) mientras se calculan los libres
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 50 50"
          className="animate-spin h-12 w-12 text-white"
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            fill="currentColor"
            d="M 45,25 A 20,20 0 0,1 25,45 A 20,20 0 0,1 5,25 A 20,20 0 0,1 25,5 A 20,20 0 0,1 45,25 Z"
          />
        </svg>
      ) : (
        <>
          <h1 className="text-white text-center text-[2.5vw] font-nunito">{libres}</h1>
          <p className="text-white text-center text-[0.85vw] font-nunito mt-[0.90vh] ">Libres</p>
        </>
      )}
    </div>

   




              <div className='w-[8vw] h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
            {totalbloquesAntesdelas18.toFixed(1)}
            </h1>
            <h1 className="text-white text-center text-[2w] font-nunito">VM</h1>
          </div>

          <div className='w-[8vw] h-[10vh] bg-[#f2ac02] flex flex-col justify-center items-center rounded-xl shadow-md'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
            {totalProductosDespuesDeLas18.toFixed(1)}
            </h1>
            <h1 className="text-white text-center text-[2w] font-nunito">VT</h1>
          </div>

          {/* Aquí sumamos VM + VT */}
          <div className='w-[8vw] h-[10vh] bg-[#f2ac02]  flex flex-col justify-center items-center rounded-xl shadow-md'>
            <h1 className="text-white text-center text-[2vw] font-nunito">
             {totalProductos.toFixed(1)}
            </h1>
            <h1 className="text-white text-center text-[2w] font-nunito">VD</h1>
          </div>




      
        <div className={`${divStyle} flex flex-col justify-center items-center rounded-xl shadow-md`} onClick={handleShowModal}>
            <RelojDistinto fecha={dateToPass} />
          </div>
      </div>
    </div>

    <div className="w-full bg-gray-700 mt-5 p-1 fixed flex">
    <div className="flex justify-start items-center"> {/* Alinea ambos divs horizontal y verticalmente */}
      <div className="ms-3 p-1">
        <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
          <g id="SVGRepo_iconCarrier">
            <path fillRule="evenodd" clipRule="evenodd" d="M15 10.5C15 12.9853 12.9853 15 10.5 15C8.01472 15 6 12.9853 6 10.5C6 8.01472 8.01472 6 10.5 6C12.9853 6 15 8.01472 15 10.5ZM14.1793 15.2399C13.1632 16.0297 11.8865 16.5 10.5 16.5C7.18629 16.5 4.5 13.8137 4.5 10.5C4.5 7.18629 7.18629 4.5 10.5 4.5C13.8137 4.5 16.5 7.18629 16.5 10.5C16.5 11.8865 16.0297 13.1632 15.2399 14.1792L20.0304 18.9697L18.9697 20.0303L14.1793 15.2399Z" fill="#e5e7e9"/>
          </g>
        </svg>
      </div>
      <div className="ms-1 w-30 h-6 bg-white rounded-md">
      <div className="relative w-full">
  <input
    type="text"
    className="w-full h-full bg-transparent border-none outline-none px-2 text-center pl-8"
    placeholder="buscar..."
    value={searchTerm}
    onChange={handleSearchChange}
  />
  {searchTerm && (
    <button
      className="absolute right-2 top-1/2 transform -translate-y-1/2"
      onClick={() => setSearchTerm('')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-500 hover:text-gray-700"
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )}
</div>

      </div>
    </div>


  {/* Contenedor flex para centrar el texto */}
  <div className="flex justify-center w-full mt-1">
    <div className="text-white text-[1.5vh]">
      {/* Proximos 45 minutos */}
      {(() => {
       

          
           return (
          <div>
            {dateToPass && (
              // Si dateToPass está presente, mostrar "Modo Supervisión" encima del div
              <span className="text-[#75adab] font-nunito font-extrabold -ms-[10vw]">MODO SUPERVISIÓN PEDIDOS</span>
            )}
        
            <div
              className={`text-gray-400 font-nunito text-xl flex space-x-1 -ms-[8vw] ${
                dateToPass ? 'bg-gray-300' : 'bg-transparent'
              }`} // Cambiar el color de fondo dependiendo de la condición
            >
              {!dateToPass && (
                <>
                  <span>Prox 45 min</span>
                  <span>|</span>
                  <span className="font-nunito text-gray-400">Pollo:</span>
                  <span className="text-white font-nunito font-extrabold">{totales.totalProductosId1}</span>
                  <span>+</span>
                  <span className="text-white font-nunito font-extrabold">{totales.totalProductosId2}</span>
                  <span>/2</span>
                  {
                      totales.totalProductosId20 > 0 && (
                        <>
                          <span>|</span>
                          <span className="text-gray-400 font-nunito">Codillo:</span>
                          <span className="text-white font-nunito font-extrabold">{totales.totalProductosId20}</span>
                         
                        </>
                      )
                    }
                    {
                      totales.totalProductosId41 > 0 && (
                        <>
                          <span>|</span>
                          <span className="text-gray-400 font-nunito">Costilla:</span>
                          <span className="text-white font-nunito font-extrabold">{totales.totalProductosId41}</span>
                         
                        </>
                      )
                    }
                    {
                      totales.totalProductosId48 > 0 && (
                        <>
                           <span>+</span>
                           <span className="text-white font-nunito font-extrabold">{totales.totalProductosId48}</span>
                           <span>/2</span>
                        </>
                      )
                    }
                  

                 
                 
                </>
              )}
            </div>
          </div>
        );
        
        
      })()}
    </div>
  </div>
    </div>






          <div className="w-full bg-gray-100 flex flex-col justify-center items-center mt-[6rem] mb-2 pl-1 pr-1">  
        {Object.keys(bloquesFiltrados).map((bloque) => (
          <div key={bloque} className="w-full ">
            {/* Título con la franja horaria */}
             <div className="text-center  bg-gray-500 text-md font-semibold mb-1 text-white font-nunito rounded-md ">
                  <div className="flex justify-center items-center  ">
                    <div>
                    <span className='text-xl ms-[48vw] font-extrabold  '>{bloque}</span> {/* Mostrar la hora de la franja horaria */}
                    </div>
                    <div className=' flex ml-auto me-4 items-center'>
                    <p className="text-lg font-bold  text-gray-300   "><span> Pedidos: </span>{bloquesFiltrados[bloque]?.pedidos.length || 0}  | Entregados:  </p>
                    {/* Contamos los pedidos completados */}
                    <p className="text-lg font-bold text-gray-300 ms-1 ">
                      {/* Descontamos los productos completados de la longitud total de pedidos */}
                      {bloquesFiltrados[bloque]?.pedidos.filter(pedido => {
                        // Verificar si todos los productos del pedido están completos
                        const todosCompletados = pedido.productos.every(producto => producto.entregado === producto.cantidad);
                        return todosCompletados;  // Solo contar los pedidos donde todos los productos están completos
                      }).length || 0} 
                    </p>
             </div>
          
         
         
        </div>
        
        {/* Mostrar los alias de los productos en la franja horaria */}
        {Object.keys(bloquesFiltrados[bloque].productos).length > 0 && (
  <div className="">
    {bloquesFiltrados[bloque].productos
      // Ordenamos los productos según la categoría
      .sort((a, b) => {
        // Definimos las prioridades de las categorías
        const categoriaPrioridad = {
          comida: 1,
          complementos: 2,
          bebidas: 3,
          postres: 4,
          extras: 5,
        };
        
        // Comparamos las categorías para ordenarlas
        return categoriaPrioridad[a.categoria] - categoriaPrioridad[b.categoria];
      })
      .map((producto, index) => {
        // Ahora accedemos directamente al objeto producto en el array

        const categoriaColor = producto.categoria === "comida"
          ? "text-yellow-500"  // Si la categoría es comida, amarillo
          : producto.categoria === "complementos"
          ? "text-green-900"  // Si la categoría es complementos, verde
          : producto.categoria === "bebidas"
          ? "text-red-700"  // Si la categoría es bebidas, rojo
          : producto.categoria === "postres"
          ? "text-purple-700"  // Si la categoría es postres, morado
          : producto.categoria === "extras"
          ? "text-gray-900"  // Si la categoría es extras, gris
          : "text-gray-900";  // Si no es ninguna de las anteriores, gris

        return (
          <span key={index} className={`mr-2 font-extrabold font-nunito text-lg ${categoriaColor}`}>
            {producto.nombre}: {producto.cantidad} ({producto.entregado}) 
          </span>
        );
      })}
  </div>
)}

      </div>

      {/* Filtrar y mostrar los pedidos de esa franja horaria, aplicando el filtro de clientes */}
      {bloquesFiltrados[bloque].pedidos.filter((pedido) => {
        // Filtrar solo los pedidos que coinciden con el término de búsqueda de clientes
        const numeroPedido = String(pedido.NumeroPedido || ""); // Convertir a string vacío si es null o undefined
        const clienteMatch = pedido.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
        const numeroPedidoMatch = numeroPedido.toLowerCase().includes(searchTerm.toLowerCase());
        return clienteMatch || numeroPedidoMatch;
      }).map((pedido) => {
        // Comprobamos si todos los productos del pedido tienen "entregado" igual a "cantidad"
        const todosCompletados = pedido.productos.every(producto => producto.entregado === producto.cantidad);
        
        // Si todos los productos están completos, el color de fondo cambia a verde
        const containerColor = todosCompletados ? 'bg-[#52be80]' : 'bg-gray-200';

        return (
          <div key={pedido.id} className={`w-full flex ${containerColor} p-[0.30vh] mb-1 rounded-md`}>
            <div className="flex items-center">
              <h3
                className={`text-[0.70vw] font-semibold mr-4 text-center
                  ${pedido.origen === 1 ? 'text-green-700' : 
                  pedido.origen === 0 ? 'text-gray-600' : 'text-gray-700'}`}
              >
                {pedido.NumeroPedido}
                <p className="pt-1 w-16 text-[0.5vw] font-extrabold">{pedido.cliente ? pedido.cliente : 'Generico'}</p>
              </h3>

              {/* Botón para mostrar detalles */}
              <div className="ms-[-0.5vw]">
                <button
                  className="p-1 rounded-md hover:bg-[#f2ac02] transition-all border-1 border-gray-300"
                  onClick={() => handleShowModal1(pedido.NumeroPedido)}
                >
                  <svg fill="#808b96" width="25px" height="25px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12,7a2,2,0,1,0-2-2A2,2,0,0,0,12,7Zm0,10a2,2,0,1,0,2,2A2,2,0,0,0,12,17Zm0-7a2,2,0,1,0,2,2A2,2,0,0,0,12,10Z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Mostrar los productos de este pedido */}
            <div className="ml-2 gap-2 flex flex-wrap items-center ">
              {pedido.productos.map((producto) => {
                let borderColor = 'border-gray-500';
                let backgroundColor = 'bg-white';

                // Obtener el valor de entregado del producto
                const entregadoActual = producto.entregado || 0;
                const cantidadTotal = producto.cantidad;

                // Definir el borde según la categoría
                if (producto.categoria === 'comida') {
                  borderColor = 'border-3 border-yellow-500';
                } else if (producto.categoria === 'complementos') {
                  borderColor = 'border-3 border-green-700';
                } else if (producto.categoria === 'bebidas') {
                  borderColor = 'border-3 border-red-700';
                } else if (producto.categoria === 'postres') {
                  borderColor = 'border-3 border-purple-700';
                } else if (producto.categoria === 'extras') {
                  borderColor = 'border-3 border-gray-500';
                }

                // Si entregado es igual a cantidad, cambia el color de fondo
                if (entregadoActual === cantidadTotal) {
                  backgroundColor = 'bg-[#52be80]';
    
                    }

                return (
                  <div
                    key={producto.id}
                    className={`border-2 ${borderColor} ${backgroundColor} p-2 rounded-md w-auto flex items-center text-md `}
                    onClick={() => handleClick(pedido.NumeroPedido, producto.id, producto.cantidad)}
                  >
                    {producto.alias}
                    <strong className="text-gray-500 ms-1"> [ </strong>
                    <strong>{producto.entregado}/{producto.cantidad}</strong> {/* Mostrar entregado y cantidad */}
                    <strong className="text-gray-500"> ] </strong>
                    {producto.celiaco && <img src={singluten} alt="Sin gluten" className="w-5 h-5 ml-2" />}
                    {producto.tostado && <img src={fire_new} alt="Tostado" className="w-5 h-5 ml-2" />}
                    {producto.troceado && <img src={tijera_new} alt="Troceado" className="w-5 h-5 ml-2" />}
                    {producto.salsa && <p className="ms-2 font-extrabold font-nunito"> | S.S</p>}
                    {producto.extrasalsa && <p className="ms-2 font-extrabold font-nunito"> | E.S</p>}

                    
                  </div>
                );
              })}

              {/* Si el pedido está completamente entregado, mostrar el componente GenerarQRCodeInvisible una sola vez */}
              {pedido.productos.every(producto => producto.entregado === producto.cantidad) && (
                <GenerarQRCodeInvisible numeroPedido={pedido.NumeroPedido} />
              )}

               {/* Si no tiene observaciones pero está pagado, mostrar solo el icono de pagado */}
               {pedido.pagado && !pedido.observaciones && (
                    <div className={`ml-2 p-2 gap-3 border-1 border-gray-700 ${pedido.productos.every(producto => producto.entregado === producto.cantidad) ? 'bg-[#52be80]' : 'bg-gray-300'} rounded-md w-auto font-nunito flex justify-center items-center`}>
                      <img src={dinero} alt="importe pagado" className="w-5" />
                    </div>
                  )}

                  {/* Mostrar las observaciones del pedido */}
                  {pedido.pagado && pedido.observaciones && (
                    <div className={`ml-2 p-2 gap-3 border-1 border-gray-700 ${pedido.productos.every(producto => producto.entregado === producto.cantidad) ? 'bg-[#52be80]' : 'bg-gray-300'} rounded-md w-auto font-nunito flex justify-center items-center`}>
                      <p className="flex items-center gap-3">
                        <img src={dinero} alt="importe pagado" className="w-5" />
                        Ob: {pedido.observaciones}
                      </p>
                    </div>
                  )}

                  {/* Si tiene observaciones y no está pagado, mostrar solo las observaciones */}
                  {!pedido.pagado && pedido.observaciones && (
                    <div className={`ml-2 p-2 gap-3 border-1 border-gray-700 ${pedido.productos.every(producto => producto.entregado === producto.cantidad) ? 'bg-[#52be80]' : 'bg-gray-300'} rounded-md w-auto font-nunito flex justify-center items-center`}>
                      <p>Ob: {pedido.observaciones}</p>
                    </div>
              )}


            </div>

          </div>
        );
      })}
    </div>
  ))}
</div>












    {/* Offcanvas */}
    <Offcanvas show={show} onHide={toggleOffcanvas} placement="start"  style={{ width: '120px', top: '123px', background: '#f2ac02', borderTopRightRadius: '30px', borderBottomRightRadius: '30px' }}>
  <Offcanvas.Header closeButton>
    <Offcanvas.Title></Offcanvas.Title>
  </Offcanvas.Header>
  <Offcanvas.Body>
    <Nav>
    <ul className=" ms-2 flex  flex-col justify-between text-center items-center gap-10   bg-[#f2ac02] ">

      <Link className=" p-3 mt-2  hover:bg-gray-100 hover:rounded-2xl " to={"/layout/comida"}>

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575">

          <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

          <g id="SVGRepo_iconCarrier"> <path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M15 18H9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

      </svg>


      </Link>

      <Link className='p-3   hover:bg-gray-100 hover:rounded-2xl' to={"/ordenes"} onClick={() => {
          window.location.reload(); // Recarga la página al hacer clic en el enlace
        }}>

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

          <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

          <g id="SVGRepo_iconCarrier"> <path d="M10.5 14L17 14" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 14H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 10.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 17.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 10.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 17.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="#757575" strokeWidth="1.5"/> <path d="M21 16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V13.0002M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V12.0002M8 4.00195C5.82497 4.01406 4.64706 4.11051 3.87868 4.87889C3.11032 5.64725 3.01385 6.82511 3.00174 9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

      </svg>


      </Link>

      <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl' to={"/freidora"}>

      <svg fill="#757575" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="40px" height="40px" viewBox="0 0 91.689 91.689" xmlSpace="preserve">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

      <g id="SVGRepo_iconCarrier"> <g> <path d="M74.41,42.085l-6.922,3.783l0.58-6.131l1.436,0.376l16.424-5.548l-3.037-10.497l-13.729,4.637l-14.853-3.892l-14.513,2.276 l-13.521-2.528l-10.109,8.94l6.299,8.324L22.2,41.833l-9.982,3.899l-7.474-4.445L0,50.855l11.6,6.9l12.813-5.004l3.576-0.113 l-3.738,8.75l11.969,6.232L48.73,61.9l14.635-1.299l13.471-7.364l14.443,1.183l0.41-10.919L74.41,42.085z M27.438,29.346 l12.301,2.301l14.371-2.255l15.19,3.98l10.857-3.667l0.553,1.908l-11.347,3.834l-15.342-4.02l-14.309,2.245l-11.758-2.199 l-4.762,4.211l-1.172-1.549L27.438,29.346z M29.121,36.258l10.533,1.971l5.236-0.821l-8.355,3.971l-13.697,0.435L29.121,36.258z M23.506,48.284l-11.654,4.552l-6.215-3.695L6.5,47.402l5.463,3.249l11.143-4.351l14.477-0.461l14.324-6.809l11.86,1.652 l-0.186,1.978l-11.352-1.58l-14.184,6.741L23.506,48.284z M39.096,52.284l13.867-6.592l11.834,1.647l-4.608,2.52l-14.285,1.268 l-9.746,4.456l-5.801-3.021L39.096,52.284z M87.266,49.611l-11.424-0.936l-13.776,7.532l-14.492,1.285l-11.379,5.204l-6.414-3.338 l0.764-1.786l5.639,2.937l10.877-4.976l14.428-1.278l13.916-7.606l11.938,0.979L87.266,49.611z"/> </g> </g>

      </svg>
      </Link>

      <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/cocina"}>

      <svg fill="#757575" height="40px" width="40px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" stroke="#757575" strokeWidth="6">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />

      <g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M85.432,411.629H40.162c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C93.516,415.247,89.896,411.629,85.432,411.629z"/> <path d="M471.838,411.629h-45.269c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C479.922,415.247,476.303,411.629,471.838,411.629z"/> <path d="M490.981,115.637h-21.435h-5.392c-4.466,0-8.084,3.619-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h5.392h21.435 c2.674,0,4.851,2.176,4.851,4.851v205.151H264.084V131.805h83.659h89.466c4.466,0,8.084-3.619,8.084-8.084 c0-4.466-3.618-8.084-8.084-8.084h-89.466H256H21.019C9.429,115.637,0,125.066,0,136.656v213.236v21.492 c0,11.59,9.429,21.019,21.019,21.019H256h234.981c11.59,0,21.019-9.429,21.019-21.019v-21.492V136.656 C512,125.066,502.571,115.637,490.981,115.637z M247.916,341.807h-27.365c-4.466,0-8.084,3.619-8.084,8.084 s3.618,8.084,8.084,8.084h27.365v18.258H21.019c-2.674,0.001-4.851-2.175-4.851-4.849v-13.408h177.795 c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H16.168V136.656c0-2.674,2.176-4.851,4.851-4.851h226.897 V341.807z M495.832,371.384c0,2.674-2.176,4.851-4.851,4.851H264.084v-18.258h231.747V371.384z"/> <path d="M286.181,209.934v53.787c0,4.466,3.619,8.084,8.084,8.084c4.466,0,8.084-3.618,8.084-8.084v-53.787 c0-4.466-3.618-8.084-8.084-8.084C289.8,201.85,286.181,205.468,286.181,209.934z"/> <path d="M217.735,271.805c4.466,0,8.084-3.618,8.084-8.084v-53.787c0-4.466-3.619-8.084-8.084-8.084s-8.084,3.619-8.084,8.084 v53.787C209.65,268.187,213.269,271.805,217.735,271.805z"/> <path d="M8.084,100.371h495.832c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H8.084 C3.619,84.203,0,87.821,0,92.287C0,96.753,3.619,100.371,8.084,100.371z"/> <path d="M43.32,200.086c2.068,0,4.137-0.789,5.716-2.368l29.048-29.049c3.157-3.157,3.157-8.276-0.001-11.432 c-3.156-3.156-8.275-3.157-11.432,0.001l-29.048,29.049c-3.157,3.157-3.157,8.276,0.001,11.432 C39.182,199.297,41.251,200.086,43.32,200.086z"/> <path d="M64.557,225.374c1.579,1.578,3.649,2.367,5.717,2.367s4.138-0.789,5.717-2.367l52.958-52.958 c3.157-3.158,3.157-8.276,0-11.433c-3.158-3.156-8.276-3.156-11.434,0l-52.958,52.958C61.4,217.099,61.4,222.217,64.557,225.374z "/> <path d="M46.664,231.834l-2.877,2.877c-3.157,3.158-3.157,8.276,0,11.433c1.579,1.578,3.649,2.367,5.717,2.367 c2.068,0,4.138-0.789,5.717-2.367l2.877-2.877c3.157-3.158,3.157-8.276,0-11.433C54.94,228.678,49.822,228.678,46.664,231.834z"/> </g> </g> </g> </g>

      </svg>
      
      </Link>

      <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/buscadorPedidos"}>

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

      <g id="SVGRepo_iconCarrier"> <path d="M14 4C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V13M10 4C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10 16H6" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <circle cx="18" cy="17" r="3" stroke="#757575" strokeWidth="1.5"/> <path d="M20.5 19.5L21.5 20.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M2 10L7 10M22 10L11 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

      </svg>
      </Link>

      <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/stock"}> 

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

      <g id="SVGRepo_iconCarrier"> <path d="M7.50626 15.2647C7.61657 15.6639 8.02965 15.8982 8.4289 15.7879C8.82816 15.6776 9.06241 15.2645 8.9521 14.8652L7.50626 15.2647ZM6.07692 7.27442L6.79984 7.0747V7.0747L6.07692 7.27442ZM4.7037 5.91995L4.50319 6.64265L4.7037 5.91995ZM3.20051 4.72457C2.80138 4.61383 2.38804 4.84762 2.2773 5.24675C2.16656 5.64589 2.40035 6.05923 2.79949 6.16997L3.20051 4.72457ZM20.1886 15.7254C20.5895 15.6213 20.8301 15.2118 20.7259 14.8109C20.6217 14.41 20.2123 14.1695 19.8114 14.2737L20.1886 15.7254ZM10.1978 17.5588C10.5074 18.6795 9.82778 19.8618 8.62389 20.1747L9.00118 21.6265C10.9782 21.1127 12.1863 19.1239 11.6436 17.1594L10.1978 17.5588ZM8.62389 20.1747C7.41216 20.4896 6.19622 19.7863 5.88401 18.6562L4.43817 19.0556C4.97829 21.0107 7.03196 22.1383 9.00118 21.6265L8.62389 20.1747ZM5.88401 18.6562C5.57441 17.5355 6.254 16.3532 7.4579 16.0403L7.08061 14.5885C5.10356 15.1023 3.89544 17.0911 4.43817 19.0556L5.88401 18.6562ZM7.4579 16.0403C8.66962 15.7254 9.88556 16.4287 10.1978 17.5588L11.6436 17.1594C11.1035 15.2043 9.04982 14.0768 7.08061 14.5885L7.4579 16.0403ZM8.9521 14.8652L6.79984 7.0747L5.354 7.47414L7.50626 15.2647L8.9521 14.8652ZM4.90421 5.19725L3.20051 4.72457L2.79949 6.16997L4.50319 6.64265L4.90421 5.19725ZM6.79984 7.0747C6.54671 6.15847 5.8211 5.45164 4.90421 5.19725L4.50319 6.64265C4.92878 6.76073 5.24573 7.08223 5.354 7.47414L6.79984 7.0747ZM11.1093 18.085L20.1886 15.7254L19.8114 14.2737L10.732 16.6332L11.1093 18.085Z" fill="#757575"/> <path d="M19.1647 6.2358C18.6797 4.48023 18.4372 3.60244 17.7242 3.20319C17.0113 2.80394 16.1062 3.03915 14.2962 3.50955L12.3763 4.00849C10.5662 4.47889 9.66119 4.71409 9.24954 5.40562C8.8379 6.09714 9.0804 6.97492 9.56541 8.73049L10.0798 10.5926C10.5648 12.3481 10.8073 13.2259 11.5203 13.6252C12.2333 14.0244 13.1384 13.7892 14.9484 13.3188L16.8683 12.8199C18.6784 12.3495 19.5834 12.1143 19.995 11.4227C20.2212 11.0429 20.2499 10.6069 20.1495 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

      </svg>
      </Link>

      <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/scanner"}>

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="1.2">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

      <g id="SVGRepo_iconCarrier"> <path d="M7.55556 4H5C4.44771 4 4 4.44772 4 5V7.55556M16.4444 4H19C19.5523 4 20 4.44772 20 5V7.55556M20 16.4444V19C20 19.5523 19.5523 20 19 20H16.4444M7.55556 20H5C4.44771 20 4 19.5523 4 19V16.4444M5.77778 12.8889H6.66667M8.44444 12.8889H9.33333M5.77778 11H10.1111C10.6634 11 11.1111 10.5523 11.1111 10V5.77778M12.8889 5.77778V11.1111M16.4444 11H18.2222M14.6667 11H15.1111M13.7778 12.8889H15.1111M17 12.8889H18.2222M18.2222 15H15.5556M15.5556 16.8889V18.2222M13.7778 15V18.2222M12 18.2222V12.8889H11.1111M10.2222 14.6667V18.2222M18.2222 17.7778V17.7778C18.2222 17.5323 18.0232 17.3333 17.7778 17.3333V17.3333C17.5323 17.3333 17.3333 17.5323 17.3333 17.7778V17.7778C17.3333 18.0232 17.5323 18.2222 17.7778 18.2222V18.2222C18.0232 18.2222 18.2222 18.0232 18.2222 17.7778ZM18.2222 6.77778V8.33333C18.2222 8.88562 17.7745 9.33333 17.2222 9.33333H15.6667C15.1144 9.33333 14.6667 8.88562 14.6667 8.33333V6.77778C14.6667 6.22549 15.1144 5.77778 15.6667 5.77778H17.2222C17.7745 5.77778 18.2222 6.22549 18.2222 6.77778ZM6.77778 9.33333H8.33333C8.88562 9.33333 9.33333 8.88562 9.33333 8.33333V6.77778C9.33333 6.22549 8.88562 5.77778 8.33333 5.77778H6.77778C6.22549 5.77778 5.77778 6.22549 5.77778 6.77778V8.33333C5.77778 8.88562 6.22549 9.33333 6.77778 9.33333ZM7.44444 18.2222H6.77778C6.22549 18.2222 5.77778 17.7745 5.77778 17.2222V15.6667C5.77778 15.1144 6.22549 14.6667 6.77778 14.6667H7.44444C7.99673 14.6667 8.44444 15.1144 8.44444 15.6667V17.2222C8.44444 17.7745 7.99673 18.2222 7.44444 18.2222Z" stroke="#757575" strokeLinecap="round" strokeLinejoin="round"/> </g>

      </svg>
                  
      </Link>



      <Link className='p-3 mb-2 hover:bg-gray-100 hover:rounded-2xl' to={"/login"}>

      <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

      <g id="SVGRepo_iconCarrier"> <path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

      </svg>
      </Link>

</ul>
    </Nav>
    </Offcanvas.Body>
    </Offcanvas>

    {/* Modal fecha */}
    <Modal show={showModal} onHide={handleCloseModal} size="md" backdrop="static" keyboard={false} centered>
       
        <Modal.Body >

        
                <ThemeProvider theme={theme}> {/* Aplicar el tema personalizado */}
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <DemoContainer components={['StaticDatePicker']}>
                      <DemoItem>
                        <StaticDatePicker
                          displayStaticWrapperAs="desktop"  // 
                          value={selectedDate}
                          defaultValue={dayjs('DD/MM/YYYY')}
                          onChange={handleDateChange}  // Actualiza el estado de la fecha
                          sx={{
                            '& .MuiPickersDay-root': {
                              fontSize: '1.5rem',  // Tamaño de los días
                            },
                            '& .MuiPickersCalendarHeader-root': {
                              fontSize: '1.5rem',  // Tamaño de la cabecera del calendario
                            },
                            '& .MuiPickersDay-selected': {
                              backgroundColor: 'blue',  // Ejemplo de personalización extra (opcional)
                            },
                            '& .MuiPickersDay-dayWithMargin': {
                              margin: '2px',  // Espaciado entre los días
                            },
                          }}
                        />
                      </DemoItem>
                    </DemoContainer>

               </LocalizationProvider>
              </ThemeProvider>

   


        </Modal.Body>
        <Modal.Footer className='no-border'>
        <Button
            variant="secondary"
            className="p-3 bg-white font-nunito text-gray-500 border-gray-300 hover:text-yellow-600 hover:border-yellow-600"
            onClick={handleCloseModal}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
           
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito"
            onClick={handleAccept}
          >
            Aceptar
          </Button>
        </Modal.Footer>
        
    </Modal>

     {/* Modal iconos */}
     <Modal show={showModal1} onHide={handleCloseModal1} size="md" backdrop="static" keyboard={false} centered>
       
  

       
       <Modal.Body className="flex flex-col items-center ">
          

          {/* Tres íconos centrados con sus respectivos onClick */}
          <div className="flex space-x-4">
            <div
              className="p-3 cursor-pointer hover:bg-yellow-500 rounded-md" onClick={() => borrarOrden(pedidoSeleccionado)} 
             
            >
             <svg width="4vw" height="4vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier"> <path d="M20.5001 6H3.5" stroke="#f10707 " strokeWidth="1.5" strokeLinecap="round"/> <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="#f10707 " strokeWidth="1.5"/> <path d="M18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5M18.8334 8.5L18.6334 11.5" stroke="#f10707 " strokeWidth="1.5" strokeLinecap="round"/> </g>

              </svg>
              <p className='text-center p-1 font-nunito text-[#f10707]'>Borrar</p>
            </div>
            <div
              className="p-3 cursor-pointer hover:bg-yellow-500 rounded-lg" 
              //onClick={() => handleIconClick("2")}
            >
              <svg width="4vw" height="4vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                <g id="SVGRepo_iconCarrier"> <path d="M10 21.9948C6.58687 21.9658 4.70529 21.7764 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C21.5093 4.43821 21.8356 5.80655 21.9449 8" stroke="#808b96 " strokeWidth="1.5" strokeLinecap="round"/> <path d="M2.5 7.25C2.08579 7.25 1.75 7.58579 1.75 8C1.75 8.41421 2.08579 8.75 2.5 8.75V7.25ZM22 7.25H2.5V8.75H22V7.25Z" fill="#808b96 "/> <path d="M10.5 2.5L7 8" stroke="#808b96 " strokeWidth="1.5" strokeLinecap="round"/> <path d="M17 2.5L13.5 8" stroke="#808b96 " strokeWidth="1.5" strokeLinecap="round"/> <path d="M18.562 13.9354L18.9791 13.5183C19.6702 12.8272 20.7906 12.8272 21.4817 13.5183C22.1728 14.2094 22.1728 15.3298 21.4817 16.0209L21.0646 16.438M18.562 13.9354C18.562 13.9354 18.6142 14.8217 19.3962 15.6038C20.1783 16.3858 21.0646 16.438 21.0646 16.438M18.562 13.9354L14.7275 17.77C14.4677 18.0297 14.3379 18.1595 14.2262 18.3027C14.0945 18.4716 13.9815 18.6544 13.8894 18.8478C13.8112 19.0117 13.7532 19.1859 13.637 19.5344L13.2651 20.65L13.1448 21.0109M21.0646 16.438L17.23 20.2725C16.9703 20.5323 16.8405 20.6621 16.6973 20.7738C16.5284 20.9055 16.3456 21.0185 16.1522 21.1106C15.9883 21.1888 15.8141 21.2468 15.4656 21.363L14.35 21.7349L13.9891 21.8552M13.9891 21.8552L13.6281 21.9755C13.4567 22.0327 13.2676 21.988 13.1398 21.8602C13.012 21.7324 12.9673 21.5433 13.0245 21.3719L13.1448 21.0109M13.9891 21.8552L13.1448 21.0109" stroke="#808b96 " strokeWidth="1.5"/> </g>

                </svg>
             <p className='text-center p-1 font-nunito text-[#808b96]'>Editar</p>
            </div>
            <div
              className="p-3 cursor-pointer hover:bg-yellow-500 rounded-md"
             // onClick={() => handleIconClick("3")}
            >
              <svg fill="#2ad12f " height="4vw" width="4vw" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 220.262 220.262" xmlSpace="preserve">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier"> <g> <path d="M110.127,0C50.606,0,2.184,48.424,2.184,107.944c0,23.295,9.455,44.211,13.521,52.123 c1.893,3.685,6.416,5.135,10.099,3.243c3.684-1.893,5.136-6.415,3.243-10.099c-3.566-6.941-11.862-25.247-11.862-45.268 C17.184,56.695,58.878,15,110.127,15c51.254,0,92.951,41.695,92.951,92.944c0,51.251-41.697,92.946-92.951,92.946 c-20.044,0-35.971-6.94-41.889-9.925c-1.755-0.886-3.788-1.046-5.66-0.447l-47.242,15.097c-3.945,1.261-6.122,5.481-4.861,9.427 c1.018,3.187,3.968,5.219,7.142,5.219c0.757,0,1.526-0.115,2.285-0.358l44.391-14.186c9.287,4.311,25.633,10.173,45.834,10.173 c59.524,0,107.951-48.424,107.951-107.946C218.078,48.424,169.651,0,110.127,0z"/> <path d="M88.846,89.537c-3.285,2.523-3.902,7.231-1.38,10.517c2.523,3.285,7.23,3.903,10.517,1.38 c2.299-1.766,8.406-6.456,7.512-14.845c-0.551-4.987-5.417-11.83-9.402-16.691c-5.831-7.114-10.767-11.327-14.643-12.513 c-3.632-1.126-7.354-0.948-11.066,0.53c-7.636,3.052-13.025,8.108-15.585,14.622c-2.493,6.344-2.04,13.443,1.313,20.537 c7.827,16.522,18.288,30.791,31.093,42.413c0.05,0.047,0.101,0.093,0.152,0.139c12.987,11.48,28.352,20.325,45.675,26.293 c3.287,1.129,6.513,1.692,9.611,1.692c3.892,0,7.583-0.888,10.94-2.658c6.191-3.264,10.621-9.177,12.814-17.115 c1.056-3.848,0.82-7.564-0.689-11.024c-1.619-3.745-6.35-8.184-14.064-13.193c-5.269-3.422-12.601-7.5-17.64-7.5 c-0.003,0-0.007,0-0.011,0c-8.406,0.034-12.397,6.621-13.899,9.102c-2.146,3.543-1.014,8.155,2.529,10.301 c3.541,2.146,8.154,1.015,10.301-2.529c0.593-0.98,0.969-1.5,1.205-1.772c4.236,1.23,15.567,8.642,17.889,11.761 c0.038,0.166,0.043,0.417-0.082,0.874c-0.739,2.675-2.268,6.204-5.349,7.828c-2.879,1.516-6.312,0.863-8.677,0.051 c-15.413-5.31-29.053-13.142-40.543-23.279c-0.003-0.003-0.007-0.006-0.01-0.01c-11.377-10.308-20.693-23.023-27.688-37.788 c-1.071-2.268-2.1-5.607-0.91-8.634c1.274-3.242,4.613-5.15,7.183-6.177c0.441-0.176,0.69-0.203,0.871-0.179 c3.358,1.965,11.969,12.402,13.66,16.477C90.229,88.41,89.753,88.84,88.846,89.537z"/> </g> </g>

              </svg>
              <p className='text-center p-1 font-nunito text-[#2ad12f]'>Mensaje</p>
            </div>
          </div>
        </Modal.Body>

  


       
       <Modal.Footer className='no-border'>
         <Button
           variant="primary"
          
           className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-2 font-nunito"
           onClick={handleCloseModal1}
         >
           Cerrar
         </Button>
       </Modal.Footer>
       
   </Modal>

     {/* Modal cierre turno */}
     <Modal show={showModal2} onHide={handleCloseModal2} size="md" backdrop="static" keyboard={false} centered>
       
  

       
       <Modal.Body className="flex flex-col items-center ">
          
          <div>

          <h1 className='font-nunito text-2xl font-[2vw] text-[#808b96]'>El Turno actual ha finalizado!</h1>
          </div>
         
         <div className='p-2'>
         <svg fill="#808b96 " width="100px" height="100px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">

              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

              <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>

              </svg>



         </div>
       
        </Modal.Body>

  


       
       <Modal.Footer className='no-border'>
         <Button
           variant="primary"
          
           className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-2 font-nunito"
           onClick={handleCloseModal2}
         >
           Aceptar
         </Button>
       </Modal.Footer>
       
   </Modal>

         
    <PedidoRapido ref={pedidoRapidoRef} datosCliente={datosCliente} />
   
                        
   </>
   
  );
};

export default Ordenes;

