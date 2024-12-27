import { useState } from 'react';
import login from '../../assets/login.jpg'



const Login = () => {

    const [valorInput, setValorInput] = useState('');

    const handleClick = (numero) => {
      setValorInput(valorInput + numero);
    };
  
    const handleBorrarTodo = () => {
      setValorInput(''); // Asigna una cadena vacía al input
    };
  
    const handleBorrar = () => {
      setValorInput(valorInput.slice(0, -1)); // Elimina el último carácter
    };
  return (
    
<section className="min-h-screen flex items-center justify-center font-nunito bg-gray-200 ">

    <div className="flex shadow-2xl ">

   

     <div className="flex flex-col items-center justify-center text-center p-12  bg-white rounded-2xl xl:rounded-tr-none xl:rounded-br-none  ">

         
        <h4 className="text-4xl text-gray-500 font-extrabold font-nunito -mt-5 ">Bienvenido</h4>
        <p className="font-medium text-lg text-gray-400 mt-2 font-nunito border-b-2 ">Introduce tu PIN!</p>

            <div className="flex flex-col text-2xl text-center p-4">
                {/*input*/}         
              <input type="password" maxLength={5} value={valorInput} readOnly  className="w-36 pl-2 pr-6 text-yellow-500 bg-white " />

            </div>

            <div className="grid grid-cols-3  text-center items-center justify-center gap-3 font-nunito text-gray-500 font-extrabold ">

                <div  onClick={() => handleClick('1')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">1</div>
                <div  onClick={() => handleClick('2')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">2</div>
                <div  onClick={() => handleClick('3')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">3</div>
                <div  onClick={() => handleClick('4')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">4</div>
                <div  onClick={() => handleClick('5')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">5</div>
                <div  onClick={() => handleClick('6')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">6</div>
                <div  onClick={() => handleClick('7')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">7</div>
                <div  onClick={() => handleClick('8')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">8</div>
                <div  onClick={() => handleClick('9')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">9</div>

            <div  onClick={handleBorrarTodo} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">
            
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>

            
            </div>
            <div  onClick={() => handleClick('0')} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">0</div>

            <div onClick={handleBorrar} className="p-7 border-2 rounded-2xl  hover:border-gray-300 hover:bg-yellow-500 active:scale-[0.98] active:duration-75 transition-all ease-in-out hover:scale-[1.01]">

            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>


            </div>

  

           </div>


           <button
                            className="mt-8 tracking-wide font-semibold bg-yellow-500 text-white w-full py-4 rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none">
                            <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <path d="M20 8v6M23 11h-6" />
                            </svg>
                            <span className="ml-2 font-nunito">
                                Entrar
                            </span>
            </button>

           
        </div>

            <img src={login} alt="" className='relative w-[400px] object-cover xl:rounded-tr-2xl xl:rounded-br-2xl xl:block hidden' />

    </div>
</section>


  )
}

export default Login