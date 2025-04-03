import { useState, useEffect, useContext } from "react";
import { useLocation, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { dataContext } from "../Context/DataContext";
import CartElements from "./CartElements";
import CartTotal from "./CartTotal";
import avatar from "../../assets/avatar.png";
import dinero from "../../assets/dinero.png";
import singluten from "../../assets/singluten.png";
import ModalClientes from "./ModalClientes";

const Ticket = (props) => {
  const location = useLocation();
  const orderToEditId = props.orderToEdit || location.state?.orderToEdit || null;

  const [orderToEdit, setOrderToEdit] = useState(null);
  const { cart, setCart, data } = useContext(dataContext);

  const [datosCliente, setDatosCliente] = useState({
    cliente: "",
    telefono: "",
    fechahora: "",
    observaciones: "",
    pagado: false,
    celiaco: false,
  });

  const [orderAlreadyLoaded, setOrderAlreadyLoaded] = useState(false);

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

  useEffect(() => {
    if (orderToEdit && !orderAlreadyLoaded && data.length > 0) {
      setDatosCliente({
        cliente: orderToEdit.cliente || "",
        telefono: orderToEdit.telefono || "",
        fechahora: orderToEdit.fechahora || "",
        observaciones: orderToEdit.observaciones || "",
        pagado: orderToEdit.pagado || false,
        celiaco: orderToEdit.celiaco || false,
      });

      const productosCompletos = orderToEdit.productos.map((prod, index) => {
        const productoInfo = data.find((p) => Number(p.id_product) === Number(prod.id));
        return {
          ...productoInfo,
          ...prod,
          id_cart: prod.id_cart || index + 1,
          cantidad: Number(prod.cantidad || 1),
          price: Number(prod.price || 0),
        };
      });

      setCart(productosCompletos);
      setOrderAlreadyLoaded(true);
    }
  }, [orderToEdit, orderAlreadyLoaded, data, setCart]);

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleDataFromModal = (data) => {
    setDatosCliente(data);
  };

  return (
    <>
      <div className="flex justify-end gap-[1vw] p-[0.5vw] mt-[0.7vw]">
        <Link className="border-2 p-[0.55vh] rounded-lg bg-white shadow-md">
          {/* Botón extra */}
        </Link>
      </div>

      <div className="p-[1.3vh] mt-[1vh]">
        <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
          Cliente
        </h1>
      </div>

      <div className="flex items-center text-center justify-center" onClick={handleShow}>
        <img
          src={avatar}
          alt="avatar"
          className="w-[3.5vw] mt-2 rounded-lg border-2 border-yellow-500"
        />
        <div className="ms-[1vw] font-nunito">
          <h3 className="text-gray-600 font-bold">{datosCliente.cliente}</h3>
          <h3 className="text-gray-600">{datosCliente.telefono}</h3>
          <h3 className="text-gray-600">{datosCliente.fechahora}</h3>
          <div className="flex justify-around">
            {datosCliente.pagado && (
              <img src={dinero} alt="dinero pagado" className="w-7" />
            )}
            {datosCliente.celiaco && (
              <img src={singluten} alt="sin gluten" className="w-7" />
            )}
          </div>
        </div>
      </div>

      <div className="p-[1vw]">
        <p className="font-nunito text-xs">{datosCliente.observaciones}</p>
      </div>

      {cart.length === 0 ? (
        <div className="flex justify-center items-center mt-52">
          {/* SVG vacío */}
        </div>
      ) : (
        <div className="p-[1.3vh]">
          <h1 className="font-nunito border-b-2 font-bold text-gray-600 border-gray-600 text-[1vw]">
            Pedido
          </h1>
        </div>
      )}

      <div className="p-[1.3vh] max-h-[54%] overflow-y-auto">
        <CartElements />
      </div>

      {cart.length === 0 ? (
        <div className="text-center text-[2vh] text-gray-600"></div>
      ) : (
        <div className="p-[1.3vh] mt-[1vh]">
          <h1 className="font-nunito border-b-2 text-gray-600 font-bold border-gray-600 text-[1vw]">
            Total
          </h1>
          <CartTotal
            datosCliente={datosCliente}
            setDatosCliente={setDatosCliente}
            orderToEdit={orderToEdit}
          />
        </div>
      )}

      <ModalClientes
        show={show}
        handleClose={handleClose}
        onSave={handleDataFromModal}
      />
    </>
  );
};

export default Ticket;