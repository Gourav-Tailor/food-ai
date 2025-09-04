"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ShoppingCart, MapPin, Star, Utensils, Plus, Minus, ChevronRight, ChevronLeft, Check, X, Filter, Trash2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { restaurants } from "@/data/restaurants";

// ---------- Voice Recognition Hook ----------
interface VoiceCommand {
  command: string;
  action: () => void;
  pattern?: RegExp;
  context?: string[];
}

const useVoiceRecognition = (commands: VoiceCommand[], isEnabled: boolean) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, [commands]);

  const processVoiceCommand = useCallback((transcript: string) => {
    for (const command of commands) {
      if (command.pattern && command.pattern.test(transcript)) {
        command.action();
        return;
      }
      
      const commandWords = command.command.toLowerCase().split(' ');
      const transcriptWords = transcript.toLowerCase().split(' ');
      
      // Simple matching logic - can be enhanced
      if (commandWords.some(word => transcriptWords.includes(word))) {
        command.action();
        return;
      }
    }
  }, [commands]);

  const startListening = useCallback(() => {
    if (recognition.current && isEnabled && !isListening) {
      setTranscript("");
      recognition.current.start();
      setIsListening(true);
    }
  }, [isEnabled, isListening]);

  const stopListening = useCallback(() => {
    if (recognition.current && isListening) {
      recognition.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    isSupported
  };
};

// ---------- Voice Synthesis Hook ----------
const useVoiceSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string, rate: number = 1, pitch: number = 1) => {
    if (!isSupported || !text) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isSupported };
};

// ---------- Types (keeping existing ones) ----------
type Extra = {
  id: string;
  name: string;
  price: number;
};

interface Option {
  id: string;
  label: string;
  price: number;
  spice?: string;
}

