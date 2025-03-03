// ListadoEmpleados.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

const ListadoEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmpleados();
  }, []);

  // Obtener todos los empleados desde Firestore
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

  // Eliminar un empleado
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

  // Editar: redirige al formulario enviando los datos del empleado
  const handleEditar = (empleado) => {
    navigate("/dashboard/crearempleado", { state: { empleado, modo: "editar" } });
  };

  // Crear: redirige al formulario en modo creación
  const handleCrear = () => {
    navigate("/dashboard/crearempleado", { state: { modo: "crear" } });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-3xl font-semibold text-center mb-6">
        Listado de Empleados
      </h2>
      <div className="mb-4 text-right">
        <button
          onClick={handleCrear}
          className="px-4 py-2 bg-[#f2ac02] text-white rounded-md hover:bg-yellow-600"
        >
          Crear Empleado
        </button>
      </div>
      {mensaje && (
        <p className="text-sm text-center mb-4 text-green-600">{mensaje}</p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Nombre</th>
              <th className="py-2 px-4 border-b">Rol</th>
              <th className="py-2 px-4 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((empleado) => (
              <tr key={empleado.id} className="text-center">
                <td className="py-2 px-4 border-b">{empleado.nombre}</td>
                <td className="py-2 px-4 border-b">{empleado.rol}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleEditar(empleado)}
                    className="mr-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(empleado.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {empleados.length === 0 && (
              <tr>
                <td colSpan="3" className="py-4">
                  No hay empleados registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListadoEmpleados;
