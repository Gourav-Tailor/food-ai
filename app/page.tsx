"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Phone, Home, Utensils, Store } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  distance: string;
  image: string;
  menu: number[]; // <-- list of menu item ids available at this restaurant
}

interface MenuItem {
  id: number;
  name: string;
  image: string;
}

interface Order {
  type: string;
  contact: string;
  restaurant: Restaurant | null;
  items: MenuItem[];
}


const restaurants: Restaurant[] = [
  { id: 1, name: "Rajasthani Thali", distance: "1.5 km", image: "/rajasthani-thali.jpg", menu: [1, 2, 3, 4, 7] },
  { id: 2, name: "Marwar Delight", distance: "2.8 km", image: "/marwar-delight.jpg", menu: [1, 3, 5, 6, 8] },
  { id: 3, name: "Desert Spice", distance: "3.2 km", image: "/desert-spice.jpg", menu: [2, 4, 6, 7, 9] },
  { id: 4, name: "Jaipur Bhoj", distance: "4.0 km", image: "/jaipur-bhoj.jpg", menu: [1, 2, 5, 8, 9] },
];

const menuItems: MenuItem[] = [
  { id: 1, name: "Dal Baati Churma", image: "/dal-baati-churma.jpg" },
  { id: 2, name: "Gatte ki Sabzi", image: "/gatte-ki-sabzi.jpg" },
  { id: 3, name: "Ker Sangri", image: "/ker-sangri.jpg" },
  { id: 4, name: "Bajre ki Roti", image: "/bajre-ki-roti.jpg" },
  { id: 5, name: "Laal Maas", image: "/laal-maas.jpg" },
  { id: 6, name: "Gulab Jamun", image: "/gulab-jamun.jpg" },
  { id: 7, name: "Namkeen Sev", image: "/namkeen-sev.jpg" },
  { id: 8, name: "Mawa Kachori", image: "/mawa-kachori.jpg" },
  { id: 9, name: "Pyaaz Kachori", image: "/pyaaz-kachori.jpg" },
];

