
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';


import singluten from '../../assets/singluten.png'
import vegano from '../../assets/vegano.png'
import vegetariano from '../../assets/vegetariano.png'


import { useState, useContext, useEffect} from 'react';
import {  dataContext } from '../Context/DataContext';


const ModalProductos = ({show, handleClose, product,isNuevoProducto}) => {

  

  const {data, cart, setCart}=useContext(dataContext);


    // Estados para los valores de los checkbox y switch
    const [sinsalsa, setSinsalsa] = useState(false);
    const [extrasalsa, setExtrasalsa] = useState(false);
    const [tostado, setTostado] = useState(false);
    const [troceado, setTroceado] = useState(false);
    const [celiaco, setCeliaco] = useState(false);
    const [clickCount, setClickCount]=useState(1);

    const [countCard, setcountCard]=useState(1);


  // Al cargar el modal, inicializamos las opciones con los valores del producto
  useEffect(() => {
      if (product) {
        setClickCount( product.cantidad || 1);
        setSinsalsa(product.sinsalsa || false);
        setExtrasalsa(product.extrasalsa || false);
        setTostado(product.tostado ||false);
        setTroceado(product.troceado ||false);
        setCeliaco(product.celiaco ||false);
        setcountCard(product.id_cart || countCard)
      }
  }, [product]);


  

  const buyProducts = (product) => {

       // Función para manejar la adición al carrito
       
        const updatedProduct = {
          ...product,
          id_cart: countCard,
          cantidad: clickCount,
          sinsalsa,
          extrasalsa,
          tostado,
          troceado,
          celiaco,
        };

    //console.log(updatedProduct);

    

   // Añade el producto al carrito (o actualiza si ya existe)
   if ( isNuevoProducto )
   {
     setCart([...cart, { ...updatedProduct }]);
     setcountCard(countCard+1);

    } else{
    setCart(
      /*cart.map((item) =>
        item.id === updatedProduct.id
          ? updatedProduct// Aquí puedes ajustar la lógica de cantidad según sea necesario
          : item
      )*/

          cart.map((item) =>
            item.id_cart === updatedProduct.id_cart
              ? updatedProduct// Aquí puedes ajustar la lógica de cantidad según sea necesario
              : item
          )

        
    );
   }
   /*const existingProduct = cart.find((item) => item.id === updatedProduct.id);
   if (existingProduct) {
      // Actualizar cantidad si ya existe en el carrito
      setCart(
        cart.map((item) =>
          item.id === updatedProduct.id
            ? updatedProduct// Aquí puedes ajustar la lógica de cantidad según sea necesario
            : item
        )
      );
   } else {
     setCart([...cart, { ...updatedProduct }]);
   }*/



     //poner valores por defecto
      setClickCount(1);
      setSinsalsa(false);
      setExtrasalsa(false);
      setTostado(false);
      setTroceado(false);
      setCeliaco(false);


    handleClose();

  };


  // Función para eliminar el producto del carrito
  const deleteProduct = (productToDelete) => {
    // Filtrar el carrito y eliminar el producto
    const updatedCart = cart.filter(item => item.id_cart !== productToDelete.id_cart);
    setCart(updatedCart);
    handleClose(); // Cerrar el modal después de eliminar
  };


  //console.log(setCart+"productos carrito");
 

    {/*Estado contador*/}
    
    const sumar = () => {
        setClickCount(clickCount+1);
    }

    const restar = () => {
        if (clickCount>1){
        setClickCount(clickCount-1)};
    }

    //console.log(product);

    // const nombreCondicion = "Pollo"; // El nombre con el que comparas
    // const mostrarSwitches = product.name !== nombreCondicion;

  return (
    <>
     
       
      <Modal
        show={show}
        onHide={handleClose}
        size='lg'
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton className='border-none'  onClick={handleClose}>
        
        </Modal.Header>
        <Modal.Body>
        
        <div className='flex -mt-6 '>
            <img src={product?.imagen} alt="plato comida" className='w-52 h-42 object-cover pr-7' />
            <div>
                <h1  className='font-nunito text-3xl font-extrabold text-gray-900 pb-3'>{product?.name}</h1>
                <h3 className='font-nunito text-lg text-gray-400 '>{product?.description}  </h3>
                <div className='border-b-2 pt-3'></div>
            </div>     
        </div>   

            <div className="flex ms-[30px] gap-3 p-3">
                            
                        {product?.gluten_free && (
                          <img src={singluten} alt="vegano" className="h-6 w-6 object-cover " />
                        )}
                        {product?.vegan && (
                          <img src={vegano} alt="celiaco" className="h-6 w-6 object-cover" />
                        )}
                        {product?.vegetarian && (
                          <img src={vegetariano} alt="vegetariano" className="h-6 w-6 object-cover" />
                        )}
    
            </div>

      
    

        <div className='flex  gap-2  pl-2 justify-center '>
                <span onClick={restar} className='w-12 h-10 text-5xl text-center' >-</span>
                <span className='w-12 h-10 text-5xl text-center'>{clickCount}</span>
                <span onClick={sumar} className='w-12 h-10 text-5xl text-center' >+</span>
        </div>  

       

    <div className="p-2 text-left border-b-2 mt-4 ">
        <h4 className="text-2xl  font-extrabold font-nunito">
            Opciones
        </h4>
    </div>

 {/* Condicional para mostrar u ocultar el bloque */}

 {/* Condicional con el operador ternario: si no es pollo, no renderizamos el bloque */}
 {(product?.name === "Pollo Asado" || product?.name === "Medio Pollo") && (
    <div className='text-center flex justify-center  gap-10 font-nunito text-lg p-[2vw] pt-[5vh]'>

        <div className="form-check form-switch ">
          <input className="form-check-input" type="checkbox" role="switch" id="sinsalsa" checked={sinsalsa} onChange={(e) =>  {
                // Si se marca "Sin salsa", aseguramos que "Extra salsa" se desmarque
                if (e.target.checked) {
                    setSinsalsa(true);
                    setExtrasalsa(false); // Desmarcar "Extra salsa"
                } else {
                    setSinsalsa(false); // Desmarcar "Sin salsa"
                }
            }}/>
          <label className="form-check-label" htmlFor="flexSwitchCheckDefault">Sin salsa</label>
       </div>
       <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" role="switch" id="extrasalsa" checked={extrasalsa}  onChange={(e) =>{
                // Si se marca "Extra salsa", aseguramos que "Sin salsa" se desmarque
                if (e.target.checked) {
                    setExtrasalsa(true);
                    setSinsalsa(false); // Desmarcar "Sin salsa"
                } else {
                    setExtrasalsa(false); // Desmarcar "Extra salsa"
                }
            }}/>
          <label className="form-check-label" htmlFor="flexSwitchCheckDefault">Extra Salsa</label>
      </div>
  
          
    </div>

 )}


    <div className='text-center justify-center items-center font-nunito  p-4'>

  
                  <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl ">
                    <input className="form-check-input m-1" type="checkbox" id="Tostado" name="ostado" value="option1" checked={tostado} onChange={(e) => setTostado(e.target.checked)} disabled={product?.name !== "Pollo Asado"}   />
                    <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="inlineCheckbox1">Tostado</label>
                  </div>
               
              
                  <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl ">
                    <input className="form-check-input m-1" type="checkbox" id="Troceado"  name="troceado" value="option2" checked={troceado} onChange={(e) => setTroceado(e.target.checked)} disabled={product?.name !== "Pollo Asado"}  />
                    <label className="form-check-label text-lg font-nunito text-gray-900" htmlFor="inlineCheckbox2">Troceado</label>
                  </div>
               
                  <div className="form-check form-check-inline border-2 p-[1vw] border-gray-200 rounded-xl " >
                    <input className="form-check-input m-1" type="checkbox" id="celiaco"  name="celiaco" value="option3" checked={celiaco} onChange={(e) => setCeliaco(e.target.checked)}  disabled={!product?.gluten_free} />
                    <label className="form-check-label text-lg font-nunito text-black" htmlFor="inlineCheckbox3">Celiaco</label>
                  </div>
      
    </div>

    


      
         



       
        </Modal.Body>
        <Modal.Footer className='border-none'>
  {/* Mostrar solo el botón de Eliminar si no es un producto nuevo */}
  {!isNuevoProducto && (
    <Button
      variant="danger"
      onClick={() => deleteProduct(product)}
      className="bg-white border-red-500 hover:bg-red-600 hover:border-red-900 p-3 font-nunito text-red-500 hover:text-red-900"
    >
      Eliminar
    </Button>
  )}

  {/* Mostrar el botón de Cancelar solo cuando estamos añadiendo un producto nuevo */}
  {isNuevoProducto && (
    <Button
      variant="secondary"
      onClick={handleClose}
      className="p-3 bg-white font-nunito text-gray-500 border-gray-500 hover:text-yellow-500  hover:border-yellow-500"
    >
      Cancelar
    </Button>
  )}

  {/* Botón para agregar o modificar el producto */}
  <Button
    variant={isNuevoProducto ? 'primary' : 'warning'}
    onClick={() => buyProducts(product)}
    className={`
      ${isNuevoProducto ? 'bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito' : 'bg-yellow-500 border-yellow-500 hover:bg-yellow-600 hover:border-yellow-600 p-3 font-nunito'}
      text-white
    `}
  >
    {isNuevoProducto ? 'Agregar' : 'Modificar'}
  </Button>
</Modal.Footer>

      </Modal>

    </>
  );
};

export default ModalProductos;