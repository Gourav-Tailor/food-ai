"use client";

import { useState } from "react";
import axios from "axios";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 28.6139, // Default to New Delhi
  lng: 77.209,
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"location" | "list">("location");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(defaultCenter);
  const [userAddress, setUserAddress] = useState<string>("");

  // new state for filters
  const [keyword, setKeyword] = useState<string>("");
  const [radius, setRadius] = useState<number>(1500); // default 1.5km

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  });

  const fetchRestaurants = async () => {
    if (!userLocation) return;
    setLoading(true);

    // Reverse geocode for address
    const geoRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        latlng: `${userLocation.lat},${userLocation.lng}`,
        key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      },
    });
    if (geoRes.data.results.length > 0) {
      setUserAddress(geoRes.data.results[0].formatted_address);
    }

    // Fetch restaurants from our API
    const res = await axios.get("/api/restaurants", {
      params: {
        lat: userLocation.lat,
        lng: userLocation.lng,
        keyword: keyword || undefined,
        radius: radius || 1500,
      },
    });

    setRestaurants(res.data.results || []);
    setLoading(false);
    setActiveTab("list");
  };

  const getPhotoUrl = (photoReference: string) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;

  function getPriceRange(priceLevel?: number): string {
    if (priceLevel === undefined) return "N/A";
    switch (priceLevel) {
      case 0: return "Free";
      case 1: return "₹ (Inexpensive)";
      case 2: return "₹₹ (Moderate)";
      case 3: return "₹₹₹ (Expensive)";
      case 4: return "₹₹₹₹ (Very Expensive)";
      default: return "N/A";
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "location" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
          }`}
          onClick={() => setActiveTab("location")}
        >
          📍 Select Location
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "list" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"
          }`}
          onClick={() => setActiveTab("list")}
        >
          🍴 Restaurants List
        </button>
      </div>

      {/* Select Location Tab */}
      {activeTab === "location" && (
        <div className="flex flex-col items-center w-full">
          <h1 className="text-2xl font-bold mb-4">Choose Your Location</h1>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={userLocation || defaultCenter}
              zoom={14}
              onClick={(e) =>
                setUserLocation({ lat: e.latLng?.lat() || 0, lng: e.latLng?.lng() || 0 })
              }
            >
              {userLocation && (
                <Marker
                  position={userLocation}
                  draggable
                  onDragEnd={(e) =>
                    setUserLocation({ lat: e.latLng?.lat() || 0, lng: e.latLng?.lng() || 0 })
                  }
                />
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}

          {/* Filter inputs */}
          <div className="mt-6 w-full max-w-md space-y-4">
            <input
              type="text"
              placeholder="Type of restaurant (optional, e.g. pizza, sushi)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full border p-2 rounded"
            />
            <input
              type="number"
              placeholder="Radius in meters (default 1500)"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border p-2 rounded"
            />
          </div>

          <button
            onClick={fetchRestaurants}
            className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Find Restaurants Here
          </button>

          {userAddress && <p className="mt-2 text-gray-700">📍 {userAddress}</p>}
        </div>
      )}

      {/* List Tab */}
      {activeTab === "list" && (
        <div>
          <h1 className="text-2xl font-bold mb-4">Nearby Restaurants</h1>
          {userAddress && (
            <p className="mb-4 text-gray-700 font-medium">
              📍 Your Location: <span className="text-blue-600">{userAddress}</span>
            </p>
          )}
          {loading && <p>Loading...</p>}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r, idx) => {
              const distance =
                userLocation && r.geometry?.location
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      r.geometry.location.lat,
                      r.geometry.location.lng
                    )
                  : null;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-md border overflow-hidden hover:shadow-lg transition"
                >
                  {r.photos && r.photos.length > 0 ? (
                    <img
                      src={getPhotoUrl(r.photos[0].photo_reference)}
                      alt={r.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="text-lg font-semibold">{r.name}</h2>
                    <p className="text-gray-600">{r.vicinity}</p>
                    <p className="text-yellow-600">
                      ⭐ {r.rating || "N/A"} ({r.user_ratings_total || 0} reviews)
                    </p>
                    <p className="text-green-600">💲 {getPriceRange(r.price_level)}</p>
                    {distance && <p className="text-gray-700">📏 {distance} km away</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
