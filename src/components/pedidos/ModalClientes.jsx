import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Calendario from './Calendario';
import Ticket from './Ticket';
import Layout from './Layout';

const ModalClientes = ({ show, handleClose, onSave }) => {
  const [formData, setFormData] = useState({
    cliente: '',
    telefono: '',
    fechahora: '',
    observaciones: '',
    pagado: false,
    celiaco: false,
  });

  // Manejar la fecha seleccionada
  const handleDateChange = (fecha) => {
    setFormData({
      ...formData,
      fechahora: fecha,  // Actualizamos la fecha seleccionada
    });
  };


  const [clientes, setClientes] = useState([]); // Lista completa de clientes
  const [filteredClientes, setFilteredClientes] = useState([]); // Lista filtrada de clientes

  // Cargar los clientes de Firebase
  useEffect(() => {
    const fetchClientes = async () => {
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const clientesList = clientesSnapshot.docs.map((doc) => doc.data());
      setClientes(clientesList); // Guardamos todos los clientes
      setFilteredClientes(clientesList); // Inicialmente mostramos todos los clientes
    };

    fetchClientes();
  }, []);

  // Función para filtrar los clientes
  const filtrarClientes = (term) => {
    if (!term) {
      setFilteredClientes(clientes); // Si no hay término de búsqueda, mostramos todos los clientes
    } else {
      const termLower = term.toLowerCase(); // Convertir el término a minúsculas

      // Filtrar los clientes con una validación para evitar "undefined"
      const clientesFiltrados = clientes.filter((cliente) => {
        const nombre = cliente.nombre ? cliente.nombre.toLowerCase() : ''; // Si no hay nombre, usamos una cadena vacía
        const telefono = cliente.telefono ? cliente.telefono : ''; // Si no hay teléfono, usamos una cadena vacía

        // Compara tanto nombre como teléfono
        return nombre.includes(termLower) || telefono.includes(termLower);
      });

      setFilteredClientes(clientesFiltrados); // Actualizamos los resultados filtrados
    }
  };

  // Manejador para actualizar el estado de los inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // Filtrar clientes cuando se escriba en el campo de búsqueda
    filtrarClientes(value);
  };

  // Manejador para actualizar el estado de los checkboxes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: checked, // Actualiza el estado del checkbox
    }));
  };

  // Manejador para enviar los datos al formulario y cerrar el modal
  const handleSubmitData = () => {
    onSave(formData);
    handleClose();
  };


  const handleSubmitClose = () => {
    setFormData({
      cliente: '',  // Asumiendo que "cliente" es uno de los campos
      telefono: '',
      fechahora: '',
      observaciones: '',
      pagado: false,  // Si el estado tiene esta propiedad
      celiaco: false,  // Si el estado tiene esta propiedad
    });
    handleClose(); // Función que probablemente cierra el modal o formulario
  };

  return (
    <>
      <Modal show={show} onHide={handleClose} size="xl" backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Buscar Cliente</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="bg-white rounded-lg flex justify-around gap-3 appearance-none px-[3vw]">
            <div className="form-floating mb-3 w-[25vw]">
              <input
                type="text"
                className="form-control border-2 border-gray-200 font-nunito font-extrabold focus:border-yellow-500 focus:ring-0"
                id="nombre"
                placeholder="Nombre"
                value={formData.cliente}
                onChange={handleInputChange}
                name="cliente"
              />
              <label className="text-gray-500 font-extrabold" htmlFor="floatingInput">
                Nombre
              </label>
            </div>
            <div className="form-floating w-[25vw]">
              <input
                type="phone"
                className="form-control border-2 border-gray-200 font-nunito font-extrabold focus:border-yellow-500 focus:ring-0"
                id="telefono"
                placeholder="Teléfono"
                maxLength={9}
                value={formData.telefono}
                onChange={handleInputChange}
                name="telefono"
              />
              <label className="text-gray-500 font-extrabold " htmlFor="floatingPhone">
                Teléfono
              </label>
            </div>
          </div>

          {/* Lista de clientes con scroll */}
          <div className="max-h-40 overflow-y-auto mt-4">
            {filteredClientes.length > 0 ? (
              filteredClientes.map((cliente, index) => (
                <div key={index} className="py-2 px-4 cursor-pointer" onClick={() => {
                  setFormData({
                    cliente: cliente.cliente || '',
                    telefono: cliente.telefono || '',
                    fechahora: formData.fechahora,  // Mantiene la fecha actual
                    observaciones: cliente.observaciones || '',  // Asigna las observaciones del cliente a formData
                    pagado: formData.pagado,
                    celiaco: formData.celiaco,
                  });
                  // handleClose(); // Cierra el modal cuando seleccionas un cliente
                }}>
                  {/* Otros campos del formulario */}
                  <div className="px-[3.5vw] mt-[2vh]">
                    <div className="grid grid-cols-2 text-center h-[2vh]">
                      <h1 className="text-lg font-nunito text-gray-500 ">{cliente.cliente}</h1>
                      <h1 className="text-lg font-nunito text-gray-500 ">{cliente.telefono}</h1>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-center'>No se encontraron resultados</p>
            )}
          </div>

          {/* Calendario */}
          <div className='p-[4.5vh]'>
            <Calendario onDateChange={handleDateChange} />
          </div>

          

          {/* Observaciones */}
          <div className='px-[4.5vh]'>
            <label htmlFor="textarea" className="form-label text-gray-500 text-lg font-nunito font-extrabold "></label>
            <textarea
              className="form-control text-lg font-nunito border-2 border-gray-200 "
              value={formData.observaciones || ""}  // Usamos formData.observaciones aquí
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}  // Actualiza formData.observaciones
              id="observaciones"
              rows="2"
              placeholder="Observaciones al pedido"
            />
          </div>

          {/* Checkboxes */}
          <div className='pt-[4.5vh] text-center'>
            <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
              <input
                className="form-check-input m-1"
                type="checkbox"
                id="pagado"
                name="pagado"
                value="option1"
                checked={formData.pagado}
                onChange={handleCheckboxChange}
              />
              <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="inlineCheckbox1">
                Pagado
              </label>
            </div>

             {/*<div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
              <input
                className="form-check-input m-1"
                type="checkbox"
                id="celiaco"
                name="celiaco"
                value="option2"
                checked={formData.celiaco}
                onChange={handleCheckboxChange}
              />
              <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="inlineCheckbox2">
                Celiaco
              </label>
            </div>  */}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-none">
          <Button
            variant="secondary"
            className="p-3 bg-white font-nunito text-gray-500 border-gray-300 hover:text-yellow-600 hover:border-yellow-600"
            onClick={handleSubmitClose}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitData}
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito"
          >
            Agregar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalClientes;
