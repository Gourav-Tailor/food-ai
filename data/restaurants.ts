// data/restaurants.ts

// Define interfaces for type safety
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

// Static restaurant data
export const restaurants: Restaurant[] = [
  {
    id: "r1",
    name: "Bombay Spice Kitchen",
    cuisine: ["Indian", "North Indian", "Biryani"],
    distanceKm: 1.2,
    priceLevel: 2,
    rating: 4.5,
    etaMin: 28,
    image: "https://lh3.googleusercontent.com/p/AF1QipMwh8ONtoWNgwVwMsdl-JMtxfYQVtbofd-Liwfi=s1360-w1360-h1020-rw",
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
  {
    id: "r3",
    name: "Mediterranean Breeze",
    cuisine: ["Mediterranean", "Greek", "Middle Eastern"],
    distanceKm: 1.8,
    priceLevel: 2,
    rating: 4.6,
    etaMin: 30,
    image: "https://images.unsplash.com/photo-1512485800893-b08ec1ea59b1?q=80&w=1600&auto=format&fit=crop",
    menu: [
      {
        id: "m6",
        name: "Lamb Gyro Platter",
        description: "Sliced lamb, tzatziki, pita, tomatoes, onions, and fries.",
        basePrice: 320,
        rating: 4.7,
        calories: 650,
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
              { id: "large", label: "Large", price: 100 },
            ],
          },
          {
            id: "sauce",
            label: "Sauce Choice",
            type: "radio",
            required: true,
            options: [
              { id: "tzatziki", label: "Tzatziki", price: 0 },
              { id: "harissa", label: "Harissa", price: 0 },
              { id: "garlic", label: "Garlic Sauce", price: 0 },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "feta", label: "Feta Cheese", price: 30 },
              { id: "olives", label: "Kalamata Olives", price: 25 },
              { id: "hummus", label: "Hummus Side", price: 40 },
            ],
          },
        ],
      },
      {
        id: "m7",
        name: "Falafel Wrap",
        description: "Crispy falafel, lettuce, tahini, and pickled veggies in a pita.",
        basePrice: 200,
        rating: 4.5,
        calories: 480,
        category: "Mains",
        optionSets: [
          {
            id: "wrap",
            label: "Wrap Type",
            type: "radio",
            required: true,
            options: [
              { id: "pita", label: "Pita", price: 0 },
              { id: "whole-wheat", label: "Whole Wheat Pita", price: 10 },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "feta", label: "Feta Cheese", price: 30 },
              { id: "extra-falafel", label: "Extra Falafel", price: 50 },
            ],
          },
        ],
      },
      {
        id: "m8",
        name: "Baklava",
        description: "Layered pastry with nuts and honey syrup.",
        basePrice: 80,
        rating: 4.4,
        calories: 300,
        category: "Desserts",
        optionSets: [
          {
            id: "size",
            label: "Serving Size",
            type: "radio",
            required: true,
            options: [
              { id: "single", label: "Single Piece", price: 0 },
              { id: "double", label: "Two Pieces", price: 70 },
            ],
          },
          {
            id: "addons",
            label: "Add-ons",
            type: "checkbox",
            options: [
              { id: "ice-cream", label: "Vanilla Ice Cream", price: 40 },
              { id: "pistachio", label: "Pistachio Topping", price: 20 },
            ],
          },
        ],
      },
      {
        id: "m9",
        name: "Pomegranate Spritzer",
        description: "Refreshing pomegranate juice with soda and mint.",
        basePrice: 90,
        rating: 4.3,
        category: "Beverages",
        optionSets: [
          {
            id: "sweetness",
            label: "Sweetness Level",
            type: "radio",
            required: true,
            options: [
              { id: "regular", label: "Regular", price: 0 },
              { id: "less", label: "Less Sweet", price: 0 },
            ],
          },
          {
            id: "temp",
            label: "Temperature",
            type: "radio",
            required: true,
            options: [
              { id: "iced", label: "Iced", price: 0 },
              { id: "chilled", label: "Chilled", price: 0 },
            ],
          },
        ],
      },
    ],
  },
];