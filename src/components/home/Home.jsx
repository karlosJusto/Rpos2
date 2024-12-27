import { Link } from "react-router-dom"


const Home = () => {
  return (

    <section >
      <main className="h-screen flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-300">
        <div className="grid grid-cols-1 grid-rows-2 place-items-center">
              <h1 className="font-nunito text-8xl text-gray-500 font-bold  ">SuperPollo <span className="text-[#ffa300]"> Mungia </span> <span className="text-lg">POS</span></h1>
          <div className="flex gap-20 font-nunito text-gray-400 text-xl">
              <Link to={"/login"} className="hover:text-yellow-500 transition-colors" >ACCESO EMPLEADO</Link>
              <Link to={"/layout/comida"} className="hover:text-yellow-500 transition-colors">ACCESO GERENTE</Link>
              <Link to={""} className="hover:text-yellow-500 transition-colors">SALIR</Link>
          </div>
        </div>
     </main>
    </section>

    
  )
}

export default Home
