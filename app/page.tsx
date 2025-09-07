"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Phone, Home, Utensils, Store, Volume2, Mic2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";


interface Order {
  type: string;
  contact: string;
  items: { item: MenuItem; restaurant: Restaurant }[];
}

type Restaurant = {
  id: number;
  name: string;
  distance: string;
  image: string;
  menu: number[];
  rating: number;
  tags?: string[];
};

const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "Rajasthani Thali",
    distance: "1.5 km",
    image: "/rajasthani-thali.jpg",
    menu: [1, 2, 3, 4, 7],
    rating: 4.6,
    tags: ["bestseller", "discount"],
  },
  {
    id: 2,
    name: "Marwar Delight",
    distance: "2.8 km",
    image: "/marwar-delight.jpg",
    menu: [1, 3, 5, 6, 8],
    rating: 4.3,
    tags: ["discount"],
  },
  {
    id: 3,
    name: "Desert Spice",
    distance: "3.2 km",
    image: "/desert-spice.jpg",
    menu: [2, 4, 6, 7, 9],
    rating: 4.1,
    tags: ["bestseller"],
  },
  {
    id: 4,
    name: "Jaipur Bhoj",
    distance: "4.0 km",
    image: "/jaipur-bhoj.jpg",
    menu: [1, 2, 5, 8, 9],
    rating: 3.9,
    tags: [],
  },
];

type MenuItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  oldPrice?: number; // optional for discounts
  tags?: string[];   // optional (e.g., "bestseller", "discount")
};

const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Dal Baati Churma",
    image: "/dal-baati-churma.jpg",
    price: 180,
    tags: ["bestseller"],
  },
  {
    id: 2,
    name: "Gatte ki Sabzi",
    image: "/gatte-ki-sabzi.jpg",
    price: 150,
  },
  {
    id: 3,
    name: "Ker Sangri",
    image: "/ker-sangri.jpg",
    price: 200,
    oldPrice: 240,
    tags: ["discount"],
  },
  {
    id: 4,
    name: "Bajre ki Roti",
    image: "/bajre-ki-roti.jpg",
    price: 50,
  },
  {
    id: 5,
    name: "Laal Maas",
    image: "/laal-maas.jpg",
    price: 350,
    tags: ["bestseller"],
  },
  {
    id: 6,
    name: "Gulab Jamun",
    image: "/gulab-jamun.jpg",
    price: 100,
  },
  {
    id: 7,
    name: "Namkeen Sev",
    image: "/namkeen-sev.jpg",
    price: 80,
  },
  {
    id: 8,
    name: "Mawa Kachori",
    image: "/mawa-kachori.jpg",
    price: 120,
    oldPrice: 150,
    tags: ["discount"],
  },
  {
    id: 9,
    name: "Pyaaz Kachori",
    image: "/pyaaz-kachori.jpg",
    price: 90,
  },
];


