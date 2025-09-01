"use client";

import React, { useMemo, useState } from "react";
import { ShoppingCart, MapPin, Star, Utensils, Plus, Minus, ChevronRight, ChevronLeft, Check, X, Filter, Trash2 } from "lucide-react";
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

// ---------- Types ----------

type Extra = {
  id: string;
  name: string;
  price: number;
};

type OptionSet = {
  id: string;
  label: string;
  type: "radio" | "checkbox";
  required?: boolean;
  options: Array<{ id: string; label: string; price: number } & ({ spice?: never } | { spice?: "mild" | "medium" | "hot" })>;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  rating: number;
  calories?: number;
  category: string;
  popular?: boolean;
  optionSets: OptionSet[]; // size, spice, addons, etc
};

type Restaurant = {
  id: string;
  name: string;
  cuisine: string[];
  distanceKm: number;
  priceLevel: 1 | 2 | 3 | 4;
  rating: number;
  etaMin: number;
  image?: string;
  menu: MenuItem[];
};

type ChosenOption = {
  optionSetId: string;
  // radio => single id, checkbox => multiple ids
  values: string[];
};

type CartLine = {
  uid: string; // unique per cart line
  itemId: string;
  itemName: string;
  restaurantId: string;
  quantity: number;
  chosen: ChosenOption[];
  unitPrice: number; // computed per configuration
  notes?: string;
};

// ---------- Static Data ----------

