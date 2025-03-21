

import { useState } from 'react';

import { Link } from "react-router-dom";
import {useContext } from 'react'
import { dataContext } from '../Context/DataContext'
import CartElements from './CartElements';
import CartTotal from './CartTotal';
import avatar from '../../assets/avatar.png';
import dinero from '../../assets/dinero.png';
import singluten from '../../assets/singluten.png';


import ModalClientes from './ModalClientes';



const Ticket = () => {

   const {cart} =useContext(dataContext);


   //console.log(cart);

    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);


    const [datosCliente, setDatosCliente] = useState({
        cliente: '',
        telefono: '',
        fechahora: '',
        observaciones:'',
        pagado:false,
        celiaco:false,
      });

        // Función para actualizar los datos del cliente
  const handleDataFromModal = (data) => {
    setDatosCliente(data);
  };




            return (

                <>
              
                <div className="flex justify-end gap-[1vw] p-[0.5vw] mt-[0.7vw]">

                    <Link className='border-2 p-[0.55vh] rounded-lg bg-white shadow-md'>

                            <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">

                                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                                <g id="SVGRepo_iconCarrier">

                                <path clipRule="evenodd" d="M14 20C17.3137 20 20 17.3137 20 14C20 10.6863 17.3137 8 14 8C10.6863 8 8 10.6863 8 14C8 17.3137 10.6863 20 14 20ZM18 14C18 16.2091 16.2091 18 14 18C11.7909 18 10 16.2091 10 14C10 11.7909 11.7909 10 14 10C16.2091 10 18 11.7909 18 14Z" fill="#757575" fillRule="evenodd"/>

                                <path clipRule="evenodd" d="M0 12.9996V14.9996C0 16.5478 1.17261 17.822 2.67809 17.9826C2.80588 18.3459 2.95062 18.7011 3.11133 19.0473C2.12484 20.226 2.18536 21.984 3.29291 23.0916L4.70712 24.5058C5.78946 25.5881 7.49305 25.6706 8.67003 24.7531C9.1044 24.9688 9.55383 25.159 10.0163 25.3218C10.1769 26.8273 11.4511 28 12.9993 28H14.9993C16.5471 28 17.8211 26.8279 17.9821 25.3228C18.4024 25.175 18.8119 25.0046 19.2091 24.8129C20.3823 25.6664 22.0344 25.564 23.0926 24.5058L24.5068 23.0916C25.565 22.0334 25.6674 20.3813 24.814 19.2081C25.0054 18.8113 25.1757 18.4023 25.3234 17.9824C26.8282 17.8211 28 16.5472 28 14.9996V12.9996C28 11.452 26.8282 10.1782 25.3234 10.0169C25.1605 9.55375 24.9701 9.10374 24.7541 8.66883C25.6708 7.49189 25.5882 5.78888 24.5061 4.70681L23.0919 3.29259C21.9846 2.18531 20.2271 2.12455 19.0485 3.1103C18.7017 2.94935 18.3459 2.80441 17.982 2.67647C17.8207 1.17177 16.5468 0 14.9993 0H12.9993C11.4514 0 10.1773 1.17231 10.0164 2.6775C9.60779 2.8213 9.20936 2.98653 8.82251 3.17181C7.64444 2.12251 5.83764 2.16276 4.70782 3.29259L3.2936 4.7068C2.16377 5.83664 2.12352 7.64345 3.17285 8.82152C2.98737 9.20877 2.82199 9.60763 2.67809 10.0167C1.17261 10.1773 0 11.4515 0 12.9996ZM15.9993 3C15.9993 2.44772 15.5516 2 14.9993 2H12.9993C12.447 2 11.9993 2.44772 11.9993 3V3.38269C11.9993 3.85823 11.6626 4.26276 11.2059 4.39542C10.4966 4.60148 9.81974 4.88401 9.18495 5.23348C8.76836 5.46282 8.24425 5.41481 7.90799 5.07855L7.53624 4.70681C7.14572 4.31628 6.51256 4.31628 6.12203 4.7068L4.70782 6.12102C4.31729 6.51154 4.31729 7.14471 4.70782 7.53523L5.07958 7.90699C5.41584 8.24325 5.46385 8.76736 5.23451 9.18395C4.88485 9.8191 4.6022 10.4963 4.39611 11.2061C4.2635 11.6629 3.85894 11.9996 3.38334 11.9996H3C2.44772 11.9996 2 12.4474 2 12.9996V14.9996C2 15.5519 2.44772 15.9996 3 15.9996H3.38334C3.85894 15.9996 4.26349 16.3364 4.39611 16.7931C4.58954 17.4594 4.85042 18.0969 5.17085 18.6979C5.39202 19.1127 5.34095 19.6293 5.00855 19.9617L4.70712 20.2632C4.3166 20.6537 4.3166 21.2868 4.70712 21.6774L6.12134 23.0916C6.51186 23.4821 7.14503 23.4821 7.53555 23.0916L7.77887 22.8483C8.11899 22.5081 8.65055 22.4633 9.06879 22.7008C9.73695 23.0804 10.4531 23.3852 11.2059 23.6039C11.6626 23.7365 11.9993 24.1411 11.9993 24.6166V25C11.9993 25.5523 12.447 26 12.9993 26H14.9993C15.5516 26 15.9993 25.5523 15.9993 25V24.6174C15.9993 24.1418 16.3361 23.7372 16.7929 23.6046C17.5032 23.3985 18.1809 23.1157 18.8164 22.7658C19.233 22.5365 19.7571 22.5845 20.0934 22.9208L20.2642 23.0916C20.6547 23.4821 21.2879 23.4821 21.6784 23.0916L23.0926 21.6774C23.4831 21.2868 23.4831 20.6537 23.0926 20.2632L22.9218 20.0924C22.5855 19.7561 22.5375 19.232 22.7669 18.8154C23.1166 18.1802 23.3992 17.503 23.6053 16.7931C23.7379 16.3364 24.1425 15.9996 24.6181 15.9996H25C25.5523 15.9996 26 15.5519 26 14.9996V12.9996C26 12.4474 25.5523 11.9996 25 11.9996H24.6181C24.1425 11.9996 23.7379 11.6629 23.6053 11.2061C23.3866 10.4529 23.0817 9.73627 22.7019 9.06773C22.4643 8.64949 22.5092 8.11793 22.8493 7.77781L23.0919 7.53523C23.4824 7.14471 23.4824 6.51154 23.0919 6.12102L21.6777 4.7068C21.2872 4.31628 20.654 4.31628 20.2635 4.7068L19.9628 5.00748C19.6304 5.33988 19.1137 5.39096 18.6989 5.16979C18.0976 4.84915 17.4596 4.58815 16.7929 4.39467C16.3361 4.2621 15.9993 3.85752 15.9993 3.38187V3Z" fill="#757575" fillRule="evenodd"/>

                                </g>

                            </svg>

                    </Link>
                    <Link className='border-2  p-[0.55vh] rounded-lg bg-white shadow-md'>


                                    <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">

                                    <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                                    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                                    <g id="SVGRepo_iconCarrier">

                                    <path clipRule="evenodd" d="M11 4.54125C8.11878 5.68927 6.0772 8.44184 6.07706 11.6767V17.9802L3.31773 20.658C3.12222 20.8387 3 21.0961 3 21.3818V21.5114C3 22.6045 3.89543 23.4906 5 23.4906H10.0255C10.2508 25.4654 11.9443 27 14 27C16.0557 27 17.7492 25.4654 17.9745 23.4906H23C24.1046 23.4906 25 22.6045 25 21.5114V21.382C25.0001 21.0963 24.8779 20.8388 24.6823 20.658L21.9232 17.9805V11.677C21.9231 8.44206 19.8814 5.6891 17 4.54114V3.47401C17 2.18459 15.9963 1.54919 15.6019 1.354C15.0885 1.09988 14.5194 1 14 1C13.4806 1 12.9115 1.09988 12.3981 1.354C12.0037 1.54919 11 2.18459 11 3.47401V4.54125ZM14.927 3.96881C14.9218 3.98589 14.9164 4.00272 14.9108 4.0193C14.6118 3.98595 14.308 3.96881 14.0001 3.96881C13.6922 3.96881 13.3883 3.98596 13.0893 4.01933C13.0836 4.00274 13.0782 3.9859 13.073 3.96881H13V3.47401C13 3.20076 13.4473 2.97921 14 2.97921C14.5527 2.97921 15 3.20076 15 3.47401V3.96881H14.927ZM15.9483 23.4906H12.0517C12.2572 24.3674 13.0515 25.0208 14 25.0208C14.9485 25.0208 15.7428 24.3674 15.9483 23.4906ZM8.07706 11.6767C8.07722 8.53096 10.7105 5.94802 14.0001 5.94802C17.2898 5.94802 19.9231 8.53096 19.9232 11.6767H8.07706ZM8.07706 11.6767H19.9232V17.9805C19.9232 18.5121 20.1393 19.0214 20.5229 19.3936L22.7052 21.5114H5.29484L7.77028 19.1091C7.95901 18.9296 8.07706 18.6772 8.07706 18.3958V11.6767Z" fill="#757575" fillRule="evenodd"/>

                                    </g>

                                    </svg>
                    </Link>

                    <Link className='border-2 p-[0.55vh]  rounded-lg bg-white shadow-md'>
                    <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">

                        <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                        <g id="SVGRepo_iconCarrier">

                        <path clipRule="evenodd" d="M1.82047 1C1.36734 1 1 1.35728 1 1.79801V2.39948C1 2.84021 1.36734 3.19749 1.82047 3.19749H3.72716C4.03867 3.19749 4.3233 3.36906 4.46192 3.64038L5.4947 5.93251C5.53326 6.00798 5.56364 6.09443 5.62081 6.15194L10.057 16.4429C10.0129 16.4634 9.97056 16.4883 9.93075 16.5176C8.70163 17.4226 7.87009 18.5878 7.87001 19.7604C7.86996 20.4429 8.16289 21.0807 8.75002 21.5212C9.30752 21.9394 10.0364 22.1118 10.8189 22.1118H10.8446C10.336 22.6308 10.0238 23.3336 10.0238 24.1072C10.0238 25.7049 11.3554 27 12.998 27C14.6406 27 15.9722 25.7049 15.9722 24.1072C15.9722 23.3336 15.66 22.6308 15.1513 22.1118H19.0494C18.5408 22.6308 18.2285 23.3336 18.2285 24.1072C18.2285 25.7049 19.5601 27 21.2027 27C22.8454 27 24.177 25.7049 24.177 24.1072C24.177 23.3336 23.8647 22.6308 23.3561 22.1118H23.9718C24.425 22.1118 24.7923 21.7545 24.7923 21.3138V20.9148C24.7923 20.474 24.425 20.1167 23.9718 20.1167H10.8189C10.3192 20.1167 10.0864 20.0041 10.0028 19.9414C9.94878 19.9009 9.92119 19.8618 9.9212 19.7606C9.92122 19.4917 10.1711 18.8708 11.069 18.1827C11.1084 18.1524 11.1453 18.1194 11.1792 18.084C11.2692 18.1089 11.3635 18.1221 11.4601 18.1221H23.9235C24.4248 18.1221 24.8527 17.7696 24.9351 17.2885L26.9858 5.31837C27.09 4.71036 26.6079 4.1569 25.9742 4.1569H7.35431C7.1981 4.1569 7.05618 4.06597 6.9909 3.92405L5.84968 1.44289C5.71106 1.17157 5.42642 1 5.11492 1H1.82047ZM8.47667 6.15194C8.18952 6.15194 7.99591 6.44552 8.10899 6.70946L12.04 15.8846C12.103 16.0317 12.2476 16.1271 12.4076 16.1271H22.7173C22.9122 16.1271 23.0787 15.9867 23.1116 15.7946L24.6834 6.61948C24.7253 6.37513 24.5371 6.15194 24.2892 6.15194H8.47667ZM11.8698 24.1072C11.8698 23.5012 12.3749 23.0099 12.998 23.0099C13.621 23.0099 14.1261 23.5012 14.1261 24.1072C14.1261 24.7132 13.621 25.2045 12.998 25.2045C12.3749 25.2045 11.8698 24.7132 11.8698 24.1072ZM21.2027 23.0099C20.5797 23.0099 20.0746 23.5012 20.0746 24.1072C20.0746 24.7132 20.5797 25.2045 21.2027 25.2045C21.8258 25.2045 22.3309 24.7132 22.3309 24.1072C22.3309 23.5012 21.8258 23.0099 21.2027 23.0099Z" fill="#757575" fillRule="evenodd"/>

                        </g>

                    </svg>

                    </Link>

                    <Link className=' p-[0.30vw] rounded-lg   bg-[#f2ac02] '>
                    <h1 className='p-[0.40vw]  font-nunito text-white'>18</h1>
                    </Link>
                </div>

                <div className='p-[1.3vh] mt-[1vh]'>
                <h1 className='font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]'>Cliente</h1>
                </div>

                <div className=''>

                 

                    <div className='flex   items-center text-center justify-center '  onClick={handleShow} >

                        <img src={avatar} alt={avatar} className='w-[3.5vw] mt-2 rounded-lg border-2 border-yellow-500 ' />

                        <div className='ms-[1vw] font-nunito'>
                            <h3 className='text-gray-600 font-bold'>{datosCliente.cliente || ""}</h3>
                            <h3 className='text-gray-600 '>{datosCliente.telefono || ""}</h3>
                            <h3 className='text-gray-600 '>{datosCliente.fechahora || ""}</h3>

                            <div className='flex justify-around'>

                                <h3 className='text-gray-600 '>
                                {datosCliente.pagado === true ? (
                                        <>
                                        <img src={dinero} alt="dinero pagado" className='w-7' />
                                        </>
                                    ) : (
                                        <>
                                        
                                        </>
                                    )}
                                </h3>
                                <h3 className='text-gray-600 '>
                                {datosCliente.celiaco === true ? (
                                        <>
                                        <img src={singluten} alt="sin gluten" className='w-7' />
                                        </>
                                    ) : (
                                        <>
                                        
                                        </>
                                    )}
                                </h3>
                            </div>

                                                     
                           
                        </div>

                         
                        
                        
                    </div>

            


                </div>

                <div className='p-[1vw] '>
                    <p className='font-nunito text-xs'>{datosCliente.observaciones}</p>
                         </div>

              
                
                         {cart.length === 0  ? (
                            <div className="flex justify-center items-center mt-52">

                                <svg fill="#4B5563" height="150px" width="150px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 483.1 483.1" xmlSpace="preserve">

                                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                                <g id="SVGRepo_iconCarrier"> <g> <path d="M434.55,418.7l-27.8-313.3c-0.5-6.2-5.7-10.9-12-10.9h-58.6c-0.1-52.1-42.5-94.5-94.6-94.5s-94.5,42.4-94.6,94.5h-58.6 c-6.2,0-11.4,4.7-12,10.9l-27.8,313.3c0,0.4,0,0.7,0,1.1c0,34.9,32.1,63.3,71.5,63.3h243c39.4,0,71.5-28.4,71.5-63.3 C434.55,419.4,434.55,419.1,434.55,418.7z M241.55,24c38.9,0,70.5,31.6,70.6,70.5h-141.2C171.05,55.6,202.65,24,241.55,24z M363.05,459h-243c-26,0-47.2-17.3-47.5-38.8l26.8-301.7h47.6v42.1c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h141.2v42.1 c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h47.6l26.8,301.8C410.25,441.7,389.05,459,363.05,459z"/> </g> </g>

                            </svg>






                            </div>
                        ) : (
                            <div className='p-[1.3vh]'>
                                <h1 className='font-nunito border-b-2 font-bold text-gray-600 border-gray-600 text-[1vw]'>
                                    Pedido
                                </h1>
                            </div>
                        )}

               

                <div className='p-[1.3vh]  max-h-[54%] overflow-y-auto'>

                       


                        <CartElements/>
                        


                </div>

                {cart.length === 0  ? (
                         <div className="text-center text-[2vh] text-gray-600"></div>
                        ) : (
                <div className='p-[1.3vh] mt-[1vh]'>
                <h1 className='font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]'>Total</h1>
                <CartTotal datosCliente={datosCliente} setDatosCliente={setDatosCliente} />
                </div>
                 )}

                         
            


                <ModalClientes show={show} handleClose={handleClose} onSave={handleDataFromModal}  />
        
                
          
                </>


            )



        }

     

export default Ticket
