import SidebarGenerica from "./SidebarGenerica"
import patata from '../../assets/freidora/patata.png'
import pimiento from '../../assets/freidora/pimiento.png'
import croquetas from '../../assets/freidora/croquetas.png'

import trigo from '../../assets/freidora/trigo.png'



const Freidora = () => {
  return (


  
<div>

      <div className="navbar">

            <SidebarGenerica/>
      </div>



      <div className="flex  text-center justify-between  p-6 mt-10 ">
        
            <div className=" w-[30%] bg-gray-100 rounded-lg  h-[90vh] ">
              
              
                  <div className="p-4 text-center  ">

                  <h1 className=" text-gray-900 text-2xl font-extrabold">Patatas Fritas</h1>
                      
                  </div>
              
                  <div className="flex justify-center ">

                  <img src= {patata} alt="patatas freidora" className="p-4 rounded-full bg-white w-[7vw] shadow-md" />

                  </div>

                  <div className="mt-5 flex justify-between bg-yellow-600 text-center">

                        <div className="flex">

                        <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                              <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                              <g id="SVGRepo_iconCarrier"> <g clipPath="url(#clip0_429_11240)"> <circle cx="12" cy="12" r="9" stroke="#e5e8e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M13 9L10 12L13 15" stroke="#e5e8e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/> </g> <defs> <clipPath id="clip0_429_11240"> <rect width="24" height="24" fill="white"/> </clipPath> </defs> </g>

                              </svg>

                        <h5>12:00</h5>

                        </div>

                  <h1 className="  font-bold text-gray-800">actual</h1>

                  <h1 className="  font-bold text-gray-800">posterior 13:00</h1>

                 </div>

                 <div className="grid grid-cols-3">

                     <div className="bg-red-500 border-2"
                     
                     
                     
                     >Anterior</div>

                     <div className="bg-gray-200 ">
                     
                            <div className="flex text-center justify-around   border-2 border-gray-800 my-2 rounded-md">
                                <h5 className="font-extrabold" >1 <span>x</span></h5>
                                <img src={trigo} alt="logo celiaco freidora" className="w-[3vw] p-1" />
                            </div>

                            <div className="flex text-center justify-around items-center border-2 border-gray-800 my-2 rounded-md ">
                            <h5 className="font-extrabold" >1 <span>x</span></h5>
                                <img src={trigo} alt="logo celiaco freidora" className="w-[3vw] p-1" />
                            </div>

                            <div className="flex text-center justify-around   border-2 border-gray-800 my-2 ">
                            <h5 className="font-extrabold" >1 <span>x</span></h5>
                                <img src={trigo} alt="logo celiaco freidora" className="w-[3vw] p-1" />
                            </div>

                            <div className="flex text-center justify-around   border-2 border-gray-800 my-2 ">
                            <h5 className="font-extrabold" >1 <span>x</span></h5>
                                <img src={trigo} alt="logo celiaco freidora" className="w-[3vw] p-1" />
                            </div>
                     </div>


                     <div className="bg-red-700">Posterior</div>


                 </div>
              
            </div>

            <div className="bg-gray-100 w-[30%] rounded-lg ">
              
                        <div className="p-4 text-center ">

                                <h1 className=" mb-2 text-gray-900 text-2xl font-extrabold">Pimientos</h1>

                        </div>   

                        <div className="flex justify-center">

                        <img src= {pimiento} alt="pimientos freidora" className="p-4 rounded-full bg-white w-[7vw] shadow-md" />



                        </div>
              
            </div>

            <div className="bg-gray-100 w-[30%] rounded-lg ">
            
                      <div className="p-4 text-center  ">

                          <h1 className="mb-2  text-gray-900 text-2xl font-extrabold">Croquetas</h1>

                      </div>   

                        <div className="flex justify-center">

                          <img src= {croquetas} alt="croquetas freidora" className="p-4 rounded-full bg-white w-[7vw] shadow-md" />

                      </div>
            </div>

      </div>

     
  </div>
  )
}

export default Freidora