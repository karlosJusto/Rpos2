// cropImage.js
export const getCroppedImg = (imageSrc, croppedAreaPixels) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.setAttribute("crossOrigin", "anonymous"); // importante para imágenes de origen remoto
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;
        const ctx = canvas.getContext("2d");
  
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );
  
        canvas.toBlob((blob) => {
          if (!blob) {
            // En caso de error
            console.error("Canvas is empty");
            return reject(new Error("Canvas is empty"));
          }
          // Se puede convertir el blob en un File si se necesita:
          const file = new File([blob], "cropped_image.jpg", { type: blob.type });
          resolve(file);
        }, "image/jpeg");
      };
      image.onerror = (error) => {
        reject(error);
      };
    });
  };
  