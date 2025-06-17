import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'; // Importamos Firestore
import login from '../../assets/login.jpg';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import CartTotal from '../pedidos/CartTotal';
import LoginJefe from './LoginJefe'
import dayjs from 'dayjs';
import 'dayjs/locale/es'; // Para trabajar con el locale en español
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC
import customParseFormat from 'dayjs/plugin/customParseFormat';
import SonidoOnChange from '../ordenes/SonidoOnChange';
import Ordenes from '../ordenes/Ordenes';
import { Layout } from 'lucide-react';


const Login = () => {
    // Usamos los plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');



  const [valorInput, setValorInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(0);



  const navigate = useNavigate(); // Inicializa el hook useNavigate

  const handleClick = (numero) => {
    // Limitar a 5 caracteres
    if (valorInput.length < 5) {
      setValorInput(valorInput + numero);
    }
  };

  const handleBorrarTodo = () => {
    setValorInput(''); // Asigna una cadena vacía al input
  };

  const handleBorrar = () => {
    setValorInput(valorInput.slice(0, -1)); // Elimina el último carácter
  };

  const obtenerFechaEspana = () => {
    const now = dayjs().tz('Europe/Madrid'); // Hora actual en la zona horaria de España 
    const fecha = now.format('DD-MM-YYYY'); 

    console.log('carlos'+fecha);

      // Obtenemos el día de la semana completo en español
      const diaSemana = now.format('dddd'); 
      console.log(diaSemana)
      return  {diaSemana , fecha} ;
      };


// Función para generar las estadísticas diarias y guardarlas en Firestore
const generarEstadisticasDiarias = async () => {
  let currentStock = null;
  try {
    // Fetch current stock for product ID '1'
    const productRef = doc(db, 'productos', '1');
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      currentStock = productSnap.data().stock;
    } else {
      console.error('Producto con ID 1 no encontrado para obtener stock inicial.');
      setErrorMessage("No se pudo obtener el stock inicial para las estadísticas.");
      return;
    }
  } catch (error) {
    console.error("Error al obtener el stock del producto para estadísticas:", error);
    setErrorMessage("Error obteniendo stock para estadísticas.");
    return;
  }

  if (currentStock === null || typeof currentStock === 'undefined') {
    console.log('Stock no disponible (null o undefined) para generar estadísticas.');
    setErrorMessage("Stock no válido para generar estadísticas.");
    return;
  }

  try {
    const { fecha, diaSemana } = obtenerFechaEspana(); // Obtenemos la fecha y el día de la semana
    const docRef = doc(db, "estadisticas_diarias", fecha); // Usamos la fecha como ID para el documento

    // Verificamos si el documento ya existe
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      // Lógica para el día anterior (ayer)
      const fechaAyer = dayjs().tz('Europe/Madrid').subtract(1, 'day');
      const fechaAyerStr = fechaAyer.format('DD-MM-YYYY');
      const diaSemanaAyer = fechaAyer.format('dddd');
      const docAyerRef = doc(db, "estadisticas_diarias", fechaAyerStr); // Referencia al documento de ayer
      let docAyerSnapshot = await getDoc(docAyerRef); // Intenta obtener el documento de ayer

      // Si el documento de AYER no existe, lo creamos
      if (!docAyerSnapshot.exists()) {
        console.log(`El documento de estadísticas para AYER (${fechaAyerStr}) no existe. Creándolo...`);
        const fechaAnteayer = dayjs().tz('Europe/Madrid').subtract(2, 'day');
        const fechaAnteayerStr = fechaAnteayer.format('DD-MM-YYYY');
        const docAnteayerRef = doc(db, "estadisticas_diarias", fechaAnteayerStr);
        const docAnteayerSnapshot = await getDoc(docAnteayerRef);

        // El stock inicial de ayer es el stock final (o el stock si no hay final) del día anterior a ayer.
        const stockInicialAyer = docAnteayerSnapshot.exists()
          ? (docAnteayerSnapshot.data().stock_final ?? docAnteayerSnapshot.data().stock ?? 0)
          : 0;
        
        // El stock_anterior de ayer es el stock_anterior del día anterior a ayer.
        const stockAnteriorDeAnteayer = docAnteayerSnapshot.exists()
          ? (docAnteayerSnapshot.data().stock_anterior ?? 0)
          : 0;

        await setDoc(docAyerRef, { // Creando el documento de AYER
          diasemana: diaSemanaAyer,
          enbarra: 0, libresManana: 0, libresTarde: 0, vm: 0, vt: 0, vd: 0,
          stock: stockInicialAyer, // Stock inicial de ayer
          stock_anterior: stockAnteriorDeAnteayer, // Stock anterior de ayer (es decir, el inicial de anteayer)
          entran: 0, baja: 0, devueltos: 0,
          // stock_final no se establece aquí, se actualizaría al final del día de ayer.
        });
        console.log(`Documento de estadísticas para AYER (${fechaAyerStr}) creado.`);
        docAyerSnapshot = await getDoc(docAyerRef); // Volvemos a leer el documento de ayer, ya que acaba de ser creado.
      }

      // Obtenemos el stock_anterior para HOY del documento de AYER (que ahora sabemos que existe)
      // Se prioriza stock_final de ayer, si no, el stock (inicial) de ayer.
      const stockAnteriorParaHoy = docAyerSnapshot.exists()
        ? (docAyerSnapshot.data().stock_final ?? docAyerSnapshot.data().stock ?? 0)
        : 0; // Prefer stock_final from yesterday, then stock, then 0

      await setDoc(docRef, {
        diasemana: diaSemana,
        enbarra: 0,
        libresManana: 0,
        libresTarde: 0,
        vm: 0,
        vt: 0,
        vd: 0,
        stock: currentStock, // Stock at the beginning of today
        stock_anterior: stockAnteriorParaHoy, // Stock from the previous day (ayer)
        //stockactualizado:0,
        //stockfinal:0,
        entran: 0,
        baja: 0,
        devueltos: 0,
      });
      console.log("Datos de HOY guardados exitosamente para el día", fecha);
    } else {
      console.log("Ya existen datos para el día de HOY", fecha);
    }
  } catch (e) {
    console.error("Error al generar las estadísticas diarias: ", e);
  }
};
  // Función para validar el PIN en Firebase
  const handleLogin = async () => {
    if (!valorInput || valorInput.length !== 5) {
      setErrorMessage("Por favor ingresa un PIN válido.");
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    //console.log(valorInput);

    try {
      // Creamos la consulta para buscar al empleado con el PIN ingresado
      const empleadosRef = collection(db, 'empleados'); // Accedemos a la colección "empleados"
      const q = query(empleadosRef, where('pin', '==', valorInput)); // Buscamos por el PIN
      const querySnapshot = await getDocs(q); // Obtenemos los documentos que coinciden

      console.log(q);
      console.log(`Se encontraron ${querySnapshot.size} documentos.`); // Ver cuántos documentos devolvió

      if (querySnapshot.empty) {
        setErrorMessage('PIN incorrecto.');
      } else {
        // Si encontramos el documento, podemos obtener los datos del empleado
        querySnapshot.forEach((doc) => {
          const empleado = doc.data();

          console.log(empleado.nombre); // Aquí puedes manejar el login, redirigir, etc.

          // Guardar el nombre del empleado en sessionStorage
        sessionStorage.setItem('empleadoNombre', empleado.nombre);

          // Ejecutamos la función para generar las estadísticas diarias
          generarEstadisticasDiarias(); // Llamamos a la función para crear estadísticas

          // Ejemplo de cómo hacer algo con el dato
          if (empleado.rol === "jefe") {
            console.log("Jefe ingresó correctamente");

           
            
          
            navigate('/layout/comida', { state: { role: empleado.rol } }); // Pasa el rol

          } else if (empleado.rol === "empleado") {
            console.log("Operario ingresó correctamente");

            
         
           
            
            navigate('/stock'); // Redirige a /layout
          }
        });

        setIsLoggedIn(true);
       // console.log(setIsLoggedIn);

      }
    } catch (error) {
      setErrorMessage('Error al verificar el PIN. Intenta nuevamente.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackgroundClick = (e) => {
    // Verifica que el clic haya sido fuera del formulario (evitar que el clic dentro del formulario cierre el mensaje)
    if (e.target === e.currentTarget) {
      setErrorMessage('');
      setValorInput('');
    }
  };





  return (
    <>
<section className="min-h-screen flex items-center justify-center font-nunito bg-gray-200">
  <div className="flex shadow-2xl" onClick={(e) => e.stopPropagation()}>
    <div
      className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl xl:rounded-tr-none xl:rounded-br-none"
      onClick={handleBackgroundClick}
    >
      <h4 className="text-4xl text-gray-500 font-extrabold font-nunito -mt-5">Bienvenido</h4>
      <p className="font-medium text-lg text-gray-400 mt-2 font-nunito border-b-2">Introduce tu PIN!</p>

      <div className="flex flex-col text-xl text-center p-4">
        <input
          type="password"
          maxLength={5} // Limita el máximo de caracteres a 5
          value={valorInput}
          readOnly
          className="w-[6.5vw]  text-yellow-500 bg-white text-center"
        />
      </div>

      <div className="grid grid-cols-3 text-center items-center justify-center gap-3 font-nunito text-gray-500 font-extrabold ">
        {[...Array(9).keys()].map((i) => (
          <div
            key={i + 1}
            onClick={() => handleClick((i + 1).toString())}
            className="p-7 border-2 rounded-2xl hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
          >
            {i + 1}
          </div>
        ))}

        <div
          onClick={handleBorrarTodo}
          className="p-7 border-2 rounded-2xl hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div
          onClick={() => handleClick('0')}
          className="p-7 border-2 rounded-2xl hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
        >
          0
        </div>
        <div
          onClick={handleBorrar}
          className="p-7 border-2 rounded-2xl hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
      </div>

      {errorMessage && <p className="text-red-500 mt-4 font-extrabold font-nunito">{errorMessage}</p>}

      <button
        onClick={handleLogin}
        className="mt-8 tracking-wide font-semibold bg-yellow-500 text-white w-full py-4 rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none"
        disabled={isLoading}
      >
        <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
        {isLoading ? (
          <svg className="w-6 h-6 -ml-2 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path d="M4 12a8 8 0 1 1 16 0 8 8 0 0 1 16 0Z" />
          </svg>
        ) : (
          <span className="ml-2">Entrar</span>
        )}
      </button>
    </div>

    {/* Contenedor de la imagen con el botón "X" encima */}
    <div className="relative flex justify-center items-center">
      <img
        src={login}
        alt="imagen login"
        className="w-[400px] h-full object-cover xl:rounded-tr-2xl xl:rounded-br-2xl xl:block hidden"
      />
      <button
        onClick={() => navigate("/")} // Redirigir a home cuando se haga click en "X"
        className="absolute top-4 right-4 text-4xl text-white hover:text-gray-400 z-10"
      >
        &times; {/* El "X" */}
      </button>
    </div>
  </div>
</section>




      
   
   

     

    </>
  );
};

export default Login;
