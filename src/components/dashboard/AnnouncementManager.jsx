import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import logo from "../../assets/SP_UNA_LINEA.png";

const DEFAULT_ANNOUNCEMENT = {
  active: false,
  blocking: false,
  ctaLabel: "",
  imageUrl:
    "https://firebasestorage.googleapis.com/v0/b/superpollorpos.firebasestorage.app/o/imagenes_sinfondo%2F1.png?alt=media&token=cf599bf8-a473-42f7-8dd8-e9abf036aa9a",
  message: "",
  title: "",
};

const ToggleField = ({ label, description, checked, name, onChange }) => (
  <label className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
    <div className="space-y-1">
      <p className="font-nunito text-sm font-extrabold text-gray-800">{label}</p>
      <p className="font-nunito text-sm text-gray-500">{description}</p>
    </div>

    <span
      className={`relative mt-1 inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors ${checked ? "bg-yellow-400" : "bg-gray-300"
        }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </span>
  </label>
);

const TextField = ({ label, name, value, onChange, placeholder }) => (
  <label className="block space-y-2">
    <span className="font-nunito text-sm font-extrabold text-gray-700">{label}</span>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-nunito text-sm text-gray-700 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
    />
  </label>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, rows = 4 }) => (
  <label className="block space-y-2">
    <span className="font-nunito text-sm font-extrabold text-gray-700">{label}</span>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 font-nunito text-sm text-gray-700 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
    />
  </label>
);

const AnnouncementManager = () => {
  const [formData, setFormData] = useState(DEFAULT_ANNOUNCEMENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const announcementRef = doc(db, "settings", "announcement");
        const snapshot = await getDoc(announcementRef);

        if (snapshot.exists()) {
          setFormData({
            ...DEFAULT_ANNOUNCEMENT,
            ...snapshot.data(),
          });
        }
      } catch (error) {
        console.error("Error loading announcement:", error);
        setFeedback({
          type: "error",
          message: "No se pudo cargar la configuración del anuncio.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncement();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_ANNOUNCEMENT);
    setFeedback({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        active: !!formData.active,
        blocking: !!formData.blocking,
        ctaLabel: formData.ctaLabel.trim(),
        imageUrl: formData.imageUrl.trim(),
        message: formData.message.trim(),
        title: formData.title.trim(),
      };

      await setDoc(doc(db, "settings", "announcement"), payload);
      setFormData(payload);
      setFeedback({
        type: "success",
        message: "Anuncio guardado correctamente.",
      });
    } catch (error) {
      console.error("Error saving announcement:", error);
      setFeedback({
        type: "error",
        message: "No se pudo guardar el anuncio. Inténtalo otra vez.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-3xl border border-yellow-100 bg-white px-8 py-6 shadow-sm">
          <p className="font-nunito text-base font-bold text-gray-600">Cargando configuración del anuncio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-nunito">
      <div className="rounded-[28px] bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-300 p-[1px] shadow-sm">
        <div className="rounded-[27px] bg-[#F3F3F3] px-6 py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <span className="inline-flex w-fit rounded-full bg-yellow-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] text-yellow-700">
                App Mobile
              </span>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-800">Anuncio emergente</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500">
                  Gestiona el modal informativo que verán los clientes al abrir la app.
                </p>
              </div>
            </div>


          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-800">Configuración</h2>
                <p className="text-sm text-gray-500">Edita el contenido y compórtamiento del modal.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleField
                label="Anuncio activo"
                checked={formData.active}
                name="active"
                onChange={handleChange}
              />
              <ToggleField
                label="Modal bloqueante"
                description="Úsalo para avisos por ejemplo tienda cerrada"
                checked={formData.blocking}
                name="blocking"
                onChange={handleChange}
              />
            </div>

            <div className="mt-5 grid gap-4">
              <TextField
                label="Título"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Nuevo producto"
              />

              <TextAreaField
                label="Mensaje"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Hemos añadido pollo con bacon y salsa cheddar"
                rows={5}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Texto del botón"
                  name="ctaLabel"
                  value={formData.ctaLabel}
                  onChange={handleChange}
                  placeholder="Probar ahora"
                />
                <TextField
                  label="URL de la imagen (en siguientes versiones se podran subir imagenes)"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 md:flex-row md:items-center md:justify-between">
              <div>
                {feedback.message ? (
                  <p
                    className={`text-sm font-bold ${feedback.type === "success" ? "text-green-600" : "text-red-500"
                      }`}
                  >
                    {feedback.message}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400"></p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-extrabold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Guardando..." : "Guardar anuncio"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="rounded-[28px] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-gray-800">Vista previa (aproximada)</h2>
          </div>

          <div className="mx-auto w-full max-w-[390px] rounded-[42px] bg-[rgba(48,46,43,0.9)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <div className={`overflow-hidden rounded-[32px] bg-[#F8F6F1] px-5 pb-6 pt-6 shadow-[0_22px_50px_rgba(0,0,0,0.18)] transition ${formData.active ? "opacity-100" : "opacity-65"}`}>
              <div className="mb-5 flex justify-center">
                <img src={logo} alt="SuperPollo" className="h-12 w-auto object-contain" />
              </div>

              <div className="mx-auto mb-6 w-full max-w-[290px] overflow-hidden rounded-[26px] bg-gradient-to-br from-yellow-100 via-orange-100 to-amber-200">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt={formData.title || "Vista previa del anuncio"}
                    className="h-[250px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[250px] items-center justify-center px-8 text-center">
                    <p className="text-sm font-bold text-gray-400">Añade una imagen para verla aquí</p>
                  </div>
                )}
              </div>

              <div className="px-2 text-center">
                <h3 className="text-[34px] font-extrabold leading-[1.05] text-gray-900">
                  {formData.title || "Título del anuncio"}
                </h3>
                <p className="mx-auto mt-4 max-w-[290px] text-[18px] leading-[1.45] text-gray-500">
                  {formData.message || "Aquí aparecerá el mensaje principal del modal para la app móvil."}
                </p>

                <div className="mt-8">
                  {formData.ctaLabel ? (
                    <button
                      type="button"
                      className="w-full rounded-[24px] bg-gradient-to-b from-[#FFB21A] to-[#FF9F00] px-4 py-5 text-[19px] font-extrabold text-white shadow-[0_18px_30px_rgba(255,163,0,0.28)]"
                    >
                      {formData.ctaLabel}
                    </button>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-gray-300 px-4 py-5 text-center text-sm font-bold text-gray-400">
                      Sin botón CTA
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default AnnouncementManager;
