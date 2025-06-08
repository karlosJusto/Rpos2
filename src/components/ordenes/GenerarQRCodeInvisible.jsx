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
    if (qrGenerado || !numeroPedido) return; // Evitar si ya fue generado o no hay numeroPedido

    const verificarYGenerarQR = async () => {
      const numeroPedidoString = numeroPedido.toString();
      const pedidoDocRef = doc(db, 'pedidos', numeroPedidoString);

      try {
        // 1. Verificar si el QR ya existe en Firestore
        const docSnap = await getDoc(pedidoDocRef);
        if (docSnap.exists() && docSnap.data().codigoQR) {
          // console.log(`[QR Invisible] QR ya existe en Firestore para ${numeroPedidoString}`);
          setQrGenerado(true); // Marcar como generado si ya existe en DB
          return;
        }

        // 2. Si no existe, proceder a generar y subir
        // Asegurarse de que el componente QRCode esté montado y tenga el SVG
        // Esto se maneja mejor esperando el renderizado del componente QRCode
        // y luego accediendo al ref. El renderizado condicional de QRCode ayuda aquí.

        // Usamos un pequeño delay para asegurarnos de que el QR se ha generado correctamente en el DOM
        // (especialmente porque QRCode se renderiza condicionalmente ahora)
        setTimeout(async () => {
          if (!qrCodeRef.current) {
              // console.warn(`[QR Invisible] qrCodeRef.current es null después del timeout para ${numeroPedidoString}. Esto puede pasar si el componente se desmontó.`);
              return;
          }
          const svgElement = qrCodeRef.current.querySelector('svg');
          if (!svgElement) {
            // Esto podría pasar si el componente QRCode no se renderizó (por ej. qrGenerado se puso a true antes)
            // o si el selector falla.
            // console.warn(`[QR Invisible] No se encontró el svg generado para ${numeroPedidoString}. Verifique si QRCode se renderizó.`);
            return;
          }

          const svgString = new XMLSerializer().serializeToString(svgElement);
          const base64Image = 'data:image/svg+xml;base64,' + window.btoa(svgString);
          const qrStorageRef = ref(storage, `qr/${numeroPedidoString}.png`);

          try {
            await uploadString(qrStorageRef, base64Image, 'data_url');
            const downloadURL = await getDownloadURL(qrStorageRef);

            // Actualizar Firestore solo si el documento del pedido aún existe
            // y si el QR no se generó mientras tanto por otra instancia/proceso.
            const currentPedidoSnap = await getDoc(pedidoDocRef);
            if (currentPedidoSnap.exists() && !currentPedidoSnap.data().codigoQR) {
              await updateDoc(pedidoDocRef, { codigoQR: downloadURL });
              // console.log(`[QR Invisible] Código QR guardado en Firestore para ${numeroPedidoString}`);
            } else if (currentPedidoSnap.exists() && currentPedidoSnap.data().codigoQR) {
              // console.log(`[QR Invisible] QR para ${numeroPedidoString} ya fue guardado por otro proceso.`);
            } else {
              // console.warn(`[QR Invisible] El pedido ${numeroPedidoString} ya no existe en Firestore al intentar guardar URL del QR.`);
            }
            setQrGenerado(true);
          } catch (error) {
            console.error(`[QR Invisible] Error en subida o actualización de Firestore para ${numeroPedidoString}:`, error);
            // No se establece qrGenerado a true aquí para permitir reintentos si es un error transitorio,
            // aunque la lógica de verificación al inicio del efecto debería manejar esto.
          }
        }, 150); // Aumentado ligeramente el delay para el renderizado del SVG

      } catch (error) {
        console.error(`[QR Invisible] Error verificando QR en Firestore para ${numeroPedidoString}:`, error);
      }
    };

    verificarYGenerarQR();

  }, [numeroPedido, qrGenerado]); // Ejecuta si el numeroPedido cambia y qrGenerado es false

  return (
    <div className="flex flex-col items-center mt-5">
      {/* El div con el ref debe existir para que qrCodeRef.current no sea null */}
      {/* Renderizar QRCode solo si es necesario y el ref está disponible */}
      <div ref={qrCodeRef} className="hidden">
        {numeroPedido && !qrGenerado && (
          <QRCode value={numeroPedido.toString()} size={128} />
        )}
      </div>
    </div>
  );
};

export default React.memo(GenerarQRCodeInvisible);
