
import logo from '../../assets/logo.png';
import fondo from '../../assets/fondo.jpg';

import Reloj from './Reloj';
import Search from './Search';



const Navbar = () => {
  return (
   

      <div className='flex p-[2.8vh] gap-2 ' >
            <div className='flex w-[32%]'>
                <img src={logo} alt="logo" className='w-[12%] h-auto -mt-[0.5vh] rounded-xl object-contain' />
                <h1 className='text-[1.5vw] ms-[2%] text-gray-600 font-nunito font-extrabold '>SuperPollo</h1>
            </div>
            <div className=' w-[45%] '><Search/></div>
            <div className='w-[21%]'><Reloj/></div>  
      </div>



  )
}

export default Navbar