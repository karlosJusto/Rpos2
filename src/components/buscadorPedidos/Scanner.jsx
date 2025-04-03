import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { db } from "../firebase/firebase"; // Importa la configuración de Firebase
import { collection, query, where, getDocs } from "firebase/firestore";
import pagado from '../../assets/ticket/pagado.png'; // Imagen paid
import qr from '../../assets/qr.png'; // Imagen qr


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

      //console.log(querySnapshot);  // Para ver el objeto completo de la consulta

      if (querySnapshot.empty) {
        setError("No se encontró el pedido.");
      } else {
        // Extraemos los datos del primer pedido que coincida
        querySnapshot.forEach((doc) => {
          //console.log("Pedido encontrado:", doc.data()); // Muestra los datos del pedido en la consola
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

      <div className="mt-6 text-center font-nunito">
      <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-around gap-4 mb-4 -mt-8">
        {pedidoData ? (
          <div className="space-y-4">
            <div className="border p-4 rounded-md shadow-md hover:shadow-xl transition mt-4 relative">
              {/* Mostrar la imagen "Paid" solo si el pedido está pagado */}
              {pedidoData.pagado && (
                <img
                  src={pagado} // Ruta a tu imagen
                  alt="Pago Realizado"
                  className="absolute top-80 right-10 w-60 h-60 transform rotate-90"
                />
              )}

              {/* Información del Pedido */}
              <table className="table table-striped table-bordered shadow-sm rounded-lg mb-4 font-nunito">
                <thead className="thead-dark">
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Teléfono</th>
                    <th>F.Realizado</th>
                    <th>F.Recogida</th>
                    <th>Empleado</th>
                    <th>Origen</th>
                    <th>Nº auto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-light">
                    <td className="font-extrabold">{pedidoData.NumeroPedido}</td>
                    <td>{pedidoData.cliente}</td>
                    <td>{pedidoData.telefono}</td>
                    <td>{pedidoData.fechahora_realizado}</td>
                    <td>{pedidoData.fechahora}</td>
                    <td>Alain</td>
                    <td>{pedidoData.origen === 1 ? 'Online' : 'Tienda'}</td>
                    <td>12345ABCD</td>
                  </tr>
                </tbody>
              </table>

              {/* Tabla de Productos Comprados */}
              <div>
                <h5 className="font-semibold text-lg text-yellow-500 pb-2">Productos Comprados</h5>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoData.productos.map((producto, index) => (
                      <tr key={index}>
                        <td>{producto.nombre}</td>
                        <td>{producto.cantidad}</td>
                        <td>{producto.precio} €</td>
                        <td>{producto.total} €</td>
                      </tr>
                    ))}
                    {/* Fila de Total Pedido */}
                    <tr className="font-extrabold">
                      <td colSpan="3" className="text-right">Total Pedido:</td>
                      <td>{pedidoData.productos.reduce((acc, item) => acc + parseFloat(item.total), 0).toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabla del Código QR */}
              <div className="mt-6">
                <h5 className="font-semibold text-lg text-yellow-500 pb-2">Código QR del Pedido</h5>
                <table className="table table-sm border-none">
                  <tbody>
                    <tr>
                      <td colSpan="2" className="text-center p-3 pb-1 border-0">
                        <img src={pedidoData.codigoQR} alt={`Código QR del Pedido ${pedidoData.NumeroPedido}`} className="w-32 h-32 mx-auto" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">No se encontraron pedidos para este cliente.</p>
        )}
      </div>
    </div>
  </div>
    </div>
  );
};

export default Scanner;
