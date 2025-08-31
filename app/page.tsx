"use client";

import { useState, useRef, useEffect } from "react";
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
  ShoppingCart,
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
import { VoiceIndicator } from "@/components/ui/voice-indicator";
import { Badge } from "@/components/ui/badge";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 28.611707360891085,
  lng: 77.22955188008568,
};

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  type: "dining" | "delivery";
  image?: string;
}

export default function ChatBotPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [foodImages, setFoodImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState(1500);
  const [userInput, setUserInput] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [showMap, setShowMap] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<"dining" | "delivery">("dining");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const recognitionRef = useRef<any>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
  });

  // --- TTS Helper ---
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

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);

        // Generate conversational summary dynamically
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: "You are a conversational AI. Summarize the user's spoken query in 1 line." },
                { role: "user", content: transcript },
              ],
              temperature: 0.2,
            }),
          });
          const completion = await response.json();
          const summary = completion.choices[0].message.content;

          // Update input and speak
          setUserInput(summary);
          speak(`Got it. Searching for ${summary}`);

          // Trigger parse + fetch
          handleParse();
        } catch (err) {
          console.error("Conversation error:", err);
          setUserInput(transcript);
          speak("Searching with what I understood from your speech.");
          handleParse();
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (userInput) {
          speak(`Okay, searching for ${userInput}. Let me find some options for you.`);
          handleParse();
        }
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      speak("I'm listening. Go ahead.");
      setUserInput(""); // Clear previous input
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
  const fetchRestaurants = async (currentLocation: { lat: number; lng: number }) => {
    setLoading(true);

    // Reverse geocode
    const geoRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        latlng: `${currentLocation.lat},${currentLocation.lng}`,
        key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      },
    });
    if (geoRes.data.results.length > 0) {
      setUserAddress(geoRes.data.results[0].formatted_address);
    }

    const res = await axios.get("/api/restaurants", {
      params: {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        keyword: keyword || undefined,
        radius: radius || 1500,
      },
    });

    const fetchedRestaurants = res.data.results || [];
    setRestaurants(fetchedRestaurants);
    setLoading(false);
    await fetchFoodImages();
    return fetchedRestaurants;
  };

  const fetchFoodImages = async () => {
    // if (!keyword) return [];
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
      const fetchedImages = res.data.items || [];
      setFoodImages(fetchedImages);
      setLoading(false);
      return fetchedImages;
    } catch (err) {
      console.error(err);
      setLoading(false);
      return [];
    }
  };

  const addToCart = (id: string, name: string, quantity: number, type: "dining" | "delivery", image?: string) => {
    if (quantity <= 0) return;
    setCart((prev) => {
      const exist = prev.find((i) => i.id === id);
      if (exist) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        return [...prev, { id, name, quantity, type, image }];
      }
    });
    setQuantities((prev) => ({ ...prev, [id]: 0 })); // reset quantity
    speak(`Added ${quantity} of ${name} to cart.`);
  };

  const handleParse = async () => {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                "You are a parser. Extract parameters from user text. If the user is searching for restaurants or food, output JSON {type: 'search', keyword: string, radius: number in meters}. If the user is adding to cart like 'add 2 pizzas' or 'I want 3 burgers', output {type: 'add', item: string, quantity: number}. Parse distance unit and convert to meters (e.g., 1 km = 1000, 500 m = 500). Defaults: keyword='', radius=1500, quantity=1.",
            },
            {
              role: "user",
              content: `${userInput}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });
      const completion = await response.json();
      const parsedData = JSON.parse(completion.choices[0].message.content);

      if (parsedData.type === "add") {
        const id = parsedData.item; // Use item as id for voice adds
        addToCart(id, parsedData.item, parsedData.quantity || 1, activeTab);
        return;
      }

      setKeyword(keyword + parsedData.keyword);
      setRadius(parsedData.radius);

      // Handle location
      let currentLocation = userLocation;
      if (!currentLocation) {
        speak("I need your location to find nearby places. Trying to get your current location automatically.");
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(currentLocation);
          speak("Location acquired. Proceeding with search.");
        } catch (err) {
          speak("Unable to get your location automatically. Please set it manually on the map.");
          setShowMap(true);
          // Wait for map to close and location to be set
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (!showMap && userLocation) {
                clearInterval(interval);
                resolve(null);
              }
            }, 500);
          });
          currentLocation = userLocation;
          if (!currentLocation) {
            speak("Location not set. Search cancelled.");
            return;
          }
        }
      }

      const fetchedRestaurants = await fetchRestaurants(currentLocation!);

      speak(
        `Search complete. I found ${fetchedRestaurants.length} restaurants for ${parsedData.keyword} within ${parsedData.radius / 1000} km. Check the dining tab for details and delivery tab for options.`
      );
    } catch (err: any) {
      console.error("Frontend error:", err.response?.data || err.message);
      speak("Sorry, there was an error processing your request.");
    }
  };

  // Monitor showMap to detect when user confirms location
  useEffect(() => {
    if (!showMap && userLocation) {
      // If needed, can trigger search here, but since we await in handleParse, it's handled
    }
  }, [showMap, userLocation]);

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 🔹 Search Toolbar */}
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm">
        <img src="/logo.png" alt="Logo" className="w-12 h-12" />
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
        <Button variant="secondary" size="icon" onClick={() => setShowCart(true)}>
          <ShoppingCart size={20} />
          {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
            <Badge className="ml-1">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </Button>
        <VoiceIndicator isActive={isListening} />
      </div>

      {/* 🔹 Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 items-center">
        <TabsList className="w-1/2 text-3xl font-bold grid grid-cols-2 sticky top-0 bg-white z-10 shadow">
          <TabsTrigger value="dining"><HomeIcon size={20} /> Dining Out</TabsTrigger>
          <TabsTrigger value="delivery" onClick={fetchFoodImages}><Bike size={20} /> Delivery</TabsTrigger>
        </TabsList>

        {/* Dining Out */}
        <TabsContent value="dining" className="p-12">
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
                const id = r.place_id;
                const quantity = quantities[id] || 0;
                const image = r.photos?.[0] ? getPhotoUrl(r.photos[0].photo_reference) : undefined;
                return (
                  <Card key={idx} className="overflow-hidden rounded-2xl">
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
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantities({ ...quantities, [id]: Math.max(0, quantity - 1) })}
                        >
                          -
                        </Button>
                        <span>{quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantities({ ...quantities, [id]: quantity + 1 })}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(id, r.name, quantity, "dining", image)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Delivery */}
        <TabsContent value="delivery" className="p-12">
          {restaurants.length === 0 && foodImages.length === 0 ? (
            <p className="text-center text-gray-500">No delivery options found. Try searching!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {restaurants.map((restaurant, idx) => {
                const image = idx < foodImages.length ? foodImages[idx] : null;
                const id = restaurant.place_id || `delivery-${idx}`;
                const quantity = quantities[id] || 0;
                const name = restaurant.name || `Delivery Option ${idx + 1}`;
                const distance =
                  userLocation && restaurant.geometry?.location
                    ? calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        restaurant.geometry.location.lat,
                        restaurant.geometry.location.lng
                      )
                    : null;
                return (
                  <Card key={idx} className="overflow-hidden shadow-lg rounded-2xl">
                    {image ? (
                      <img src={image.link} alt={name} className="w-full h-36 object-cover" />
                    ) : restaurant.photos?.length > 0 ? (
                      <img
                        src={getPhotoUrl(restaurant.photos[0].photo_reference)}
                        alt={name}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                        No Image
                      </div>
                    )}
                    <CardContent className="pt-3 space-y-2">
                      <h2 className="text-md font-semibold">{name}</h2>
                      <p className="text-yellow-600 flex items-center">
                        <Star size={16} className="mr-1" />
                        {restaurant.rating || "N/A"} ({restaurant.user_ratings_total || 0})
                      </p>
                      {distance && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Ruler size={16} className="mr-1" />
                          {distance} km
                        </p>
                      )}
                    </CardContent>
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantities({ ...quantities, [id]: Math.max(0, quantity - 1) })}
                        >
                          -
                        </Button>
                        <span>{quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQuantities({ ...quantities, [id]: quantity + 1 })}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(id, name, quantity, "delivery", image?.link || restaurant.photos?.[0]?.photo_reference ? getPhotoUrl(restaurant.photos[0].photo_reference) : undefined)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </Card>
                );
              })}
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

      {/* 🔹 Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Your cart is empty.</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.image && <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />}
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p>Quantity: {item.quantity}</p>
                    <p>Type: {item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setShowCart(false); speak("Proceeding to checkout."); alert("Checkout complete!"); setCart([]); }}>Checkout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}