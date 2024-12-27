import { useContext } from "react";
import { dataContext } from '../Context/DataContext'



const Search = () => {

  const { buscar, handleSearch, setBuscar } = useContext(dataContext);

   // Función para resetear el valor de búsqueda
   const handleBlur = () => {
    setBuscar(""); // Limpiar el valor de búsqueda cuando el input pierde el foco
  };



  return (
    <div className="w-full max-w-[32vh] ">
        <div className="relative">
            <input
            className="w-[20vw] bg-white placeholder:text-slate-400 text-slate-900 text-[0.8vw] border border-slate-100 rounded-md pl-[1vw] pr-[10vw] py-[0.8vh] focus:bg-white transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"
            placeholder="Buscador de Productos" type="text"
            value={buscar}
            onChange={handleSearch}
            onBlur={handleBlur} // Resetea cuando pierde el foco

            />
           
        </div>
    </div>   
  )
}

export default Search