export default function VoiceFoodOrderingApp() {
  const [step, setStep] = useState<number>(1);
  const [transcript, setTranscript] = useState<string>("");
  const [order, setOrder] = useState<Order>({ type: "", contact: "", restaurant: null, items: [] });
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(restaurants);
  const [parsedCommand, setParsedCommand] = useState<string>("");


  // --- TTS Helper ---
  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
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
                content: `
                 You are a strict command parser for a voice-based food ordering assistant.
                 Return JSON ONLY. No extra text, no explanations.

                 Rules (normalize everything to lower-case, ignore filler words like "um", "please", "I want", etc.):
                 - Step 1: Look for intent to select order type. Output "dine in" if user mentions dining in, eating here, or similar. Output "takeaway" if user mentions take away, pickup, to go, or similar.
                 - Step 2: Look for contact info. Output "guest" if user says guest, anonymous, no number, or similar. Output "number is <digits>" if user provides a phone number (extract only the digits, e.g., from "my number is 123-456-7890" extract "1234567890").
                 - Step 3: Look for restaurant selection. Output "restaurant <name>" where <name> is the closest matching restaurant name (fuzzy match allowed, e.g., "rajasthani" for "Rajasthani Thali"). Include the full or partial name for downstream matching. Available restaurants: ${restaurants.map(r => r.name).join(', ')}.
                 - Step 4: Look for cart actions. Output "add <item>" where <item> is the closest matching menu item name (fuzzy match, e.g., "dal baati" for "Dal Baati Churma"). Output "remove <item>" similarly for removals. Output "checkout" for finishing, paying, done, or similar. Available menu items: ${menuItems.map(m => m.name).join(', ')}.
                 - Step 5: Output "new order" if user wants to start over, reset, or new.

                 Examples:
                 - User: "I'd like to dine in please" → { "command": "dine in" }
                 - User: "Take out" → { "command": "takeaway" }
                 - User: "I'm a guest" → { "command": "guest" }
                 - User: "My phone is five five five one two three four" → { "command": "number is 5551234" }
                 - User: "I want Rajasthani Thali" → { "command": "restaurant rajasthani thali" }
                 - User: "Pick the marwar one" → { "command": "restaurant marwar delight" }
                 - User: "Add gulab jamun and dal baati" → { "command": "add gulab jamun" }
                 - User: "Remove the namkeen" → { "command": "remove namkeen sev" }
                 - User: "I'm done, checkout now" → { "command": "checkout" }
                 - User: "Start a new order" → { "command": "new order" }

                 If you cannot parse confidently or it doesn't match the current step, return: { "command": "unknown" }

                 ALWAYS output exactly one JSON object with a "command" field.
                `,
              },
              {
                role: "user",
                content: `user said in step-${step}: ${text}`,
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
        } else {
          handleVoiceCommand(text);
          setParsedCommand(text);
          setTranscript(text);
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
        setOrder((prev) => ({ ...prev, items: [...prev.items, item] }));
        speak(`${item.name} has been added to your order.`);
      }
    } else if (cmd.includes("remove")) {
      const item = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
      if (item) {
        setOrder((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== item.id),
        }));
        speak(`${item.name} has been removed from your order.`);
      }
    }
  } else if (step === 5) {
    if (cmd.includes("new order")) {
      setOrder({ type: "", contact: "", restaurant: null, items: [] });
      setStep(1);
      speak("Starting a new order. Please say dine in or takeaway.");
    }
  }

  // setTranscript("");
};


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      {/* Transcript Box */}
      <Card className="w-full max-w-md mb-6 border shadow-md">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Voice Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Raw Speech */}
            <div>
              <p className="text-xs text-gray-500">You said:</p>
              <p className="font-semibold text-gray-800">
                {transcript || "..."}
              </p>
            </div>

            {/* Parsed Command */}
            <div className="border-t pt-2">
              <p className="text-xs text-gray-500">System understood:</p>
              <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {parsedCommand || "..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Step 1: Choose type */}
      {step === 1 && (
        <Card className="w-full max-w-md border shadow-md p-6 text-center">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <Utensils /> Choose Order Type
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => { setOrder({ ...order, type: "Dine In" }); setStep(2); }}>Dine In</Button>
            <Button variant="secondary" onClick={() => { setOrder({ ...order, type: "Takeaway" }); setStep(2); }}>Takeaway</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contact details */}
      {step === 2 && (
        <Card className="w-full max-w-md border shadow-md p-6 text-center">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <Phone /> Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input placeholder="Enter contact number" onBlur={(e) => { setOrder({ ...order, contact: e.target.value }); setStep(3); }} />
            <Button variant="secondary" onClick={() => { setOrder({ ...order, contact: "Guest" }); setStep(3); }}>Continue as Guest</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Restaurant list */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {filteredRestaurants.map((r) => (
            <Card key={r.id} className="cursor-pointer border shadow-md" onClick={() => { setOrder({ ...order, restaurant: r }); setStep(4); }}>
              <CardContent className="p-3">
                <img src={r.image} alt={r.name} className="w-full h-32 object-cover rounded-lg" />
                <p className="font-semibold mt-2 flex items-center gap-2"><Store size={16}/> {r.name}</p>
                <p className="text-sm text-gray-500">{r.distance}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 4: Menu */}
      {step === 4 && (
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
            {order.restaurant &&
              menuItems
                .filter((item) => order.restaurant?.menu.includes(item.id)) // ✅ only items from restaurant menu
                .map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer border shadow-md"
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
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <p className="font-semibold mt-2">{item.name}</p>
                    </CardContent>
                  </Card>
                ))}
          </div>
          <Card className="w-72 border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={18}/> Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-500">No items added</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {Object.entries(
                    order.items.reduce((acc: Record<string, number>, item) => {
                      acc[item.name] = (acc[item.name] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, count], idx) => (
                    <li key={idx} className="text-sm flex justify-between">
                      <span>{name}</span>
                      <span className="font-medium text-gray-700"> x {count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button className="mt-4 w-full" onClick={() => setStep(5)}>
                Checkout
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && (
        <Card className="w-full max-w-md border shadow-md text-center p-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Home /> Order Successful 🎉
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">Your token: <span className="font-mono">#{Math.floor(Math.random() * 1000)}</span></p>
            <p className="text-gray-600 mb-4">Expected time: 20 mins</p>
            <Button onClick={() => { setOrder({ type: "", contact: "", restaurant: null, items: [] }); setStep(1); }}>New Order</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
