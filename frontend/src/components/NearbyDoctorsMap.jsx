import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CITY_COORDS = {
 bangalore: { lat: 12.9716, lng: 77.5946 },
 bengaluru: { lat: 12.9716, lng: 77.5946 },
 mumbai: { lat: 19.076, lng: 72.8777 },
 pune: { lat: 18.5204, lng: 73.8567 },
 delhi: { lat: 28.6139, lng: 77.209 },
 chennai: { lat: 13.0827, lng: 80.2707 },
 hyderabad: { lat: 17.385, lng: 78.4867 },
 kolkata: { lat: 22.5726, lng: 88.3639 },
 ahmedabad: { lat: 23.0225, lng: 72.5714 },
 jaipur: { lat: 26.9124, lng: 75.7873 },
 lucknow: { lat: 26.8467, lng: 80.9462 }
};

const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 };

function getCityCoords(city) {
 if (!city) {
  return null;
 }

 return CITY_COORDS[String(city).trim().toLowerCase()] || null;
}

function haversineDistanceKm(a, b) {
 const toRadians = (value) => (value * Math.PI) / 180;
 const earthRadiusKm = 6371;

 const dLat = toRadians(b.lat - a.lat);
 const dLng = toRadians(b.lng - a.lng);

 const lat1 = toRadians(a.lat);
 const lat2 = toRadians(b.lat);

 const h =
  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

 return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function normalizeDoctorCoords(doctor, index, patientCoords) {
 const lat = Number(doctor.latitude);
 const lng = Number(doctor.longitude);

 if (Number.isFinite(lat) && Number.isFinite(lng)) {
  return { lat, lng, source: "profile" };
 }

 const cityCoords = getCityCoords(doctor.city);
 if (cityCoords) {
  return { ...cityCoords, source: "city" };
 }

 const angle = (index + 1) * (Math.PI / 5);
 const radius = 0.08 + (index % 4) * 0.015;
 return {
  lat: patientCoords.lat + radius * Math.sin(angle),
  lng: patientCoords.lng + radius * Math.cos(angle),
  source: "fallback"
 };
}

export default function NearbyDoctorsMap({ doctors, patientCity, onRequestConsultation }) {
 const [patientCoords, setPatientCoords] = useState(() => getCityCoords(patientCity) || DEFAULT_LOCATION);
 const [locationStatus, setLocationStatus] = useState("Using your city fallback location");
 const [locationMeta, setLocationMeta] = useState({ mode: "fallback", accuracyMeters: null });
 const [isLocating, setIsLocating] = useState(false);

 const requestLiveLocation = () => {
  const cityFallback = getCityCoords(patientCity) || DEFAULT_LOCATION;
  setIsLocating(true);

  if (!navigator.geolocation) {
   setPatientCoords(cityFallback);
   setLocationStatus("Live location unavailable. Showing fallback location.");
   setLocationMeta({ mode: "fallback", accuracyMeters: null });
   setIsLocating(false);
   return;
  }

  navigator.geolocation.getCurrentPosition(
   (position) => {
    setPatientCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    setLocationStatus("Using your live location");
    setLocationMeta({
     mode: "live",
     accuracyMeters: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null
    });
    setIsLocating(false);
   },
   () => {
    setPatientCoords(cityFallback);
    setLocationStatus("Location permission denied. Showing fallback location.");
    setLocationMeta({ mode: "fallback", accuracyMeters: null });
    setIsLocating(false);
   },
   { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
 };

 useEffect(() => {
  requestLiveLocation();
 }, [patientCity]);

 const doctorPoints = useMemo(() => {
  return doctors
   .map((doctor, index) => {
    const coords = normalizeDoctorCoords(doctor, index, patientCoords);
    const distanceKm = haversineDistanceKm(patientCoords, coords);

    return {
     ...doctor,
     coords,
     distanceKm
    };
   })
   .sort((a, b) => a.distanceKm - b.distanceKm);
 }, [doctors, patientCoords]);

 const nearestDoctors = doctorPoints.slice(0, 6);

 return (
  <section className="bg-white rounded-2xl shadow p-6" id="nearby-panel" role="tabpanel" aria-labelledby="nearby-tab">
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div>
     <h2 className="text-lg font-semibold">Nearby Doctors Map</h2>
     <p className="text-sm text-gray-500">{locationStatus}</p>
       <p className="text-xs text-gray-500 mt-1">
        Source: <strong>{locationMeta.mode === "live" ? "Live GPS" : "Fallback"}</strong>
        {" | "}
        Lat: <strong>{patientCoords.lat.toFixed(5)}</strong>
        {" | "}
        Lng: <strong>{patientCoords.lng.toFixed(5)}</strong>
        {locationMeta.accuracyMeters ? (
         <>
          {" | "}
          Accuracy: <strong>{locationMeta.accuracyMeters}m</strong>
         </>
        ) : null}
       </p>
    </div>
        <div className="flex items-center gap-2">
         <span className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-medium">
          {doctorPoints.length} doctors loaded
         </span>
         <button
          type="button"
          className="text-xs px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          onClick={requestLiveLocation}
          disabled={isLocating}
         >
          {isLocating ? "Refreshing..." : "Refresh Location"}
         </button>
        </div>
   </div>

   <div className="nearby-doctors-map mb-4">
        <MapContainer
         key={`${patientCoords.lat.toFixed(4)}-${patientCoords.lng.toFixed(4)}`}
         center={[patientCoords.lat, patientCoords.lng]}
         zoom={11}
         scrollWheelZoom
         className="h-full w-full rounded-xl"
        >
     <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
     />

     <CircleMarker center={[patientCoords.lat, patientCoords.lng]} radius={11} pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.95 }}>
      <Popup>
       <strong>You are here</strong>
      </Popup>
     </CircleMarker>

     {nearestDoctors.map((doctor) => (
      <CircleMarker
       key={doctor._id}
       center={[doctor.coords.lat, doctor.coords.lng]}
       radius={8}
       pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.92 }}
      >
       <Popup>
        <div className="text-sm">
         <p className="font-semibold">Dr. {doctor.name}</p>
         <p>{doctor.specialization || "General"}</p>
         {doctor.city ? <p className="text-gray-500">{doctor.city}</p> : null}
         <p className="font-medium mt-1">{doctor.distanceKm.toFixed(1)} km away</p>
         <button className="submit-btn text-xs px-3 py-1 mt-2" type="button" onClick={() => onRequestConsultation(doctor._id)}>
          Request Consultation
         </button>
        </div>
       </Popup>
      </CircleMarker>
     ))}

     {nearestDoctors.map((doctor) => (
      <Polyline
       key={`${doctor._id}-line`}
       positions={[
        [patientCoords.lat, patientCoords.lng],
        [doctor.coords.lat, doctor.coords.lng]
       ]}
       pathOptions={{ color: "#93c5fd", weight: 1.8, opacity: 0.5 }}
      />
     ))}
    </MapContainer>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {nearestDoctors.length ? (
     nearestDoctors.map((doctor, index) => (
      <div key={`${doctor._id}-card`} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
       <p className="font-semibold">#{index + 1} Dr. {doctor.name}</p>
       <p className="text-xs text-gray-500">{doctor.specialization || "General"}</p>
       <p className="text-xs text-gray-500">{doctor.city || "City not set"}</p>
       <p className="text-sm mt-1 text-teal-700 font-medium">Approx {doctor.distanceKm.toFixed(1)} km away</p>
      </div>
     ))
    ) : (
     <p className="text-sm text-gray-500">No doctors available to map right now.</p>
    )}
   </div>
  </section>
 );
}