import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListHospitals, useListPatients } from "@workspace/api-client-react";
import { useDonors } from "@/hooks/use-donors";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Activity, Droplets,
  HeartPulse, RefreshCw, ChevronDown, ChevronUp, X
} from "lucide-react";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeIcon(label: string, color: string, size = 36) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:${size * 0.38}px;color:white;
      font-family:sans-serif;
      position:relative;
    ">
      ${label}
      <div style="
        position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:8px solid ${color};
      "></div>
    </div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 10)],
  });
}

const patientIcon = makeIcon("P", "#EF4444");
const donorIcon = makeIcon("D", "#3B82F6");
const matchedDonorIcon = makeIcon("★", "#F59E0B", 42);
const hospitalIcon = makeIcon("H", "#10B981");
const userIcon = makeIcon("Me", "#8B5CF6", 40);

function FlyToUser({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 1.5 });
  }, [position, map]);
  return null;
}

type SelectedItem = {
  type: "patient" | "donor" | "hospital" | "user";
  name: string;
  details: string[];
  distanceKm?: number;
};

export default function MapPage() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [flyToUser, setFlyToUser] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const { data: donors = [] } = useDonors();
  const { data: hospitals = [] } = useListHospitals();
  const { data: patients = [] } = useListPatients();
  const MUMBAI: [number, number] = [19.076, 72.877];

  const [matchedDonorIds, setMatchedDonorIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("carecell_match_donors");
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ id?: number }>;
        setMatchedDonorIds(new Set(parsed.map((d) => d.id).filter(Boolean) as number[]));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setFlyToUser(true);
        setLocError(null);
        setGeoLoading(false);
      },
      () => {
        setLocError("Location permission denied. Showing Mumbai.");
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, []);

  const distFrom = useCallback(
    (lat: number, lng: number) =>
      userPos ? haversineKm(userPos[0], userPos[1], lat, lng) : null,
    [userPos]
  );

  const mapCenter: [number, number] = userPos ?? MUMBAI;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-background/90 backdrop-blur-xl border-b border-border/50 flex items-center justify-between z-10 shrink-0">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Live Map
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {donors.filter(d => d.available).length} donors · {hospitals.length} hospitals · {patients.length} patients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={getLocation}
            disabled={geoLoading}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/50 transition-colors disabled:opacity-50"
            title="Find my location"
          >
            {geoLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Error toast */}
      {locError && (
        <div className="absolute top-[72px] left-4 right-4 z-[1000] bg-card/95 border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-muted-foreground shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="flex-1">{locError}</span>
          <button onClick={() => setLocError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
            maxZoom={20}
          />

          {flyToUser && userPos && <FlyToUser position={userPos} />}

          {/* User position */}
          {userPos && (
            <>
              <Circle
                center={userPos}
                radius={300}
                pathOptions={{ color: "#8B5CF6", fillColor: "#8B5CF6", fillOpacity: 0.15, weight: 1 }}
              />
              <Marker
                position={userPos}
                icon={userIcon}
                eventHandlers={{
                  click: () => setSelected({ type: "user", name: "Your Location", details: ["GPS coordinates obtained", "Used as reference for distance calculations"] }),
                }}
              >
                <Popup className="carecell-popup">
                  <strong>Your Location</strong>
                  <br />Lat: {userPos[0].toFixed(4)}, Lng: {userPos[1].toFixed(4)}
                </Popup>
              </Marker>
            </>
          )}

          {/* Patient Markers */}
          {patients.map((p) => {
            const dist = distFrom(p.latitude, p.longitude);
            return (
              <Marker
                key={`patient-${p.id}`}
                position={[p.latitude, p.longitude]}
                icon={patientIcon}
                eventHandlers={{
                  click: () =>
                    setSelected({
                      type: "patient",
                      name: p.name,
                      details: [
                        `Blood Group: ${p.bloodGroup}`,
                        `Urgency: ${p.urgency?.toUpperCase()}`,
                        `Diagnosis: ${p.cancerType}`,
                      ],
                      distanceKm: dist ?? undefined,
                    }),
                }}
              >
                <Popup>
                  <strong>Patient: {p.name}</strong><br />
                  Blood: {p.bloodGroup} · {p.urgency?.toUpperCase()}
                  {dist != null && <><br />{dist.toFixed(1)} km from you</>}
                </Popup>
              </Marker>
            );
          })}

          {/* Donors */}
          {donors.map((donor) => {
            const dist = distFrom(donor.latitude, donor.longitude);
            const isMatched = matchedDonorIds.has(donor.id);
            return (
              <Marker
                key={`donor-${donor.id}`}
                position={[donor.latitude, donor.longitude]}
                icon={isMatched ? matchedDonorIcon : donorIcon}
                eventHandlers={{
                  click: () =>
                    setSelected({
                      type: "donor",
                      name: donor.name,
                      details: [
                        `Blood Group: ${donor.bloodGroup}`,
                        `Available: ${donor.available ? "Yes ✓" : "No"}`,
                        `Phone: ${donor.phone}`,
                      ],
                      distanceKm: dist ?? undefined,
                    }),
                }}
              >
                <Popup>
                  <strong>{donor.name}</strong><br />
                  Blood: {donor.bloodGroup} · {donor.available ? "Available" : "Unavailable"}
                  {dist && <><br />{dist.toFixed(1)} km from you</>}
                </Popup>
              </Marker>
            );
          })}

          {/* Hospitals */}
          {hospitals.map((h) => {
            const dist = distFrom(h.latitude, h.longitude);
            return (
              <Marker
                key={`hosp-${h.id}`}
                position={[h.latitude, h.longitude]}
                icon={hospitalIcon}
                eventHandlers={{
                  click: () =>
                    setSelected({
                      type: "hospital",
                      name: h.name,
                      details: [
                        `Address: ${h.address}`,
                        `Blood Bank: ${h.bloodBankAvailable ? "Available ✓" : "Not available"}`,
                        `Beds: ${h.bedsAvailable ?? "—"}`,
                        `Phone: ${h.phone ?? "—"}`,
                      ],
                      distanceKm: dist ?? undefined,
                    }),
                }}
              >
                <Popup>
                  <strong>{h.name}</strong><br />
                  Blood Bank: {h.bloodBankAvailable ? "Yes" : "No"}
                  {dist && <><br />{dist.toFixed(1)} km from you</>}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend toggle */}
      <div className="absolute bottom-[90px] right-4 z-[500]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setLegendOpen((v) => !v)}
          className="bg-card/95 backdrop-blur-md border border-border rounded-full px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xl"
        >
          {legendOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          Legend
        </motion.button>
        <AnimatePresence>
          {legendOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-12 right-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl w-44 space-y-2.5"
            >
              {[
                { color: "#EF4444", label: "P", text: "Patient Request" },
                { color: "#3B82F6", label: "D", text: "Blood Donor" },
                { color: "#F59E0B", label: "★", text: "AI Matched Donor" },
                { color: "#10B981", label: "H", text: "Hospital" },
                { color: "#8B5CF6", label: "Me", text: "Your Location" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-md"
                    style={{ background: item.color }}
                  >
                    {item.label}
                  </div>
                  <span className="text-xs text-white">{item.text}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected item panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
            className="absolute bottom-[76px] left-0 right-0 z-[600] px-4"
          >
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-3xl p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md"
                    style={{
                      background:
                        selected.type === "patient" ? "#EF4444" :
                        selected.type === "donor" ? "#3B82F6" :
                        selected.type === "hospital" ? "#10B981" : "#8B5CF6",
                    }}
                  >
                    {selected.type === "patient" ? "P" :
                     selected.type === "donor" ? "D" :
                     selected.type === "hospital" ? "H" : "Me"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm leading-tight">{selected.name}</h3>
                    {selected.distanceKm != null && (
                      <p className="text-xs text-primary font-semibold mt-0.5 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {selected.distanceKm.toFixed(1)} km from you
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-white transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 pl-1">
                {selected.details.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                    {d}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="absolute top-[72px] left-4 right-4 z-[500] flex gap-2 mt-2">
        {[
          { icon: HeartPulse, color: "#EF4444", count: patients.length, label: "Patients" },
          { icon: Droplets, color: "#3B82F6", count: donors.filter(d => d.available).length, label: "Donors" },
          { icon: Activity, color: "#10B981", count: hospitals.length, label: "Hospitals" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-card/90 backdrop-blur-md border border-border/60 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <s.icon className="w-3.5 h-3.5 shrink-0" style={{ color: s.color }} />
            <div>
              <span className="text-sm font-bold text-white">{s.count}</span>
              <span className="text-[10px] text-muted-foreground ml-1">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
