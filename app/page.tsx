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
{ id: 1, name: "Spicy Villa", distance: "1.2 km", image: "/restaurant1.jpg" },
{ id: 2, name: "Sweet Treats", distance: "2.5 km", image: "/restaurant2.jpg" },
{ id: 3, name: "Veggie Delight", distance: "3.8 km", image: "/restaurant3.jpg" },
{ id: 4, name: "Royal Tandoor", distance: "4.2 km", image: "/restaurant4.jpg" },
{ id: 5, name: "Biryani Palace", distance: "5.0 km", image: "/restaurant5.jpg" },
{ id: 6, name: "Cafe Mocha", distance: "2.0 km", image: "/restaurant6.jpg" },
{ id: 7, name: "Healthy Bites", distance: "3.3 km", image: "/restaurant7.jpg" },
];


const menuItems: MenuItem[] = [
{ id: 1, name: "Paneer Butter Masala", image: "/menu1.jpg" },
{ id: 2, name: "Chocolate Cake", image: "/menu2.jpg" },
{ id: 3, name: "Veg Biryani", image: "/menu3.jpg" },
{ id: 4, name: "Butter Naan", image: "/menu4.jpg" },
{ id: 5, name: "Cold Coffee", image: "/menu5.jpg" },
{ id: 6, name: "French Fries", image: "/menu6.jpg" },
{ id: 7, name: "Chicken Tikka", image: "/menu7.jpg" },
];

export default function VoiceFoodOrderingApp() {
  const [step, setStep] = useState<number>(1);
  const [transcript, setTranscript] = useState<string>("");
  const [order, setOrder] = useState<Order>({ type: "", contact: "", restaurant: null, items: [] });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.trim();
      setTranscript(text);
      handleVoiceCommand(text);
    };

    recognition.start();

    return () => recognition.stop();
  }, [step]);

  const handleVoiceCommand = (text: string) => {
    const cmd = text.toLowerCase();
    console.log("Transcript:", cmd);

    if (step === 1) {
      if (cmd.includes("dine")) {
        setOrder((prev) => ({ ...prev, type: "Dine In" }));
        setStep(2);
      } else if (cmd.includes("takeaway") || cmd.includes("take away")) {
        setOrder((prev) => ({ ...prev, type: "Takeaway" }));
        setStep(2);
      }
    } else if (step === 2) {
      if (cmd.includes("guest")) {
        setOrder((prev) => ({ ...prev, contact: "Guest" }));
        setStep(3);
      } else if (cmd.includes("number is")) {
        const num = cmd.split("number is")[1]?.trim();
        setOrder((prev) => ({ ...prev, contact: num }));
        setStep(3);
      }
    } else if (step === 3) {
      const restaurant = restaurants.find((r) => cmd.includes(r.name.toLowerCase()) || cmd.includes(r.id.toString()));
      if (restaurant) {
        setOrder((prev) => ({ ...prev, restaurant }));
        setStep(4);
      }
    } else if (step === 4) {
      if (cmd.includes("check")) {
        setStep(5);
      } else if (cmd.includes("add")) {
        const item = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
        if (item) setOrder((prev) => ({ ...prev, items: [...prev.items, item] }));
      } else if (cmd.includes("remove")) {
        const item = menuItems.find((m) => cmd.includes(m.name.toLowerCase()));
        if (item) setOrder((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }));
      }
    } else if (step === 5) {
      if (cmd.includes("new order")) {
        setOrder({ type: "", contact: "", restaurant: null, items: [] });
        setStep(1);
      }
    }

    setTranscript("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      {/* Transcript Box */}
      <Card className="w-full max-w-md mb-6 border shadow-md">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">You said:</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-gray-800">{transcript || "..."}</p>
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
          {restaurants.map((r) => (
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
            {menuItems.map((item) => (
              <Card key={item.id} className="cursor-pointer border shadow-md" onClick={() => setOrder((prev) => ({ ...prev, items: [...prev.items, item] }))}>
                <CardContent className="p-3">
                  <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded-lg" />
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
