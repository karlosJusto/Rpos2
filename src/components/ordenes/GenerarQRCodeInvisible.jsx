import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { storage } from '../firebase/firebase'; // Asume que tienes la configuración de Firebase correcta
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase/firebase'; // Asegúrate de que db esté exportado de tu configuración de Firebase
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Asegúrate de importar estos métodos de Firestore

const GenerarQRCodeInvisible = ({ numeroPedido }) => {
  const [qrGenerado, setQrGenerado] = useState(false); // Estado para controlar si el QR ha sido generado
  const qrCodeRef = useRef(null);  // Usamos un ref para capturar el componente QR generado

  useEffect(() => {
    if (qrGenerado) return; // Evitar ejecutar nuevamente si ya fue generado

    const generarQRCode = async () => {
      try {
        // Convertir el numeroPedido a string
        const numeroPedidoString = numeroPedido.toString();

        // Usamos un pequeño delay para asegurarnos de que el QR se ha generado correctamente
        setTimeout(async () => {
          // Obtener el svg generado por el componente QRCode
          const svgElement = qrCodeRef.current.querySelector('svg');
          if (!svgElement) {
            console.error('No se encontró el svg generado');
            return;
          }

          // Convertir el SVG a base64
          const svgString = new XMLSerializer().serializeToString(svgElement);
          const base64Image = 'data:image/svg+xml;base64,' + window.btoa(svgString);

          // Crear una referencia en Firebase Storage con el nombre del numeroPedido
          const qrRef = ref(storage, `qr/${numeroPedidoString}.png`);

          // Subir la imagen a Firebase Storage
          uploadString(qrRef, base64Image, 'data_url')
            .then(async () => {
              // Obtener la URL del código QR almacenado en Firebase Storage
              const downloadURL = await getDownloadURL(qrRef);

              // Ahora actualizamos el pedido en Firestore, añadiendo la URL del QR
              const pedidoDoc = doc(db, 'pedidos', numeroPedidoString);
              const pedidoSnapshot = await getDoc(pedidoDoc);

              if (pedidoSnapshot.exists()) {
                // Solo actualizamos el campo qrCodeUrl sin tocar los demás datos del pedido
                await updateDoc(pedidoDoc, {
                  codigoQR: downloadURL, // Añadimos solo el campo qrCodeUrl
                });
                //console.log('Código QR guardado correctamente en Firestore');
              } else {
                //console.error('El pedido no existe en Firestore');
              }

            })
            .catch((error) => {
             // console.error('Error al subir el código QR a Firebase Storage:', error);
            });

          // Marcar el QR como generado
          setQrGenerado(true);
        }, 100); // Un pequeño delay para garantizar que el QR se haya generado

      } catch (error) {
        console.error('Error generando el código QR:', error);
      }
    };

    generarQRCode();  // Ejecutar la generación y subida del código QR

  }, [numeroPedido, qrGenerado]); // Ejecuta si el numeroPedido cambia y qrGenerado es false

  return (
    <div className="flex flex-col items-center mt-5">
      <div ref={qrCodeRef} className="hidden">
        <QRCode value={numeroPedido.toString()} size={128} />
      </div>
    </div>
  );
};

export default GenerarQRCodeInvisible;