interface OptionSet {
  id: string;
  label: string;
  type: "radio" | "checkbox";
  required?: boolean;
  options: Option[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  rating: number;
  calories?: number;
  category: string;
  popular?: boolean;
  optionSets: OptionSet[];
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  distanceKm: number;
  priceLevel: number;
  rating: number;
  etaMin: number;
  image: string;
  menu: MenuItem[];
}

type ChosenOption = {
  optionSetId: string;
  values: string[];
};

type CartLine = {
  uid: string;
  itemId: string;
  itemName: string;
  restaurantId: string;
  quantity: number;
  chosen: ChosenOption[];
  unitPrice: number;
  notes?: string;
};

// ---------- Helper Functions (keeping existing ones) ----------
const formatMoney = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const priceLevelTo = (lvl: Restaurant["priceLevel"]) => "₹".repeat(lvl);

function computeUnitPrice(item: MenuItem, chosen: ChosenOption[]) {
  let price = item.basePrice;
  for (const set of item.optionSets) {
    const picked = chosen.find((c) => c.optionSetId === set.id);
    if (!picked) continue;
    if (set.type === "radio") {
      const opt = set.options.find((o) => o.id === picked.values[0]);
      if (opt) price += opt.price;
    } else {
      for (const id of picked.values) {
        const opt = set.options.find((o) => o.id === id);
        if (opt) price += opt.price;
      }
    }
  }
  return price;
}

function ensureDefaults(item: MenuItem): ChosenOption[] {
  return item.optionSets.map((set) => {
    if (set.type === "radio") {
      const first = set.options[0]?.id ?? "";
      return { optionSetId: set.id, values: [first] };
    }
    return { optionSetId: set.id, values: [] };
  });
}

// ---------- Main Component ----------
export default function VoiceEnabledFoodOrderingApp() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<{ item: MenuItem; chosen: ChosenOption[]; qty: number } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSettings, setVoiceSettings] = useState({
    autoSpeak: true,
    speechRate: 1,
    speechPitch: 1
  });

  // Voice synthesis
  const { speak, stop, isSpeaking, isSupported: speechSupported } = useVoiceSynthesis();

  
  // Existing computed values
  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => r.name.toLowerCase().includes(q) || r.cuisine.join(", ").toLowerCase().includes(q));
  }, [search]);

  
  const categories = useMemo(() => {
    if (!selectedRestaurant) return [] as string[];
    const unique = Array.from(new Set(selectedRestaurant.menu.map((m) => m.category)));
    return ["All", ...unique];
  }, [selectedRestaurant]);

  const menuForActiveCategory = useMemo(() => {
    if (!selectedRestaurant) return [] as MenuItem[];
    const all = selectedRestaurant.menu;
    if (!activeCategory || activeCategory === "All") return all;
    return all.filter((m) => m.category === activeCategory);
  }, [selectedRestaurant, activeCategory]);


  // Voice commands based on current context
  const voiceCommands: VoiceCommand[] = useMemo(() => {
    const commands: VoiceCommand[] = [
      // Global commands
      {
        command: "help",
        action: () => {
          const helpText = step === 1 
            ? "You can say: show restaurants, search for pizza, find indian food"
            : step === 2 
            ? "You can say: show menu, browse appetizers, add item to cart, go back"
            : "You can say: show cart, place order, go back, modify order";
          speak(helpText);
        }
      },
      {
        command: "go back",
        action: () => back()
      },
      {
        command: "start over",
        action: () => {
          setStep(1);
          setSelectedRestaurant(null);
          setCart([]);
          speak("Starting over. Please select a restaurant.");
        }
      }
    ];

    // Step-specific commands
    if (step === 1) {
      commands.push(
        {
          command: "show restaurants",
          action: () => speak(`Showing ${filteredRestaurants.length} restaurants. ${filteredRestaurants.slice(0, 3).map(r => r.name).join(', ')}`)
        },
        {
          command: "search",
          pattern: /search for (.+)|find (.+) restaurants?|show (.+) food/i,
          action: () => {
            // This would be enhanced to extract the search term
            speak("What would you like to search for?");
          }
        }
      );

      // Add commands for each restaurant
      filteredRestaurants.forEach(restaurant => {
        commands.push({
          command: `select ${restaurant.name.toLowerCase()}`,
          action: () => {
            pickRestaurant(restaurant);
            speak(`Selected ${restaurant.name}. ${restaurant.cuisine.join(' and ')} cuisine. Estimated delivery time ${restaurant.etaMin} minutes.`);
          }
        });
      });
    }

    if (step === 2 && selectedRestaurant) {
      commands.push(
        {
          command: "show menu",
          action: () => speak(`Showing menu for ${selectedRestaurant.name}. Available categories: ${categories.slice(1).join(', ')}`)
        },
        {
          command: "show cart",
          action: () => {
            if (cart.length === 0) {
              speak("Your cart is empty");
            } else {
              speak(`Your cart has ${cart.length} items. Total: ${formatMoney(subtotal)}`);
            }
          }
        },
        {
          command: "proceed to checkout",
          action: () => {
            if (cart.length > 0) {
              proceedToCheckout();
              speak("Proceeding to checkout");
            } else {
              speak("Your cart is empty. Please add items first.");
            }
          }
        }
      );

      // Category navigation
      categories.forEach(category => {
        if (category !== "All") {
          commands.push({
            command: `browse ${category.toLowerCase()}`,
            action: () => {
              setActiveCategory(category);
              speak(`Browsing ${category} items`);
            }
          });
        }
      });

      // Menu items
      menuForActiveCategory.forEach(item => {
        commands.push({
          command: `add ${item.name.toLowerCase()}`,
          action: () => {
            openCustomize(item);
            speak(`Customizing ${item.name}. ${item.description}. Base price ${formatMoney(item.basePrice)}`);
          }
        });
      });
    }

    if (step === 3) {
      commands.push(
        {
          command: "place order",
          action: () => {
            speak(`Order placed! Total amount: ${formatMoney(total)}. Your order will be delivered in ${selectedRestaurant?.etaMin || 30} minutes.`);
          }
        },
        {
          command: "modify order",
          action: () => {
            setStep(2);
            speak("Going back to modify your order");
          }
        }
      );
    }

    // Customization dialog commands
    if (customizing) {
      commands.push(
        {
          command: "add to cart",
          action: () => {
            addToCart();
            speak(`Added ${customizing.item.name} to cart`);
          }
        },
        {
          command: "cancel",
          action: () => {
            setCustomizing(null);
            speak("Cancelled customization");
          }
        },
        {
          command: "increase quantity",
          action: () => {
            setCustomizing({ ...customizing, qty: customizing.qty + 1 });
            speak(`Quantity increased to ${customizing.qty + 1}`);
          }
        },
        {
          command: "decrease quantity",
          action: () => {
            setCustomizing({ ...customizing, qty: Math.max(1, customizing.qty - 1) });
            speak(`Quantity decreased to ${Math.max(1, customizing.qty - 1)}`);
          }
        }
      );
    }

    return commands;
  }, [step, selectedRestaurant, activeCategory, customizing, cart, filteredRestaurants]);

  // Voice recognition
  const { isListening, startListening, stopListening, transcript, isSupported: recognitionSupported } = useVoiceRecognition(voiceCommands, voiceEnabled);

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes + (subtotal > 0 ? 20 : 0);

  // Existing functions
  function pickRestaurant(r: Restaurant) {
    setSelectedRestaurant(r);
    setActiveCategory("All");
    setStep(2);
  }

  function openCustomize(item: MenuItem) {
    setCustomizing({ item, chosen: ensureDefaults(item), qty: 1 });
  }

  function updateChosen(setId: string, values: string[], type: OptionSet["type"]) {
    if (!customizing) return;
    setCustomizing({
      ...customizing,
      chosen: customizing.chosen.map((c) => (c.optionSetId === setId ? { ...c, values: type === "radio" ? [values[0]] : values } : c)),
    });
  }

  function addToCart() {
    if (!customizing || !selectedRestaurant) return;
    const { item, chosen, qty } = customizing;
    const price = computeUnitPrice(item, chosen);
    const uid = `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const line: CartLine = {
      uid,
      itemId: item.id,
      itemName: item.name,
      restaurantId: selectedRestaurant.id,
      quantity: qty,
      chosen,
      unitPrice: price,
    };
    setCart((c) => [...c, line]);
    setCustomizing(null);
  }

  function changeQty(uid: string, delta: number) {
    setCart((c) =>
      c
        .map((l) => (l.uid === uid ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(uid: string) {
    setCart((c) => c.filter((l) => l.uid !== uid));
  }

  function clearCart() { 
    setCart([]);
    if (voiceSettings.autoSpeak) {
      speak("Cart cleared");
    }
  }

  function back() {
    if (step === 2) {
      setSelectedRestaurant(null);
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  }

  function proceedToCheckout() {
    setStep(3);
  }

  // Voice control toggle
  const toggleVoiceListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      // Speak current context
      const contextText = step === 1 
        ? "Welcome to the food ordering app. Please select a restaurant."
        : step === 2 
        ? `You're browsing ${selectedRestaurant?.name}. Add items to your cart.`
        : "Review your order and proceed to checkout.";
      speak(contextText);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Voice Controls Bar */}
      {(recognitionSupported || speechSupported) && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Card className="p-2">
            <div className="flex items-center gap-2">
              {recognitionSupported && (
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleVoiceListening}
                  className="flex items-center gap-1"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? "Stop" : "Voice"}
                </Button>
              )}
              {speechSupported && (
                <Button
                  variant={isSpeaking ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleSpeech}
                  className="flex items-center gap-1"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isSpeaking ? "Stop" : "Speak"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak("Say 'help' to hear available commands")}
              >
                ?
              </Button>
            </div>
            {transcript && (
              <div className="mt-2 text-xs text-gray-600 max-w-48 truncate">
                "{transcript}"
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="h-8 w-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-900">FoodieVoice</h1>
            </div>
            <div className="flex items-center gap-4">
              {cart.length > 0 && (
                <Button variant="outline" className="relative" onClick={() => setStep(3)}>
                  <ShoppingCart className="h-4 w-4" />
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-8">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${step >= 1 ? "bg-orange-100 text-orange-800" : "opacity-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-orange-600 text-white" : "bg-gray-300"}`}>1</div>
              Select Restaurant
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${step >= 2 ? "bg-orange-100 text-orange-800" : "opacity-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-orange-600 text-white" : "bg-gray-300"}`}>2</div>
              Choose Menu & Customize
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${step >= 3 ? "bg-orange-100 text-orange-800" : "opacity-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? "bg-orange-600 text-white" : "bg-gray-300"}`}>3</div>
              Review & Checkout
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Restaurants or Menu */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Select a Restaurant
                  {recognitionSupported && (
                    <Badge variant="secondary" className="ml-auto">
                      Say "search for [restaurant]" or "select [name]"
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search restaurants or cuisines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="space-y-3">
                  {filteredRestaurants.map((r) => (
                    <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-orange-600 font-medium">{priceLevelTo(r.priceLevel)}</span>
                              <h3 className="font-semibold text-lg">{r.name}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {r.distanceKm} km
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {r.rating}
                              </span>
                              <span>{r.etaMin} min</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {r.cuisine.map((c) => (
                                <Badge key={c} variant="secondary" className="text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button onClick={() => pickRestaurant(r)}>
                            Choose
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {step >= 2 && selectedRestaurant && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRestaurant.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedRestaurant.cuisine.join(" • ")} • {priceLevelTo(selectedRestaurant.priceLevel)} • {selectedRestaurant.etaMin} min ETA
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    Change Restaurant
                  </Button>
                </div>
                {recognitionSupported && (
                  <Badge variant="secondary" className="w-fit">
                    Say "browse [category]" or "add [item name]"
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeCategory || "All"} onValueChange={setActiveCategory} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    {categories.map((c) => (
                      <TabsTrigger key={c} value={c} className="text-xs">
                        {c}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeCategory || "All"} className="space-y-4 mt-4">
                    {menuForActiveCategory.map((m, idx) => (
                      <Card key={m.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  #{idx + 1}
                                </Badge>
                                <h3 className="font-medium">{m.name}</h3>
                                {m.popular && <Badge className="bg-red-100 text-red-800">Popular</Badge>}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{m.description}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {m.rating}
                                </span>
                                {m.calories && <span>• {m.calories} cal</span>}
                              </div>
                              <p className="font-medium text-orange-600 mt-2">
                                Starts at {formatMoney(m.basePrice)}
                              </p>
                            </div>
                            <Button onClick={() => openCustomize(m)} size="sm">
                              Customize
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to Restaurants
                </Button>
                <Button onClick={proceedToCheckout} disabled={cart.length === 0}>
                  Review Order
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Checkout</CardTitle>
                <p className="text-sm text-gray-600">
                  Review your items and confirm your delivery details. (Static demo – no payments)
                </p>
                {recognitionSupported && (
                  <Badge variant="secondary" className="w-fit">
                    Say "place order" or "modify order"
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((l) => (
                  <div key={l.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{l.itemName} × {l.quantity}</h4>
                      <p className="text-xs text-gray-600">
                        {l.chosen.map((c) => `${c.optionSetId}: ${c.values.join(", ") || "—"}`).join(" • ")}
                      </p>
                    </div>
                    <span className="font-medium">{formatMoney(l.unitPrice * l.quantity)}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxes</span>
                    <span>{formatMoney(taxes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>{subtotal > 0 ? formatMoney(20) : "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4" />
                  Modify Order
                </Button>
                <Button className="flex-1" onClick={() => speak(`Order placed! Total amount: ${formatMoney(total)}. Your order will be delivered in ${selectedRestaurant?.etaMin || 30} minutes.`)}>
                  Place Order
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right / Summary Card - keeping existing content */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((line) => (
                    <div key={line.uid} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{line.itemName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => changeQty(line.uid, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm min-w-[1.5rem] text-center">{line.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => changeQty(line.uid, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-medium">{formatMoney(line.unitPrice * line.quantity)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeLine(line.uid)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes (5%)</span>
                      <span>{formatMoney(taxes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span>{formatMoney(20)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatMoney(total)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={proceedToCheckout}
                      disabled={step === 3}
                    >
                      {step === 3 ? "At Checkout" : "Proceed to Checkout"}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={clearCart}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={!!customizing} onOpenChange={(o) => !o && setCustomizing(null)}>
        {customizing && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Customize – {customizing.item.name}
                {recognitionSupported && (
                  <Badge variant="secondary" className="ml-2">
                    Say "add to cart" or "increase quantity"
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-sm text-gray-600">
                {customizing.item.description} • Starts at {formatMoney(customizing.item.basePrice)}
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {customizing.item.optionSets.map((set) => (
                <div key={set.id} className="space-y-3">
                  <Label className="text-base font-medium">
                    {set.label}
                    {set.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {set.type === "radio" ? (
                    <RadioGroup
                      value={customizing.chosen.find((c) => c.optionSetId === set.id)?.values[0] ?? ""}
                      onValueChange={(v) => updateChosen(set.id, [v], "radio")}
                      className="grid grid-cols-2 gap-2"
                    >
                      {set.options.map((o) => (
                        <div key={o.id} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                          <RadioGroupItem value={o.id} id={`${set.id}-${o.id}`} />
                          <Label htmlFor={`${set.id}-${o.id}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span>{o.label}</span>
                              <span className="text-sm text-gray-500">
                                {o.price > 0 ? `+${formatMoney(o.price)}` : "Included"}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {set.options.map((o) => {
                        const current = customizing.chosen.find((c) => c.optionSetId === set.id)?.values || [];
                        const checked = current.includes(o.id);
                        return (
                          <div key={o.id} className="flex items-center space-x-2 p-2 border rounded">
                            <Checkbox
                              id={`${set.id}-${o.id}`}
                              checked={checked}
                              onCheckedChange={(ck) => {
                                const values = new Set(current);
                                if (ck) values.add(o.id); else values.delete(o.id);
                                updateChosen(set.id, Array.from(values), "checkbox");
                              }}
                            />
                            <Label htmlFor={`${set.id}-${o.id}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <span>{o.label}</span>
                                <span className="text-sm text-gray-500">
                                  {o.price > 0 ? `+${formatMoney(o.price)}` : "Included"}
                                </span>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="space-y-3">
                <Label>Special notes</Label>
                <Input placeholder="Any special requests..." />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCustomizing({ ...customizing, qty: Math.max(1, customizing.qty - 1) })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="flex-1 text-center font-medium">{customizing.qty}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCustomizing({ ...customizing, qty: customizing.qty + 1 })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <div className="font-medium text-center py-2">
                    {formatMoney(computeUnitPrice(customizing.item, customizing.chosen))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Line Total</Label>
                  <div className="font-bold text-center py-2 text-orange-600">
                    {formatMoney(computeUnitPrice(customizing.item, customizing.chosen) * customizing.qty)}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCustomizing(null)}>
                Cancel
              </Button>
              <Button onClick={addToCart}>
                Add to Cart
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}