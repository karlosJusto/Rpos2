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

const DEFAULT_APP_VERSION = {
  androidStoreUrl: "https://play.google.com/store/apps/details?id=com.superpollo.app&hl=es",
  iosStoreUrl: "itms-apps://itunes.apple.com/app/id6744891313",
  isUpdateOptional: false,
  minAndroidVersion: "1.2.0",
  minIosVersion: "1.2.0",
};

const ToggleField = ({ label, description = "", checked, name, onChange }) => (
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
  const [announcementData, setAnnouncementData] = useState(DEFAULT_ANNOUNCEMENT);
  const [appVersionData, setAppVersionData] = useState(DEFAULT_APP_VERSION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const announcementRef = doc(db, "settings", "announcement");
        const appVersionRef = doc(db, "settings", "appVersion");
        const [announcementSnapshot, appVersionSnapshot] = await Promise.all([
          getDoc(announcementRef),
          getDoc(appVersionRef),
        ]);

        if (announcementSnapshot.exists()) {
          setAnnouncementData({
            ...DEFAULT_ANNOUNCEMENT,
            ...announcementSnapshot.data(),
          });
        }

        if (appVersionSnapshot.exists()) {
          setAppVersionData({
            ...DEFAULT_APP_VERSION,
            ...appVersionSnapshot.data(),
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setFeedback({
          type: "error",
          message: "No se pudo cargar la configuración.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleAnnouncementChange = (event) => {
    const { name, value, type, checked } = event.target;

    setAnnouncementData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const handleAppVersionChange = (event) => {
    const { name, value, type, checked } = event.target;

    setAppVersionData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const handleReset = () => {
    setAnnouncementData(DEFAULT_ANNOUNCEMENT);
    setAppVersionData(DEFAULT_APP_VERSION);
    setFeedback({ type: "", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const announcementPayload = {
        active: !!announcementData.active,
        blocking: !!announcementData.blocking,
        ctaLabel: announcementData.ctaLabel.trim(),
        imageUrl: announcementData.imageUrl.trim(),
        message: announcementData.message.trim(),
        title: announcementData.title.trim(),
      };

      const appVersionPayload = {
        androidStoreUrl: appVersionData.androidStoreUrl.trim(),
        iosStoreUrl: appVersionData.iosStoreUrl.trim(),
        isUpdateOptional: !!appVersionData.isUpdateOptional,
        minAndroidVersion: appVersionData.minAndroidVersion.trim(),
        minIosVersion: appVersionData.minIosVersion.trim(),
      };

      await Promise.all([
        setDoc(doc(db, "settings", "announcement"), announcementPayload),
        setDoc(doc(db, "settings", "appVersion"), appVersionPayload),
      ]);

      setAnnouncementData(announcementPayload);
      setAppVersionData(appVersionPayload);
      setFeedback({
        type: "success",
        message: "Configuracion guardada correctamente.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setFeedback({
        type: "error",
        message: "No se pudo guardar la configuracion. Intentalo otra vez.",
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
                  Gestiona el modal informativo y la version minima requerida de la app.
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
                checked={announcementData.active}
                name="active"
                onChange={handleAnnouncementChange}
              />
              <ToggleField
                label="Modal bloqueante"
                description="Úsalo para avisos por ejemplo tienda cerrada"
                checked={announcementData.blocking}
                name="blocking"
                onChange={handleAnnouncementChange}
              />
            </div>

            <div className="mt-5 grid gap-4">
              <TextField
                label="Título"
                name="title"
                value={announcementData.title}
                onChange={handleAnnouncementChange}
                placeholder="Nuevo producto"
              />

              <TextAreaField
                label="Mensaje"
                name="message"
                value={announcementData.message}
                onChange={handleAnnouncementChange}
                placeholder="Hemos añadido pollo con bacon y salsa cheddar"
                rows={5}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Texto del botón"
                  name="ctaLabel"
                  value={announcementData.ctaLabel}
                  onChange={handleAnnouncementChange}
                  placeholder="Probar ahora"
                />
                <TextField
                  label="URL de la imagen (en siguientes versiones se podran subir imagenes)"
                  name="imageUrl"
                  value={announcementData.imageUrl}
                  onChange={handleAnnouncementChange}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-gray-800">Version minima</h2>
              <p className="text-sm text-gray-500">Configura los enlaces de tienda y las versiones obligatorias.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Version minima Android"
                name="minAndroidVersion"
                value={appVersionData.minAndroidVersion}
                onChange={handleAppVersionChange}
                placeholder="1.2.0"
              />
              <TextField
                label="Version minima iOS"
                name="minIosVersion"
                value={appVersionData.minIosVersion}
                onChange={handleAppVersionChange}
                placeholder="1.2.0"
              />
            </div>

            <div className="mt-4 grid gap-4">
              <TextField
                label="URL Google Play"
                name="androidStoreUrl"
                value={appVersionData.androidStoreUrl}
                onChange={handleAppVersionChange}
                placeholder="https://play.google.com/..."
              />
              <TextField
                label="URL App Store"
                name="iosStoreUrl"
                value={appVersionData.iosStoreUrl}
                onChange={handleAppVersionChange}
                placeholder="itms-apps://itunes.apple.com/..."
              />
              <ToggleField
                label="Actualizacion opcional"
                description="Si esta apagado, la actualizacion sera obligatoria al estar por debajo de la version minima."
                checked={appVersionData.isUpdateOptional}
                name="isUpdateOptional"
                onChange={handleAppVersionChange}
              />
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
                  {saving ? "Guardando..." : "Guardar configuracion"}
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
            <div className={`overflow-hidden rounded-[32px] bg-[#F8F6F1] px-5 pb-6 pt-6 shadow-[0_22px_50px_rgba(0,0,0,0.18)] transition ${announcementData.active ? "opacity-100" : "opacity-65"}`}>
              <div className="mb-5 flex justify-center">
                <img src={logo} alt="SuperPollo" className="h-12 w-auto object-contain" />
              </div>

              <div className="mx-auto mb-6 w-full max-w-[290px] overflow-hidden rounded-[26px] bg-gradient-to-br from-yellow-100 via-orange-100 to-amber-200">
                {announcementData.imageUrl ? (
                  <img
                    src={announcementData.imageUrl}
                    alt={announcementData.title || "Vista previa del anuncio"}
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
                  {announcementData.title || "Título del anuncio"}
                </h3>
                <p className="mx-auto mt-4 max-w-[290px] text-[18px] leading-[1.45] text-gray-500">
                  {announcementData.message || "Aquí aparecerá el mensaje principal del modal para la app móvil."}
                </p>

                <div className="mt-8">
                  {announcementData.ctaLabel ? (
                    <button
                      type="button"
                      className="w-full rounded-[24px] bg-gradient-to-b from-[#FFB21A] to-[#FF9F00] px-4 py-5 text-[19px] font-extrabold text-white shadow-[0_18px_30px_rgba(255,163,0,0.28)]"
                    >
                      {announcementData.ctaLabel}
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
