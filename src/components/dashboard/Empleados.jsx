import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import LGDashboard from "./LGDashboard";
import { Modal } from "react-bootstrap";
import CrearEmpleado from "./CrearEmpleado"; // asegúrate de que CrudEmpleados acepta props

const ListadoEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);

  useEffect(() => {
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const snapshot = await getDocs(collection(db, "empleados"));
      const empleadosList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmpleados(empleadosList);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await deleteDoc(doc(db, "empleados", id));
      setMensaje("Empleado eliminado con éxito.");
      fetchEmpleados();
    } catch (error) {
      console.error("Error al eliminar empleado:", error);
      setMensaje("Error al eliminar empleado.");
    }
  };

  const handleEditar = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setModoEdicion(true);
    setShowModal(true);
  };

  const handleCrear = () => {
    setEmpleadoSeleccionado(null);
    setModoEdicion(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    fetchEmpleados(); // refrescar lista tras crear/editar
  };

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(""), 3000); // Limpia el mensaje en 3 segundos
      return () => clearTimeout(timer); // Limpia el timer si el componente se desmonta antes
    }
  }, [mensaje]);

  return (
    <>
      
      <div className="max-w-4xl mx-auto p-2">
        <h2 className="text-2xl font-nunito font-extrabold text-gray-600 text-center ">Listado de Empleados</h2>
        <p className="text-gray-500 text-center mb-6 font-nunito">Gestiona la creación o eliminación de empleados y sus roles.</p>

        {mensaje && (
          <p className="text-sm text-center mb-4 text-red-500">{mensaje}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 ">
          {empleados.map((empleado) => (
            <div
            key={empleado.id}
            className={`bg-white p-4 rounded-lg border-2 ${
              empleado.rol === "jefe" ? "border-gray-700" : "border-green-700"
            } shadow-md`}
          >
            <div className="flex items-center justify-center mb-4 ">
              <div
                className={`w-16 h-16 rounded-full bg-${
                  empleado.rol === "admin"
                    ? "blue"
                    : empleado.rol === "empleado"
                    ? "green"
                    : "gray"
                }-700 text-white flex items-center justify-center`}
              >
                  <span className="text-xl">{empleado.nombre.charAt(0)}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-center">{empleado.nombre}</h3>
              <p className="text-sm text-center text-gray-600">{empleado.rol}</p>
              <div className="mt-4 flex justify-between items-center gap-2 -ms-[0.9vw]">
              <button
                onClick={() => handleEditar(empleado)}
                className="px-3 py-1 text-sm bg-white border-1 border-yellow-500 text-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 hover:text-yellow-600  rounded shadow-md"
              >
                Editar
              </button>
                <button
                  onClick={() => handleEliminar(empleado.id)}
                  className="px-3 py-1 text-sm bg-white text-red-500 border-1 border-red-500 hover:text-red-700 hover:border-red-700 rounded shadow-md"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex justify-center mt-5">
        <button
            onClick={handleCrear}
            className="p-2 py-2 px-3 flex items-center gap-2 bg-[#f2ac02] border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 text-white rounded font-nunito"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Empleado
          </button>
        </div>
      </div>

      {/* Modal Bootstrap */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="md">
        
        <Modal.Body>
          <div className="p-3 flex justify-center text-2xl font-nunito text-gray-600">
          <h1>{modoEdicion ? "Editar Empleado" : "Crear Empleado"}</h1>
          </div>
         
          <CrearEmpleado
            modoEdicion={modoEdicion}
            empleadoEditar={empleadoSeleccionado}
            onClose={handleCloseModal}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ListadoEmpleados;
