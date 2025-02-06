import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { db } from "../firebase/firebase"; // Importa la configuración de Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import qr_final from '../../assets/ticket/qr_final.png'; // Imagen qr
import fecha_prevista from '../../assets/ticket/fecha_prevista.png'; // Imagen calendario
import fecha_recogida from '../../assets/ticket/fecha_recogida.png'; // Imagen calendario
import cliente from '../../assets/ticket/cliente.png'; // Imagen cliente
import gluten from '../../assets/ticket/gluten.png'; // Imagen gluten
import metodopago from '../../assets/ticket/metodopago.png'; // Imagen pago
import empleado from '../../assets/ticket/empleado.png'; // Imagen empleado
import pagado from '../../assets/ticket/pagado.png'; // Imagen empleado
import qr from '../../assets/qr.png'; // Imagen qr
import singluten from '../../assets/singluten.png'; // Imagen sin gluten
import tarjeta from '../../assets/ticket/tarjeta.png'; // Imagen empleado
import dinero from '../../assets/ticket/dinero.png'; // Imagen empleado
import pin from '../../assets/ticket/pin.png'; // Imagen empleado
import store from '../../assets/ticket/store.png'; // Imagen tienda
import internet from '../../assets/ticket/internet.png'; // Imagen intenet




const Scanner = () => {

 



  // States for QR scanner
  const scanner = useRef(null);
  const videoEl = useRef(null);
  const qrBoxEl = useRef(null);
  const [qrOn, setQrOn] = useState(true);

  // State for scanned result
  const [scannedResult, setScannedResult] = useState("");

  // State for Firebase Data
  const [pedidoData, setPedidoData] = useState(null); // Datos del pedido
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error

  // Success callback function
  const onScanSuccess = (result) => {
    console.log("QR scan result:", result);
    setScannedResult(result?.data); // Set the scanned data to state
    fetchPedidoData(result?.data); // Call Firebase function after scanning
  };

  // Fail callback function
  const onScanFail = (err) => {
    //console.log(err); // Log the error to the console
  };

  // Fetch the pedido data from Firebase
  const fetchPedidoData = async (NumeroPedido) => {
    setLoading(true);
    setError(null);

    try {
      // Referencia a la colección de pedidos
      const pedidosRef = collection(db, 'pedidos');

      // Realizamos la búsqueda en Firebase
      const q = query(pedidosRef, where("NumeroPedido", "==", Number(NumeroPedido)));  // Aseguramos que el número es convertido a tipo Number
      const querySnapshot = await getDocs(q);

      console.log(querySnapshot);  // Para ver el objeto completo de la consulta

      if (querySnapshot.empty) {
        setError("No se encontró el pedido.");
      } else {
        // Extraemos los datos del primer pedido que coincida
        querySnapshot.forEach((doc) => {
          console.log("Pedido encontrado:", doc.data()); // Muestra los datos del pedido en la consola
          setPedidoData(doc.data()); // Almacenamos los datos del pedido
        });
      }
    } catch (err) {
      setError("Error al buscar el pedido. Intenta nuevamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoEl?.current && !scanner.current) {
      // Instantiate the QR Scanner
      scanner.current = new QrScanner(videoEl.current, onScanSuccess, {
        onDecodeError: onScanFail,
        preferredCamera: "environment", // Use back camera by default
        highlightScanRegion: true, // Highlight the scan region
        highlightCodeOutline: true, // Outline the scanned QR code
        overlay: qrBoxEl?.current || undefined, // Custom overlay for scanning region
      });

      // Start QR Scanner
      scanner?.current
        ?.start()
        .then(() => setQrOn(true)) // Successfully started the scanner
        .catch((err) => {
          if (err) setQrOn(false); // Handle scanner start failure
        });
    }

    // Cleanup function to stop the scanner when component unmounts
    return () => {
      if (!videoEl?.current) {
        scanner?.current?.stop();
      }
    };
  }, []);

  // Handle camera permissions or availability
  useEffect(() => {
    if (!qrOn)
      alert(
        "Camera is blocked or not accessible. Please allow camera in your browser permissions and Reload."
      );
  }, [qrOn]);

  return (
    <div className="qr-reader relative w-full h-screen">
     

      {/* Video element for QR scanning */}
      <video
        ref={videoEl}
        className="w-[150px] h-[150px] object-cover mx-auto mt-4" // Limit the video size to match the scan region
      ></video>

      {/* QR Scan Region Overlay */}
      <div
        ref={qrBoxEl}
        className="qr-box absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-4 border-dashed border-white rounded-lg flex justify-center items-center"
      >
        {!videoEl?.current && (
          <img
            src={qr}
            alt="Qr Frame"
            width={128}
            height={128}
            className="qr-frame"
          />
        )}
      </div>

      {/* Display the scanned result */}
      {scannedResult && (
        <p className="absolute top-0 left-0 z-50 text-white bg-black p-2 rounded">
          QR Leido: {scannedResult}
        </p>
      )}

      {/* Display Pedido Data */}
      {loading && <p className="text-gray-500">Cargando datos del pedido...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {pedidoData && (
       <div className="w-[90%] md:w-[500px] mx-auto p-6 font-nunito">
       {/* Título o encabezado principal */}
       <div className="bg-[#f2ac02] p-4 rounded-lg shadow-lg text-white text-center relative">
       <h1 className="text-md font-bold">Revisión de Pedidos</h1>
      
       {/* Condición para mostrar la imagen solo si "pagado" es true */}
        {pedidoData.pagado && (
          <img 
            src={pagado} 
            alt="Icono encima" 
            className="absolute top-64 left-1/2 transform -translate-x-1/2 -translate-y-8 rotate-90 w-72"
          />
        )}
     </div>
     
     {/* Contenedor de los 4 elementos (QR, Fecha, Cliente) */}
     <div className="grid grid-cols-4 gap-4 mt-6">
       {/* Primer Item: QR */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={qr_final} alt="Codigo QR" className="w-4 mx-auto mb-2" />
         <h2 className="text-sm font-semibold">{pedidoData.NumeroPedido}</h2>
       </div>
     
       {/* Segundo Item: Calendario (Fecha) */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={fecha_prevista} alt="Calendario" className="w-4 mx-auto mb-2" />
         <h2 className="text-sm font-semibold"> {pedidoData.fechahora_realizado}</h2>
       </div>
     
       {/* Tercer Item: Calendario (Fecha) */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={fecha_recogida} alt="Calendario" className="w-4 mx-auto mb-2" />
         <h2 className="text-sm font-semibold">{pedidoData.fechahora}</h2>
       </div>
     
       {/* Cuarto Item: Cliente */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
        <img src={cliente} alt="Cliente" className="w-4 mx-auto mb-2" />
        <h2 className="text-sm font-semibold text-center">{pedidoData.cliente}<br/>{pedidoData.telefono}</h2>
      </div>
     
       {/* Quinto Item: Cliente */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={gluten} alt="Cliente" className="w-4 mx-auto mb-2" />
         {pedidoData.pagado ? (
          <img src={singluten} alt="Tarjeta" className="w-6 mx-auto" />
        ) : (
          // Si no tiene gluten, no se muestra nada o puedes mostrar algo vacío
          null
        )}
       </div>
     
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
        <img src={metodopago} alt="Cliente" className="w-4 mx-auto mb-2" />
        {pedidoData.pagado ? (
          <img src={dinero} alt="Tarjeta" className="w-6 mx-auto" />
        ) : (
          // Si no está pagado, no se muestra nada o puedes mostrar algo vacío
          null
        )}
      </div>
     
       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={empleado} alt="Cliente" className="w-4 mx-auto mb-2" />
         <h2 className="text-sm font-semibold">desco</h2>
       </div>

       <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
         <img src={pin} alt="Cliente" className="w-4 mx-auto mb-2" />
        {/* Aquí se usa la condición para mostrar una imagen según el valor */}
        {pedidoData.origen === 1 ? (
                  <img
                    src={internet}
                    alt="Imagen para internet"
                    className="w-6 mx-auto"
                  />
                ) : (
                  <img
                    src={store}
                    alt="Imagen para tienda"
                    className="w-6 mx-auto"
                  />
                )}
       </div>


     </div>

     
     
     
       {/* Contenedor para la tabla de productos */}
       <div className="mt-8">
         <ul className="w-full border-collapse table-auto rounded-lg overflow-hidden shadow-lg font-nunito">
           {/* Encabezado de la tabla */}
           <li className="flex bg-[#f2ac02] text-white p-3 text-center text-xl">
             <span className="w-1/3 font-semibold">Producto</span>
             <span className="w-1/3 font-semibold">Cantidad</span>
             <span className="w-1/3 font-semibold">Precio</span>
           </li>
           
           {/* Aquí puedes agregar dinámicamente las filas de productos */}
            {pedidoData.productos && pedidoData.productos.length > 0 ? (
              pedidoData.productos.map((producto, index) => (
                <li key={index} className="flex border-b border-gray-300 p-3 text-center text-xl">
                  <span className="w-1/3 truncate">{producto.nombre}</span>
                  <span className="w-1/3">{producto.cantidad}</span>
                  <span className="w-1/3">{producto.precio}€</span>
                 
                </li>
              ))
            ) : (
              <p className="text-center text-gray-500">No hay productos en este pedido.</p>
            )}
           {/* Más productos pueden ser añadidos aquí */}
     
            {/* Fila del total */}
             <li className="flex bg-gray-100 p-3 text-center font-semibold font-nunito">
               <span className="w-1/3 text-right font-extrabold text-2xl">Total</span>
               <span className="w-1/3"></span> {/* Columna vacía en el medio */}
               <span className="w-1/3 font-extrabold text-2xl">{pedidoData.total_pedido}€</span> {/* Total */}
             </li>
         </ul>
     
        
          
           {/* observaciones */}
           <div className="bg-gray-100 p-4 rounded-lg shadow-lg text-gray-500 text-center mt-4">
             <h1 className="text-md font-bold font-nunito">{pedidoData.observaciones}</h1>
           </div>
     
     
       
           {/*Aprobación tarjeta */}
           <div className="bg-gray-100 p-4 rounded-lg shadow-lg text-gray-500 text-center mt-4">
             <h1 className="text-md font-bold font-nunito">Tarjeta</h1>
           </div>
     
        
       
     
     
     
       </div>
     
       
       
     
     
     
     
     </div>
      )}
    </div>
  );
};

export default Scanner;
