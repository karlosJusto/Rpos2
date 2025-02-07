import React, { useState } from "react";
import { storage, db } from "../firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import ImageCropper from "./ImageCropper"; // Asegúrate de que la ruta sea la correcta

const CrearProductos = () => {
  const [producto, setProducto] = useState({
    nombre: "",
    categoria: "",
    precio: "",
    visible: false,
    descripcionBreve: "",
    descripcion: "",
    celiaco: false,
    vegetariano: false,
    vegano: false,
    freidora: false,
    productoDoble: false,
    mediaRacion: false,
    sabores: false,
    imagen: null,
    imagenRpos: null,
  });
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [cropModal, setCropModal] = useState({ open: false, field: "", imageSrc: "" });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setProducto({ ...producto, [name]: type === "checkbox" ? checked : value });
  };

  // Modificamos handleImageChange para abrir el modal de recorte
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convertir a URL para poder mostrarla en el cropper
      const imageSrc = URL.createObjectURL(file);
      setCropModal({ open: true, field: e.target.name, imageSrc });
    }
  };

  // Función para recibir la imagen recortada
  const handleCropComplete = (croppedFile) => {
    // Se guarda el archivo recortado en el campo correspondiente
    setProducto({ ...producto, [cropModal.field]: croppedFile });
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  const handleCropCancel = () => {
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  // Función para obtener el nuevo ID basado en la cantidad de documentos existentes
  const obtenerNuevoID = async () => {
    const productosSnapshot = await getDocs(collection(db, "productos"));
    return productosSnapshot.size + 100;
  };

  // Función para subir las imágenes y luego guardar el producto en Firestore
  const subirImagenes = async () => {
    if (!producto.imagen || !producto.imagenRpos) {
      setMensaje("Por favor selecciona y recorta ambas imágenes.");
      return;
    }

    try {
      const nuevoID = await obtenerNuevoID();
      const urls = {};
      const imagenes = ["imagen", "imagenRpos"];

      for (const img of imagenes) {
        const folder = img === "imagen" ? "imagenes_sinfondo" : "imagenes";
        const storageRef = ref(storage, `${folder}/${nuevoID}`);
        const uploadTask = uploadBytesResumable(storageRef, producto[img]);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              setProgreso((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            },
            (error) => reject(error),
            async () => {
              urls[img] = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      guardarProducto(urls.imagen, urls.imagenRpos, nuevoID);
    } catch (error) {
      console.error(error);
      setMensaje("Error al obtener el ID o subir las imágenes.");
    }
  };

  const guardarProducto = async (imagenUrl, imagenRposUrl, id) => {
    const fullPrice = producto.precio ? Number(producto.precio) : 0;
    const computedHalfPrice = fullPrice ? fullPrice - 6 : 0;

    const productoFinal = {
      categoria: producto.categoria,
      description: producto.descripcion,
      description_half: producto.descripcionBreve,
      gluten_free: producto.celiaco ? "1" : "0",
      half: producto.mediaRacion ? 1 : 0,
      half_price: computedHalfPrice,
      id_product: id,
      imagen: imagenUrl,
      imagen_rpos: imagenRposUrl,
      name: producto.nombre,
      position: id,
      price: fullPrice,
      sabores: producto.sabores ? "1" : "",
      stock: 0,
      vegan: producto.vegano ? "1" : "",
      vegetarian: producto.vegetariano ? "1" : "",
      visible: producto.visible ? 1 : 0,
    };

    try {
      await setDoc(doc(db, "productos", id.toString()), productoFinal);
      setMensaje("Producto creado con éxito.");
      setProducto({
        nombre: "",
        categoria: "",
        precio: "",
        visible: false,
        descripcionBreve: "",
        descripcion: "",
        celiaco: false,
        vegetariano: false,
        vegano: false,
        freidora: false,
        productoDoble: false,
        mediaRacion: false,
        sabores: false,
        imagen: null,
        imagenRpos: null,
      });
    } catch (error) {
      console.error("Error al crear el producto:", error);
      setMensaje("Error al crear el producto.");
    }
  };

  // Función para comprobar si los campos están completos
  const camposCompletos = () => {
    return (
      producto.nombre &&
      producto.categoria &&
      producto.precio &&
      producto.descripcionBreve &&
      producto.descripcion &&
      producto.imagen &&
      producto.imagenRpos
    );
  };

  // Función para verificar si un campo está vacío
  const esCampoVacio = (campo) => !producto[campo] && campo !== "sabores"; // "sabores" no es obligatorio

  return (
    <div className="max-w-5xl mx-auto p-8 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center mb-6">Crear Producto</h2>

      {/* Sección de imágenes */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {["imagen", "imagenRpos"].map((img, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-48 h-48 bg-gray-100 border border-gray-300 flex items-center justify-center">
              {producto[img] ? (
                <img
                  src={URL.createObjectURL(producto[img])}
                  alt={img}
                  className="object-cover w-full h-full"
                />
              ) : (
                <img
                  src={`https://cdn.pixabay.com/photo/2014/06/03/19/38/board-361516_1280.jpg?text=${img === "imagen" ? "Portada" : "Contraportada"}`}
                  alt="Demo"
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <label className="mt-2 inline-block px-4 py-2 bg-yellow-500 text-white rounded-md cursor-pointer hover:bg-yellow-600">
              Cambiar Imagen
              <input
                type="file"
                name={img}
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={producto.nombre}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${esCampoVacio("nombre") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder="Nombre del producto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <select
            name="categoria"
            value={producto.categoria}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${esCampoVacio("categoria") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          >
            <option value="">Seleccionar</option>
            <option value="comida">Comida</option>
            <option value="bebida">Bebida</option>
            <option value="postre">Postre</option>
            <option value="extra">Extra</option>
          </select>
        </div>
      </div>

      {/* Precio */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Precio</label>
        <input
          type="number"
          name="precio"
          value={producto.precio}
          onChange={handleChange}
          className={`w-full px-4 py-2 mt-1 border ${esCampoVacio("precio") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          placeholder="Precio del producto"
        />
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {["visible", "celiaco", "vegetariano", "vegano", "freidora", "productoDoble", "mediaRacion", "sabores"].map((campo) => (
          <label key={campo} className="flex items-center space-x-2">
            <input
              type="checkbox"
              name={campo}
              checked={producto[campo]}
              onChange={handleChange}
              className="h-5 w-5 text-yellow-500"
            />
            <span className="text-sm text-gray-700">
              {campo.charAt(0).toUpperCase() + campo.slice(1)}
            </span>
          </label>
        ))}
      </div>

      {/* Descripciones */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción Breve</label>
          <textarea
            name="descripcionBreve"
            value={producto.descripcionBreve}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${esCampoVacio("descripcionBreve") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="descripcion"
            value={producto.descripcion}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${esCampoVacio("descripcion") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          />
        </div>
      </div>

      <button
        onClick={subirImagenes}
        className="w-full py-3 mt-6 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        disabled={!camposCompletos()}
      >
        Crear Producto
      </button>

      {mensaje && <p className="text-sm text-gray-700 mt-2 text-center">{mensaje}</p>}

      {/* Modal de recorte */}
      {cropModal.open && (
        <ImageCropper
          imageSrc={cropModal.imageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default CrearProductos;