const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "Bombay Spice Kitchen",
    cuisine: ["Indian", "North Indian", "Biryani"],
    distanceKm: 1.2,
    priceLevel: 2,
    rating: 4.5,
    etaMin: 28,
    image: "https://images.unsplash.com/photo-1598515213641-8a9b7351826e?q=80&w=1600&auto=format&fit=crop",
    menu: [
      {
        id: "m1",
        name: "Chicken Biryani",
        description: "Aromatic basmati, tender chicken, saffron, and whole spices.",
        basePrice: 240,
        rating: 4.7,
        calories: 780,
        category: "Mains",
        popular: true,
        optionSets: [
          {
            id: "size",
            label: "Portion Size",
            type: "radio",
            required: true,
            options: [
              { id: "regular", label: "Regular", price: 0 },
              { id: "large", label: "Large", price: 80 },
              { id: "family", label: "Family Pack", price: 180 },
            ],
          },
          {
            id: "spice",
            label: "Spice Level",
            type: "radio",
            required: true,
            options: [
              { id: "mild", label: "Mild", price: 0, spice: "mild" },
              { id: "medium", label: "Medium", price: 0, spice: "medium" },
              { id: "hot", label: "Hot", price: 0, spice: "hot" },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "egg", label: "Boiled Egg", price: 20 },
              { id: "raita", label: "Raita", price: 30 },
              { id: "extra-chicken", label: "Extra Chicken", price: 90 },
            ],
          },
        ],
      },
      {
        id: "m2",
        name: "Paneer Butter Masala",
        description: "Creamy tomato gravy with cottage cheese cubes.",
        basePrice: 220,
        rating: 4.6,
        calories: 560,
        category: "Mains",
        optionSets: [
          {
            id: "size",
            label: "Portion Size",
            type: "radio",
            required: true,
            options: [
              { id: "regular", label: "Regular", price: 0 },
              { id: "large", label: "Large", price: 70 },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "butter-naan", label: "Butter Naan", price: 40 },
              { id: "jeera-rice", label: "Jeera Rice", price: 60 },
            ],
          },
        ],
      },
      {
        id: "m3",
        name: "Masala Chai",
        description: "Spiced milk tea brewed fresh.",
        basePrice: 40,
        rating: 4.3,
        category: "Beverages",
        optionSets: [
          {
            id: "sweetness",
            label: "Sweetness",
            type: "radio",
            required: true,
            options: [
              { id: "regular", label: "Regular", price: 0 },
              { id: "less", label: "Less Sugar", price: 0 },
              { id: "more", label: "Extra Sweet", price: 0 },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "ginger", label: "Ginger", price: 5 },
              { id: "elaichi", label: "Cardamom", price: 7 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "r2",
    name: "Kyoto Street Ramen",
    cuisine: ["Japanese", "Ramen"],
    distanceKm: 2.1,
    priceLevel: 3,
    rating: 4.4,
    etaMin: 35,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop",
    menu: [
      {
        id: "m4",
        name: "Tonkotsu Ramen",
        description: "Pork broth, chashu, egg, noodles, scallions.",
        basePrice: 380,
        rating: 4.8,
        category: "Bowls",
        optionSets: [
          {
            id: "size",
            label: "Bowl Size",
            type: "radio",
            required: true,
            options: [
              { id: "standard", label: "Standard", price: 0 },
              { id: "mega", label: "Mega", price: 120 },
            ],
          },
          {
            id: "spice",
            label: "Spice Level",
            type: "radio",
            required: true,
            options: [
              { id: "none", label: "No Spice", price: 0 },
              { id: "medium", label: "Medium", price: 0 },
              { id: "fiery", label: "Fiery", price: 0 },
            ],
          },
          {
            id: "addons",
            label: "Toppings",
            type: "checkbox",
            options: [
              { id: "nori", label: "Nori", price: 20 },
              { id: "corn", label: "Corn", price: 20 },
              { id: "extra-egg", label: "Extra Egg", price: 30 },
            ],
          },
        ],
      },
      {
        id: "m5",
        name: "Matcha Latte",
        description: "Creamy matcha with milk.",
        basePrice: 160,
        rating: 4.2,
        category: "Beverages",
        optionSets: [
          {
            id: "milk",
            label: "Milk Type",
            type: "radio",
            required: true,
            options: [
              { id: "dairy", label: "Dairy", price: 0 },
              { id: "almond", label: "Almond", price: 15 },
              { id: "oat", label: "Oat", price: 20 },
            ],
          },
          {
            id: "temp",
            label: "Temperature",
            type: "radio",
            required: true,
            options: [
              { id: "hot", label: "Hot", price: 0 },
              { id: "iced", label: "Iced", price: 0 },
            ],
          },
        ],
      },
    ],
  },
];

// ---------- Helpers ----------

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

export default function FoodOrderingApp() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: pick restaurant, 2: pick items, 3: review/checkout
  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<{ item: MenuItem; chosen: ChosenOption[]; qty: number } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

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

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + taxes + (subtotal > 0 ? 20 : 0); // + delivery fee flat 20 if any items

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

  function clearCart() { setCart([]); }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Utensils className="h-6 w-6" />
          <h1 className="text-xl font-semibold">FoodFlow</h1>
          <Badge variant="secondary" className="ml-2">Static Demo</Badge>
          <div className="ml-auto flex items-center gap-2">
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={back}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="mr-2 h-4 w-4" /> Cart
                  {cart.length > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  {cart.length === 0 && (
                    <p className="text-sm text-slate-500">Your cart is empty.</p>
                  )}
                  {cart.map((l) => (
                    <Card key={l.uid} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{l.itemName}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {l.chosen
                                .map((c) => `${c.optionSetId}: ${c.values.join(", ") || "—"}`)
                                .join(" • ")}
                            </div>
                            <div className="mt-1 text-sm">{formatMoney(l.unitPrice)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => changeQty(l.uid, -1)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center text-sm">{l.quantity}</span>
                            <Button size="icon" onClick={() => changeQty(l.uid, 1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Line total</span>
                          <span className="text-sm font-medium">{formatMoney(l.unitPrice * l.quantity)}</span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => removeLine(l.uid)}>
                            <Trash2 className="mr-1 h-4 w-4" /> Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Taxes (5%)</span><span>{formatMoney(taxes)}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>{subtotal > 0 ? formatMoney(20) : "—"}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(total)}</span></div>
                </div>
                <SheetFooter className="mt-4">
                  <div className="flex w-full items-center gap-2">
                    <Button variant="outline" className="w-1/3" onClick={clearCart} disabled={cart.length === 0}>
                      Clear
                    </Button>
                    <Button className="w-2/3" disabled={cart.length === 0} onClick={proceedToCheckout}>
                      Checkout
                    </Button>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        <ol className="grid grid-cols-3 gap-3 text-sm">
          <li className={`rounded-2xl border p-3 ${step >= 1 ? "bg-white" : "opacity-50"}`}>
            <div className="flex items-center gap-2 font-medium"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">1</span> Select Restaurant</div>
          </li>
          <li className={`rounded-2xl border p-3 ${step >= 2 ? "bg-white" : "opacity-50"}`}>
            <div className="flex items-center gap-2 font-medium"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">2</span> Choose Menu & Customize</div>
          </li>
          <li className={`rounded-2xl border p-3 ${step >= 3 ? "bg-white" : "opacity-50"}`}>
            <div className="flex items-center gap-2 font-medium"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">3</span> Review & Checkout</div>
          </li>
        </ol>
      </div>

      {/* Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-3">
        {/* Left / Restaurants or Menu */}
        <div className="md:col-span-2">
          {step === 1 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="relative w-full">
                  <Input placeholder="Search cuisines or restaurants" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredRestaurants.map((r) => (
                  <Card key={r.id} className="hover:shadow-sm">
                    <CardHeader className="p-0">
                      <div className="relative">
                        <img src={r.image} alt={r.name} className="h-40 w-full rounded-t-2xl object-cover" />
                        <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs shadow">{priceLevelTo(r.priceLevel)}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{r.name}</CardTitle>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.distanceKm} km</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {r.rating}</span>
                            <span>•</span>
                            <span>{r.etaMin} min</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.cuisine.map((c) => (
                              <Badge key={c} variant="secondary">{c}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button onClick={() => pickRestaurant(r)}>
                          Choose <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {step >= 2 && selectedRestaurant && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedRestaurant.name}</h2>
                  <div className="mt-1 text-sm text-slate-500">{selectedRestaurant.cuisine.join(" • ")} • {priceLevelTo(selectedRestaurant.priceLevel)} • {selectedRestaurant.etaMin} min ETA</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Change Restaurant
                </Button>
              </div>

              <Tabs value={activeCategory ?? "All"} onValueChange={(v) => setActiveCategory(v)} className="w-full">
                <TabsList className="w-full overflow-auto">
                  {categories.map((c) => (
                    <TabsTrigger key={c} value={c} className="whitespace-nowrap">{c}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={activeCategory ?? "All"} className="mt-4">
                  <ScrollArea className="h-[62vh] rounded-2xl border p-3">
                    <div className="grid grid-cols-1 gap-3">
                      {menuForActiveCategory.map((m, idx) => (
                        <Card key={m.id} className="group hover:shadow-sm">
                          <CardContent className="flex items-start gap-4 p-4">
                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{idx + 1}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{m.name}</CardTitle>
                                {m.popular && <Badge>Popular</Badge>}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 line-clamp-2">{m.description}</div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {m.rating}</span>
                                {m.calories && <span>• {m.calories} cal</span>}
                              </div>
                              <div className="mt-2 text-sm font-medium">Starts at {formatMoney(m.basePrice)}</div>
                            </div>
                            <div className="flex flex-none items-center gap-2">
                              <Button onClick={() => openCustomize(m)}>
                                Customize <Plus className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex items-center justify-end">
                <Button variant="outline" className="mr-2" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back to Restaurants
                </Button>
                <Button onClick={proceedToCheckout} disabled={cart.length === 0}>
                  Review Order <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-600">Review your items and confirm your delivery details. (Static demo – no payments)</div>
                  <div className="space-y-3">
                    {cart.map((l) => (
                      <div key={l.uid} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{l.itemName} × {l.quantity}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {l.chosen.map((c) => `${c.optionSetId}: ${c.values.join(", ") || "—"}`).join(" • ")}
                            </div>
                          </div>
                          <div className="text-sm font-medium">{formatMoney(l.unitPrice * l.quantity)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="grid gap-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                    <div className="flex justify-between"><span>Taxes</span><span>{formatMoney(taxes)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>{subtotal > 0 ? formatMoney(20) : "—"}</span></div>
                    <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(total)}</span></div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Modify Order
                    </Button>
                    <Button>
                      Place Order <Check className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        {/* Right / Summary Card */}
        <aside className="md:col-span-1">
          <Card className="sticky top-[92px] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                Order Summary
                <Badge variant="outline" className="font-normal">{cart.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cart.length === 0 && (
                  <p className="text-sm text-slate-500">No items yet. Add some deliciousness!</p>
                )}
                {cart.map((l) => (
                  <div key={l.uid} className="rounded-xl border p-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{l.itemName}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{l.chosen.map((c) => c.values.join("/ ")).filter(Boolean).join(" • ") || "—"}</div>
                        <div className="mt-1 text-xs">{formatMoney(l.unitPrice)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" onClick={() => changeQty(l.uid, -1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-sm">{l.quantity}</span>
                        <Button size="icon" onClick={() => changeQty(l.uid, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                <div className="flex justify-between"><span>Taxes</span><span>{formatMoney(taxes)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{subtotal > 0 ? formatMoney(20) : "—"}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(total)}</span></div>
              </div>
              <Button className="mt-4 w-full" disabled={cart.length === 0} onClick={proceedToCheckout}>
                Go to Checkout
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Customize Dialog */}
      <Dialog open={!!customizing} onOpenChange={(o) => !o && setCustomizing(null)}>
        <DialogContent className="max-w-2xl">
          {customizing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Customize – {customizing.item.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">Starts at {formatMoney(customizing.item.basePrice)}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  {customizing.item.optionSets.map((set) => (
                    <div key={set.id}>
                      <div className="mb-2 text-sm font-medium">{set.label}{set.required && <span className="ml-1 text-red-500">*</span>}</div>
                      {set.type === "radio" ? (
                        <RadioGroup
                          value={customizing.chosen.find((c) => c.optionSetId === set.id)?.values[0] ?? ""}
                          onValueChange={(v) => updateChosen(set.id, [v], "radio")}
                          className="grid grid-cols-2 gap-2"
                        >
                          {set.options.map((o) => (
                            <Label key={o.id} htmlFor={`${set.id}-${o.id}`} className="flex cursor-pointer items-center justify-between rounded-xl border p-3">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem id={`${set.id}-${o.id}`} value={o.id} />
                                <span>{o.label}</span>
                              </div>
                              <span className="text-xs text-slate-500">{o.price > 0 ? `+${formatMoney(o.price)}` : "Included"}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {set.options.map((o) => {
                            const current = customizing.chosen.find((c) => c.optionSetId === set.id)?.values || [];
                            const checked = current.includes(o.id);
                            return (
                              <Label key={o.id} htmlFor={`${set.id}-${o.id}`} className="flex cursor-pointer items-center justify-between rounded-xl border p-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`${set.id}-${o.id}`}
                                    checked={checked}
                                    onCheckedChange={(ck) => {
                                      const values = new Set(current);
                                      if (ck) values.add(o.id); else values.delete(o.id);
                                      updateChosen(set.id, Array.from(values), "checkbox");
                                    }}
                                  />
                                  <span>{o.label}</span>
                                </div>
                                <span className="text-xs text-slate-500">{o.price > 0 ? `+${formatMoney(o.price)}` : "Included"}</span>
                              </Label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-slate-500">Special notes</div>
                      {/* <Input placeholder="e.g., No onions, extra spicy" onChange={(e) => (customizing.notes = e.target.value)} /> */}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">Quantity</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setCustomizing({ ...customizing, qty: Math.max(1, customizing.qty - 1) })}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{customizing.qty}</span>
                          <Button size="icon" onClick={() => setCustomizing({ ...customizing, qty: customizing.qty + 1 })}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between text-sm">
                        <span>Unit Price</span>
                        <span className="font-medium">{formatMoney(computeUnitPrice(customizing.item, customizing.chosen))}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-base font-semibold">
                        <span>Line Total</span>
                        <span>{formatMoney(computeUnitPrice(customizing.item, customizing.chosen) * customizing.qty)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter>
                <div className="flex w-full items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setCustomizing(null)}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={addToCart}>
                    <Plus className="mr-2 h-4 w-4" /> Add to Cart
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="mt-8 border-t bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} FoodFlow Demo. Built with Next.js • Tailwind • shadcn/ui • lucide-react.</div>
          <div className="hidden sm:block">All data is static for demo purposes.</div>
        </div>
      </footer>
    </div>
  );
}
