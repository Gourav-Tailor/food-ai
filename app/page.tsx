"use client";

import { useState } from "react";
import axios from "axios";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "400px",
};


const defaultCenter = {
  lat: 26.924179699327425, // Default to New Delhi
  lng: 75.82699334517531,
};

const key_groq = "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";

export default function ChatBotPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [foodImages, setFoodImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(1500);
  const [userInput, setUserInput] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [showMap, setShowMap] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  });

  // --- Helpers ---
  const getPhotoUrl = (photoReference: string) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;

  const getPriceRange = (priceLevel?: number): string => {
    if (priceLevel === undefined) return "N/A";
    switch (priceLevel) {
      case 0: return "Free";
      case 1: return "₹ (Inexpensive)";
      case 2: return "₹₹ (Moderate)";
      case 3: return "₹₹₹ (Expensive)";
      case 4: return "₹₹₹₹ (Very Expensive)";
      default: return "N/A";
    }
  };

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

  // --- API Calls ---
  const fetchRestaurants = async () => {
    if (!userLocation) return alert("Set location first");
    setLoading(true);

    // Reverse geocode
    const geoRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        latlng: `${userLocation.lat},${userLocation.lng}`,
        key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      },
    });
    if (geoRes.data.results.length > 0) {
      setUserAddress(geoRes.data.results[0].formatted_address);
    }

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
  };

  const fetchFoodImages = async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
        params: {
          q: keyword + " food",
          cx: process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CX,
          key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          searchType: "image",
          num: 9,
        },
      });
      setFoodImages(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setMessages((prev) => [
      ...prev,
      { type: "user", text: `Search restaurants for "${keyword}" within ${radius}m` },
    ]);

    await fetchRestaurants();
    await fetchFoodImages();

    setMessages((prev) => [
      ...prev,
      {
        type: "bot",
        text: `Here are restaurants near ${userAddress || "your location"} and some "${keyword}" food images.`,
      },
    ]);
  };

  const handleParse = async () => {
    try {
      await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key_groq}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: "You are a parser. Extract restaurant search parameters from user text. Output JSON with fields: keyword (string), radius (number in meters). If not found, use defaults: keyword='', radius=1500.",
                },
                {
                  role: "user",
                  content: `${userInput}`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
            }),
          })
            .then((response) => response.json())
            .then((completion) => {
              const parserJDData = JSON.parse(completion.choices[0].message.content);
                   setKeyword(parserJDData.keyword);
                   setRadius(parserJDData.radius);
            });

            await handleSearch();

    } catch (err: any) {
      console.error("Frontend error:", err.response?.data || err.message);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs ${
                msg.type === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))} */}

        {/* Restaurant carousel */}
        {restaurants.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold text-lg mb-2">🍴 Restaurants</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
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
                    className="bg-white min-w-[250px] rounded-xl shadow-md border overflow-hidden"
                  >
                    {r.photos && r.photos.length > 0 ? (
                      <img
                        src={getPhotoUrl(r.photos[0].photo_reference)}
                        alt={r.name}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                        No Image
                      </div>
                    )}
                    <div className="p-3">
                      <h2 className="text-md font-semibold">{r.name}</h2>
                      <p className="text-sm text-gray-600">{r.vicinity}</p>
                      <p className="text-yellow-600">
                        ⭐ {r.rating || "N/A"} ({r.user_ratings_total || 0})
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

        {/* Food carousel */}
        {foodImages.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-lg mb-2">🍕 Food Images</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {foodImages.map((img, idx) => (
                <div
                  key={idx}
                  className="bg-white min-w-[200px] rounded-xl shadow-md border overflow-hidden"
                >
                  <img src={img.link} alt={keyword} className="w-full h-32 object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    <div className="border-t bg-white p-4 flex items-center space-x-2">
      <input
        type="text"
        placeholder="Type what you’re looking for... e.g. 'Show me pizza places within 2 km'"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        className="flex-1 border rounded-lg px-3 py-2"
      />
        <button
          onClick={() => setShowMap(true)}
          className="bg-gray-200 px-3 py-2 rounded-lg"
        >
          📍
        </button>
      <button
        onClick={handleParse}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        Send
      </button>
    </div>


      {/* Map Popup */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-[90%] max-w-2xl">
            <h2 className="font-semibold mb-2">Select Location</h2>
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
            <button
              onClick={() => setShowMap(false)}
              className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