export default function VoiceFoodOrderingApp() {
  const [screen, setScreen] = useState<"main" | "checkout">("main");
  const [transcript, setTranscript] = useState<string>("");
  const [order, setOrder] = useState<Order>({ type: "Takeaway", contact: "Guest", items: [] });
  const [currentOptions, setCurrentOptions] = useState<{ item: MenuItem; restaurant: Restaurant }[]>([]);
  const [parsedCommand, setParsedCommand] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);


  // --- TTS Helper ---
    const speak = (text: string) => {
      if (typeof window === "undefined") return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event: any) => {
      try {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.trim();

        const getSystemPrompt = (screen: string, restaurants: any[], menuItems: any[]) => {
          if (screen === "main") {
            return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - For searching an item (e.g., "i want to eat gulab jamun", "show ker sangri"): Output { "command": "search item <exact_item_name>" } where <exact_item_name> is the closest fuzzy matched exact name from available menu items.
                - If specifying restaurant with item (e.g., "gulab jamun from rajasthani thali"): Output { "command": "search item <exact_item_name> from <exact_restaurant_name>" }.
                - For searching a restaurant's menu (e.g., "show marwar delight", "menu from desert spice"): Output { "command": "search restaurant <exact_restaurant_name>" }.
                - For adding items: Output { "command": "add <quantity> <exact_item_name> from <exact_restaurant_name>" } where quantity defaults to 1 if not specified.
                - For removing items: Output { "command": "remove <quantity> <exact_item_name> from <exact_restaurant_name>" } where quantity defaults to 1 if not specified.
                - For checkout: phrases like "done", "finish", "pay", "checkout": Output { "command": "checkout" }.

                Available restaurants: ${restaurants.map(r => r.name).join(", ")}.
                Available menu items: ${menuItems.map(m => m.name).join(", ")}.

                Examples:
                - "i want gulab jamun" → { "command": "search item Gulab Jamun" }
                - "show me gulab jamun from rajasthani thali" → { "command": "search item Gulab Jamun from Rajasthani Thali" }
                - "show rajasthani thali" → { "command": "search restaurant Rajasthani Thali" }
                - "add 3 gulab jamun from rajasthani thali" → { "command": "add 3 Gulab Jamun from Rajasthani Thali" }
                - "add gulab jamun from marwar delight" → { "command": "add 1 Gulab Jamun from Marwar Delight" }
                - "remove 2 laal maas from desert spice" → { "command": "remove 2 Laal Maas from Desert Spice" }
                - "checkout now" → { "command": "checkout" }

                If no clear intent or match, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;
          } else if (screen === "checkout") {
            return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Detect intent to reset the order.
                - Output { "command": "new order" } for phrases like "start over", "reset", "new order", or similar.

                Examples:
                - "Start a new order" → { "command": "new order" }

                If no reset intent is detected, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;
          }
          return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.
                Output { "command": "unknown" } for all inputs.
              `;
        };
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: getSystemPrompt(screen, restaurants, menuItems),
              },
              {
                role: "user",
                content: `${text}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        const completion = await response.json();
        const parserJDData = JSON.parse(completion.choices[0].message?.content || "{}");

        if (parserJDData.command !== "unknown") {
          handleVoiceCommand(parserJDData.command);
          setParsedCommand(parserJDData.command);
          setTranscript(text);
          toast.success(parserJDData.command);
        } else {
          handleVoiceCommand(text);
          setParsedCommand(text);
          setTranscript(text);
          toast.error(text)
        }

        console.log("Parsed Command:", parserJDData);
      } catch (error) {
        console.error("Error parsing voice input:", error);
      }
    };

    recognition.start();

    return () => recognition.stop();
  }, [screen]);

  const handleVoiceCommand = (text: string) => {
    const cmd = text.toLowerCase();
    console.log("Transcript:", cmd);

    if (screen === "main") {
      if (cmd.startsWith("search item ")) {
        let itemName = cmd.replace("search item ", "").trim();
        let restName: string | undefined = undefined;
        if (itemName.includes(" from ")) {
          const parts = itemName.split(" from ");
          itemName = parts[0].trim();
          restName = parts[1].trim();
        }
        const item = menuItems.find((m) => m.name.toLowerCase() === itemName);
        if (!item) {
          speak("Sorry, item not found.");
          return;
        }
        let matchingRests = restaurants.filter((r) => r.menu.includes(item.id));
        if (restName) {
          const rest = restaurants.find((r) => r.name.toLowerCase() === restName);
          if (rest && matchingRests.some((mr) => mr.id === rest.id)) {
            matchingRests = [rest];
          } else {
            speak("Sorry, restaurant not found or doesn't serve that item.");
            return;
          }
        }
        setCurrentOptions(matchingRests.map((r) => ({ item, restaurant: r })));
        speak(`Showing ${item.name} from ${matchingRests.length} restaurants.`);
      } else if (cmd.startsWith("search restaurant ")) {
        const restName = cmd.replace("search restaurant ", "").trim();
        const rest = restaurants.find((r) => r.name.toLowerCase() === restName);
        if (!rest) {
          speak("Sorry, restaurant not found.");
          return;
        }
        const matchingItems = menuItems.filter((m) => rest.menu.includes(m.id));
        setCurrentOptions(matchingItems.map((i) => ({ item: i, restaurant: rest })));
        speak(`Showing menu from ${rest.name}.`);
      } else if (cmd.startsWith("add ")) {
        let addStr = cmd.replace("add ", "").trim();
        let qty = 1;
        const qtyMatch = addStr.match(/^(\d+) /);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10);
          addStr = addStr.replace(/^\d+ /, "");
        }
        if (!addStr.includes(" from ")) {
          speak("Please specify the restaurant.");
          return;
        }
        const [itemName, restName] = addStr.split(" from ").map((s) => s.trim());
        const item = menuItems.find((m) => m.name.toLowerCase() === itemName);
        const rest = restaurants.find((r) => r.name.toLowerCase() === restName);
        if (item && rest && rest.menu.includes(item.id)) {
          const toAdd = Array.from({ length: qty }, () => ({ item, restaurant: rest }));
          setOrder((prev) => ({ ...prev, items: [...prev.items, ...toAdd] }));
          speak(`Added ${qty} ${item.name} from ${rest.name}.`);
        } else {
          speak("Sorry, that item is not available at that restaurant.");
        }
      } else if (cmd.startsWith("remove ")) {
        let remStr = cmd.replace("remove ", "").trim();
        let qty = 1;
        const qtyMatch = remStr.match(/^(\d+) /);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10);
          remStr = remStr.replace(/^\d+ /, "");
        }
        if (!remStr.includes(" from ")) {
          speak("Please specify the restaurant.");
          return;
        }
        const [itemName, restName] = remStr.split(" from ").map((s) => s.trim());
        const item = menuItems.find((m) => m.name.toLowerCase() === itemName);
        const rest = restaurants.find((r) => r.name.toLowerCase() === restName);
        if (!item || !rest) {
          speak("Sorry, item or restaurant not found.");
          return;
        }
        setOrder((prev) => {
          let removed = 0;
          const newItems = prev.items.filter((entry) => {
            if (entry.item.id === item.id && entry.restaurant.id === rest.id && removed < qty) {
              removed++;
              return false;
            }
            return true;
          });
          return { ...prev, items: newItems };
        });
        speak(`Removed ${qty} ${item.name} from ${rest.name}.`);
      } else if (cmd === "checkout") {
        setScreen("checkout");
        speak("Here is your order summary.");
      } else {
        speak("Sorry, I didn't understand that.");
      }
    } else if (screen === "checkout") {
      if (cmd === "new order") {
        setOrder({ type: "Takeaway", contact: "Guest", items: [] });
        setCurrentOptions([]);
        setScreen("main");
        speak("Starting a new order. What would you like to eat?");
      } else {
        speak("Sorry, I didn't understand that.");
      }
    }
  };


  const getGroupedItems = (items: { item: MenuItem; restaurant: Restaurant }[]) => {
    return items.reduce(
      (acc: Record<string, { restaurant: Restaurant; items: Record<string, { count: number; price: number }> }>, entry) => {
        const rKey = entry.restaurant.id.toString();
        if (!acc[rKey]) {
          acc[rKey] = { restaurant: entry.restaurant, items: {} };
        }
        const iKey = entry.item.id.toString();
        if (!acc[rKey].items[iKey]) {
          acc[rKey].items[iKey] = { count: 0, price: entry.item.price };
        }
        acc[rKey].items[iKey].count++;
        return acc;
      },
      {}
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
  {/* Transcript Box */}
  <Card className="w-full max-w-md mb-6 border shadow-sm rounded-2xl bg-white">
      <CardContent className="px-4 flex items-center gap-3">
        {/* Speaker Icon */}
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{
            duration: 0.6,
            repeat: isSpeaking ? Infinity : 0,
            ease: "easeInOut",
          }}
          className="text-blue-500"
        >
          {isSpeaking ? <Volume2 size={24} /> : <Mic2 size={24} />}
        </motion.div>

        {/* Transcript */}
        <div className="space-y-1 flex-1">
          <p className="font-medium text-gray-800 text-sm truncate">
            {transcript || "Listening..."}
          </p>
        </div>
      </CardContent>
    </Card>

      {screen === "main" && (
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
          {/* Grid of menu items with restaurant info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
            {currentOptions.map((option, idx) => (
              <Card
                key={idx}
                className="cursor-pointer border shadow-md rounded-2xl hover:shadow-lg transition bg-white"
                onClick={() => {
                  setOrder((prev) => ({
                    ...prev,
                    items: [...prev.items, option],
                  }));
                  speak(`Added 1 ${option.item.name} from ${option.restaurant.name}.`);
                }}
              >
                <CardContent className="p-3">
                  <div className="relative">
                    <img
                      src={option.item.image}
                      alt={option.item.name}
                      className="w-full h-28 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 left-2 flex gap-2">
                      {option.item.tags?.includes("discount") && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow">
                          🔥 20% Discount
                        </span>
                      )}
                      {option.item.tags?.includes("bestseller") && (
                        <span className="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-medium shadow">
                          ⭐ Best Seller
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold mt-2 text-sm text-gray-800">
                    {option.item.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {option.restaurant.name} - {option.restaurant.distance}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-green-600">₹{option.item.price}</p>
                    {option.item.oldPrice && (
                      <p className="text-xs line-through text-gray-500">₹{option.item.oldPrice}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < Math.round(option.restaurant.rating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }
                      >
                        ★
                      </span>
                    ))}
                    <span className="ml-1">({option.restaurant.rating.toFixed(1)})</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {currentOptions.length === 0 && (
              <p className="text-center col-span-full text-white text-2xl font-bold">
                Say what you want to eat ?, eg. I want to eat Ker Sangri!
              </p>
            )}
          </div>

          {/* Cart */}
          {currentOptions.length !== 0 && <Card className="w-full md:w-72 border shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <ShoppingCart size={18} className="text-orange-500" /> Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-500">No items added</p>
              ) : (
                <>
                  {Object.entries(getGroupedItems(order.items)).map(([rKey, group]) => (
                    <div key={rKey} className="mb-4">
                      <p className="font-semibold flex items-center gap-2 text-gray-800">
                        <Store size={16} className="text-indigo-500" /> {group.restaurant.name}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {Object.entries(group.items).map(([iKey, data]) => {
                          const item = menuItems.find((m) => m.id === parseInt(iKey))!;
                          return (
                            <li
                              key={iKey}
                              className="text-sm flex justify-between border-b pb-1"
                            >
                              <span>
                                {item.name} <span className="text-gray-500">₹{data.price}</span>
                              </span>
                              <span className="font-medium text-gray-700">× {data.count}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  <div className="mt-3 flex justify-between font-semibold text-gray-800">
                    <span>Total:</span>
                    <span>
                      ₹{order.items.reduce((sum, entry) => sum + entry.item.price, 0)}
                    </span>
                  </div>
                </>
              )}
              <Button className="mt-4 w-full rounded-xl" onClick={() => setScreen("checkout")}>
                Checkout
              </Button>
            </CardContent>
          </Card>}
        </div>
      )}

      {screen === "checkout" && (
        <Card className="w-full max-w-md border shadow-md rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2 text-green-600">
              <Home /> Order Successful 🎉
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-4 border-t pt-3 text-left">
              <p className="font-semibold text-gray-800 mb-2">Order Details:</p>
              {Object.entries(getGroupedItems(order.items)).map(([rKey, group]) => (
                <div key={rKey} className="mb-4">
                  <p className="font-semibold text-gray-800">{group.restaurant.name}</p>
                  <ul className="space-y-1">
                    {Object.entries(group.items).map(([iKey, data]) => {
                      const item = menuItems.find((m) => m.id === parseInt(iKey))!;
                      return (
                        <li
                          key={iKey}
                          className="flex justify-between text-sm border-b pb-1"
                        >
                          <span>
                            {item.name} × {data.count}
                          </span>
                          <span className="font-medium text-gray-700">
                            ₹{data.count * data.price}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="mt-3 flex justify-between font-bold text-gray-900 text-base border-t pt-2">
                <span>Total</span>
                <span>
                  ₹{order.items.reduce((sum, entry) => sum + entry.item.price, 0)}
                </span>
              </div>
            </div>

            {/* Token + Expected Time */}
            <p className="mt-4 text-gray-700">
              Your token:{" "}
              <span className="font-mono font-bold text-indigo-600">
                #{Math.floor(Math.random() * 1000)}
              </span>
            </p>
            <p className="text-gray-600 mb-4">Expected time: 20 mins</p>

            {/* New Order Button */}
            <Button
              className="rounded-xl w-full"
              onClick={() => {
                setOrder({ type: "Takeaway", contact: "Guest", items: [] });
                setCurrentOptions([]);
                setScreen("main");
              }}
            >
              Pay Now
            </Button>
          </CardContent>
        </Card>
      )}
</div>

  );
}