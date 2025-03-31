import { useState, useContext } from "react";
import { dataContext } from "../Context/DataContext";
import { doc, getDoc, updateDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Modal, Button } from "react-bootstrap";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const CartTotal = ({ datosCliente, setDatosCliente, orderToEdit }) => {
  const { cart, setCart } = useContext(dataContext);
  const navigate = useNavigate();

  const [mensajeModal, setMensajeModal] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseModal = () => setShowModal(false);
  const handleCloseModal2 = () => setShowModal2(false);

  const total = cart.reduce(
    (acc, item) => acc + (item.price || 0) * (item.cantidad || 1),
    0
  );

  const obtenerHoraRedondeada = () => {
    const now = dayjs();
    const minutos = now.minute();
    const siguienteBloque = Math.floor(minutos / 15) * 15;
    const nuevaHora = now.minute(siguienteBloque).second(0).millisecond(0);
    return nuevaHora.isBefore(now) ? nuevaHora.add(15, "minute") : nuevaHora;
  };

  const fechahora = datosCliente.fechahora || obtenerHoraRedondeada().format("DD/MM/YYYY HH:mm");

  // Función para obtener el siguiente ID (solo se usa en creación de pedido)
  const getNextId = async () => {
    const contadorRef = doc(db, "contadorPedidos", "pedidoId");
    const docSnap = await getDoc(contadorRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const nextId = data.id + 1;
      await updateDoc(contadorRef, { id: nextId });
      return nextId;
    } else {
      await setDoc(contadorRef, { id: 1 });
      return 1;
    }
  };

  const sanitizeClientData = (data) => ({
    cliente: data.cliente || "",
    telefono: data.telefono || "",
    fechahora: data.fechahora || "",
    observaciones: data.observaciones || "",
    pagado: data.pagado || false,
    celiaco: data.celiaco || false,
    localidad: data.localidad || "",
  });

  // Función para actualizar stock, actualizada según tu lógica
  const updateStock = async (productId, cantidadVendida) => {
    try {
      if (productId == null || typeof productId !== "number") {
        console.error("ID de producto inválido:", productId);
        return;
      }
      const productRef = doc(db, "productos", productId.toString());
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const currentStock = productData.stock || 0;
        const newStock = currentStock - cantidadVendida;
        if (newStock >= 0) {
          await updateDoc(productRef, { stock: newStock });
          setCart((prevCart) =>
            prevCart.map((item) =>
              item.id_product === productId ? { ...item, stock: newStock } : item
            )
          );
        } else {
          console.log(`No hay suficiente stock para ${productData.name || "sin nombre"}`);
        }
      } else {
        console.log("Producto no encontrado para el id:", productId);
      }
    } catch (error) {
      console.error("Error al actualizar el stock:", error);
    }
  };

  // Helpers para trabajar con los intervalos (no se modifican)
  const convertTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const findClosestIntervalIndex = (intervals, targetTime) => {
    const targetMinutes = convertTimeToMinutes(targetTime);
    let closestIndex = 0;
    let smallestDiff = Infinity;
    intervals.forEach((interval, index) => {
      const intervalMinutes = convertTimeToMinutes(interval.start);
      const diff = Math.abs(intervalMinutes - targetMinutes);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = index;
      }
    });
    return closestIndex;
  };

  // Validaciones del pedido
  const validateOrder = async () => {
    const incluyePollo = cart.some(
      (item) => item.id_product === 1 || item.id_product === 2
    );
    const clienteData = sanitizeClientData(datosCliente);

    if (!clienteData.telefono) {
      setMensajeModal("El teléfono del cliente es obligatorio.");
      setShowModal2(true);
      return false;
    }

    if (!clienteData.fechahora) {
      setMensajeModal("No has seleccionado hora para el pedido.");
      setShowModal2(true);
      return false;
    }

    if (!incluyePollo) {
      setMensajeModal("Comprueba...tu pedido no incluye pollo.");
      setShowModal(true);
      return false;
    }

    for (const item of cart) {
      const productRef = doc(db, "productos", item.id_product.toString());
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const productData = productSnap.data();
        const currentStock = productData.stock || 0;
        if (currentStock < item.cantidad) {
          setMensajeModal(
            `No hay suficiente stock para ${item.name || "sin nombre"}. Solo quedan ${currentStock} unidades.`
          );
          setShowModal2(true);
          return false;
        }
      } else {
        setMensajeModal(`Producto no encontrado para el id: ${item.id_product}`);
        setShowModal2(true);
        return false;
      }
    }

    return true;
  };

  // Funciones para actualizar calendarios (idénticas a las que ya tenías)
  const updateChickenCalendarPollo = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, "DD/MM/YYYY HH:mm");
      const dailyDocId = orderDate.format("YYYY-MM-DD");
      const timeSlot = orderDate.format("HH:mm");
      const docRef = doc(db, "chicken_calendar_daily", dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error("Documento diario no existe");
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        let index = intervals.findIndex((interval) => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error("El límite de Pollo Asado en este intervalo ya se ha alcanzado");
        }
        transaction.update(docRef, { intervals });
      });
    } catch (error) {
      console.error("Error actualizando chicken calendar para Pollo Asado:", error);
      throw error;
    }
  };

  const updateCostillaCalendar = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, "DD/MM/YYYY HH:mm");
      const dailyDocId = orderDate.format("YYYY-MM-DD");
      const timeSlot = orderDate.format("HH:mm");
      const docRef = doc(db, "costilla_calendar_daily", dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error("Documento diario de costilla no existe");
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        let index = intervals.findIndex((interval) => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error("El límite de Costilla en este intervalo ya se ha alcanzado");
        }
        transaction.update(docRef, { intervals });
      });
    } catch (error) {
      console.error("Error actualizando costilla calendar:", error);
      throw error;
    }
  };

  const updateCodilloCalendar = async (fechahora, cantidad) => {
    try {
      const orderDate = dayjs(fechahora, "DD/MM/YYYY HH:mm");
      const dailyDocId = orderDate.format("YYYY-MM-DD");
      const timeSlot = orderDate.format("HH:mm");
      const docRef = doc(db, "codillo_calendar_daily", dailyDocId);

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error("Documento diario de codillo no existe");
        }
        const data = docSnap.data();
        const intervals = data.intervals;
        let index = intervals.findIndex((interval) => interval.start === timeSlot);
        if (index === -1) {
          index = findClosestIntervalIndex(intervals, timeSlot);
        }
        const current = intervals[index].orderedCount;
        const max = intervals[index].maxAllowed;
        if (current + cantidad <= max) {
          intervals[index].orderedCount = current + cantidad;
        } else {
          throw new Error("El límite de Codillo en este intervalo ya se ha alcanzado");
        }
        transaction.update(docRef, { intervals });
      });
    } catch (error) {
      console.error("Error actualizando codillo calendar:", error);
      throw error;
    }
  };

  // Función para enviar el pedido (o actualizarlo si se está editando)
  const sendToFirestore = async ({ confirmado }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!confirmado) {
        const isValid = await validateOrder();
        if (!isValid) return;
      }

      if (orderToEdit) {
        // Actualizar pedido existente
        const pedidoRef = doc(db, "pedidos", orderToEdit.NumeroPedido.toString());
        await updateDoc(pedidoRef, {
          cliente: datosCliente.cliente,
          telefono: datosCliente.telefono,
          fechahora: datosCliente.fechahora || fechahora,
          observaciones: datosCliente.observaciones,
          pagado: datosCliente.pagado,
          celiaco: datosCliente.celiaco,
          productos: cart.map((item) => ({
            id: item.id_product,
            nombre: item.name || "",
            cantidad: item.cantidad || 1,
            alias: item.alias,
            observaciones: datosCliente.observaciones || "",
            celiaco: item.celiaco,
            tostado: item.tostado,
            salsa: item.sinsalsa,
            extrasalsa: item.extrasalsa,
            entregado: item.entregado || 0,
            troceado: item.troceado,
            categoria: item.categoria || "No",
            precio: (item.price || 0).toFixed(2),
            total: ((item.price || 0) * (item.cantidad || 1)).toFixed(2),
          })),
          total_pedido: cart
            .reduce((acc, item) => acc + (item.price * item.cantidad || 0), 0)
            .toFixed(2),
          fechahora_modificado:
            new Date().toLocaleDateString("es-ES") +
            " " +
            new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        });
        console.log("Pedido actualizado con éxito");
      } else {
        // Crear pedido nuevo (lógica que ya tienes)
        const nextId = await getNextId();
        const clienteData = sanitizeClientData(datosCliente);
        if (!clienteData.telefono) {
          console.error("El teléfono del cliente es obligatorio");
          return;
        }
        const pedidoData = {
          NumeroPedido: nextId,
          cliente: clienteData.cliente || "",
          telefono: clienteData.telefono || "",
          fechahora: clienteData.fechahora || fechahora,
          observaciones: clienteData.observaciones || "",
          pagado: clienteData.pagado || false,
          empleado: "",
          origen: 0,
          productos: cart.map((item) => ({
            id: item.id_product,
            nombre: item.name || "",
            cantidad: item.cantidad || 1,
            alias: item.alias,
            observaciones: clienteData.observaciones || "",
            celiaco: item.celiaco,
            tostado: item.tostado,
            salsa: item.sinsalsa,
            extrasalsa: item.extrasalsa,
            entregado: item.entregado || 0,
            troceado: item.troceado,
            categoria: item.categoria || "No",
            precio: (item.price || 0).toFixed(2),
            total: ((item.price || 0) * (item.cantidad || 1)).toFixed(2),
          })),
          total_pedido: cart
            .reduce((acc, item) => acc + (item.price * item.cantidad || 0), 0)
            .toFixed(2),
          fechahora_realizado:
            new Date().toLocaleDateString("es-ES") +
            " " +
            new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        };

        await setDoc(doc(db, "pedidos", nextId.toString()), {
          ...pedidoData,
          idCliente: clienteData.telefono,
        });
        console.log("Pedido guardado con éxito");
      }

      // Actualizar stock de productos (con tus condicionales para cada tipo)
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 1) {
            return updateStock(item.id_product, item.cantidad || 1);
          } else {
            return Promise.resolve();
          }
        })
      );
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 2) {
            const cantidadDeMediosPollos = item.cantidad || 1;
            const cantidadDePollosEnteros = cantidadDeMediosPollos / 2;
            return updateStock(1, cantidadDePollosEnteros);
          } else {
            return Promise.resolve();
          }
        })
      );
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 41) {
            return updateStock(item.id_product, item.cantidad || 1);
          } else {
            return Promise.resolve();
          }
        })
      );
      await Promise.all(
        cart.map((item) => {
          if (item.id_product === 48) {
            const cantidadDeMediaCostilla = item.cantidad || 1;
            const cantidadDeCostillaEntera = cantidadDeMediaCostilla / 2;
            return updateStock(41, cantidadDeCostillaEntera);
          } else {
            return Promise.resolve();
          }
        })
      );

      // Actualizar calendarios según productos
      const polloItem = cart.find(
        (item) => item.id_product === 1 || item.id_product === 2
      );
      if (polloItem) {
        const cantidadPollo = polloItem.cantidad || 1;
        await updateChickenCalendarPollo(datosCliente.fechahora || fechahora, cantidadPollo);
      }

      const costillaItems = cart.filter(
        (item) => item.id_product === 41 || item.id_product === 48
      );
      if (costillaItems.length > 0) {
        let cantidadCostilla = 0;
        costillaItems.forEach((p) => {
          if (p.id_product === 41) {
            cantidadCostilla += p.cantidad;
          } else if (p.id_product === 48) {
            cantidadCostilla += p.cantidad / 2;
          }
        });
        await updateCostillaCalendar(datosCliente.fechahora || fechahora, cantidadCostilla);
      }

      const codilloItems = cart.filter(
        (p) => p.name.toLowerCase().includes("codillo") || p.id_product === 50
      );
      if (codilloItems.length > 0) {
        const cantidadCodillo = codilloItems.reduce((sum, p) => sum + p.cantidad, 0);
        await updateCodilloCalendar(datosCliente.fechahora || fechahora, cantidadCodillo);
      }

      // Limpiar carrito y datos de cliente
      setCart([]);
      setDatosCliente({
        cliente: "",
        telefono: "",
        fechahora: "",
        observaciones: "",
        pagado: false,
        celiaco: false,
        localidad: "",
      });

      navigate("/ordenes");
    } catch (error) {
      console.error("Error al guardar el pedido:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return cart.length > 0 ? (
    <>
      <div className="flex justify-end p-[0.5vw]">
        <a
          href="#"
          className="inline-flex items-center text-2xl font-extrabold text-gray-600 hover:underline dark:text-gray-400"
        >
          <span className="text-end">{total.toFixed(2)} €</span>
        </a>
      </div>

      <div className="flex text-center justify-center items-center">
        <button
          onClick={() => sendToFirestore({ confirmado: false })}
          className="mt-[2vw] w-[10vw] tracking-wide bg-[#f2ac02] text-white py-[0.95vw] rounded-lg hover:bg-yellow-600 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none"
        >
          {/* Aquí puedes incluir un ícono SVG */}
          <span className="ml-[0.5vw] font-nunito text-md">
            {orderToEdit ? "Actualizar Pedido" : "Generar Pedido"}
          </span>
        </button>
      </div>

      <Modal show={showModal2} onHide={handleCloseModal2} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center">
          <div className="p-2">
            {/* SVG para error */}
          </div>
          <div>
            <h1 className="font-nunito text-xl p-2 text-center text-[#808b96]">{mensajeModal}</h1>
          </div>
        </Modal.Body>
        <Modal.Footer className="no-border">
          <Button
            variant="primary"
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-2 font-nunito"
            onClick={handleCloseModal2}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModal} onHide={handleCloseModal} size="md" backdrop="static" keyboard={false} centered>
        <Modal.Body className="flex flex-col items-center">
          <div className="p-2">
            {/* SVG para validación */}
          </div>
          <div>
            <h1 className="font-nunito text-xl p-2 text-center text-[#808b96]">{mensajeModal}</h1>
          </div>
        </Modal.Body>
        <Modal.Footer className="no-border p-4">
          <Button
            variant="secondary"
            className="p-3 bg-white font-nunito text-red-500 border-red-500 hover:text-red-600 hover:border-red-600"
            onClick={handleCloseModal}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await sendToFirestore({ confirmado: true });
            }}
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito"
          >
            Continuar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  ) : (
    <h1></h1>
  );
};

export default CartTotal;
