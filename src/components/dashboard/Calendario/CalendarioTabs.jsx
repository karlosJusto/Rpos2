// CalendarTabs.jsx
import { useState } from "react";
import CalendarioPollos from "./CalendarioPollos";
import CalendarioCostillas from "./CalendarioCostillas";
import CalendarioCodillo from "./CalendarioCodillos";
import { useOrder } from '../../Context/OrderProviderContext';

const CalendarTabs = () => {
  const [activeTab, setActiveTab] = useState("chicken");
  const { setOrderType } = useOrder();

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setOrderType(tabKey); // Actualiza el orderType en el contexto
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "chicken":
        return <CalendarioPollos />;
      case "costilla":
        return <CalendarioCostillas />;
      case "codillo":
        return <CalendarioCodillo />;
      default:
        return <CalendarioPollos />;
    }
  };

  return (
    <div>
      <div className="fixed top-[6.35vh] left-0 right-0 flex justify-center mb-2 bg-white z-10 pt-3 border-b-2 text-gray-700">
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
            activeTab === "chicken"
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick("chicken")}
        >
          Pollos
        </div>
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
            activeTab === "costilla"
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick("costilla")}
        >
          Costillas
        </div>
        <div
          className={`px-4 py-3 text-md font-semibold cursor-pointer p-2 transition-all duration-300 ease-in-out ${
            activeTab === "codillo"
              ? "border-t-2 border-l-2 border-r-2 border-yellow-500 text-yellow-500 rounded-t-lg shadow-md"
              : "text-gray-700 hover:text-yellow-500"
          }`}
          onClick={() => handleTabClick("codillo")}
        >
          Codillo
        </div>
      </div>
      <div className="content mt-40">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CalendarTabs;
