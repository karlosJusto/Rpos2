import React, { useEffect, useRef, useState } from 'react';

const SonidoOnChange = ({ contadorValor, isLoggedIn }) => {
  const sonidoRef = useRef(null); // Referencia para controlar el sonido
  const prevContadorValorRef = useRef(contadorValor); // Referencia para guardar el valor previo de contadorValor

  // Crear el sonido cuando el componente se monta
  useEffect(() => {
    sonidoRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
  }, []);

  

  // Reproducir el sonido cuando el contadorValor aumenta
  useEffect(() => {
    if (contadorValor > prevContadorValorRef.current) { // Verificar si el contador ha aumentado
      if (sonidoRef.current) {
        sonidoRef.current.pause(); // Pausar el audio si ya está sonando
        sonidoRef.current.currentTime = 0; // Reiniciar el audio
        sonidoRef.current.play().catch((error) => {
          console.error('Error al intentar reproducir el sonido:', error);
        });
      }
    }

    // Actualizar el valor previo del contador
    prevContadorValorRef.current = contadorValor;

  }, [contadorValor]); // Solo se ejecuta cuando el valor de contadorValor cambia

  return (
    <div>
      <h2>Contador: {contadorValor}</h2>
    </div>
  );
};

export default SonidoOnChange;
