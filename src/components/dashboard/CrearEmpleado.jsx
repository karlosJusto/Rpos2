// src/components/dashboard/CrearEmpleado.jsx
import React, { useState, useEffect } from "react";
// *** ASEGÚRATE DE IMPORTAR query y where ***
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { Button, Form } from "react-bootstrap";

const CreaEmpleado = ({ modoEdicion, empleadoEditar, onClose }) => {
  const [empleado, setEmpleado] = useState({ nombre: "", pin: "", rol: "empleado" });
  const [mensaje, setMensaje] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Carga datos si estamos en modo edición y hay un empleado para editar
    if (modoEdicion && empleadoEditar) {
      setEmpleado({
        nombre: empleadoEditar.nombre || "",
        pin: empleadoEditar.pin || "",
        rol: empleadoEditar.rol || "empleado",
      });
      setMensaje("");
      setMostrarPin(false);
    } else {
      // Resetea si no es modo edición
      setEmpleado({ nombre: "", pin: "", rol: "empleado" });
      setMensaje("");
      setMostrarPin(false);
    }
  }, [modoEdicion, empleadoEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "pin") {
      const numericValue = value.replace(/[^0-9]/g, '');
      if (numericValue.length <= 5) {
        setEmpleado({ ...empleado, [name]: numericValue });
      }
    } else {
      setEmpleado({ ...empleado, [name]: value });
    }
    setMensaje("");
  };

  const guardarEmpleado = async () => {
    setIsSaving(true);
    setMensaje("");

    // Validaciones
    if (!empleado.nombre.trim()) {
      setMensaje("El nombre no puede estar vacío.");
      setIsSaving(false);
      return;
    }
    if (!empleado.pin || empleado.pin.length !== 5) {
      setMensaje("El PIN debe tener exactamente 5 dígitos numéricos.");
      setIsSaving(false);
      return;
    }

    try {
      // Verifica si el PIN ya existe
      const q = query(collection(db, "empleados"), where("pin", "==", empleado.pin));
      const querySnapshot = await getDocs(q);

      let pinDuplicado = false;
      querySnapshot.forEach((docSnap) => {
        // Es duplicado si:
        // 1. Estamos editando Y el documento encontrado NO es el que estamos editando.
        // 2. Estamos creando Y se encontró algún documento.
        if ((modoEdicion && empleadoEditar && docSnap.id !== empleadoEditar.id) || !modoEdicion) {
          pinDuplicado = true;
        }
      });

      if (pinDuplicado) {
        setMensaje("El PIN ya está en uso por otro empleado. Introduce uno diferente.");
        setIsSaving(false);
        return;
      }

      // Datos a guardar
      const datosEmpleado = {
        nombre: empleado.nombre.trim(),
        pin: empleado.pin,
        rol: empleado.rol,
      };

      if (modoEdicion && empleadoEditar) {
        // --- MODO EDICIÓN ---
        // Verifica que tengamos un ID para editar
        if (!empleadoEditar.id) {
           console.error("Error: Falta el ID del empleado en modo edición.", empleadoEditar);
           setMensaje("Error interno: No se pudo identificar al empleado a editar.");
           setIsSaving(false);
           return;
        }
        const empleadoDocRef = doc(db, "empleados", empleadoEditar.id);
        await updateDoc(empleadoDocRef, datosEmpleado);
        setMensaje("Empleado actualizado con éxito.");

      } else {
        // --- MODO CREACIÓN ---
        const snapshot = await getDocs(collection(db, "empleados"));
        // Filtra IDs no numéricos antes de calcular el máximo
        const existingIds = snapshot.docs
            .map(doc => parseInt(doc.id, 10))
            .filter(id => !isNaN(id)); // Asegura que solo consideramos números válidos
        const nuevoIdNumerico = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        const nuevoId = nuevoIdNumerico.toString();

        // Opcional: Guarda el ID dentro del documento si tu lógica lo requiere
        // datosEmpleado.id_empleado = nuevoId;

        const nuevoEmpleadoDocRef = doc(db, "empleados", nuevoId);
        await setDoc(nuevoEmpleadoDocRef, datosEmpleado);
        setMensaje("Empleado creado con éxito.");
        // Limpia formulario tras crear
        setEmpleado({ nombre: "", pin: "", rol: "empleado" });
      }

      // Cierra el modal tras un breve retraso
      setTimeout(() => {
        if (onClose) onClose(); // Llama a la función del padre para cerrar
      }, 1500);

    } catch (error) {
      // *** Muestra el error específico en la consola ***
      console.error("Error detallado al guardar el empleado:", error);
      // Mensaje genérico para el usuario, pero el error detallado está en consola
      setMensaje(`Error al guardar: ${error.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setIsSaving(false); // Reactiva el botón en cualquier caso
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    guardarEmpleado();
  };

  const camposCompletos = () => empleado.nombre.trim() && empleado.pin && empleado.pin.length === 5 && empleado.rol;

  // --- Renderiza SOLO el Formulario ---
  return (
    <Form onSubmit={handleSubmit}>
      {/* Grupo Nombre */}
      <Form.Group className="mb-3">
        <Form.Label className="text-md font-nunito ms-2 font-extrabold text-gray-600">Nombre</Form.Label>
        <Form.Control
          type="text"
          name="nombre"
          value={empleado.nombre}
          onChange={handleChange}
          placeholder="Nombre del empleado"
          required
          disabled={isSaving}
        />
      </Form.Group>

      {/* Grupo PIN */}
      <Form.Group className="mb-3">
        <Form.Label className="text-md font-nunito ms-2 font-extrabold text-gray-600">PIN (5 dígitos numéricos)</Form.Label>
        <div className="position-relative">
          <Form.Control
            type={mostrarPin ? "text" : "password"}
            name="pin"
            value={empleado.pin}
            onChange={handleChange}
            placeholder="PIN del empleado"
            maxLength={5}
            pattern="\d{5}"
            required
            disabled={isSaving}
          />
          {/* Botón para mostrar/ocultar PIN */}
          <Button
            variant="link"
            onClick={() => setMostrarPin(!mostrarPin)}
            className="position-absolute end-0 top-50 translate-middle-y pe-3 text-muted border-0 bg-transparent"
            style={{ zIndex: 5 }}
            type="button"
            aria-label={mostrarPin ? "Ocultar PIN" : "Mostrar PIN"}
            disabled={isSaving}
          >
            {/* Iconos SVG (sin cambios) */}
            {mostrarPin ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            )}
          </Button>
        </div>
      </Form.Group>

      {/* Grupo Rol */}
      <Form.Group className="mb-3">
        <Form.Label className="text-md font-nunito ms-2 font-extrabold text-gray-600">Role</Form.Label>
        <Form.Select
          name="rol"
          value={empleado.rol}
          onChange={handleChange}
          disabled={isSaving}
        >
          <option value="empleado">Empleado</option>
          <option value="jefe">Jefe</option>
        </Form.Select>
      </Form.Group>

      {/* Mensaje de estado/error */}
      {mensaje && (
        // Ajusta la clase de color si el mensaje es de PIN duplicado
        <div className={`text-center small mb-3 ${mensaje.includes("Error") || mensaje.includes("uso") ? 'text-danger' : 'text-success'}`}>
          {mensaje}
        </div>
      )}

      {/* Botones del formulario */}
      <div className="d-flex justify-content-center gap-5 p-4">
        <Button variant="secondary" onClick={onClose} disabled={isSaving} className="text-red-500 bg-white border-1 border-red-500 hover:text-red-700 hover:border-red-700 rounded shadow-md">
          Cancelar
        </Button>
        <Button className="text-md font-nunito ms-2 bg-white border-1 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 hover:text-yellow-600 rounded text-yellow-500 shadow-md"
          type="submit"
          variant="warning"
          disabled={!camposCompletos() || isSaving}
        >
          {isSaving ? 'Guardando...' : (modoEdicion ? "Guardar " : "Crear Empleado")}
        </Button>
      </div>
    </Form>
  );
};

export default CreaEmpleado;
