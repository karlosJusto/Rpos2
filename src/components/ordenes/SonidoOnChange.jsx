import React, { useEffect, useRef } from 'react';

const SonidoOnChange = ({ pedidosConOrigenUno }) => {
  const sonidoRef = useRef(null); // Referencia para controlar el sonido
  const prevPedidosConOrigenUnoRef = useRef(pedidosConOrigenUno); // Referencia para guardar el valor previo
  

  // Crear el sonido cuando el componente se monta
  useEffect(() => {
   // sonidoRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
    sonidoRef.current = new Audio('/musica/audio.mp3');
  }, []);

  // Reproducir el sonido cuando pedidosConOrigenUno cambia
  useEffect(() => {
    if (pedidosConOrigenUno > prevPedidosConOrigenUnoRef.current) { // Verificar si el valor ha cambiado
      if (sonidoRef.current) {
        sonidoRef.current.pause(); // Pausar el audio si ya está sonando
        sonidoRef.current.currentTime = 0; // Reiniciar el audio
        sonidoRef.current.play().catch((error) => {
          console.error('Error al intentar reproducir el sonido:', error);
        });
      }
    }

    // Actualizar el valor previo
    prevPedidosConOrigenUnoRef.current = pedidosConOrigenUno;
  }, [pedidosConOrigenUno]); // Se ejecuta cuando pedidosConOrigenUno cambia

  return (
    <>
    </>
  );
};

export default SonidoOnChange;