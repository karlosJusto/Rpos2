import React, { useState } from "react";
import { storage, db } from "../firebase/firebase"; // Asumiendo que tienes una configuración de Firebase
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";






const CrearProductos = () => {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagen, setImagen] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState("");

  // Manejar la carga de la imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
    }
  };

  // Subir imagen a Firebase Storage
  const subirImagen = async () => {
    if (!imagen) {
      setMensaje("Por favor selecciona una imagen.");
      return;
    }

    const storageRef = ref(storage, `productos/${imagen.name}`);
    const uploadTask = uploadBytesResumable(storageRef, imagen);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progreso = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgreso(progreso);
      },
      (error) => {
        setMensaje("Error al subir la imagen.");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setMensaje("Imagen subida con éxito.");
          // Guardar el URL de la imagen
          guardarProducto(downloadURL);
        });
      }
    );
  };

  // Guardar el producto en la base de datos
  const guardarProducto = async (imageUrl) => {
    try {
      await addDoc(collection(db, "productos"), {
        nombre,
        precio,
        categoria,
        imagenUrl: imageUrl,
      });
      setMensaje("Producto creado con éxito.");
      resetFormulario();
    } catch (error) {
      setMensaje("Error al crear el producto.");
    }
  };

  // Resetear el formulario
  const resetFormulario = () => {
    setNombre("");
    setPrecio("");
    setCategoria("");
    setImagen(null);
  };

  return (
    <div className="max-w-xl mx-auto p-6 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center mb-6">Crear Producto</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Nombre del producto"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Precio</label>
        <input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          placeholder="Precio"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Categoría</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">Seleccionar categoría</option>
          <option value="comida">Comida</option>
          <option value="bebidas">Bebidas</option>
          <option value="postres">Postres</option>
          <option value="complementos">Complementos</option>
          <option value="extras">Extras</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
        <input
          type="file"
          onChange={handleImageChange}
          className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md"
        />
      </div>
      {imagen && (
        <div className="mb-4">
          <p>Imagen seleccionada: {imagen.name}</p>
        </div>
      )}
      <div className="mb-4">
        <button
          onClick={subirImagen}
          className="w-full py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500"
        >
          Crear Producto
        </button>
      </div>

      {progreso > 0 && (
        <div className="mb-4">
          <p>Progreso: {Math.round(progreso)}%</p>
        </div>
      )}
      {mensaje && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-700">{mensaje}</p>
        </div>
      )}
    </div>
  );
};

export default CrearProductos;
