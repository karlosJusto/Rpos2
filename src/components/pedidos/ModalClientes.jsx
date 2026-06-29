import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { Pencil } from 'lucide-react';
import { db } from '../firebase/firebase';
import CalendarioDropdown from './CalendarioDropdown'; // Assuming CalendarioDropdown is preferred over Calendario

// Added initialData prop to receive customer data when editing
const ModalClientes = ({ show, handleClose, onSave, initialData,clearClientData }) => {
  const [isNameEditable, setIsNameEditable] = useState(false);
  const [formData, setFormData] = useState({
    cliente: '',
    telefono: '',
    fechahora: '',
    observaciones: '',
    pagado: false,
    celiaco: false, // Note: celiaco might be order-specific, not client-specific
    img_perfil: '',
  });

  // Effect to load initial data when the modal is shown for editing
  useEffect(() => {
    if (show && initialData) {
      // Populate formData with the data passed from Ticket.jsx
      setFormData({
        cliente: initialData.cliente || '',
        telefono: initialData.telefono || '',
        fechahora: initialData.fechahora || '', // Use the date/time from the order being edited
        observaciones: initialData.observaciones || '',
        pagado: initialData.pagado || false,
        celiaco: initialData.celiaco || false, // Keep celiaco status from the order
        img_perfil: initialData.img_perfil || '',
      });
      setIsNameEditable(!initialData.cliente);
    } else if (!show) {
      setIsNameEditable(false);
       // Optional: Reset form when modal is hidden (already handled by handleSubmitClose)
       // If you want it to reset *every time* it's hidden, uncomment below
       /*
       setFormData({
         cliente: '',
         telefono: '',
         fechahora: '',
         observaciones: '',
         pagado: false,
         celiaco: false,
         img_perfil: '',
       });
       */
    }
  }, [show, initialData]); // Re-run when show status or initialData changes

  // Manejar la fecha seleccionada
  const handleDateChange = (fecha) => {
    setFormData((prevFormData) => ({ // Use functional update to preserve other fields
      ...prevFormData,
      fechahora: fecha,  // Update only the date/time
    }));
  };


  const [clientes, setClientes] = useState([]); // Lista completa de clientes
  const [filteredClientes, setFilteredClientes] = useState([]); // Lista filtrada de clientes

  // Cargar los clientes de Firebase
  useEffect(() => {
    const fetchClientes = async () => {
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      // Assuming 'clientes' collection has fields: cliente, telefono, img_perfil, maybe observaciones?
      const clientesList = clientesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClientes(clientesList);
      setFilteredClientes([]); // Inicia la lista vacía
    };

    fetchClientes();
  }, []);

  // Función para filtrar los clientes solo por teléfono
  const filtrarClientes = (term) => {
    if (!term) {
      setFilteredClientes([]);
    } else {
      const clientesFiltrados = clientes.filter((cliente) => {
        const telefono = cliente.telefono ? cliente.telefono.toString() : ''; 
        return telefono.startsWith(term);
      });
      setFilteredClientes(clientesFiltrados);
    }
  };

  // Manejador para actualizar el estado de los inputs (cliente y telefono)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono') {
      const exactClient = clientes.find((cliente) => {
        const telefono = cliente.telefono ? cliente.telefono.toString() : '';
        return telefono === value;
      });

      setFormData((prevState) => ({
        ...prevState,
        telefono: value,
        cliente: exactClient ? exactClient.cliente || '' : prevState.cliente,
        img_perfil: exactClient ? exactClient.img_perfil || '' : prevState.img_perfil,
        observaciones: exactClient ? exactClient.observaciones || '' : prevState.observaciones,
      }));
      filtrarClientes(value);
      if (exactClient) setFilteredClientes([]);
      setIsNameEditable((prevIsNameEditable) => exactClient ? false : prevIsNameEditable || value.length === 9);
      return;
    }

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Manejador para actualizar el estado de los checkboxes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: checked,
    }));
  };

  // Manejador para enviar los datos al formulario (Ticket) y cerrar el modal
  const handleSubmitData = () => {
    onSave(formData); // Send the current formData back to Ticket
    handleClose();
  };

  // Manejador para cancelar y resetear el formulario
  const handleSubmitClose = () => {
    // Reset to a blank state, not initialData
    setFormData({
      cliente: '',
      telefono: '',
      fechahora: '',
      observaciones: '',
      pagado: false,
      celiaco: false,
      img_perfil: "",
    });
    setFilteredClientes([]); // Reset filtered list
    setIsNameEditable(false);
    handleClose();
  };

  const exactMatchExists = clientes.some((cliente) => {
    const telefono = cliente.telefono ? cliente.telefono.toString() : '';
    return telefono === formData.telefono;
  });
  const isNewClient = formData.telefono.length === 9 && !exactMatchExists;
  const canEditName = formData.telefono.length === 9 || formData.cliente.trim() !== '';
  const isNameInputEditable = isNewClient || isNameEditable;


  return (
    <>
      <Modal show={show} onHide={handleSubmitClose} size="lg" backdrop="static"  keyboard={false} top> {/* Changed onHide to ensure reset */}

      <Modal.Header closeButton className='border-none text-center justify-center items-center flex'>
        <Modal.Title className='text-center pt-1 font-nunito text-gray-600 w-full'>
          Datos Pedido
        </Modal.Title>
      </Modal.Header>

          

        <Modal.Body>
          <div className="bg-white rounded-lg flex justify-around gap-3 appearance-none px-[3vw] -mt-3 ">
            {/* Input Cliente */}
            <div className="form-floating w-[25vw] relative">
              <input
                type="text"
                className={`form-control border-2 border-gray-200 font-nunito font-extrabold focus:ring-0 pr-12 ${
                  isNameInputEditable ? 'bg-white focus:border-yellow-500' : 'bg-gray-100 text-gray-500'
                }`}
                id="cliente"
                placeholder="Nombre"
                value={formData.cliente}
                onChange={handleInputChange}
                readOnly={!isNameInputEditable}
                name="cliente"
              />
              {canEditName && (
                <button
                  type="button"
                  onClick={() => setIsNameEditable(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-600 disabled:opacity-40"
                  aria-label="Editar nombre del cliente"
                  title="Editar nombre"
                  disabled={isNameInputEditable}
                >
                  <Pencil size={18} strokeWidth={2.5} />
                </button>
              )}
              <label className="text-gray-500 font-extrabold" htmlFor="cliente">
                {isNewClient ? "Nombre (Nuevo Cliente)" : "Nombre"}
              </label>
            </div>
            {/* Input Telefono */}
            <div className="form-floating w-[25vw]">
              <input
                type="text"
                pattern="[0-9]*"
                inputMode='numeric'
                className="form-control border-2 border-gray-200 font-nunito font-extrabold focus:border-yellow-500 focus:ring-0"
                id="telefono"
                placeholder="Teléfono"
                maxLength={9}
                value={formData.telefono}
                onChange={handleInputChange}
                name="telefono"
              />
              <label className="text-gray-500 font-extrabold" htmlFor="telefono"> {/* Changed htmlFor */}
                Teléfono
              </label>
            </div>
          </div>

          {/* Lista de clientes con scroll */}
          <div className="max-h-40 overflow-y-auto mt-1">
            {filteredClientes.length > 0 ? (
              filteredClientes.map((cliente, index) => {
                const isSelectable = formData.telefono.length >= 7;
                return (
                <div
                  key={index} // Consider using cliente.id if available and unique
                  className={`py-2 px-4 ${isSelectable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
                  onClick={() => {
                    if (!isSelectable) return;
                    // Update only client-specific fields, keep order-specific fields from formData
                    setFormData(prevFormData => ({
                      ...prevFormData, // Keep existing fechahora, observaciones, pagado, celiaco
                      cliente: cliente.cliente || '', // Use 'cliente' field for name
                      telefono: cliente.telefono || '',
                      img_perfil: cliente.img_perfil || '',
                      // Optionally update observations if they should come from client profile:
                      //observaciones: cliente.observaciones || prevFormData.observaciones,
                         observaciones: cliente.observaciones || '', // Si el nuevo cliente no tiene obs, limpiar las anteriores
                    }));
                    setFilteredClientes([]); // Hide list after selection
                    setIsNameEditable(false);
                  }}>
                  <div className="px-[3vw]  mt-[1vh]"> {/* Adjusted margin */}
                    <div className="grid grid-cols-2 text-center h-auto"> {/* Adjusted height */}
                      {/* Display client name and phone */}
                      <h1 className="text-lg font-nunito text-green-700">{cliente.cliente}</h1>
                      <h1 className="text-lg font-nunito text-green-700">{cliente.telefono}</h1>
                    </div>
                  </div>
                </div>
                );
              })
            ) : (
              // Show message only if a search term exists, is incomplete, and no client is selected
              (formData.telefono && formData.telefono.length < 9 && !formData.cliente) && <p className='text-center mt-4 font-nunito text-red-500'>No hay coincidencias</p>
            )}
          </div>

          {/* Calendario Dropdown */}
          <div className='px-[4.5vh] mt-3'>
            {/* Pass current fechahora to potentially pre-select date */}
            <CalendarioDropdown onDateChange={handleDateChange} initialDate={formData.fechahora} />
          </div>

          {/* Observaciones */}
          <div className='px-[4.5vh]'>
            <label htmlFor="observaciones" className="form-label text-gray-100 text-lg font-nunito  "></label>
            <textarea
              className="form-control text-md font-nunito text-gray-900 font-extrabold  border-2 border-gray-200"
              value={formData.observaciones} // Bind directly to formData
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              id="observaciones"
              rows="2"
              placeholder=""
              name="observaciones" // Added name attribute
            />
          </div>

          {/* Checkboxes */}
          <div className='pt-[3vh] text-center'>
            <div className="form-check form-check-inline border-2 p-[0.8vw] border-gray-200 rounded-xl">
              <input
                className="form-check-input m-1"
                type="checkbox"
                id="pagado"
                name="pagado"
                // value="option1" // Value is not needed for boolean checkbox
                checked={formData.pagado}
                onChange={handleCheckboxChange}
              />
              <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="pagado"> {/* Changed htmlFor */}
                Pagado
              </label>
            </div>

             {/* Celiaco Checkbox - Uncomment if needed */}
             {/*
             <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl">
              <input
                className="form-check-input m-1"
                type="checkbox"
                id="celiaco"
                name="celiaco"
                checked={formData.celiaco}
                onChange={handleCheckboxChange}
              />
              <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="celiaco">
                Celiaco
              </label>
            </div>
            */}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-none">
        <div className="flex justify-end space-x-3">
  <Button
     variant="danger"
    className="p-2 bg-white font-nunito text-red-500 border-red-500 hover:text-red-700 hover:border-red-700 shadow-sm"
    onClick={() => {
      if (formData.cliente) {
        clearClientData(); // ✅ Limpia los datos del ticket
        handleSubmitClose(); // ✅ Cierra el modal
      } else {
        handleSubmitClose(); // Solo cerrar si no había datos
      }
    }}
  >
    {initialData.cliente ? "Eliminar" : "Cancelar"}
  </Button>

  <Button
    variant="primary"
    onClick={handleSubmitData}
    disabled={formData.telefono.length !== 9 || formData.cliente.trim() === ''}
    className="bg-white text-yellow-500 border-yellow-500 hover:bg-yellow-600  hover:text-yellow-600 hover:border-yellow-600 p-2 font-nunito shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {initialData.cliente ? "Actualizar" : "Agregar"}
  </Button>
</div>

        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalClientes;
