import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import Tabs from "./Tabs"
import Card from "./Card"
import Ticket from "./Ticket"
import { useState } from "react"
import Calendario from './Calendario';

import fondo from '../../assets/fondo.jpg';

import ModalClientes from "./ModalClientes"; // Importa tu modal aquí




const Layout = () => {



  return (

   <>
    <div className=" flex  max-w-[3000px]  mx-auto h-screen   bg-contain" style={{ backgroundImage: `url(${fondo})` }}>
     
          <div className="w-[7%]">
            <Sidebar/>
          </div> 
      
          <div className="w-[70%] ">
          
                  <div className="h-[9%]">
                    <Navbar/>
                  </div>
                  <div className=" h-[9%] ">
                  <Tabs/>  
                  </div>

                  <div className="p-[2.5vw] pl-[3vw] h-[64%] max-h-[64%] grid grid-cols-5 overflow-y-auto"  >
                    
                    <Card/>
                    
                  </div>
                  <div className=" h-[18%] pt-[1vh] ">
                    
                  <swiper-container>
                                    <swiper-slide>Slide1</swiper-slide>
                                    <swiper-slide>Slide2</swiper-slide>
                                    <swiper-slide>Slide3</swiper-slide>
                                    <swiper-slide>Slide4</swiper-slide>
                                    <swiper-slide>Slide5</swiper-slide>
                  </swiper-container>
                    
                    
                  </div>
              
          
            </div> 
      
            <div className="bg-[#F3F3F3]  w-[23%]">
              
            <Ticket />
                
            </div> 
          
    </div>
  
   
  </>
    
  )
}

export default Layout