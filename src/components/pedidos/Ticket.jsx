import { useState, useEffect, useContext } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { dataContext } from "../Context/DataContext";
import CartElements from "./CartElements";
import CartTotal from "./CartTotal";
import avatar from "../../assets/avatar.png";
import dinero from "../../assets/dinero.png";
import dayjs from "dayjs"; // Importar dayjs
import singluten from "../../assets/singluten.png";
import ModalClientes from "./ModalClientes";
import { Offcanvas, Button, Nav, Modal, InputGroup, Form } from 'react-bootstrap';

const Ticket = (props) => {

  const [showModal2, setShowModal2] = useState(false);
  const handleCloseModal2 = () => setShowModal2(false);

  const {
    cart,
    setCart,
    data,
    orderBeingEdited,
    isEditingOrder,
    setOrderBeingEdited,
    pedidosConOrigenUno,
    selectedSlotTime,    // Obtener el slot seleccionado del contexto
    setSelectedSlotTime  // Obtener la función para resetear el slot
  } = useContext(dataContext);

  const navigate = useNavigate();
  const location = useLocation();
  const orderObjectFromSource = orderBeingEdited;
  const orderToEditId = orderObjectFromSource ? orderObjectFromSource.NumeroPedido : null;

  const [datosCliente, setDatosCliente] = useState({
    cliente: "", telefono: "", fechahora: "", observaciones: "",
    pagado: false, celiaco: false, img_perfil: ""
  });

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const handleCloseConfirmCancelModal = () => setShowConfirmCancelModal(false);
  const handleShowConfirmCancelModal = () => setShowConfirmCancelModal(true);

  // Efecto para actualizar fechahora cuando selectedSlotTime cambia
  useEffect(() => {
    if (selectedSlotTime) {
      const newTime = selectedSlotTime; // e.g., "14:30"

      setDatosCliente(prevDatos => {
        let baseDateStr;
        // Intentar obtener la fecha de prevDatos.fechahora si existe y es válida
        if (prevDatos.fechahora && prevDatos.fechahora.includes(' ')) {
          const datePart = prevDatos.fechahora.split(' ')[0];
          if (dayjs(datePart, "DD/MM/YYYY", true).isValid()) {
            baseDateStr = datePart;
          } else {
            baseDateStr = dayjs().format("DD/MM/YYYY"); // Fallback a hoy si la fecha previa no es válida
          }
        } else {
          baseDateStr = dayjs().format("DD/MM/YYYY"); // Hoy si no hay fecha previa
        }

        const newFechahora = `${baseDateStr} ${newTime}`;

        // Validar antes de actualizar
        if (dayjs(newFechahora, "DD/MM/YYYY HH:mm", true).isValid()) {
          return { ...prevDatos, fechahora: newFechahora };
        }
        return prevDatos; // No actualizar si la nueva fecha/hora no es válida
      });
      setSelectedSlotTime(null); // Resetear el slot seleccionado en el contexto para que sea un trigger de una sola vez
    }
  }, [selectedSlotTime, setDatosCliente, setSelectedSlotTime]);

  // --- NUEVO: Estado para el modal de confirmación de vaciar ticket ---
  const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
  const handleCloseConfirmClearModal = () => setShowConfirmClearModal(false);
  const handleShowConfirmClearModal = () => setShowConfirmClearModal(true);
  // --- FIN NUEVO ESTADO ---

  useEffect(() => {
    const orderToUpdate = orderObjectFromSource;
    if (orderToUpdate) {
      console.log("Ticket (Context): Actualizando datosCliente desde orderBeingEdited:", orderToUpdate);
      setDatosCliente({
        cliente: orderToUpdate.cliente || "",
        telefono: orderToUpdate.telefono || "",
        fechahora: orderToUpdate.fechahora || "",
        observaciones: orderToUpdate.observaciones || "",
        pagado: orderToUpdate.pagado || false,
        celiaco: orderToUpdate.celiaco || false,
        img_perfil: orderToUpdate.img_perfil || "",
      });
    } else {
      setDatosCliente({
        cliente: "", telefono: "", fechahora: "", observaciones: "",
        pagado: false, celiaco: false, img_perfil: ""
      });
    }
  }, [orderObjectFromSource]);

  const handleDataFromModal = (data) => {
    setDatosCliente(data);
  };

  const handleCancelEdit = () => {
    handleShowConfirmCancelModal();
  };

  const confirmCancelAction = () => {
    setOrderBeingEdited(null);
    setCart([]);
    setDatosCliente({
      cliente: "", telefono: "", fechahora: "", observaciones: "",
      pagado: false, celiaco: false, img_perfil: ""
    });
    handleCloseConfirmCancelModal();
    navigate('/ordenes', { replace: true });
  };

  const clearClientData = () => {
    setDatosCliente(prevDatos => ({
      cliente: '', telefono: '', fechahora: '', observaciones: '',
      pagado: false, celiaco: false, img_perfil: '',
    }));
  };

  // Función para limpiar el ticket completo (cliente y carrito) - MODIFICADA
  const handleClearTicket = () => {
    // Solo abre el modal de confirmación
    handleShowConfirmClearModal();

  };



  // --- NUEVA FUNCIÓN: Lógica que se ejecuta al confirmar el vaciado del ticket ---
  const confirmClearAction = () => {
    setCart([]); // Vacía el carrito en el contexto
    setDatosCliente({ // Limpia los datos del cliente en el estado local
      cliente: "", telefono: "", fechahora: "", observaciones: "",
      pagado: false, celiaco: false, img_perfil: ""
    });

    handleCloseConfirmClearModal(); // Cierra este modal de confirmación
  };
  // --- FIN NUEVA FUNCIÓN ---

  const empleadoNombre = sessionStorage.getItem('empleadoNombre');

  return (
    <>
      {/* Sección superior del Ticket */}
      <div className="flex justify-end gap-[1vw] p-[0.5vw] mt-[1vh]">
        {/* ... (Iconos superiores sin cambios) ... */}
        <Link to="#" className='border-2 p-[0.55vh] rounded-lg bg-white'>
          <svg width="1.5vw" height="1.5vw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier"> <path d="M14 19.2857L15.8 21L20 17M4 21C4 17.134 7.13401 14 11 14C12.4872 14 13.8662 14.4638 15 15.2547M15 7C15 9.20914 13.2091 11 11 11C8.79086 11 7 9.20914 7 7C7 4.79086 8.79086 3 11 3C13.2091 3 15 4.79086 15 7Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g>
          </svg>
        </Link>
        <div className="me-4">
          <h1 className="flex items-center justify-start text-sm text-gray-400 font-nunito ">Empleado</h1>
          <h1 className="text-gray-800 font-bold font-nunito text-sm text-center">{empleadoNombre}</h1>
        </div>
        <Link to="#" className='border-2 p-[0.55vh] rounded-lg bg-white '>
          <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
              <path clipRule="evenodd" d="M11 4.54125C8.11878 5.68927 6.0772 8.44184 6.07706 11.6767V17.9802L3.31773 20.658C3.12222 20.8387 3 21.0961 3 21.3818V21.5114C3 22.6045 3.89543 23.4906 5 23.4906H10.0255C10.2508 25.4654 11.9443 27 14 27C16.0557 27 17.7492 25.4654 17.9745 23.4906H23C24.1046 23.4906 25 22.6045 25 21.5114V21.382C25.0001 21.0963 24.8779 20.8388 24.6823 20.658L21.9232 17.9805V11.677C21.9231 8.44206 19.8814 5.6891 17 4.54114V3.47401C17 2.18459 15.9963 1.54919 15.6019 1.354C15.0885 1.09988 14.5194 1 14 1C13.4806 1 12.9115 1.09988 12.3981 1.354C12.0037 1.54919 11 2.18459 11 3.47401V4.54125ZM14.927 3.96881C14.9218 3.98589 14.9164 4.00272 14.9108 4.0193C14.6118 3.98595 14.308 3.96881 14.0001 3.96881C13.6922 3.96881 13.3883 3.98596 13.0893 4.01933C13.0836 4.00274 13.0782 3.9859 13.073 3.96881H13V3.47401C13 3.20076 13.4473 2.97921 14 2.97921C14.5527 2.97921 15 3.20076 15 3.47401V3.96881H14.927ZM15.9483 23.4906H12.0517C12.2572 24.3674 13.0515 25.0208 14 25.0208C14.9485 25.0208 15.7428 24.3674 15.9483 23.4906ZM8.07706 11.6767C8.07722 8.53096 10.7105 5.94802 14.0001 5.94802C17.2898 5.94802 19.9231 8.53096 19.9232 11.6767H8.07706ZM8.07706 11.6767H19.9232V17.9805C19.9232 18.5121 20.1393 19.0214 20.5229 19.3936L22.7052 21.5114H5.29484L7.77028 19.1091C7.95901 18.9296 8.07706 18.6772 8.07706 18.3958V11.6767Z" fill="#000000" fillRule="evenodd" />
            </g>
          </svg>
        </Link>
        <Link to="#" className='border-2 p-[0.55vh] rounded-lg bg-white '>
          <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
              <path clipRule="evenodd" d="M1.82047 1C1.36734 1 1 1.35728 1 1.79801V2.39948C1 2.84021 1.36734 3.19749 1.82047 3.19749H3.72716C4.03867 3.19749 4.3233 3.36906 4.46192 3.64038L5.4947 5.93251C5.53326 6.00798 5.56364 6.09443 5.62081 6.15194L10.057 16.4429C10.0129 16.4634 9.97056 16.4883 9.93075 16.5176C8.70163 17.4226 7.87009 18.5878 7.87001 19.7604C7.86996 20.4429 8.16289 21.0807 8.75002 21.5212C9.30752 21.9394 10.0364 22.1118 10.8189 22.1118H10.8446C10.336 22.6308 10.0238 23.3336 10.0238 24.1072C10.0238 25.7049 11.3554 27 12.998 27C14.6406 27 15.9722 25.7049 15.9722 24.1072C15.9722 23.3336 15.66 22.6308 15.1513 22.1118H19.0494C18.5408 22.6308 18.2285 23.3336 18.2285 24.1072C18.2285 25.7049 19.5601 27 21.2027 27C22.8454 27 24.177 25.7049 24.177 24.1072C24.177 23.3336 23.8647 22.6308 23.3561 22.1118H23.9718C24.425 22.1118 24.7923 21.7545 24.7923 21.3138V20.9148C24.7923 20.474 24.425 20.1167 23.9718 20.1167H10.8189C10.3192 20.1167 10.0864 20.0041 10.0028 19.9414C9.94878 19.9009 9.92119 19.8618 9.9212 19.7606C9.92122 19.4917 10.1711 18.8708 11.069 18.1827C11.1084 18.1524 11.1453 18.1194 11.1792 18.084C11.2692 18.1089 11.3635 18.1221 11.4601 18.1221H23.9235C24.4248 18.1221 24.8527 17.7696 24.9351 17.2885L26.9858 5.31837C27.09 4.71036 26.6079 4.1569 25.9742 4.1569H7.35431C7.1981 4.1569 7.05618 4.06597 6.9909 3.92405L5.84968 1.44289C5.71106 1.17157 5.42642 1 5.11492 1H1.82047ZM8.47667 6.15194C8.18952 6.15194 7.99591 6.44552 8.10899 6.70946L12.04 15.8846C12.103 16.0317 12.2476 16.1271 12.4076 16.1271H22.7173C22.9122 16.1271 23.0787 15.9867 23.1116 15.7946L24.6834 6.61948C24.7253 6.37513 24.5371 6.15194 24.2892 6.15194H8.47667ZM11.8698 24.1072C11.8698 23.5012 12.3749 23.0099 12.998 23.0099C13.621 23.0099 14.1261 23.5012 14.1261 24.1072C14.1261 24.7132 13.621 25.2045 12.998 25.2045C12.3749 25.2045 11.8698 24.7132 11.8698 24.1072ZM21.2027 23.0099C20.5797 23.0099 20.0746 23.5012 20.0746 24.1072C20.0746 24.7132 20.5797 25.2045 21.2027 25.2045C21.8258 25.2045 22.3309 24.7132 22.3309 24.1072C22.3309 23.5012 21.8258 23.0099 21.2027 23.0099Z" fill="#000000" fillRule="evenodd" />
            </g>
          </svg>
        </Link>
        <Link to="#" className='p-[0.30vw] rounded-lg bg-green-700 w-11 text-center'>
          <h1 className='p-[0.40vw] font-nunito text-white'>{pedidosConOrigenUno ?? 0}</h1>
        </Link>
      </div>

      {/* Banner de Edición */}
      {isEditingOrder && (
        <div className="relative bg-red-500 p-3 mt-2 text-white font-nunito shadow-lg ">
          <h1 className="font-bold text-center">Modificando pedido: {orderToEditId}</h1>
          <button
            onClick={handleCancelEdit}
            className="absolute right-3 top-3 hover:text-yellow-300 transition-colors"
            aria-label="Cancelar edición"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sección Cliente */}
      <div className="p-[1.3vh] mt-[0.9vh]">
        <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
          Cliente
        </h1>
      </div>
      <div className="flex items-center text-center justify-center relative ">
        <img onClick={handleShow}
          src={datosCliente.img_perfil ? datosCliente.img_perfil : avatar}
          alt="avatar"
          className="w-[3.8vw]  rounded-lg border-2 border-yellow-500 object-cover cursor-pointer"
        />
        <div className={`ms-[1vw] font-nunito rounded-md py-1 px-4 text-sm`}>
          <h3 className="text-gray-900 font-bold">{datosCliente.cliente}</h3>
          <h3 className="text-gray-600">{datosCliente.telefono}</h3>
          <h3 className="text-gray-900 font-bold">{datosCliente.fechahora}</h3>
          <div className="flex justify-around mt-1">
            {datosCliente.pagado && (<img src={dinero} alt="dinero pagado" className="w-5" title="Pagado" />)}
            {datosCliente.celiaco && (<img src={singluten} alt="sin gluten" className="w-5" title="Celiaco" />)}
          </div>
        </div>
        {/* Se eliminó el botón de papelera de aquí */}
      </div>

      {/* Observaciones */}
      {datosCliente.observaciones && (
        <div className="p-[0.5vw] mt-1">
          <p className="font-nunito text-left text-gray-600 text-sm ">
            <span className="font-bold">Obs:</span> {datosCliente.observaciones}
          </p>
        </div>
      )}

      {/* Sección Pedido */}
      {cart.length === 0 ? (
        <div className="flex justify-center items-center mt-52">
          {/* ... SVG Carrito Vacío ... */}
          <svg fill="#4B5563" height="150px" width="150px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 483.1 483.1" xmlSpace="preserve">
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier"> <g> <path d="M434.55,418.7l-27.8-313.3c-0.5-6.2-5.7-10.9-12-10.9h-58.6c-0.1-52.1-42.5-94.5-94.6-94.5s-94.5,42.4-94.6,94.5h-58.6 c-6.2,0-11.4,4.7-12,10.9l-27.8,313.3c0,0.4,0,0.7,0,1.1c0,34.9,32.1,63.3,71.5,63.3h243c39.4,0,71.5-28.4,71.5-63.3 C434.55,419.4,434.55,419.1,434.55,418.7z M241.55,24c38.9,0,70.5,31.6,70.6,70.5h-141.2C171.05,55.6,202.65,24,241.55,24z M363.05,459h-243c-26,0-47.2-17.3-47.5-38.8l26.8-301.7h47.6v42.1c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h141.2v42.1 c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h47.6l26.8,301.8C410.25,441.7,389.05,459,363.05,459z" /> </g> </g>
          </svg>
        </div>
      ) : (
        <div className="p-[1.3vh] mt-2 relative"> {/* Contenedor relativo */}
          <h1 className="font-nunito border-b-2 font-bold text-gray-600 border-gray-600 text-[1vw] pb-1"> {/* Padding inferior */}
            Pedido
          </h1>
          {/* Botón Papelera (solo si hay carrito y NO se edita) */}
          {!isEditingOrder && cart.length > 0 && (
            <button
              onClick={handleClearTicket} // Llama a la función que abre el modal de confirmación
              className="absolute top-0 right-0 -mt-1 p-1 rounded-full hover:bg-yellow-500 transition"
              title="Vaciar ticket"
            >
              <svg
                width="27px"
                height="27px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M20.5001 6H3.5"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path d="M9.5 11L10 16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14.5 11L14 16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                  <path
                    d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Lista de Elementos del Carrito */}
      <div className="p-[1.3vh] max-h-[43%] overflow-y-auto">
        <CartElements />
      </div>

      {/* Sección Total */}
      {cart.length > 0 && (
        <div className="p-[1.3vh] mt-[1vh]">
          <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
            Total
          </h1>
          <CartTotal
            datosCliente={datosCliente}
            setDatosCliente={setDatosCliente}
            orderToEdit={orderObjectFromSource}
            orderToEditIdProp={orderToEditId}
          />
        </div>
      )}

      {/* Modales */}
      <ModalClientes
        show={show}
        handleClose={handleClose}
        onSave={handleDataFromModal}
        initialData={datosCliente}
        clearClientData={clearClientData}
      />
      <Modal show={showModal2} onHide={handleCloseModal2} size="md" backdrop="static" keyboard={false} centered>
        {/* ... contenido modal cierre turno ... */}
      </Modal>
      <Modal show={showConfirmCancelModal} onHide={handleCloseConfirmCancelModal} centered>
        <h1 className="text-center pt-3 font-nunito text-lg font-bold">Confirmación de cancelación</h1>
        <Modal.Body className="font-nunito">
          <div className=' d-flex justify-content-center align-items-center -mt-4'>
            <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z" /> </g>
            </svg>
          </div>
          <p className="text-center text-gray-500 font-nunito">¿Estás seguro de que quieres cancelar la edición? Se perderán los cambios no guardados.</p>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: 'none' }}>
          <Button variant="secondary" onClick={handleCloseConfirmCancelModal} className="shadow-md bg-white border-red-500 hover:bg-red-700 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700">
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmCancelAction} className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-600 hover:border-yellow-600">
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- NUEVO: Modal de Confirmación para Vaciar Ticket --- */}
      <Modal show={showConfirmClearModal} onHide={handleCloseConfirmClearModal} size="md" backdrop="static" keyboard={false} centered>

        <Modal.Body className="font-nunito">

          <h1 className="text-center text-lg text-gray-800 font-bold">Confirmar Vaciar Ticket</h1>

          <div className=' d-flex justify-content-center align-items-center '>
            <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z" /> </g>
            </svg>
          </div>


          <p className=" p-2 text-center text-gray-400">¿Estás seguro de que quieres vaciar el ticket actual? Se borrarán los datos cliente y todos los productos de este pedido.</p>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: 'none' }}>
          <Button variant="secondary" onClick={handleCloseConfirmClearModal} className=" shadow-md bg-white border-red-500 hover:bg-red-600 hover:border-red-700 p-2 font-nunito text-red-500 hover:text-red-700">
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmClearAction} className="shadow-md p-2 bg-white font-nunito text-yellow-500 border-yellow-500 hover:text-yellow-600 hover:border-yellow-600">
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>
      {/* --- FIN NUEVO MODAL --- */}

      {/* Sección de Versión */}
      <div className="absolute bottom-0 right-0 p-2 text-xs text-gray-400 font-nunito">
        v1.0.5
      </div>
    </>
  );
};

export default Ticket;
