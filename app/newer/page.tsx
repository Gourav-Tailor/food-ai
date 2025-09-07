"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Phone, Home, Utensils, Store, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";


interface Order {
  type: string;
  contact: string;
  restaurant: Restaurant | null;
  items: MenuItem[];
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
  const [step, setStep] = useState<number>(1);
  const [transcript, setTranscript] = useState<string>("");
  const [order, setOrder] = useState<Order>({ type: "", contact: "", restaurant: null, items: [] });
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(restaurants);
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

        const getSystemPrompt = (step: number, restaurants: any[], menuItems: any[]) => {
          switch (step) {
            case 1:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Identify intent to select order type.
                - Output { "command": "dinein" } for phrases like "dine in", "eat here", "eating in", or similar.
                - Output { "command": "takeaway" } for phrases like "take away", "pickup", "to go", or similar.

                Examples:
                - "I'd like to dine in please" → { "command": "dinein" }
                - "Take out" → { "command": "takeaway" }

                If no clear intent is detected, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;

            case 2:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Extract contact information.
                - Output { "command": "guest" } for phrases like "guest", "anonymous", "no number", or similar.
                - Output { "command": "number is <digits>" } for a phone number, extracting only digits (e.g., "1234567890").

                Examples:
                - "I'm a guest" → { "command": "guest" }
                - "My phone is five five five one two three four" → { "command": "number is 5551234" }

                If no contact information is detected, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;

            case 3:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Identify restaurant selection.
                - Output { "command": "restaurant <name>" } where <name> is the closest matching restaurant name using fuzzy matching.
                - Available restaurants: ${restaurants.map(r => r.name).join(", ")}.
                - Available menu items: ${menuItems.map(m => m.name).join(", ")}.

                Examples:
                - "I want Rajasthani Thali" → { "command": "restaurant rajasthani thali" }
                - "Pick the marwar one" → { "command": "restaurant marwar delight" }
                - "Ker Sangri" → { "command": "Ker Sangri" }

                If no match is found, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;

            case 4:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Parse cart actions.
                - For adding items: Output { "command": "add <quantity> <item>" } where <item> is the closest matching menu item (fuzzy match) and <quantity> defaults to 1 if not specified.
                - For removing items: Output { "command": "remove <quantity> <item>" } where <item> is the closest matching menu item and <quantity> defaults to 1 if not specified.
                - For checkout: Output { "command": "checkout" } for phrases like "done", "finish", "pay", or similar.
                - Available menu items: ${menuItems.map(m => m.name).join(", ")}.
                - If multiple items are mentioned (e.g., "add gulab jamun and dal baati"), return one JSON object per command, prioritizing the first valid item in this response, and process subsequent items in further responses.

                Examples:
                - "Add 3 gulab jamun" → { "command": "add 3 gulab jamun" }
                - "Add gulab jamun" → { "command": "add 1 gulab jamun" }
                - "Remove 2 dal baati" → { "command": "remove 2 dal baati churma" }
                - "Remove namkeen" → { "command": "remove 1 namkeen sev" }
                - "I'm done, checkout now" → { "command": "checkout" }
                - "Add gulab jamun and dal baati" → { "command": "add 1 gulab jamun" } (first response)

                If no valid action is detected, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;

            case 5:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.

                Rules (normalize input to lower-case, ignore filler words like "um", "please", "I want"):
                - Detect intent to reset the order.
                - Output { "command": "neworder" } for phrases like "start over", "reset", "new order", or similar.

                Examples:
                - "Start a new order" → { "command": "new order" }

                If no reset intent is detected, return { "command": "unknown" }.

                ALWAYS return exactly one JSON object with a "command" field.
              `;

            default:
              return `
                You are a strict command parser for a voice-based food ordering assistant.
                Return JSON ONLY. No extra text, no explanations.
                Output { "command": "unknown" } for all inputs.
              `;
          }
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
                content: getSystemPrompt(step, restaurants, menuItems),
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
  }, [step]);

  const handleVoiceCommand = (text: string) => {
  const cmd = text.toLowerCase();
  console.log("Transcript:", cmd);

  if (step === 1) {
    if (cmd.includes("in")) {
      setOrder((prev) => ({ ...prev, type: "Dine In" }));
      setStep(2);
      speak("You selected dine in. Please say guest or tell me your number.");
    } else if (cmd.includes("takeaway") || cmd.includes("take away")) {
      setOrder((prev) => ({ ...prev, type: "Takeaway" }));
      setStep(2);
      speak("You selected takeaway. Please say guest or tell me your number.");
    }
  } else if (step === 2) {
    if (cmd.includes("guest")) {
      setOrder((prev) => ({ ...prev, contact: "Guest" }));
      setStep(3);
      speak("Contact set as guest. Now, please choose a restaurant.");
    } else if (cmd.includes("number is")) {
      const num = cmd.split("number is")[1]?.trim();
      setOrder((prev) => ({ ...prev, contact: num }));
      setStep(3);
      speak(`Your number is ${num}. Now, please choose a restaurant.`);
    }
  } else if (step === 3) {
    // check if user directly said restaurant name
    const restaurant = restaurants.find(
      (r) => cmd.includes(r.name.toLowerCase()) || cmd.includes(r.id.toString())
    );

    if (restaurant) {
      setOrder((prev) => ({ ...prev, restaurant }));
      setStep(4);
      speak(`You selected ${restaurant.name}. Now, say add followed by an item to add it to your order or say checkout to continue.`);
    } else {
      // check if user said a menu item
      const menuItem = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
      if (menuItem) {
        const matchingRestaurants = restaurants.filter((r) => r.menu.includes(menuItem.id));
        setFilteredRestaurants(matchingRestaurants);
        if (matchingRestaurants.length > 0) {
          // You could show these restaurants in UI or auto-select if only one
          if (matchingRestaurants.length === 1) {
            const selected = matchingRestaurants[0];
            setOrder((prev) => ({ ...prev, restaurant: selected }));
            setStep(4);
            speak(`I found ${selected.name} serving ${menuItem.name}. Moving to menu selection.`);
          } else {
            // multiple restaurants serve this item → update UI to show only them
            speak(`I found ${matchingRestaurants.length} restaurants serving ${menuItem.name}. Please choose one.`);
            // Optional: store filtered list in state to render only them
          }
        } else {
          speak(`Sorry, no restaurants found serving ${menuItem.name}. Please say another restaurant or dish.`);
        }
      }
    }
  }
 else if (step === 4) {
    if (cmd.includes("check")) {
      setStep(5);
      speak("Here is your cart. Say new order to start again.");
    } else if (cmd.includes("add")) {
      const item = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
      if (item) {
        // extract quantity (default = 1)
        const match = cmd.match(/(\d+)/);
        const qty = match ? parseInt(match[1], 10) : 1;

        setOrder((prev) => ({
          ...prev,
          items: [...prev.items, ...Array(qty).fill(item)],
        }));
        speak(`${qty} ${item.name} added to your order.`);
      }
    } else if (cmd.includes("remove")) {
      const item = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
      if (item) {
        // extract quantity (default = 1)
        const match = cmd.match(/(\d+)/);
        const qty = match ? parseInt(match[1], 10) : 1;

        setOrder((prev) => {
          let removed = 0;
          const newItems = prev.items.filter((i) => {
            if (i.id === item.id && removed < qty) {
              removed++;
              return false;
            }
            return true;
          });
          return { ...prev, items: newItems };
        });
        speak(`${qty} ${item.name} removed from your order.`);
      }
    }
  }
 else if (step === 5) {
    if (cmd.includes("new order")) {
      setOrder({ type: "", contact: "", restaurant: null, items: [] });
      setStep(1);
      speak("Starting a new order. Please say dine in or takeaway.");
    }
  }

  // setTranscript("");
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
          <Volume2 size={24} />
        </motion.div>

        {/* Transcript */}
        <div className="space-y-1 flex-1">
          <p className="font-medium text-gray-800 text-sm truncate">
            {transcript || "..."}
          </p>
        </div>
      </CardContent>
    </Card>

  {/* Step 1: Choose type */}
  {step === 1 && (
    <Card className="w-full max-w-md border shadow-md rounded-2xl bg-white text-center">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-center gap-3">
          <Utensils className="h-5 w-5 text-indigo-500" />
          Where would you like to enjoy your meal?
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Dine In Option */}
        <Button
          className="w-full flex justify-between items-center rounded-xl px-6 py-4 text-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => {
            setOrder({ ...order, type: "Dine In" });
            setStep(2);
          }}
        >
          <span>🍽️ Dine In</span>
          <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
            ➡️
          </span>
        </Button>

        {/* Takeaway Option */}
        <Button
          variant="secondary"
          className="w-full flex justify-between items-center rounded-xl px-6 py-4 text-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => {
            setOrder({ ...order, type: "Takeaway" });
            setStep(2);
          }}
        >
          <span>🛍️ Takeaway</span>
          <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
            ➡️
          </span>
        </Button>
      </CardContent>
    </Card>
  )}


  {/* Step 2: Contact details */}
  {step === 2 && (
    <Card className="w-full max-w-md border shadow-md rounded-2xl bg-white text-center">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
          <Phone className="h-5 w-5 text-green-500" /> Contact Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          placeholder="Enter contact number"
          className="rounded-xl"
          onBlur={(e) => {
            setOrder({ ...order, contact: e.target.value });
            setStep(3);
          }}
        />
        <Button
          variant="secondary"
          className="w-full rounded-xl"
          onClick={() => {
            setOrder({ ...order, contact: "Guest" });
            setStep(3);
          }}
        >
          Continue as Guest
        </Button>
      </CardContent>
    </Card>
  )}

  {/* Step 3: Restaurant list */}
  {step === 3 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
      {filteredRestaurants.map((r) => (
        <Card
          key={r.id}
          className="cursor-pointer border shadow-md rounded-2xl hover:shadow-lg transition bg-white"
          onClick={() => {
            setOrder({ ...order, restaurant: r });
            setStep(4);
          }}
        >
          <CardContent className="p-3">
            {/* Image */}
            <div className="relative">
              <img
                src={r.image}
                alt={r.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              {/* Tags */}
              <div className="absolute top-2 left-2 flex gap-2">
                {r.tags?.includes("discount") && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow">
                    🔥 20% Discount
                  </span>
                )}
                {r.tags?.includes("bestseller") && (
                  <span className="bg-yellow-400 text-black text-[10px] px-2 py-0.5 rounded-full font-medium shadow">
                    ⭐ Best Seller
                  </span>
                )}
              </div>
            </div>

            {/* Restaurant Info */}
            <p className="font-semibold mt-2 flex items-center gap-2 text-gray-800">
              <Store size={16} className="text-indigo-500" /> {r.name}
            </p>

            {/* Ratings + Distance */}
            <div className="flex items-center justify-between mt-1 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < Math.round(r.rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                ))}
                <span className="ml-1 text-xs">({r.rating.toFixed(1)})</span>
              </div>
              <p className="text-xs">{r.distance}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}


  {/* Step 4: Menu */}
  {step === 4 && (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
      {/* Menu List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
        {order.restaurant &&
          menuItems
            .filter((item) => order.restaurant?.menu.includes(item.id))
            .map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer border shadow-md rounded-2xl hover:shadow-lg transition"
                onClick={() =>
                  setOrder((prev) => ({
                    ...prev,
                    items: [...prev.items, item],
                  }))
                }
              >
                <CardContent className="p-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-28 object-cover rounded-lg"
                  />
                  <p className="font-semibold mt-2 text-sm text-gray-800">
                    {item.name}
                  </p>
                  <p className="text-sm font-bold text-green-600 font-medium">
                    ₹{item.price}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Cart */}
      <Card className="w-full md:w-72 border shadow-md rounded-2xl">
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
              <ul className="mt-2 space-y-1">
                {Object.entries(
                  order.items.reduce(
                    (acc: Record<string, { count: number; price: number }>, item) => {
                      if (!acc[item.name]) {
                        acc[item.name] = { count: 0, price: item.price };
                      }
                      acc[item.name].count += 1;
                      return acc;
                    },
                    {}
                  )
                ).map(([name, data], idx) => (
                  <li
                    key={idx}
                    className="text-sm flex justify-between border-b pb-1"
                  >
                    <span>
                      {name} <span className="text-gray-500">₹{data.price}</span>
                    </span>
                    <span className="font-medium text-gray-700">× {data.count}</span>
                  </li>
                ))}
              </ul>

              {/* Total Price */}
              <div className="mt-3 flex justify-between font-semibold text-gray-800">
                <span>Total:</span>
                <span>
                  ₹
                  {order.items.reduce((sum, item) => sum + item.price, 0)}
                </span>
              </div>
            </>
          )}
          <Button className="mt-4 w-full rounded-xl" onClick={() => setStep(5)}>
            Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  )}


  {/* Step 5: Success */}
  {step === 5 && (
    <Card className="w-full max-w-md border shadow-md rounded-2xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2 text-green-600">
          <Home /> Order Successful 🎉
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Restaurant Selected */}
        <p className="mb-2 text-gray-700">
          <span className="font-semibold">Restaurant:</span>{" "}
          <span className="text-indigo-600">{order.restaurant?.name}</span>
        </p>

        {/* Order Items */}
        <div className="mt-4 border-t pt-3 text-left">
          <p className="font-semibold text-gray-800 mb-2">Order Details:</p>
          <ul className="space-y-1">
            {Object.entries(
              order.items.reduce(
                (
                  acc: Record<string, { count: number; price: number }>,
                  item
                ) => {
                  if (!acc[item.name]) {
                    acc[item.name] = { count: 0, price: item.price };
                  }
                  acc[item.name].count += 1;
                  return acc;
                },
                {}
              )
            ).map(([name, data], idx) => (
              <li
                key={idx}
                className="flex justify-between text-sm border-b pb-1"
              >
                <span>
                  {name} × {data.count}
                </span>
                <span className="font-medium text-gray-700">
                  ₹{data.count * data.price}
                </span>
              </li>
            ))}
          </ul>

          {/* Total Price */}
          <div className="mt-3 flex justify-between font-bold text-gray-900 text-base border-t pt-2">
            <span>Total</span>
            <span>
              ₹{order.items.reduce((sum, item) => sum + item.price, 0)}
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
            setOrder({ type: "", contact: "", restaurant: null, items: [] });
            setStep(1);
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
