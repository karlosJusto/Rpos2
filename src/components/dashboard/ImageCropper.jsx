// ImageCropper.jsx
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "./cropImage";

const ImageCropper = ({ imageSrc, onComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    try {
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(croppedImageFile);
    } catch (error) {
      console.error("Error al recortar la imagen", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-96 h-96 bg-white">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={13.8 / 9} // Las fotos parece que tienen esta relacion de aspecto
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="mt-4 flex space-x-4">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Aplicar
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
