import { useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Importamos Firestore
import login from '../../assets/login.jpg';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import CartTotal from '../pedidos/CartTotal';

const Login = () => {
  const [valorInput, setValorInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      console.log(q);
      console.log(`Se encontraron ${querySnapshot.size} documentos.`); // Ver cuántos documentos devolvió

     

      if (querySnapshot.empty) {
        setErrorMessage('PIN incorrecto.');
      } else {
        // Si encontramos el documento, podemos obtener los datos del empleado
        querySnapshot.forEach((doc) => {
          const empleado = doc.data();
         

          console.log(empleado.nombre); // Aquí puedes manejar el login, redirigir, etc.

     
          // Ejemplo de cómo hacer algo con el dato
          if (empleado.rol === "jefe") {
            console.log("Jefe ingresó correctamente");
            navigate('/layout/comida'); // Redirige a /dashboard
          } else if (empleado.rol === "empleado") {
            console.log("Operario ingresó correctamente");
            navigate('/layout/comida'); // Redirige a /layout
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

  const handleBackgroundClick = (e) => {
    // Verifica que el clic haya sido fuera del formulario (evitar que el clic dentro del formulario cierre el mensaje)
    if (e.target === e.currentTarget) {
      setErrorMessage('');
      setValorInput('');
    }
  };

  return (

    <>
    <section
      className="min-h-screen flex items-center justify-center font-nunito bg-gray-200"
     // Evento para capturar clic fuera del área del mensaje de error
    >
      <div className="flex shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl xl:rounded-tr-none xl:rounded-br-none"  onClick={handleBackgroundClick} >
          <h4 className="text-4xl text-gray-500 font-extrabold font-nunito -mt-5">Bienvenido</h4>
          <p className="font-medium text-lg text-gray-400 mt-2 font-nunito border-b-2">Introduce tu PIN!</p>

          <div className="flex flex-col text-2xl text-center p-4">
            {/* input con maxLength */}
            <input
              type="password"
              maxLength={5} // Limita el máximo de caracteres a 5
              value={valorInput}
              readOnly
              className="w-24 pl-2 pr-6 text-yellow-500 bg-white text-center"
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

        <img src={login} alt="imagen login" className="relative w-[400px] object-cover xl:rounded-tr-2xl xl:rounded-br-2xl xl:block hidden" />
      </div>
    </section>

   

    </>


  );
};

export default Login;
