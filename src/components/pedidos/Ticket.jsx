import { useState, useEffect, useContext } from "react";
// import { useLocation, Link } from "react-router-dom"; // Original
import { useLocation, Link, useNavigate } from "react-router-dom"; // Asegúrate que useNavigate esté aquí
// import { doc, getDoc } from "firebase/firestore"; // Ya no se necesita getDoc si no hacemos fetch
import { db } from "../firebase/firebase"; // db puede seguir siendo necesario para CartTotal u otros
import { dataContext } from "../Context/DataContext";
import CartElements from "./CartElements";
import CartTotal from "./CartTotal";
import avatar from "../../assets/avatar.png";
import dinero from "../../assets/dinero.png";
import singluten from "../../assets/singluten.png";
import ModalClientes from "./ModalClientes";
// import fondo from "../../assets/fondo.jpg"; // Comentado o eliminado si no se usa


const Ticket = (props) => {

  const { pedidosConOrigenUno } = useContext(dataContext);;
  const navigate = useNavigate(); // Asegúrate que esta línea esté presente

  const location = useLocation();
  // Obtén el OBJETO completo pasado como prop o desde el estado (prioriza prop)
  // const orderToEditId = props.orderToEdit || location.state?.orderToEdit || null; // Original logic
  const orderObjectFromSource = props.orderToEdit || location.state?.orderToEdit || null;
  // Obtén el ID NUMÉRICO desde el objeto (si existe) - Útil para mostrarlo
  const orderToEditId = orderObjectFromSource ? orderObjectFromSource.NumeroPedido : null;


  // Ya no necesitamos este estado si no hacemos el fetch redundante
  // const [orderToEdit, setOrderToEdit] = useState(null); // Original state
  const { cart, setCart, data } = useContext(dataContext);

  const [datosCliente, setDatosCliente] = useState({
    cliente: "",
    telefono: "",
    fechahora: "",
    observaciones: "",
    pagado: false,
    celiaco: false,
    img_perfil: "", // <-- campo original
  });

  const [orderAlreadyLoaded, setOrderAlreadyLoaded] = useState(false);

  // ============================================================
  // === ¡¡¡ ASEGÚRATE DE QUE EL useEffect QUE HACÍA FETCH  ===
  // ===       CON getDoc HA SIDO BORRADO COMPLETAMENTE     ===
  // ============================================================
  /*
   // ESTE BLOQUE HA SIDO ELIMINADO:
   useEffect(() => {
     if (orderToEditId) {
       const fetchOrder = async () => {
         try {
           const orderRef = doc(db, "pedidos", orderToEditId.toString());
           const orderSnap = await getDoc(orderRef);
           if (orderSnap.exists()) {
             setOrderToEdit(orderSnap.data());
           } else {
             console.error("No se encontró el pedido con id:", orderToEditId);
           }
         } catch (error) {
           console.error("Error al obtener el pedido:", error);
         }
       };
       fetchOrder();
     }
   }, [orderToEditId]);
  */

  // useEffect que popula datos y carrito DESDE EL OBJETO RECIBIDO
  useEffect(() => {
    // Usa el objeto directamente desde la fuente (props o state)
    if (orderObjectFromSource && !orderAlreadyLoaded && data.length > 0) {
      // console.log("Populating from source object:", orderObjectFromSource); // Log para depurar
      setDatosCliente({
        // Usa orderObjectFromSource aquí
        cliente: orderObjectFromSource.cliente || "",
        telefono: orderObjectFromSource.telefono || "",
        fechahora: orderObjectFromSource.fechahora || "",
        observaciones: orderObjectFromSource.observaciones || "",
        pagado: orderObjectFromSource.pagado || false,
        celiaco: orderObjectFromSource.celiaco || false,
        img_perfil: orderObjectFromSource.img_perfil || "",
      });

      // Usa orderObjectFromSource aquí
      const productosCompletos = orderObjectFromSource.productos.map((prod, index) => {
        const productoInfo = data.find((p) => Number(p.id_product) === Number(prod.id));
        return {
          ...(productoInfo || {}), // Mantenemos la lógica original de combinar
          ...prod,
          // Asegura un id_cart único si no viene
          id_cart: prod.id_cart || `${Date.now()}-${index}`,
          cantidad: Number(prod.cantidad || 1),
          // Lógica original de precio, con fallback al producto base si no viene en el pedido
          price: Number(prod.price || productoInfo?.price || 0),
        };
      }).filter(p => p.id_product); // Asegura que el producto base exista

      setCart(productosCompletos);
      setOrderAlreadyLoaded(true);
    } else if (!orderObjectFromSource && orderAlreadyLoaded) { // Limpia solo si antes había algo cargado
        // console.log("Cleaning up ticket..."); // Log para depurar
        setCart([]);
        setDatosCliente({
            cliente: "", telefono: "", fechahora: "", observaciones: "",
            pagado: false, celiaco: false, img_perfil: ""
        });
        setOrderAlreadyLoaded(false); // Resetea el flag si no hay objeto
    }

  // --- DEPENDENCIAS CORREGIDAS ---
  // }, [orderToEdit, orderAlreadyLoaded, data, setCart]); // Original dependencies
  }, [orderObjectFromSource, data, orderAlreadyLoaded, setCart]); // <-- Dependencias actualizadas (incluir setCart si se usa dentro)


  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleDataFromModal = (data) => {
    setDatosCliente(data);
  };

  // --- FUNCIÓN clearClientData CORREGIDA ---
  // Restaura la lógica para preservar campos del pedido
  const clearClientData = () => {
      setDatosCliente(prevDatos => ({ // Usa el estado previo para mantener campos
        cliente: '',
        telefono: '',
        // Mantiene estos campos porque son del pedido, no solo del cliente buscado
        fechahora: prevDatos.fechahora,
        observaciones: prevDatos.observaciones,
        pagado: prevDatos.pagado, // Mantiene estado de pago
        celiaco: prevDatos.celiaco, // Mantiene estado celiaco
        img_perfil: '',
      }));
  };


  const empleadoNombre=sessionStorage.getItem('empleadoNombre');

  return (
    <>

        {/* =========================================== */}
        {/* === NO SE HAN TOCADO ESTILOS NI JSX AQUÍ === */}
        {/* =========================================== */}
        <div className="flex justify-end gap-[1vw] p-[0.5vw] mt-[1vh]"  >
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
                  <Link to="#" className='border-2  p-[0.55vh] rounded-lg bg-white '>
                      <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                      <g id="SVGRepo_iconCarrier">
                      <path clipRule="evenodd" d="M11 4.54125C8.11878 5.68927 6.0772 8.44184 6.07706 11.6767V17.9802L3.31773 20.658C3.12222 20.8387 3 21.0961 3 21.3818V21.5114C3 22.6045 3.89543 23.4906 5 23.4906H10.0255C10.2508 25.4654 11.9443 27 14 27C16.0557 27 17.7492 25.4654 17.9745 23.4906H23C24.1046 23.4906 25 22.6045 25 21.5114V21.382C25.0001 21.0963 24.8779 20.8388 24.6823 20.658L21.9232 17.9805V11.677C21.9231 8.44206 19.8814 5.6891 17 4.54114V3.47401C17 2.18459 15.9963 1.54919 15.6019 1.354C15.0885 1.09988 14.5194 1 14 1C13.4806 1 12.9115 1.09988 12.3981 1.354C12.0037 1.54919 11 2.18459 11 3.47401V4.54125ZM14.927 3.96881C14.9218 3.98589 14.9164 4.00272 14.9108 4.0193C14.6118 3.98595 14.308 3.96881 14.0001 3.96881C13.6922 3.96881 13.3883 3.98596 13.0893 4.01933C13.0836 4.00274 13.0782 3.9859 13.073 3.96881H13V3.47401C13 3.20076 13.4473 2.97921 14 2.97921C14.5527 2.97921 15 3.20076 15 3.47401V3.96881H14.927ZM15.9483 23.4906H12.0517C12.2572 24.3674 13.0515 25.0208 14 25.0208C14.9485 25.0208 15.7428 24.3674 15.9483 23.4906ZM8.07706 11.6767C8.07722 8.53096 10.7105 5.94802 14.0001 5.94802C17.2898 5.94802 19.9231 8.53096 19.9232 11.6767H8.07706ZM8.07706 11.6767H19.9232V17.9805C19.9232 18.5121 20.1393 19.0214 20.5229 19.3936L22.7052 21.5114H5.29484L7.77028 19.1091C7.95901 18.9296 8.07706 18.6772 8.07706 18.3958V11.6767Z" fill="#000000" fillRule="evenodd"/>
                      </g>
                      </svg>
                  </Link>
                  <Link to="#" className='border-2 p-[0.55vh]  rounded-lg bg-white '>
                  <svg width="1.5vw" height="1.5vw" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                      <g id="SVGRepo_iconCarrier">
                      <path clipRule="evenodd" d="M1.82047 1C1.36734 1 1 1.35728 1 1.79801V2.39948C1 2.84021 1.36734 3.19749 1.82047 3.19749H3.72716C4.03867 3.19749 4.3233 3.36906 4.46192 3.64038L5.4947 5.93251C5.53326 6.00798 5.56364 6.09443 5.62081 6.15194L10.057 16.4429C10.0129 16.4634 9.97056 16.4883 9.93075 16.5176C8.70163 17.4226 7.87009 18.5878 7.87001 19.7604C7.86996 20.4429 8.16289 21.0807 8.75002 21.5212C9.30752 21.9394 10.0364 22.1118 10.8189 22.1118H10.8446C10.336 22.6308 10.0238 23.3336 10.0238 24.1072C10.0238 25.7049 11.3554 27 12.998 27C14.6406 27 15.9722 25.7049 15.9722 24.1072C15.9722 23.3336 15.66 22.6308 15.1513 22.1118H19.0494C18.5408 22.6308 18.2285 23.3336 18.2285 24.1072C18.2285 25.7049 19.5601 27 21.2027 27C22.8454 27 24.177 25.7049 24.177 24.1072C24.177 23.3336 23.8647 22.6308 23.3561 22.1118H23.9718C24.425 22.1118 24.7923 21.7545 24.7923 21.3138V20.9148C24.7923 20.474 24.425 20.1167 23.9718 20.1167H10.8189C10.3192 20.1167 10.0864 20.0041 10.0028 19.9414C9.94878 19.9009 9.92119 19.8618 9.9212 19.7606C9.92122 19.4917 10.1711 18.8708 11.069 18.1827C11.1084 18.1524 11.1453 18.1194 11.1792 18.084C11.2692 18.1089 11.3635 18.1221 11.4601 18.1221H23.9235C24.4248 18.1221 24.8527 17.7696 24.9351 17.2885L26.9858 5.31837C27.09 4.71036 26.6079 4.1569 25.9742 4.1569H7.35431C7.1981 4.1569 7.05618 4.06597 6.9909 3.92405L5.84968 1.44289C5.71106 1.17157 5.42642 1 5.11492 1H1.82047ZM8.47667 6.15194C8.18952 6.15194 7.99591 6.44552 8.10899 6.70946L12.04 15.8846C12.103 16.0317 12.2476 16.1271 12.4076 16.1271H22.7173C22.9122 16.1271 23.0787 15.9867 23.1116 15.7946L24.6834 6.61948C24.7253 6.37513 24.5371 6.15194 24.2892 6.15194H8.47667ZM11.8698 24.1072C11.8698 23.5012 12.3749 23.0099 12.998 23.0099C13.621 23.0099 14.1261 23.5012 14.1261 24.1072C14.1261 24.7132 13.621 25.2045 12.998 25.2045C12.3749 25.2045 11.8698 24.7132 11.8698 24.1072ZM21.2027 23.0099C20.5797 23.0099 20.0746 23.5012 20.0746 24.1072C20.0746 24.7132 20.5797 25.2045 21.2027 25.2045C21.8258 25.2045 22.3309 24.7132 22.3309 24.1072C22.3309 23.5012 21.8258 23.0099 21.2027 23.0099Z" fill="#000000" fillRule="evenodd"/>
                      </g>
                  </svg>
                  </Link>
                    <Link to="#" className=' p-[0.30vw] rounded-lg   bg-green-700 w-11 text-center '>
                      <h1 className='p-[0.40vw]   font-nunito text-white'>{pedidosConOrigenUno}</h1>
                  </Link>
        </div>

      <div className="p-[1.3vh] mt-[1.8vh]">
        <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
          Cliente
        </h1>
      </div>

      {/* Added cursor-pointer to img */}
      <div className="flex items-center text-center justify-center" >
      <img onClick={handleShow}
          src={datosCliente.img_perfil ? datosCliente.img_perfil : avatar}
          alt="avatar"
          className="w-[3.5vw] mt-2 rounded-lg border-2 border-yellow-500 object-cover cursor-pointer"
        />

            {/* Removed specific border classes from this div */}
            <div
              className={`ms-[1vw] font-nunito rounded-md py-1 px-4 text-sm`}
              >
                {/* Button logic updated */}
                {datosCliente.cliente && datosCliente.cliente.length > 0 && (
                <button
                    // onClick={() => // Original inline function removed
                    //   setDatosCliente({
                    //     cliente: '',
                    //     telefono: '',
                    //     fechahora: '',
                    //     observaciones: '',
                    //     pagado: false,
                    //     celiaco: false,
                    //     img_perfil: '',
                    //   })
                    // }
                    onClick={clearClientData} // Use the corrected function
                    className="absolute top-[5.8vw] right-[0.8vw] rounded-full p-[0.2vw]  transition" // Original classes kept
                    title="Borrar datos del cliente" // Added title
                  >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="#4B5563"
                        className="w-[1.5vw] h-[1.5vw] text-white" // Original classes kept
                      >
                        <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Zm3-9h2v7H9v-7Zm4 0h2v7h-2v-7ZM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5Z" />
                      </svg>
                  </button>
                  )}
            {/* Added placeholders */}
            <h3 className="text-gray-900 font-bold">{datosCliente.cliente || 'Cliente...'}</h3>
            <h3 className="text-gray-600">{datosCliente.telefono || 'Teléfono...'}</h3>
            <h3 className="text-gray-900 font-bold">{datosCliente.fechahora || 'Fecha/Hora...'}</h3>
            {/* Added gap and titles */}
            <div className="flex justify-around"> {/* Kept original justify-around */}
              {datosCliente.pagado && (
                <img src={dinero} alt="dinero pagado" className="w-5" title="Pagado"/>
              )}
              {datosCliente.celiaco && (
                <img src={singluten} alt="sin gluten" className="w-5" title="Celiaco"/>
              )}
            </div>

          </div>

        </div>

        {/* Conditional rendering for observations */}
        {datosCliente.observaciones && (
            <div className="p-[1vw]">
                <p className="font-nunito text-left text-gray-600 text-sm ">
                    <span className="font-bold">Obs:</span> {datosCliente.observaciones}
                </p>
            </div>
        )}


      {cart.length === 0 ? (
        <div className="flex justify-center items-center mt-52">
             <svg fill="#4B5563" height="150px" width="150px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 483.1 483.1" xmlSpace="preserve">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
            <g id="SVGRepo_iconCarrier"> <g> <path d="M434.55,418.7l-27.8-313.3c-0.5-6.2-5.7-10.9-12-10.9h-58.6c-0.1-52.1-42.5-94.5-94.6-94.5s-94.5,42.4-94.6,94.5h-58.6 c-6.2,0-11.4,4.7-12,10.9l-27.8,313.3c0,0.4,0,0.7,0,1.1c0,34.9,32.1,63.3,71.5,63.3h243c39.4,0,71.5-28.4,71.5-63.3 C434.55,419.4,434.55,419.1,434.55,418.7z M241.55,24c38.9,0,70.5,31.6,70.6,70.5h-141.2C171.05,55.6,202.65,24,241.55,24z M363.05,459h-243c-26,0-47.2-17.3-47.5-38.8l26.8-301.7h47.6v42.1c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h141.2v42.1 c0,6.6,5.4,12,12,12s12-5.4,12-12v-42.1h47.6l26.8,301.8C410.25,441.7,389.05,459,363.05,459z"/> </g> </g>
            </svg>
            {/* Placeholder text could be added here if desired, but keeping original structure */}
        </div>
      ) : (
        // Updated heading to include order ID if editing
        <div className="p-[1.3vh]">
          <h1 className="font-nunito border-b-2 font-bold text-gray-600 border-gray-600 text-[1vw]">
            Pedido {orderToEditId ? `(Editando #${orderToEditId})` : ''}
          </h1>
        </div>
      )}

      <div className="p-[1.3vh] max-h-[54%] overflow-y-auto">
        <CartElements />
      </div>

      {/* Conditional rendering for Total section */}
      {cart.length > 0 && ( // Use cart.length > 0 as condition
        // Kept original div structure and classes for Total section
        <div className="p-[1.3vh] mt-[1vh]">
          <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
            Total
          </h1>
          <CartTotal
            datosCliente={datosCliente}
            setDatosCliente={setDatosCliente}
            // Pass the original object directly and the ID separately
            orderToEdit={orderObjectFromSource}
            orderToEditIdProp={orderToEditId} // Pass the ID explicitly if needed by CartTotal
          />
        </div>
      )}

      {/* Pass initialData to ModalClientes */}
      <ModalClientes
        show={show}
        handleClose={handleClose}
        onSave={handleDataFromModal}
        initialData={datosCliente} // <-- Prop added
      />
    </>
  );
};

export default Ticket;
