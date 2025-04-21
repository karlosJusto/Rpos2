import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'; // Importamos Firestore
import loginboss from '../../assets/loginboss.png';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import dayjs from 'dayjs';
import 'dayjs/locale/es'; // Para trabajar con el locale en español
import timezone from 'dayjs/plugin/timezone'; // Plugin para zona horaria
import utc from 'dayjs/plugin/utc'; // Plugin para trabajar con fechas en UTC
import customParseFormat from 'dayjs/plugin/customParseFormat';

const Login = () => {
  const [valorInput, setValorInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(customParseFormat);
    dayjs.locale('es');

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

  const handleBackgroundClick = (e) => {
    // Verifica que el clic haya sido fuera del formulario (evitar que el clic dentro del formulario cierre el mensaje)
    if (e.target === e.currentTarget) {
      setErrorMessage('');
      setValorInput('');
    }
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

  const [stock, setStock] = useState(null);  
 
  const obtenerStockProducto = async (productId) => {
   try {
     const docRef = doc(db, 'productos', `${productId}`);
     const docSnap = await getDoc(docRef); // Esperamos a que se obtenga el documento
 
     if (docSnap.exists()) {
       const data = docSnap.data();
       const stockValue = data.stock; // Extraemos el stock
       setStock(stockValue); // Actualizamos el estado con el valor de stock
     } else {
       console.log('No se encontró el producto');
       setStock(null); // Si no se encuentra el producto, asignamos null
     }
   } catch (error) {
     console.error("Error al obtener el stock del producto:", error);
     setStock(null); // En caso de error, podemos asignar null
   }
 };
 
 
 
 // Usamos useEffect para obtener el stock cuando el componente se monta
 useEffect(() => {
   obtenerStockProducto(1); // Llamamos a la función para obtener el stock del producto con product_id = 1
 }, []); // El array vacío hace que se ejecute solo una vez cuando el componente se monta

  const generarEstadisticasDiarias = async () => {
    if (stock === null) {
      console.log('Esperando stock...');
      return; // Salimos si el stock aún no está disponible
    }
  
    try {
      const { fecha, diaSemana } = obtenerFechaEspana(); // Obtenemos la fecha y el día de la semana
      const docRef = doc(db, "estadisticas_diarias", fecha); // Usamos la fecha como ID para el documento
  
      // Verificamos si el documento ya existe
      const docSnapshot = await getDoc(docRef);
  
      if (!docSnapshot.exists()) {
        await setDoc(docRef, {
          diasemana: diaSemana,
          enbarra: 0,
          libresManana: 0,
          libresTarde: 0,
          vm: 0,
          vt: 0,
          vd: 0,
          stock: stock, // Usamos el valor de stock
          stock_anterior: stock,
          //stockactualizado:0,
          //stockfinal:0,
          entran: 0,
          baja: 0,
          devueltos: 0,
        });
        console.log("Datos guardados exitosamente para el día", fecha);
      } else {
        console.log("Ya existen datos para el día", fecha);
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

    console.log(valorInput);

   
    try {
      // Creamos la consulta para buscar al empleado con el PIN ingresado
      const empleadosRef = collection(db, 'empleados'); // Accedemos a la colección "empleados"
      const q = query(empleadosRef, where('pin', '==', valorInput)); // Buscamos por el PIN
      const querySnapshot = await getDocs(q); // Obtenemos los documentos que coinciden

      console.log(`Se encontraron ${querySnapshot.size} documentos.`); // Ver cuántos documentos devolvió

      if (querySnapshot.empty) {
        setErrorMessage('PIN no encontrado.');
      } else {
        // Si encontramos el documento, podemos obtener los datos del empleado
        querySnapshot.forEach((doc) => {
          const empleado = doc.data();

          console.log(empleado); // Aquí puedes manejar el login, redirigir, etc.

             // Guardar el nombre del empleado en sessionStorage
             sessionStorage.setItem('empleadoNombre', empleado.nombre);
         
          // Verificamos si el rol es "jefe"
          if (empleado.rol === "jefe") {
            console.log("Jefe ingresó correctamente");
            generarEstadisticasDiarias(); // Llamamos a la función para crear estadísticas
            navigate('/dashboard'); // Redirige a /dashboard
            //generarEstadisticas();
          } else if (empleado.rol === "empleado") {
            // Si es empleado, mostramos "No autorizado"
            console.log("No autorizado");
            setErrorMessage('No autorizado');
          } else {
            // Si el rol no es "jefe" ni "empleado", mostramos un mensaje de error general
            setErrorMessage('Rol desconocido. No autorizado.');
          }
        });
      }
    } catch (error) {
      setErrorMessage('Error al verificar el PIN. Intenta nuevamente.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center font-nunito bg-gray-200">
      <div className="flex shadow-2xl">
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl xl:rounded-tr-none xl:rounded-br-none" onClick={handleBackgroundClick}>
          <h4 className="text-4xl text-gray-700 font-extrabold font-nunito -mt-5">Bienvenido</h4>
          <p className="font-medium text-lg text-gray-400 mt-2 font-nunito border-b-2">Introduce tu PIN!</p>

          <div className="flex flex-col text-xl text-center p-4">
            {/* input con maxLength */}
            <input
              type="password"
              maxLength={5} // Limita el máximo de caracteres a 5
              value={valorInput}
              readOnly
              className="w-[6.5vw] text-gray-700 bg-white text-center"
            />
          </div>

          <div className="grid grid-cols-3 text-center items-center justify-center gap-3 font-nunito text-gray-500 font-extrabold ">
            {[...Array(9).keys()].map((i) => (
              <div
                key={i + 1}
                onClick={() => handleClick((i + 1).toString())}
                className="p-7 border-2 rounded-2xl hover:bg-gray-700 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
              >
                {i + 1}
              </div>
            ))}

            <div
              onClick={handleBorrarTodo}
              className="p-7 border-2 rounded-2xl hover:bg-gray-700 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div
              onClick={() => handleClick('0')}
              className="p-7 border-2 rounded-2xl hover:bg-gray-700 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
            >
              0
            </div>
            <div
              onClick={handleBorrar}
              className="p-7 border-2 rounded-2xl hover:bg-gray-700 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>

          {errorMessage && <p className="text-red-500 mt-4 font-extrabold font-nunito">{errorMessage}</p>}

          <button
            onClick={handleLogin}
            className="mt-8 tracking-wide font-semibold bg-gray-700 text-white w-full py-4 rounded-lg hover:bg-gray-500 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none"
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
                src={loginboss}
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
  );
};

export default Login;
