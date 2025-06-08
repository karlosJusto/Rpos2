import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

import singluten from '../../assets/singluten.png';
import vegano from '../../assets/vegano.png';
import vegetariano from '../../assets/vegetariano.png';
import CrearProductos from "./CrearProductos";

const MODAL_MODES = {
  CREATE: 'crear',
  EDIT: 'editar',
};

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#eab308" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

  const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="#EF4444" 
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7h12M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
    />
  </svg>
);

export default function ListaProductos() {
  const [productos, setProductos] = useState([]);
  const categoryOrder = ["comida", "complementos", "bebidas", "postres", "extras"];
  const [activeCategory, setActiveCategory] = useState(categoryOrder[0] || "");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [productoParaEditar, setProductoParaEditar] = useState(null);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [disableDeleteReason, setDisableDeleteReason] = useState(""); // Estado para el motivo de deshabilitación

  // Helper para mostrar mensajes que se auto-limpian
  const showAutoClearMessage = (msg, duration = 3000) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(""), duration);
  };

  // Helper para obtener el nombre del producto de forma segura
  const getSafeProductName = (product, defaultName = "producto") => {
    if (!product) return defaultName;
    return product.name || product.nombre || defaultName;
  };
  
  // Helper para verificar flags como 'cocina' o 'freidora' que pueden ser "1", 1 o true
  const isFlagSet = (value) => String(value) === "1" || value === true || value === 1;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const productList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const uniqueCategories = [...new Set(productList.map(p => p.categoria).filter(Boolean))];
      const sortedCategories = uniqueCategories.sort((a, b) => {
        const lowerA = a.toLowerCase();
        const lowerB = b.toLowerCase();
        const indexA = categoryOrder.indexOf(lowerA);
        const indexB = categoryOrder.indexOf(lowerB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return lowerA.localeCompare(lowerB);
      });

      setAvailableCategories(sortedCategories);
      if (!sortedCategories.includes(activeCategory) && sortedCategories.length > 0) {
        setActiveCategory(sortedCategories[0]);
      } else if (sortedCategories.length === 0) {
        setActiveCategory("");
      }
      setProductos(productList);
    } catch (error) {
      console.error("Error al obtener los productos:", error);
      setMensaje("Error al cargar los productos");
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewProduct = () => {
    setModalMode(MODAL_MODES.CREATE);
    setProductoParaEditar(null);
    setShowModal(true);
    setMensaje("");
  };

  const handleModify = (producto) => {
    setModalMode(MODAL_MODES.EDIT);
    setProductoParaEditar(producto);
    setShowModal(true);
    setMensaje("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalMode(null);
    setProductoParaEditar(null);
  };

  const handleProductSaved = () => {
    fetchProducts();
    handleCloseModal();
    const successMessage = modalMode === MODAL_MODES.EDIT ? "Producto actualizado con éxito." : "Producto creado con éxito.";
    showAutoClearMessage(successMessage);
  };

  const handleDelete = (producto) => {
    setProductToDelete(producto);
    setMensaje(""); 

    // Verificar si el producto está activo en cocina o freidora
    let reason = "";
    if (isFlagSet(producto.cocina) && isFlagSet(producto.freidora)) {
      reason = "Este producto está activo en Cocina y Freidora. Desactívalo primero de esas áreas.";
    } else if (isFlagSet(producto.cocina)) {
      reason = "Este producto está activo en Cocina. Desactívalo primero y guarda cambios. Posteriormente ya puedes eliminarlo.";
    } else if (isFlagSet(producto.freidora)) {
      reason = "Este producto está activo en Freidora. Desactívalo primero y guarda cambios. Posteriormente ya puedes eliminarlo.";
    }
    setDisableDeleteReason(reason);

    setShowDeleteConfirmModal(true);
  };

  const handleCloseDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setProductToDelete(null);
    setDisableDeleteReason(""); // Limpiar la razón al cerrar
  };

  const executeDelete = async () => {
    if (!productToDelete || disableDeleteReason) return; // No ejecutar si está deshabilitado

    setLoading(true);
    setMensaje("Eliminando producto...");
    try {
      await deleteDoc(doc(db, "productos", productToDelete.id));

      if (isFlagSet(productToDelete.cocina)) {
        try {
          await deleteDoc(doc(db, "cocina", productToDelete.id));
        } catch (cocinaError) {
          console.warn(`Advertencia: No se pudo eliminar ${getSafeProductName(productToDelete)} de 'cocina' (puede que no existiera):`, cocinaError.message);
        }
      }
      
      setProductos(prevProductos => prevProductos.filter(p => p.id !== productToDelete.id));
      showAutoClearMessage("Producto eliminado correctamente");

    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      setMensaje(`Error al eliminar ${getSafeProductName(productToDelete)}.`);
    } finally {
      setLoading(false);
      setShowDeleteConfirmModal(false);
      setProductToDelete(null);
      setDisableDeleteReason(""); // Limpiar la razón
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;

    setMensaje("Moviendo...");
    setLoading(true);

    const currentProduct = filteredProductos[index];
    const previousProduct = filteredProductos[index - 1];

    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, "productos", currentProduct.id);
      const previousRef = doc(db, "productos", previousProduct.id);

      batch.update(currentRef, { position: previousProduct.position });
      batch.update(previousRef, { position: currentProduct.position });

      await batch.commit();
      await fetchProducts(); 
      showAutoClearMessage("Producto movido.");
    } catch (error) {
      console.error("Error al mover el producto:", error);
      setMensaje("Error al mover el producto.");
    } finally {
        setLoading(false);
    }
  };

  const handleMoveDown = async (index) => {
    if (index === filteredProductos.length - 1) return;

    setMensaje("Moviendo...");
    setLoading(true);

    const currentProduct = filteredProductos[index];
    const nextProduct = filteredProductos[index + 1];

    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, "productos", currentProduct.id);
      const nextRef = doc(db, "productos", nextProduct.id);

      batch.update(currentRef, { position: nextProduct.position });
      batch.update(nextRef, { position: currentProduct.position });

      await batch.commit();
      await fetchProducts();
      showAutoClearMessage("Producto movido.");
    } catch (error)      {
      console.error("Error al mover el producto:", error);
      setMensaje("Error al mover el producto.");
    } finally {
        setLoading(false);
    }
  };

  const filteredProductos = productos
    .filter(producto =>
      activeCategory ? producto.categoria?.toLowerCase() === activeCategory?.toLowerCase() : true
    )
    .sort((a, b) => {
      const posA = typeof a.position === 'number' ? a.position : Infinity;
      const posB = typeof b.position === 'number' ? b.position : Infinity;
      if (posA === Infinity && posB === Infinity) {
        return getSafeProductName(a, "").localeCompare(getSafeProductName(b, ""));
      }
      return posA - posB;
    });

  return (
    <div className="flex flex-col bg-gray-50 h-screen overflow-hidden">
      <div className="sticky top-0 z-10 bg-gray-100 px-6 pt-6 pb-2 shadow-sm rounded-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="ms-96 text-center -mt-6">
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Productos</h1>
            <p className="text-gray-500 text-md">Gestiona los productos en venta en la tienda.</p>
          </div>
          <button
            onClick={handleNewProduct}
            className="mt-2 sm:mt-0 px-4 py-2 bg-[#f2ac02] hover:bg-yellow-600 text-white rounded font-nunito whitespace-nowrap"
          >
            + Nuevo Producto
          </button>
        </div>

        {mensaje && (
          <p className={`text-center text-sm mb-4 ${mensaje.toLowerCase().includes("error") || mensaje.toLowerCase().includes("desactívalo") ? 'text-red-600' : 'text-green-600'}`}>
            {mensaje}
          </p>
        )}

        <div className="border-b border-gray-200 border-sm">
          <div className="flex justify-center space-x-1 sm:space-x-4 overflow-x-auto pb-2 -mb-px">
            {availableCategories.map((categoria) => (
              <button
                key={categoria}
                onClick={() => setActiveCategory(categoria)}
                className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f2ac02] transition-colors duration-150 ease-in-out ${
                  activeCategory === categoria
                    ? "bg-[#f2ac02] text-white shadow border-b-2 border-transparent"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-b-2 border-transparent"
                }`}
              >
                {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading && !mensaje.startsWith("Moviendo") && !mensaje.startsWith("Eliminando") && !mensaje.startsWith("Producto") ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        ) : filteredProductos.length === 0 && !loading ? (
          <div className="text-center text-gray-500 mt-8 py-10 bg-white rounded shadow">
            <p>No hay productos para mostrar {activeCategory ? `en la categoría "${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}"` : "aún"}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow mt-4">
            <table className="w-full table-auto text-sm text-left text-gray-600">
              <thead className="text-xs bg-gray-700 text-white uppercase text-center font-nunito">
                <tr>
                  <th scope="col" className="px-4 py-3 hidden md:table-cell">Posición</th>
                  <th scope="col" className="px-4 py-3 w-20">Imagen</th>
                  <th scope="col" className="px-4 py-3">Nombre</th>
                  <th scope="col" className="px-4 py-3 hidden sm:table-cell">Opciones</th>
                  <th scope="col" className="px-4 py-3">Precio</th>
                  <th scope="col" className="px-4 py-3">Visibilidad</th>
                  <th scope="col" className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.map((producto, index) => (
                  <tr key={producto.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-2 hidden md:table-cell text-center font-nunito">
                       <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button
                             onClick={() => handleMoveUp(index)}
                             disabled={index === 0 || loading}
                             className={`p-1 rounded-full text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                             aria-label={`Mover ${getSafeProductName(producto)} hacia arriba`}
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <span className="font-bold text-green-700 w-6 text-center">{producto.position ?? "N/A"}</span>
                          <button
                             onClick={() => handleMoveDown(index)}
                             disabled={index === filteredProductos.length - 1 || loading}
                             className={`p-1 rounded-full text-red-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                             aria-label={`Mover ${getSafeProductName(producto)} hacia abajo`}
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                       </div>
                    </td>
                    <td className="px-4 py-2">
                      {producto.imagen_rpos ? (
                        <img
                          src={producto.imagen_rpos}
                          alt={getSafeProductName(producto, "Imagen de producto")}
                          className="h-10 w-10 object-cover rounded-full"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 font-nunito">
                        <div className="flex justify-center">
                          <div
                            className="truncate w-44 overflow-hidden whitespace-nowrap text-gray-900 font-medium text-center"
                            title={getSafeProductName(producto, "Sin nombre")}
                          >
                            {getSafeProductName(producto, "Sin nombre")}
                          </div>
                        </div>
                      </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-center font-nunito">
                        {isFlagSet(producto.gluten_free) && (
                          <img src={singluten} alt="Sin gluten" className="inline-block w-4 h-4 mx-1" title="Sin Gluten"/>
                        )}
                        {isFlagSet(producto.vegan) && (
                          <img src={vegano} alt="Vegano" className="inline-block w-4 h-4 mx-1" title="Vegano"/>
                        )}
                        {isFlagSet(producto.vegetarian) && (
                          <img src={vegetariano} alt="Vegetariano" className="inline-block w-4 h-4 mx-1" title="Vegetariano"/>
                        )}
                      </td>
                    <td className="px-4 py-2 text-center font-extrabold font-nunito">{typeof producto.price === 'number' ? `${producto.price.toFixed(2)}€` : `${producto.price || "0.00"}€`}</td>
                    <td className="px-4 py-2 text-center">
                      {producto.visible ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Oculto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center"> {/* Celda para botones */}
  <div className="flex justify-center items-center gap-2">
    <button
      onClick={() => handleModify(producto)}
      className="p-1 text-gray-500 hover:text-yellow-600"
      title={`Modificar ${getSafeProductName(producto)}`}
      aria-label={`Modificar ${getSafeProductName(producto)}`}
    >
      <EditIcon />
    </button>
    <button
      onClick={() => handleDelete(producto)}
      className="p-1 text-red-500 hover:text-red-800"
      title={`Eliminar ${getSafeProductName(producto)}`}
      aria-label={`Eliminar ${getSafeProductName(producto)}`}
    >
      <DeleteIcon />
    </button>
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirmModal && productToDelete && (
        <div
          className="modal fade show"
          tabIndex="-1"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          aria-modal="true"
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-lg shadow-xl">
              
              <div className="modal-header flex justify-center items-center p-4 relative border-none">
                <h5 className="modal-title text-xl font-extrabold text-gray-800 font-nunito text-center w-full">
                  Confirma la Eliminación
                </h5>
                <button
                  type="button"
                  className="btn-close absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                  onClick={handleCloseDeleteConfirmModal}
                  aria-label="Cerrar"
                ></button>
              </div>

              <div className="modal-body p-3 font-nunito text-center">
                <div className=' d-flex justify-content-center align-items-center -mt-8 mb-2'>
                  <svg fill="#c81d0c" width="75px" height="75px" viewBox="-5.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
                    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
                    <g id="SVGRepo_iconCarrier"> <path d="M10.16 25.92c-2.6 0-8.72-0.24-9.88-2.24-1.28-2.28 2.040-8.24 3.080-10.040 1.040-1.76 4.64-7.56 7.12-7.56 2.8 0 7.24 7.48 8.56 10.12 1.92 3.84 2.48 6.4 1.56 7.6-1.52 2.040-8.96 2.12-10.44 2.12zM10.48 7.72c-0.72 0-3.080 2.36-5.64 6.76-2.76 4.68-3.48 7.72-3.080 8.4 0.32 0.56 3.2 1.4 8.4 1.4 5.44 0 8.64-0.88 9.080-1.48 0.28-0.36 0.040-2.28-1.72-5.84-2.64-5.28-6.12-9.24-7.040-9.24zM10.52 19.2c-0.48 0-0.84-0.36-0.84-0.84v-6.36c0-0.48 0.36-0.84 0.84-0.84s0.84 0.36 0.84 0.84v6.32c0 0.48-0.4 0.88-0.84 0.88zM11.36 21.36c0 0.464-0.376 0.84-0.84 0.84s-0.84-0.376-0.84-0.84c0-0.464 0.376-0.84 0.84-0.84s0.84 0.376 0.84 0.84z"/> </g>
                  </svg>
                </div>

                <p className="text-gray-700 text-sm">
                  ¿Está seguro que desea eliminar el producto "<strong>{getSafeProductName(productToDelete, 'este producto')}</strong>"?
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Esta acción no se puede deshacer.
                </p>
                {disableDeleteReason && (
                  <p className="text-sm text-red-600 mt-3 font-semibold">
                    {disableDeleteReason}
                  </p>
                )}
              </div>

              <div className="modal-footer flex justify-center gap-4 p-4 bg-white rounded-b-lg border-none">
                <button
                  type="button"
                  className="px-3 py-2 bg-white border-1 border-gray-300 text-gray-500 rounded hover:text-gray-900 hover:border-gray-900 font-nunito transition-colors shadow-md"
                  onClick={handleCloseDeleteConfirmModal}
                  disabled={loading && mensaje.startsWith("Eliminando")}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 bg-white border-1 rounded font-nunito transition-colors shadow-md ${
                    disableDeleteReason 
                    ? 'border-gray-400 text-gray-400 cursor-not-allowed' 
                    : 'border-red-500 text-red-500 hover:text-red-700 hover:border-red-700'
                  }`}
                  onClick={executeDelete}
                  disabled={(loading && mensaje.startsWith("Eliminando")) || !!disableDeleteReason}
                >
                  {loading && mensaje.startsWith("Eliminando") ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear/Editar Productos */}
      {showModal && (
        <div className="modal fade show" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} aria-modal="true" role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
          <div className="modal-header border-b-0 relative">
                <div className="flex flex-col items-center w-full">
                  <h5 className="modal-title font-nunito text-gray-700 font-extrabold text-xl text-center capitalize">
                    {modalMode === MODAL_MODES.EDIT ? 'Editar Producto' : 'Nuevo Producto'}
                  </h5>
                  <p className="text-sm text-center text-gray-400 font-nunito mt-1">
                    {modalMode === MODAL_MODES.EDIT
                      ? "Estás modificando un producto existente"
                      : "Da de alta un nuevo producto y ponlo visible en la aplicación"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                  onClick={handleCloseModal}
                  aria-label="Cerrar"
                >
                </button>
              </div>
            <div className="modal-body p-0">
              <CrearProductos
                productoEditarProp={productoParaEditar}
                modoEdicionProp={modalMode === MODAL_MODES.EDIT}
                onSave={handleProductSaved}
                onClose={handleCloseModal}
                key={modalMode === MODAL_MODES.CREATE ? 'crearForm' : `editarForm-${getSafeProductName(productoParaEditar, 'id')}`}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
