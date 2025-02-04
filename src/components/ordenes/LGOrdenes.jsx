import React, { useState } from 'react';
import { Offcanvas, Button, Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Reloj from '../pedidos/Reloj';
import Ordenes from './Ordenes';


const texto= 'Ordenes';

const LayoutGenerico = () => {
  const [show, setShow] = useState(false);

  // Función para alternar el estado del offcanvas
  const toggleOffcanvas = () => setShow(!show);

  return (
    <>
      {/* Navbar */}
      <Navbar bg="[#F3F3F3]">
        
        <Navbar.Brand href="#"></Navbar.Brand>

        {/* Botón de hamburguesa siempre visible */}
        <Button
          variant="outline-light"
          onClick={toggleOffcanvas}
          className="d-inline-block" // Hacemos que sea visible en todas las pantallas
          style={{ fontSize: '1.6rem', color: 'gray'}} // Estilo para mejorar la visibilidad
        >
          ☰
        </Button>

        {/* Los elementos del navbar normalmente estarían aquí */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto pr-3 pt-1 d-flex justify-content-between w-100">
              {/* Contenedor que centra el texto 'hola' */}
              <div className="d-flex justify-content-center flex-grow-1">
                <h1 className="text-xl font-nunito font-extrabold text-gray-600">{texto}</h1>
              </div>

              {/* Componente Reloj, que se coloca a la derecha */}
              <Reloj />
            </Nav>
          </Navbar.Collapse>
      </Navbar>

      {/* Offcanvas */}
      <Offcanvas show={show} onHide={toggleOffcanvas} placement="start"  style={{ width: '120px', top: '68px', background: '#f2ac02', borderTopRightRadius: '30px', borderBottomRightRadius: '30px' }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav>
          <ul className=" ms-2 flex  flex-col justify-between text-center items-center gap-10   bg-[#f2ac02] ">

            <Link className=" p-3 mt-2  hover:bg-gray-100 hover:rounded-2xl " to={"/layout/comida"}>

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#757575">

                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                <g id="SVGRepo_iconCarrier"> <path d="M22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M15 18H9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

            </svg>


            </Link>

            <Link className='p-3   hover:bg-gray-100 hover:rounded-2xl' to={"/ordenes"}>

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

                <g id="SVGRepo_iconCarrier"> <path d="M10.5 14L17 14" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 14H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 10.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M7 17.5H7.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 10.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10.5 17.5H17" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M8 3.5C8 2.67157 8.67157 2 9.5 2H14.5C15.3284 2 16 2.67157 16 3.5V4.5C16 5.32843 15.3284 6 14.5 6H9.5C8.67157 6 8 5.32843 8 4.5V3.5Z" stroke="#757575" strokeWidth="1.5"/> <path d="M21 16.0002C21 18.8286 21 20.2429 20.1213 21.1215C19.2426 22.0002 17.8284 22.0002 15 22.0002H9C6.17157 22.0002 4.75736 22.0002 3.87868 21.1215C3 20.2429 3 18.8286 3 16.0002V13.0002M16 4.00195C18.175 4.01406 19.3529 4.11051 20.1213 4.87889C21 5.75757 21 7.17179 21 10.0002V12.0002M8 4.00195C5.82497 4.01406 4.64706 4.11051 3.87868 4.87889C3.11032 5.64725 3.01385 6.82511 3.00174 9" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

            </svg>


            </Link>

            <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl' to={"/freidora"}>

            <svg fill="#757575" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="40px" height="40px" viewBox="0 0 91.689 91.689" xmlSpace="preserve">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

            <g id="SVGRepo_iconCarrier"> <g> <path d="M74.41,42.085l-6.922,3.783l0.58-6.131l1.436,0.376l16.424-5.548l-3.037-10.497l-13.729,4.637l-14.853-3.892l-14.513,2.276 l-13.521-2.528l-10.109,8.94l6.299,8.324L22.2,41.833l-9.982,3.899l-7.474-4.445L0,50.855l11.6,6.9l12.813-5.004l3.576-0.113 l-3.738,8.75l11.969,6.232L48.73,61.9l14.635-1.299l13.471-7.364l14.443,1.183l0.41-10.919L74.41,42.085z M27.438,29.346 l12.301,2.301l14.371-2.255l15.19,3.98l10.857-3.667l0.553,1.908l-11.347,3.834l-15.342-4.02l-14.309,2.245l-11.758-2.199 l-4.762,4.211l-1.172-1.549L27.438,29.346z M29.121,36.258l10.533,1.971l5.236-0.821l-8.355,3.971l-13.697,0.435L29.121,36.258z M23.506,48.284l-11.654,4.552l-6.215-3.695L6.5,47.402l5.463,3.249l11.143-4.351l14.477-0.461l14.324-6.809l11.86,1.652 l-0.186,1.978l-11.352-1.58l-14.184,6.741L23.506,48.284z M39.096,52.284l13.867-6.592l11.834,1.647l-4.608,2.52l-14.285,1.268 l-9.746,4.456l-5.801-3.021L39.096,52.284z M87.266,49.611l-11.424-0.936l-13.776,7.532l-14.492,1.285l-11.379,5.204l-6.414-3.338 l0.764-1.786l5.639,2.937l10.877-4.976l14.428-1.278l13.916-7.606l11.938,0.979L87.266,49.611z"/> </g> </g>

            </svg>
            </Link>

            <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/cocina"}>

            <svg fill="#757575" height="40px" width="40px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" stroke="#757575" strokeWidth="6">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />

            <g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M85.432,411.629H40.162c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C93.516,415.247,89.896,411.629,85.432,411.629z"/> <path d="M471.838,411.629h-45.269c-4.466,0-8.084,3.618-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h45.269 c4.466,0,8.084-3.618,8.084-8.084C479.922,415.247,476.303,411.629,471.838,411.629z"/> <path d="M490.981,115.637h-21.435h-5.392c-4.466,0-8.084,3.619-8.084,8.084c0,4.466,3.618,8.084,8.084,8.084h5.392h21.435 c2.674,0,4.851,2.176,4.851,4.851v205.151H264.084V131.805h83.659h89.466c4.466,0,8.084-3.619,8.084-8.084 c0-4.466-3.618-8.084-8.084-8.084h-89.466H256H21.019C9.429,115.637,0,125.066,0,136.656v213.236v21.492 c0,11.59,9.429,21.019,21.019,21.019H256h234.981c11.59,0,21.019-9.429,21.019-21.019v-21.492V136.656 C512,125.066,502.571,115.637,490.981,115.637z M247.916,341.807h-27.365c-4.466,0-8.084,3.619-8.084,8.084 s3.618,8.084,8.084,8.084h27.365v18.258H21.019c-2.674,0.001-4.851-2.175-4.851-4.849v-13.408h177.795 c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H16.168V136.656c0-2.674,2.176-4.851,4.851-4.851h226.897 V341.807z M495.832,371.384c0,2.674-2.176,4.851-4.851,4.851H264.084v-18.258h231.747V371.384z"/> <path d="M286.181,209.934v53.787c0,4.466,3.619,8.084,8.084,8.084c4.466,0,8.084-3.618,8.084-8.084v-53.787 c0-4.466-3.618-8.084-8.084-8.084C289.8,201.85,286.181,205.468,286.181,209.934z"/> <path d="M217.735,271.805c4.466,0,8.084-3.618,8.084-8.084v-53.787c0-4.466-3.619-8.084-8.084-8.084s-8.084,3.619-8.084,8.084 v53.787C209.65,268.187,213.269,271.805,217.735,271.805z"/> <path d="M8.084,100.371h495.832c4.466,0,8.084-3.618,8.084-8.084c0-4.466-3.618-8.084-8.084-8.084H8.084 C3.619,84.203,0,87.821,0,92.287C0,96.753,3.619,100.371,8.084,100.371z"/> <path d="M43.32,200.086c2.068,0,4.137-0.789,5.716-2.368l29.048-29.049c3.157-3.157,3.157-8.276-0.001-11.432 c-3.156-3.156-8.275-3.157-11.432,0.001l-29.048,29.049c-3.157,3.157-3.157,8.276,0.001,11.432 C39.182,199.297,41.251,200.086,43.32,200.086z"/> <path d="M64.557,225.374c1.579,1.578,3.649,2.367,5.717,2.367s4.138-0.789,5.717-2.367l52.958-52.958 c3.157-3.158,3.157-8.276,0-11.433c-3.158-3.156-8.276-3.156-11.434,0l-52.958,52.958C61.4,217.099,61.4,222.217,64.557,225.374z "/> <path d="M46.664,231.834l-2.877,2.877c-3.157,3.158-3.157,8.276,0,11.433c1.579,1.578,3.649,2.367,5.717,2.367 c2.068,0,4.138-0.789,5.717-2.367l2.877-2.877c3.157-3.158,3.157-8.276,0-11.433C54.94,228.678,49.822,228.678,46.664,231.834z"/> </g> </g> </g> </g>

            </svg>
            
            </Link>

            <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/buscadorPedidos"}>

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

            <g id="SVGRepo_iconCarrier"> <path d="M14 4C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V13M10 4C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M10 16H6" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <circle cx="18" cy="17" r="3" stroke="#757575" strokeWidth="1.5"/> <path d="M20.5 19.5L21.5 20.5" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> <path d="M2 10L7 10M22 10L11 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

            </svg>
            </Link>

            <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/stock"}> 

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

            <g id="SVGRepo_iconCarrier"> <path d="M7.50626 15.2647C7.61657 15.6639 8.02965 15.8982 8.4289 15.7879C8.82816 15.6776 9.06241 15.2645 8.9521 14.8652L7.50626 15.2647ZM6.07692 7.27442L6.79984 7.0747V7.0747L6.07692 7.27442ZM4.7037 5.91995L4.50319 6.64265L4.7037 5.91995ZM3.20051 4.72457C2.80138 4.61383 2.38804 4.84762 2.2773 5.24675C2.16656 5.64589 2.40035 6.05923 2.79949 6.16997L3.20051 4.72457ZM20.1886 15.7254C20.5895 15.6213 20.8301 15.2118 20.7259 14.8109C20.6217 14.41 20.2123 14.1695 19.8114 14.2737L20.1886 15.7254ZM10.1978 17.5588C10.5074 18.6795 9.82778 19.8618 8.62389 20.1747L9.00118 21.6265C10.9782 21.1127 12.1863 19.1239 11.6436 17.1594L10.1978 17.5588ZM8.62389 20.1747C7.41216 20.4896 6.19622 19.7863 5.88401 18.6562L4.43817 19.0556C4.97829 21.0107 7.03196 22.1383 9.00118 21.6265L8.62389 20.1747ZM5.88401 18.6562C5.57441 17.5355 6.254 16.3532 7.4579 16.0403L7.08061 14.5885C5.10356 15.1023 3.89544 17.0911 4.43817 19.0556L5.88401 18.6562ZM7.4579 16.0403C8.66962 15.7254 9.88556 16.4287 10.1978 17.5588L11.6436 17.1594C11.1035 15.2043 9.04982 14.0768 7.08061 14.5885L7.4579 16.0403ZM8.9521 14.8652L6.79984 7.0747L5.354 7.47414L7.50626 15.2647L8.9521 14.8652ZM4.90421 5.19725L3.20051 4.72457L2.79949 6.16997L4.50319 6.64265L4.90421 5.19725ZM6.79984 7.0747C6.54671 6.15847 5.8211 5.45164 4.90421 5.19725L4.50319 6.64265C4.92878 6.76073 5.24573 7.08223 5.354 7.47414L6.79984 7.0747ZM11.1093 18.085L20.1886 15.7254L19.8114 14.2737L10.732 16.6332L11.1093 18.085Z" fill="#757575"/> <path d="M19.1647 6.2358C18.6797 4.48023 18.4372 3.60244 17.7242 3.20319C17.0113 2.80394 16.1062 3.03915 14.2962 3.50955L12.3763 4.00849C10.5662 4.47889 9.66119 4.71409 9.24954 5.40562C8.8379 6.09714 9.0804 6.97492 9.56541 8.73049L10.0798 10.5926C10.5648 12.3481 10.8073 13.2259 11.5203 13.6252C12.2333 14.0244 13.1384 13.7892 14.9484 13.3188L16.8683 12.8199C18.6784 12.3495 19.5834 12.1143 19.995 11.4227C20.2212 11.0429 20.2499 10.6069 20.1495 10" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

            </svg>
            </Link>

            <Link className='p-3  hover:bg-gray-100 hover:rounded-2xl ' to={"/scanner"}>

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000" strokeWidth="1.2">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

            <g id="SVGRepo_iconCarrier"> <path d="M7.55556 4H5C4.44771 4 4 4.44772 4 5V7.55556M16.4444 4H19C19.5523 4 20 4.44772 20 5V7.55556M20 16.4444V19C20 19.5523 19.5523 20 19 20H16.4444M7.55556 20H5C4.44771 20 4 19.5523 4 19V16.4444M5.77778 12.8889H6.66667M8.44444 12.8889H9.33333M5.77778 11H10.1111C10.6634 11 11.1111 10.5523 11.1111 10V5.77778M12.8889 5.77778V11.1111M16.4444 11H18.2222M14.6667 11H15.1111M13.7778 12.8889H15.1111M17 12.8889H18.2222M18.2222 15H15.5556M15.5556 16.8889V18.2222M13.7778 15V18.2222M12 18.2222V12.8889H11.1111M10.2222 14.6667V18.2222M18.2222 17.7778V17.7778C18.2222 17.5323 18.0232 17.3333 17.7778 17.3333V17.3333C17.5323 17.3333 17.3333 17.5323 17.3333 17.7778V17.7778C17.3333 18.0232 17.5323 18.2222 17.7778 18.2222V18.2222C18.0232 18.2222 18.2222 18.0232 18.2222 17.7778ZM18.2222 6.77778V8.33333C18.2222 8.88562 17.7745 9.33333 17.2222 9.33333H15.6667C15.1144 9.33333 14.6667 8.88562 14.6667 8.33333V6.77778C14.6667 6.22549 15.1144 5.77778 15.6667 5.77778H17.2222C17.7745 5.77778 18.2222 6.22549 18.2222 6.77778ZM6.77778 9.33333H8.33333C8.88562 9.33333 9.33333 8.88562 9.33333 8.33333V6.77778C9.33333 6.22549 8.88562 5.77778 8.33333 5.77778H6.77778C6.22549 5.77778 5.77778 6.22549 5.77778 6.77778V8.33333C5.77778 8.88562 6.22549 9.33333 6.77778 9.33333ZM7.44444 18.2222H6.77778C6.22549 18.2222 5.77778 17.7745 5.77778 17.2222V15.6667C5.77778 15.1144 6.22549 14.6667 6.77778 14.6667H7.44444C7.99673 14.6667 8.44444 15.1144 8.44444 15.6667V17.2222C8.44444 17.7745 7.99673 18.2222 7.44444 18.2222Z" stroke="#757575" strokeLinecap="round" strokeLinejoin="round"/> </g>

            </svg>
                        
            </Link>



            <Link className='p-3 mb-2 hover:bg-gray-100 hover:rounded-2xl' to={"/login"}>

            <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>

            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>

            <g id="SVGRepo_iconCarrier"> <path d="M15 12L2 12M2 12L5.5 9M2 12L5.5 15" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M9.00195 7C9.01406 4.82497 9.11051 3.64706 9.87889 2.87868C10.7576 2 12.1718 2 15.0002 2L16.0002 2C18.8286 2 20.2429 2 21.1215 2.87868C22.0002 3.75736 22.0002 5.17157 22.0002 8L22.0002 16C22.0002 18.8284 22.0002 20.2426 21.1215 21.1213C20.3531 21.8897 19.1752 21.9862 17 21.9983M9.00195 17C9.01406 19.175 9.11051 20.3529 9.87889 21.1213C10.5202 21.7626 11.4467 21.9359 13 21.9827" stroke="#757575" strokeWidth="1.5" strokeLinecap="round"/> </g>

            </svg>
            </Link>

    </ul>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

   
      <div>
        <Ordenes/>
        
      </div>


    </>
  );
};

export default LayoutGenerico;
