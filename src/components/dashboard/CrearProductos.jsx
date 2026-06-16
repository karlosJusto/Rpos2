import React, { useState, useEffect } from "react";
import { storage, db } from "../firebase/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // prettier-ignore
import { collection, getDocs, doc, setDoc, query, where, deleteDoc } from "firebase/firestore"; // prettier-ignore
// import { useLocation } from "react-router-dom"; // Ya no se usa
import ImageCropper from "./ImageCropper";
import productosIcon from '../../assets/productos.png'; // Renombrado para evitar conflicto

// Constante para los nombres clave de la freidora
const FREIDORA_KEY_WORDS = ["patatas", "croquetas", "pimientos"];


// Props: productoEditarProp, modoEdicionProp, onSave, onClose
const CrearProductos = ({ productoEditarProp, modoEdicionProp, onSave, onClose }) => {
  const productoEditar = productoEditarProp;
  const modoEdicion = modoEdicionProp;

  const initialProductFormState = {
    nombre: "",
    alias: "",
    categoria: "",
    precio: "",
    visible: false,
    descripcionBreve: "",
    descripcion: "",
    celiaco: false,
    vegetariano: false,
    vegano: false, // boolean
    freidora: false, // boolean
    productoDoble: false, // boolean
    botonCeliaco: false, // boolean
    sabores: false, // boolean
    cocina: false, // boolean
    promocion: false,
    quickOrder: false,
    imagen: null,
    imagenRpos: null,
    stock: 10,
  };

  const [producto, setProducto] = useState(initialProductFormState);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState(""); // Mensaje local para el formulario
  const [cropModal, setCropModal] = useState({ open: false, field: "", imageSrc: "" });

  useEffect(() => {
    if (modoEdicion && productoEditar) {
      setProducto({
        ...initialProductFormState,
        nombre: productoEditar.name || initialProductFormState.nombre,
        alias: productoEditar.alias || initialProductFormState.alias,
        categoria: productoEditar.categoria || initialProductFormState.categoria,
        precio: productoEditar.price ? productoEditar.price.toString() : initialProductFormState.precio,
        visible: productoEditar.hasOwnProperty('visible') ? (productoEditar.visible === 1 || productoEditar.visible === "1") : initialProductFormState.visible,
        descripcionBreve: productoEditar.description_half || initialProductFormState.descripcionBreve,
        descripcion: productoEditar.description || initialProductFormState.descripcion,
        celiaco: productoEditar.hasOwnProperty('gluten_free') ? productoEditar.gluten_free === "1" : initialProductFormState.celiaco,
        vegetariano: productoEditar.hasOwnProperty('vegetarian') ? productoEditar.vegetarian === "1" : initialProductFormState.vegetariano,
        vegano: productoEditar.hasOwnProperty('vegan') ? productoEditar.vegan === "1" : initialProductFormState.vegano,
        freidora: productoEditar.hasOwnProperty('freidora') ? (productoEditar.freidora === "1" || productoEditar.freidora === true) : initialProductFormState.freidora,
        productoDoble: productoEditar.hasOwnProperty('productoDoble') ? (productoEditar.productoDoble === "1" || productoEditar.productoDoble === true) : initialProductFormState.productoDoble,
        botonCeliaco: productoEditar.hasOwnProperty('botonCeliaco') ? (productoEditar.botonCeliaco === "1" || productoEditar.botonCeliaco === true) : initialProductFormState.botonCeliaco,
        sabores: productoEditar.hasOwnProperty('sabores') ? productoEditar.sabores === "1" : initialProductFormState.sabores,
        cocina: productoEditar.hasOwnProperty('cocina') ? (productoEditar.cocina === "1" || productoEditar.cocina === true) : initialProductFormState.cocina,
        promocion: productoEditar.hasOwnProperty('promocion') ? (productoEditar.promocion === "1" || productoEditar.promocion === true) : initialProductFormState.promocion,
        quickOrder: productoEditar.hasOwnProperty('quickOrder') ? (productoEditar.quickOrder === "1" || productoEditar.quickOrder === true || String(productoEditar.quickOrder).toLowerCase() === "true") : initialProductFormState.quickOrder,
        imagen: productoEditar.imagen || initialProductFormState.imagen, // URL si ya existe
        imagenRpos: productoEditar.imagen_rpos || initialProductFormState.imagenRpos, // URL si ya existe
        stock: productoEditar.hasOwnProperty('stock') ? Number(productoEditar.stock) : initialProductFormState.stock,
      });
    } else {
      setProducto(initialProductFormState);
    }
    setMensaje(""); // Limpiar mensaje al cambiar de modo o producto
    setProgreso(0); // Resetear progreso
  }, [modoEdicion, productoEditar]);


  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    if (name === "stock") {
        if (value === "" || /^[0-9\b]+$/.test(value)) {
            newValue = value;
        } else {
            return;
        }
    }
    setProducto({ ...producto, [name]: newValue });
  };

  const handlePriceBlur = (e) => {
    let value = e.target.value;
    if (value) {
      const numberValue = parseFloat(value.replace(",", "."));
      if (!isNaN(numberValue)) {
        setProducto({ ...producto, precio: numberValue.toFixed(2) });
      } else {
        setProducto({ ...producto, precio: "" });
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCropModal({ open: true, field: e.target.name, imageSrc: URL.createObjectURL(file) });
    }
  };

  const handleCropComplete = (croppedFile) => {
    setProducto({ ...producto, [cropModal.field]: croppedFile });
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  const handleCropCancel = () => {
    setCropModal({ open: false, field: "", imageSrc: "" });
  };

  const obtenerNuevoID = async () => {
    const productosSnapshot = await getDocs(collection(db, "productos"));
    let maxId = 0;
    productosSnapshot.forEach((doc) => {
      const currentId = parseInt(doc.data().id_product, 10);
      if (!isNaN(currentId) && currentId > maxId) maxId = currentId;
    });
    return maxId + 1;
  };

  const obtenerNuevaPosicionEnCategoria = async (categoria) => {
    if (!categoria) return 1;
    const q = query(collection(db, "productos"), where("categoria", "==", categoria.toLowerCase()));
    const productosSnapshot = await getDocs(q);
    let maxPosition = 0;
    productosSnapshot.forEach((doc) => {
      const currentPosition = typeof doc.data().position === 'string' ? parseInt(doc.data().position, 10) : doc.data().position;
      if (!isNaN(currentPosition) && currentPosition > maxPosition) maxPosition = currentPosition;
    });
    return maxPosition + 1;
  };

  const camposCompletos = () =>
    producto.nombre &&
    producto.categoria &&
    producto.precio &&
    producto.descripcionBreve && // Asumiendo que descripción breve es obligatoria
    producto.descripcion &&
    (producto.imagen || (modoEdicion && productoEditar?.imagen)) &&
    (producto.imagenRpos || (modoEdicion && productoEditar?.imagen_rpos));

  const handleSubmit = () => {
    if (!camposCompletos()) {
      setMensaje("Por favor, completa todos los campos obligatorios, incluyendo ambas imágenes.");
      return;
    }
    setMensaje(modoEdicion ? "Actualizando producto..." : "Creando producto...");
    subirImagenes();
  };

  const subirImagenes = async () => {
    try {
      let idProductValue;
      let positionValue;

      if (modoEdicion && productoEditar) {
        idProductValue = productoEditar.id_product;
        positionValue = productoEditar.position;
        if (positionValue === undefined || positionValue === null) {
            console.warn("Producto en edición no tiene 'position'. Se calculará una nueva.");
            positionValue = await obtenerNuevaPosicionEnCategoria(producto.categoria);
        }
      } else {
        idProductValue = await obtenerNuevoID();
        positionValue = await obtenerNuevaPosicionEnCategoria(producto.categoria);
      }

      const urls = {
        imagen: producto.imagen instanceof File ? null : producto.imagen, // Si es string (URL), mantenerla
        imagenRpos: producto.imagenRpos instanceof File ? null : producto.imagenRpos,
      };

      const imagenesACargar = [];
      if (producto.imagen instanceof File) {
        imagenesACargar.push({ field: "imagen", file: producto.imagen, folder: "imagenes_sinfondo" });
      }
      if (producto.imagenRpos instanceof File) {
        imagenesACargar.push({ field: "imagenRpos", file: producto.imagenRpos, folder: "imagenes" });
      }

      for (const imgData of imagenesACargar) {
        const storageRef = ref(storage, `${imgData.folder}/${idProductValue}`);
        const uploadTask = uploadBytesResumable(storageRef, imgData.file);
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", (snapshot) => setProgreso((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            reject, // Error
            async () => { urls[imgData.field] = await getDownloadURL(uploadTask.snapshot.ref); resolve(); }
          );
        });
      }
      guardarProducto(urls.imagen, urls.imagenRpos, idProductValue, positionValue);
    } catch (error) {
      console.error("Error en subirImagenes:", error);
      setMensaje("Error al subir imágenes o obtener IDs.");
      setProgreso(0);
    }
  };

  const guardarProducto = async (imagenUrl, imagenRposUrl, idDocYProd, productPosition) => {
    const precioNumerico = producto.precio ? parseFloat(String(producto.precio).replace(",", ".")) : 0;
    if (isNaN(precioNumerico)) {
        setMensaje("El precio ingresado no es válido."); return;
    }
    const stockNumerico = producto.stock !== "" && producto.stock !== undefined ? Number(producto.stock) : 0;

    const productoFinal = {
      categoria: producto.categoria ? producto.categoria.toLowerCase() : "",
      description: producto.descripcion,
      description_half: producto.descripcionBreve,
      gluten_free: producto.celiaco ? "1" : "0",
      id_product: idDocYProd,
      imagen: imagenUrl,
      imagen_rpos: imagenRposUrl,
      name: producto.nombre,
      alias: producto.alias,
      position: productPosition,
      price: precioNumerico,
      sabores: producto.sabores ? "1" : "0",
      stock: stockNumerico,
      vegan: producto.vegano ? "1" : "0",
      vegetarian: producto.vegetariano ? "1" : "0",
      visible: producto.visible ? 1 : 0,
      cocina: !!producto.cocina,
      promocion: !!producto.promocion, // Ensure it's saved as a boolean
      quickOrder: !!producto.quickOrder,
      freidora: !!producto.freidora,
      productoDoble: producto.productoDoble ? "1" : "0",
      botonCeliaco: !!producto.botonCeliaco,
    };

    try {
      await setDoc(doc(db, "productos", idDocYProd.toString()), productoFinal);

      // Handle 'cocina' collection
      const cocinaDocRef = doc(db, "cocina", idDocYProd.toString());
      if (producto.cocina) {
        await setDoc(cocinaDocRef, { nombre: producto.nombre, id_producto: idDocYProd });
      } else {
        await deleteDoc(cocinaDocRef); // Ensure it's removed if not a 'cocina' product
      }

      // Handle 'freidora' collection
      const freidoraDocRef = doc(db, "freidora", idDocYProd.toString());
      if (producto.freidora) {
        let filtroKeyValue = producto.nombre.toLowerCase(); // Valor por defecto
        const nombreProductoLower = producto.nombre.toLowerCase();

        for (const keyword of FREIDORA_KEY_WORDS) {
          if (nombreProductoLower.includes(keyword)) {
            filtroKeyValue = keyword;
            break; // Usar la primera coincidencia
          }
        }

        const freidoraData = {
          nombreDisplay: producto.nombre,
          filtroKey: filtroKeyValue,
          imagenUrl: imagenUrl, // This is productoFinal.imagen (image without background)
          // id_producto: idDocYProd, // Optional: if you need a direct reference back
        };
        await setDoc(freidoraDocRef, freidoraData);
      } else {
        // If not a freidora product, ensure it's removed from the 'freidora' collection
        await deleteDoc(freidoraDocRef);
      }
      // No setMensaje aquí, se maneja en ListaProductos a través de onSave
      onSave(); // Notificar al padre
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      setMensaje("Error al guardar el producto.");
      setProgreso(0);
    }
  };

  return (
    <div className="px-4 py-4 bg-white"> {/* Padding para el contenido dentro del modal-body */}
      {/* Sección de imágenes */}
      <div className="grid grid-cols-2 gap-6 mb-3">
        {["imagen", "imagenRpos"].map((imgKey) => (
          <div key={imgKey} className="flex flex-col items-center">
            <div className="w-36 h-36 bg-gray-100 border border-gray-300 flex items-center justify-center rounded-md">
              {producto[imgKey] ? (
                typeof producto[imgKey] === "string" ? (
                  <img src={producto[imgKey]} alt={imgKey} className="object-cover w-full h-full rounded-md" />
                ) : (
                  <img src={URL.createObjectURL(producto[imgKey])} alt={imgKey} className="object-cover w-full h-full rounded-md" />
                )
              ) : (
                <img src={productosIcon} alt="Imagen por defecto" className="object-cover w-full h-full rounded-md" />
              )}
            </div>
            <label className="mt-2 inline-block px-2 py-2 bg-white text-yellow-500 border-1 border-yellow-500 hover:bg-yellow-600 text-xs rounded-md cursor-pointer">
              Cambiar {imgKey === "imagen" ? "Sin fondo" : "Principal"}
              <input type="file" name={imgKey} accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold font-nunito text-center text-gray-700">Nombre</label>
          <input type="text" name="nombre" value={producto.nombre} onChange={handleChange} className={`w-full px-4 py-2 text-sm font-nunito mt-1 text-center border ${!producto.nombre && mensaje.startsWith("Por favor") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-sm placeholder:text-center`} placeholder="Nombre del producto" />
        </div>
        <div>
          <label className="block text-sm font-bold font-nunito text-center text-gray-700">Alias</label>
          <input type="text" name="alias" value={producto.alias} onChange={handleChange} className="w-full px-4 py-2 text-sm mt-1 border font-nunito border-gray-300 rounded-md text-center focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-sm placeholder:text-center" placeholder="Alias (opcional)" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-3">
        <div>
          <label className="block text-sm font-bold font-nunito text-center text-gray-700">Categoría</label>
          <select name="categoria" value={producto.categoria} onChange={handleChange} className={`w-full font-nunito text-sm text-center px-4 py-2 mt-1 border ${!producto.categoria && mensaje.startsWith("Por favor") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500 ${producto.categoria ? 'text-gray-700' : 'text-gray-400'}`}>
            <option value="">Seleccionar</option>
            <option value="comida">Comida</option>
            <option value="complementos">Complementos</option>
            <option value="bebidas">Bebidas</option>
            <option value="postres">Postres</option>
            <option value="extras">Extras</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold font-nunito text-center text-gray-700">Precio (€)</label>
          <input type="text" name="precio" value={producto.precio} onChange={handleChange} onBlur={handlePriceBlur} className={`w-full px-4 py-2 text-sm text-center font-nunito text-gray-700 pr-8 mt-1 border ${!producto.precio && mensaje.startsWith("Por favor") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-sm placeholder:text-center`} placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-3">
        <div>
          <label className="block text-sm text-center font-bold text-gray-700 font-nunito">Descripción [App Tienda]</label>
          <textarea name="descripcionBreve" value={producto.descripcionBreve} onChange={handleChange} rows="3" className={`w-full px-4 py-2 mt-1 font-nunito text-sm border ${!producto.descripcionBreve && mensaje.startsWith("Por favor") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`} />
        </div>
        <div>
          <label className="block text-sm font-nunito text-center font-bold text-gray-700">Descripción [App Cliente]</label>
          <textarea name="descripcion" value={producto.descripcion} onChange={handleChange} rows="3" className={`w-full px-4 py-2 mt-1 text-sm font-nunito border ${!producto.descripcion && mensaje.startsWith("Por favor") ? "border-red-500" : "border-gray-300"} rounded-md focus:ring-yellow-500 focus:border-yellow-500`} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3 ms-4 text-sm font-nunito text-gray-500 ">
        {[
          { name: "visible", label: "Visible" }, { name: "celiaco", label: "Celiaco" },
          { name: "vegetariano", label: "Vegetariano" }, { name: "vegano", label: "Vegano" },
          { name: "freidora", label: "Freidora" }, { name: "cocina", label: "Cocina" }, // Ensure these are boolean in state
          { name: "promocion", label: "Promoción" }, // Changed from mediaRacion
          { name: "quickOrder", label: "Pedido rápido" },
          { name: "productoDoble", label: "Producto Doble" },
           { name: "botonCeliaco", label: "Check Celiaco" },
        ].map((campo) => (
          <label key={campo.name} className="flex items-center space-x-2 ms-5">
            <input type="checkbox" name={campo.name} checked={!!producto[campo.name]} onChange={handleChange} className="h-5 w-5 accent-[#f2ac02]" />
            <span className="text-sm text-gray-700">{campo.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-bold font-nunito text-center text-gray-700">Stock</label>
        <input type="text" name="stock" value={producto.stock} onChange={handleChange} className="w-full px-4 py-2 mt-1 border font-nunito text-sm text-center border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-sm" placeholder="Cantidad en stock" inputMode="numeric" pattern="[0-9]*" />
      </div>

      {progreso > 0 && progreso < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 my-3">
          <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${progreso}%` }}></div>
        </div>
      )}
      {mensaje && <p className={`text-sm font-bold font-nunito mt-4 text-center ${mensaje.includes("Error") || mensaje.startsWith("Por favor") ? "text-red-600" : "text-green-700"}`}>{mensaje}</p>}

      <div className="flex justify-end space-x-3 mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 shadow-sm text-sm font-medium text-red-500 bg-white border-1 border-red-500 rounded-md hover:text-red-900 hover:border-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={progreso > 0 && progreso < 100} className="px-4 py-2 bg-[#f2ac02] text-white rounded-md hover:bg-yellow-600 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm font-medium">
          {modoEdicion ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          )}
          <span>{modoEdicion ? "Actualizar Producto" : "Crear Producto"}</span>
        </button>
      </div>

      {cropModal.open && (
        <ImageCropper imageSrc={cropModal.imageSrc} onComplete={handleCropComplete} onCancel={handleCropCancel} aspectRatio={1} />
      )}
    </div>
  );
};

export default CrearProductos;
