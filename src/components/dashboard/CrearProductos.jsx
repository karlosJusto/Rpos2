// CrearProductos.jsx
import React, { useState, useEffect } from "react";
import { storage, db } from "../firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import ImageCropper from "./ImageCropper"; // Asegúrate de que la ruta sea la correcta

const CrearProductos = () => {
  const location = useLocation();
  const productoEditar = location.state?.producto || null;
  const modoEdicion = location.state?.modo === "editar";

  const [producto, setProducto] = useState({
    nombre: "",
    alias: "",
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
    cocina: false,
    promocion: false,
    imagen: null,
    imagenRpos: null,
  });
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [cropModal, setCropModal] = useState({ open: false, field: "", imageSrc: "" });

  // Cargar datos del producto si se está en modo edición
  useEffect(() => {
    if (modoEdicion && productoEditar) {
      setProducto({
        nombre: productoEditar.name || "",
        alias: productoEditar.alias || "",
        categoria: productoEditar.categoria || "",
        precio: productoEditar.price || "",
        visible: productoEditar.visible === 1,
        descripcionBreve: productoEditar.description_half || "",
        descripcion: productoEditar.description || "",
        celiaco: productoEditar.gluten_free === "1",
        vegetariano: productoEditar.vegetarian === "1",
        vegano: productoEditar.vegan === "1",
        freidora: false, // Ajusta si tienes este campo en la base
        productoDoble: false,
        mediaRacion: productoEditar.half ? true : false,
        sabores: productoEditar.sabores === "1",
        cocina: productoEditar.cocina === "1",
        promocion: productoEditar.promocion === "1",
        imagen: productoEditar.imagen || null,
        imagenRpos: productoEditar.imagen_rpos || null,
      });
    }
  }, [modoEdicion, productoEditar]);

  // Manejo de cambios en los inputs
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setProducto({ ...producto, [name]: newValue });
  };

  // Formatea el precio a 2 decimales con punto (ej. "12.00")
  const handlePriceBlur = (e) => {
    let value = e.target.value;
    if (value) {
      const numberValue = parseFloat(value);
      if (!isNaN(numberValue)) {
        const formatted = numberValue.toFixed(2);
        setProducto({ ...producto, precio: formatted });
      }
    }
  };

  // Abre el modal para recortar imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageSrc = URL.createObjectURL(file);
      setCropModal({ open: true, field: e.target.name, imageSrc });
    }
  };

  // Recibe la imagen recortada
  const handleCropComplete = (croppedFile) => {
    setProducto({ ...producto, [cropModal.field]: croppedFile });
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  const handleCropCancel = () => {
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  // Obtiene nuevo ID para el producto en modo creación
  const obtenerNuevoID = async () => {
    const productosSnapshot = await getDocs(collection(db, "productos"));
    let maxId = 0;
    productosSnapshot.forEach((doc) => {
      const data = doc.data();
      const currentId = parseInt(data.id_product, 10);
      if (currentId > maxId) {
        maxId = currentId;
      }
    });
    return maxId + 1;
  };

  // Verifica que los campos obligatorios estén completos
  const camposCompletos = () =>
    producto.nombre &&
    producto.categoria &&
    producto.precio &&
    producto.descripcionBreve &&
    producto.descripcion &&
    producto.imagen &&
    producto.imagenRpos;

  // Se ejecuta al presionar el botón
  const handleSubmit = () => {
    if (!camposCompletos()) {
      setMensaje("Por favor, completa todos los campos obligatorios.");
      return;
    }
    subirImagenes();
  };

  // Sube las imágenes y luego guarda/actualiza el producto en Firestore
  const subirImagenes = async () => {
    if (!producto.imagen || !producto.imagenRpos) {
      setMensaje("Por favor, selecciona y recorta ambas imágenes.");
      return;
    }

    try {
      let id;
      if (modoEdicion && productoEditar) {
        id = productoEditar.id_product;
      } else {
        id = await obtenerNuevoID();
      }
      const urls = {};
      const imagenes = ["imagen", "imagenRpos"];

      for (const img of imagenes) {
        if (producto[img] instanceof File) {
          const folder = img === "imagen" ? "imagenes_sinfondo" : "imagenes";
          const storageRef = ref(storage, `${folder}/${id}`);
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
        } else {
          urls[img] = producto[img];
        }
      }

      guardarProducto(urls.imagen, urls.imagenRpos, id);
    } catch (error) {
      console.error(error);
      setMensaje("Error al obtener el ID o subir las imágenes.");
    }
  };

  const guardarProducto = async (imagenUrl, imagenRposUrl, id) => {
    const fullPrice = producto.precio ? parseInt(parseFloat(producto.precio)) : 0;
    const computedHalfPrice = fullPrice ? fullPrice - 6 : 0;

    const productoFinal = {
      categoria: producto.categoria ? producto.categoria.toLowerCase() : "",
      description: producto.descripcion,
      description_half: producto.descripcionBreve,
      gluten_free: producto.celiaco ? "1" : "0",
      half: producto.mediaRacion ? 1 : 0,
      half_price: computedHalfPrice,
      id_product: id,
      imagen: imagenUrl,
      imagen_rpos: imagenRposUrl,
      name: producto.nombre,
      alias: producto.alias,
      position: id,
      price: fullPrice,
      sabores: producto.sabores ? "1" : "",
      stock: 0,
      vegan: producto.vegano ? "1" : "",
      vegetarian: producto.vegetariano ? "1" : "",
      visible: producto.visible ? 1 : 0,
      cocina: producto.cocina ? "1" : "0",
      promocion: producto.promocion ? "1" : "0",
    };

    try {
      await setDoc(doc(db, "productos", id.toString()), productoFinal);
      setMensaje(modoEdicion ? "Producto actualizado con éxito." : "Producto creado con éxito.");
      if (!modoEdicion) {
        setProducto({
          nombre: "",
          alias: "",
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
          cocina: false,
          promocion: false,
          imagen: null,
          imagenRpos: null,
        });
      }
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      setMensaje("Error al guardar el producto.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-2xl font-semibold text-center mb-6">
        {modoEdicion ? "Editar Producto" : "Crear Producto"}
      </h2>

      {/* Sección de imágenes */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {["imagen", "imagenRpos"].map((img, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-48 h-48 bg-gray-100 border border-gray-300 flex items-center justify-center">
              {producto[img] ? (
                typeof producto[img] === "string" ? (
                  <img src={producto[img]} alt={img} className="object-cover w-full h-full" />
                ) : (
                  <img src={URL.createObjectURL(producto[img])} alt={img} className="object-cover w-full h-full" />
                )
              ) : (
                <img
                  src={`https://cdn.pixabay.com/photo/2014/06/03/19/38/board-361516_1280.jpg?text=${img === "imagen" ? "Portada" : "Contraportada"}`}
                  alt="Demo"
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <label className="mt-2 inline-block px-4 py-2 bg-[#f2ac02] text-white rounded-md cursor-pointer">
              Cambiar Imagen
              <input type="file" name={img} accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {/* Fila 1: Nombre y Alias */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={producto.nombre}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${!producto.nombre ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder="Nombre del producto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Alias</label>
          <input
            type="text"
            name="alias"
            value={producto.alias}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${!producto.alias ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
            placeholder="Alias del producto"
          />
        </div>
      </div>

      {/* Fila 2: Categoría y Precio */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Categoría</label>
          <select
            name="categoria"
            value={producto.categoria}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${!producto.categoria ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          >
            <option value="">Seleccionar</option>
            <option value="comida">Comida</option>
            <option value="complementos">Complementos</option>
            <option value="bebida">Bebida</option>
            <option value="postre">Postre</option>
            <option value="extra">Extra</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Precio</label>
          <div className="relative">
            <input
              type="text"
              name="precio"
              value={producto.precio}
              onChange={handleChange}
              onBlur={handlePriceBlur}
              className={`w-full px-4 py-2 pr-8 mt-1 border ${!producto.precio ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
              placeholder="12.00"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resto del formulario */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción Breve</label>
          <textarea
            name="descripcionBreve"
            value={producto.descripcionBreve}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${!producto.descripcionBreve ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="descripcion"
            value={producto.descripcion}
            onChange={handleChange}
            className={`w-full px-4 py-2 mt-1 border ${!producto.descripcion ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {[
          "visible",
          "celiaco",
          "vegetariano",
          "vegano",
          "freidora",
          "productoDoble",
          "mediaRacion",
          "sabores",
          "cocina",
          "promocion",
        ].map((campo) => (
          <label key={campo} className="flex items-center space-x-2">
            <input type="checkbox" name={campo} checked={producto[campo]} onChange={handleChange} className="h-5 w-5 accent-[#f2ac02]" />
            <span className="text-sm text-gray-700">{campo.charAt(0).toUpperCase() + campo.slice(1)}</span>
          </label>
        ))}
      </div>

      <button onClick={handleSubmit} className="w-full py-3 mt-6 bg-[#f2ac02] text-white rounded-md hover:bg-yellow-600">
        {modoEdicion ? "Editar Producto" : "Crear Producto"}
      </button>

      {mensaje && <p className="text-sm text-gray-700 mt-2 text-center">{mensaje}</p>}

      {/* Modal de recorte */}
      {cropModal.open && (
        <ImageCropper imageSrc={cropModal.imageSrc} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  );
};

export default CrearProductos;
