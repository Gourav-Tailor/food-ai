"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  Mic,
  MapPin,
  Search,
  Star,
  IndianRupee,
  Ruler,
  HomeIcon,
  Bike,
  Menu as MenuIcon,
  Banknote,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

// ✅ shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 26.924179699327425,
  lng: 75.82699334517531,
};

export default function ChatBotPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [foodImages, setFoodImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(1500);
  const [menu, setMenu] = useState<string[]>([]);
  const [userInput, setUserInput] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [showMap, setShowMap] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<"restaurant" | "menu" | "checkout">("restaurant");

  const recognitionRef = useRef<any>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  });

  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // --- Voice Recognition ---
  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Sorry, your browser does not support speech recognition.");
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput((prev) => prev + " " + transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // --- Helpers ---
  const getPhotoUrl = (photoReference: string) =>
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`;

  const getPriceRange = (priceLevel?: number): string => {
    if (priceLevel === undefined) return "N/A";
    switch (priceLevel) {
      case 0:
        return "Free";
      case 1:
        return "₹ (Inexpensive)";
      case 2:
        return "₹₹ (Moderate)";
      case 3:
        return "₹₹₹ (Expensive)";
      case 4:
        return "₹₹₹₹ (Very Expensive)";
      default:
        return "N/A";
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
          q: `${keyword} food menu`,
          cx: process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CX,
          key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          searchType: "image",
          imgType: "photo",
          safe: "active",
          num: 9,
        },
      });
      setFoodImages(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleParse = async () => {
    try {
      await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                `
                You are a parser and food variety generator.  
                  Your task: Extract restaurant search parameters from user text and generate a rich list of food variants.  

                  Rules:
                  1. "keyword" → The main food or cuisine explicitly mentioned by the user (e.g., "pizza", "Chinese", "biryani").  
                    - If multiple foods are mentioned, choose the most central one.  
                    - If no clear food is mentioned, return keyword="".  

                  2. "radius" → A number in meters if the user specifies a distance (e.g., "within 2 km" = 2000).  
                    - Default = 1500.  

                  3. "menu" → An array of **10-12 specific dish variants or popular worldwide dishes** that relate to the keyword.  
                    - Include common global variations (e.g., for "pizza": ["Margherita Pizza", "Pepperoni Pizza", "BBQ Chicken Pizza", "Veggie Supreme Pizza"]).  
                    - If the user explicitly mentions dish names, include them first in the array.  
                    - If no variants are mentioned in the text, **still generate 10–20 globally popular dish variants** for the keyword.  
                    - If keyword="", then menu=[].  

                  Output must strictly be in JSON format only:  
                  {
                    "keyword": string,
                    "radius": number,
                    "menu": array of strings
                  }

                `,
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
          setMenu(parserJDData.menu);
          console.log(parserJDData);
        });

      await fetchRestaurants();
      await fetchFoodImages();
    } catch (err: any) {
      console.error("Frontend error:", err.response?.data || err.message);
    }
  };

  // --- Cart helpers ---
  const addToCart = (item: string, img?: string) => {
    if (!selectedRestaurant) {
      alert("Please select a restaurant first!");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.item === item && c.restaurantId === selectedRestaurant.place_id);
      if (existing) {
        return prev.map((c) =>
          c.item === item && c.restaurantId === selectedRestaurant.place_id
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }
      return [
        ...prev,
        {
          restaurantId: selectedRestaurant.place_id,
          restaurantName: selectedRestaurant.name,
          item,
          img,
          qty: 1,
        },
      ];
    });
  };

  const updateQty = (item: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item === item ? { ...c, qty: Math.max(1, c.qty + delta) } : c
        )
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (item: string) => {
    setCart((prev) => prev.filter((c) => c.item !== item));
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 🔹 Search Toolbar */}
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm">
        <img src="/logo.png" alt="Logo" className="w-12 h-12" />
        <Input
          placeholder="Search... e.g. 'pizza within 2 km'"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className="flex-1"
        />
        <Button
          variant={isListening ? "destructive" : "secondary"}
          size="icon"
          onClick={handleVoiceInput}
        >
          <Mic size={20} />
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setShowMap(true)}>
          <MapPin size={20} />
        </Button>
        <Button onClick={handleParse}>
          <Search size={20} className="mr-1" /> Search
        </Button>
      </div>

      {/* 🔹 Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 items-center">
        <TabsList className="w-full text-3xl font-bold grid grid-cols-3 sticky top-0 bg-white z-10 shadow">
          <TabsTrigger value="restaurant"><HomeIcon size={20} /> Select Restaurant</TabsTrigger>
          <TabsTrigger value="menu"><MenuIcon size={20} /> Choose Menu & Customize</TabsTrigger>
          <TabsTrigger value="checkout"><Banknote size={20} /> Review & Checkout</TabsTrigger>
        </TabsList>

        {/* Dining Out */}
        <TabsContent value="restaurant" className="p-24">
          {restaurants.length === 0 ? (
            <p className="text-center text-gray-500">No restaurants found. Try searching!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                  <Card
                    key={idx}
                    className={`overflow-hidden rounded-2xl cursor-pointer ${selectedRestaurant?.place_id === r.place_id ? "ring-2 ring-green-400" : ""}`}
                    onClick={() => { setSelectedRestaurant(r); setActiveTab("menu"); }}
                  >
                    {r.photos?.length > 0 ? (
                      <img
                        src={getPhotoUrl(r.photos[0].photo_reference)}
                        alt={r.name}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                        No Image
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">{r.name}</CardTitle>
                      <p className="text-sm text-gray-600">{r.vicinity}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-yellow-600 flex items-center">
                        <Star size={16} className="mr-1" /> {r.rating || "N/A"} ({r.user_ratings_total || 0})
                      </p>
                      <p className="text-green-600 flex items-center">
                        <IndianRupee size={16} className="mr-1" /> {getPriceRange(r.price_level)}
                      </p>
                      {distance && (
                        <p className="text-gray-700 flex items-center text-sm">
                          <Ruler size={16} className="mr-1" /> {distance} km away
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Delivery */}
        <TabsContent value="menu" className="p-24">
          {!selectedRestaurant ? (
            <p className="text-center text-gray-500">Please select a restaurant first.</p>
          ) : foodImages.length === 0 ? (
            <p className="text-center text-gray-500">No food images found. Try searching!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {foodImages.map((img, idx) => (
                <Card key={idx} className="overflow-hidden shadow-lg rounded-2xl">
                  <img src={img.link} alt={keyword} className="w-full h-36 object-cover" />
                  <CardContent className="pt-3 flex justify-between items-center">
                    <h2 className="text-md font-semibold">{menu[idx]}</h2>
                    <Button size="sm" variant="secondary" onClick={() => addToCart(menu[idx], img.link)}>
                      <Plus size={16} /> Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Checkout */}
        <TabsContent value="checkout" className="p-24">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Order Summary</h2>
              <div className="divide-y">
                {cart.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-3">
                    <img src={c.img} alt={c.item} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <p className="font-semibold">{c.item}</p>
                      <p className="text-sm text-gray-500">{c.restaurantName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => updateQty(c.item, -1)}>
                        <Minus size={14} />
                      </Button>
                      <span>{c.qty}</span>
                      <Button size="sm" variant="ghost" onClick={() => updateQty(c.item, 1)}>
                        <Plus size={14} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFromCart(c.item)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full">Proceed to Payment</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 🔹 Map Dialog */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={userLocation || defaultCenter}
              zoom={14}
              onClick={(e) =>
                setUserLocation({
                  lat: e.latLng?.lat() || 0,
                  lng: e.latLng?.lng() || 0,
                })
              }
            >
              {userLocation && (
                <Marker
                  position={userLocation}
                  draggable
                  onDragEnd={(e) =>
                    setUserLocation({
                      lat: e.latLng?.lat() || 0,
                      lng: e.latLng?.lng() || 0,
                    })
                  }
                />
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
          <DialogFooter>
            <Button onClick={() => setShowMap(false)}>Confirm Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
