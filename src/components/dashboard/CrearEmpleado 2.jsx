// CrudEmpleados.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useLocation } from "react-router-dom";

const CrudEmpleados = () => {
  const location = useLocation();
  const empleadoEditar = location.state?.empleado || null;
  const modoEdicion = location.state?.modo === "editar";

  const [empleado, setEmpleado] = useState({
    // id_empleado se genera automáticamente en creación
    nombre: "",
    pin: "",
    rol: "empleado", // Valor por defecto
  });
  const [mensaje, setMensaje] = useState("");

  // Si está en modo edición, precargar los datos del empleado
  useEffect(() => {
    if (modoEdicion && empleadoEditar) {
      setEmpleado({
        nombre: empleadoEditar.nombre || "",
        pin: empleadoEditar.pin || "",
        rol: empleadoEditar.rol || "empleado",
      });
    }
  }, [modoEdicion, empleadoEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpleado({ ...empleado, [name]: value });
  };

  // Función para obtener un nuevo ID basado en la cantidad de documentos existentes
  const obtenerNuevoID = async () => {
    const snapshot = await getDocs(collection(db, "empleados"));
    // Se suma 1 al tamaño actual para generar un nuevo ID
    return (snapshot.size + 1).toString();
  };

  // Guardar o actualizar el empleado en Firestore
  const guardarEmpleado = async (id) => {
    const empleadoFinal = {
      id_empleado: id,
      nombre: empleado.nombre,
      pin: empleado.pin,
      rol: empleado.rol,
    };

    try {
      await setDoc(doc(db, "empleados", id), empleadoFinal);
      setMensaje(
        modoEdicion
          ? "Empleado actualizado con éxito."
          : "Empleado creado con éxito."
      );
      if (!modoEdicion) {
        setEmpleado({
          nombre: "",
          pin: "",
          rol: "empleado",
        });
      }
    } catch (error) {
      console.error("Error al guardar el empleado:", error);
      setMensaje("Error al guardar el empleado.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = modoEdicion && empleadoEditar?.id_empleado
      ? empleadoEditar.id_empleado
      : await obtenerNuevoID();
    guardarEmpleado(id);
  };

  const camposCompletos = () => {
    return empleado.nombre && empleado.pin && empleado.rol;
  };

  return (
    <div className="max-w-2xl mx-auto p-8 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center mb-6">
        {modoEdicion ? "Editar Empleado" : "Crear Empleado"}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              type="text"
              name="nombre"
              value={empleado.nombre}
              onChange={handleChange}
              className={`w-full px-4 py-2 mt-1 border ${
                !empleado.nombre ? "border-red-500" : "border-gray-300"
              } rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
              placeholder="Nombre del empleado"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              PIN
            </label>
            <input
              type="text"
              name="pin"
              value={empleado.pin}
              onChange={handleChange}
              className={`w-full px-4 py-2 mt-1 border ${
                !empleado.pin ? "border-red-500" : "border-gray-300"
              } rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
              placeholder="PIN del empleado"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <select
              name="rol"
              value={empleado.rol}
              onChange={handleChange}
              className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="empleado">Empleado</option>
              <option value="jefe">Jefe</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!camposCompletos()}
          className="w-full py-3 mt-6 bg-[#f2ac02] text-white rounded-md hover:bg-yellow-600"
        >
          {modoEdicion ? "Editar Empleado" : "Crear Empleado"}
        </button>
      </form>

      {mensaje && (
        <p className="text-sm text-gray-700 mt-2 text-center">{mensaje}</p>
      )}
    </div>
  );
};

export default CrudEmpleados;
