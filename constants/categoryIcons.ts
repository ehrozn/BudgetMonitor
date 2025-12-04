import type { LucideIcon } from "lucide-react-native";
import {
    Anchor,
    Baby,
    Bed,
    BookHeart,
    BookOpen,
    Briefcase,
    Building2,
    Bus,
    Camera,
    CandlestickChart,
    Car,
    Coffee,
    Coins,
    CreditCard,
    Crown,
    Dumbbell,
    Flower2,
    Gamepad2,
    Gift,
    Globe2,
    Hammer,
    Heart,
    Home,
    Landmark,
    Laptop,
    Leaf,
    Lightbulb,
    MapPin,
    Moon,
    MoreHorizontal,
    Mountain,
    Music4,
    PawPrint,
    PiggyBank,
    Plane,
    Plus,
    Salad,
    Shield,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Sun,
    TimerReset,
    TreePine,
    Trophy,
    Truck,
    Undo,
    UtensilsCrossed,
    Wallet,
} from "lucide-react-native";

export type CategoryIconName =
    | "Anchor"
    | "Baby"
    | "Bed"
    | "BookHeart"
    | "BookOpen"
    | "Briefcase"
    | "Building2"
    | "Bus"
    | "Camera"
    | "CandlestickChart"
    | "Car"
    | "Coffee"
    | "Coins"
    | "CreditCard"
    | "Crown"
    | "Dumbbell"
    | "Flower2"
    | "Gamepad2"
    | "Gift"
    | "Globe2"
    | "Hammer"
    | "Heart"
    | "Home"
    | "Landmark"
    | "Laptop"
    | "Leaf"
    | "Lightbulb"
    | "MapPin"
    | "Moon"
    | "MoreHorizontal"
    | "Mountain"
    | "Music4"
    | "PawPrint"
    | "PiggyBank"
    | "Plane"
    | "Plus"
    | "Salad"
    | "Shield"
    | "ShieldCheck"
    | "ShoppingBag"
    | "Smartphone"
    | "Sparkles"
    | "Sun"
    | "TimerReset"
    | "TreePine"
    | "Trophy"
    | "Truck"
    | "Undo"
    | "UtensilsCrossed"
    | "Wallet";

const ICON_COMPONENTS: Record<CategoryIconName, LucideIcon> = {
    Anchor,
    Baby,
    Bed,
    BookHeart,
    BookOpen,
    Briefcase,
    Building2,
    Bus,
    Camera,
    CandlestickChart,
    Car,
    Coffee,
    Coins,
    CreditCard,
    Crown,
    Dumbbell,
    Flower2,
    Gamepad2,
    Gift,
    Globe2,
    Hammer,
    Heart,
    Home,
    Landmark,
    Laptop,
    Leaf,
    Lightbulb,
    MapPin,
    Moon,
    MoreHorizontal,
    Mountain,
    Music4,
    PawPrint,
    PiggyBank,
    Plane,
    Plus,
    Salad,
    Shield,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Sun,
    TimerReset,
    TreePine,
    Trophy,
    Truck,
    Undo,
    UtensilsCrossed,
    Wallet,
};

export interface CategoryIconOption {
    label: string;
    value: CategoryIconName;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
    { label: "Salary", value: "Briefcase" },
    { label: "Bonus", value: "Plus" },
    { label: "Gift", value: "Gift" },
    { label: "Refund", value: "Undo" },
    { label: "Home", value: "Home" },
    { label: "Dining", value: "UtensilsCrossed" },
    { label: "Transport", value: "Bus" },
    { label: "Car", value: "Car" },
    { label: "Phone", value: "Smartphone" },
    { label: "Utilities", value: "Lightbulb" },
    { label: "Gaming", value: "Gamepad2" },
    { label: "Health", value: "Heart" },
    { label: "Debt", value: "CreditCard" },
    { label: "Shopping", value: "ShoppingBag" },
    { label: "Misc", value: "MoreHorizontal" },
    { label: "Savings", value: "PiggyBank" },
    { label: "Wallet", value: "Wallet" },
    { label: "Investing", value: "Coins" },
    { label: "Sparkles", value: "Sparkles" },
    { label: "Business", value: "Building2" },
    { label: "Family", value: "Baby" },
    { label: "Outdoors", value: "TreePine" },
    { label: "Insurance", value: "ShieldCheck" },
    { label: "Music", value: "Music4" },
    { label: "Pets", value: "PawPrint" },
    { label: "Fitness", value: "Dumbbell" },
    { label: "Books", value: "BookOpen" },
    { label: "Groceries", value: "Salad" },
    { label: "Logistics", value: "Truck" },
    { label: "Stay", value: "Bed" },
    { label: "Repairs", value: "Hammer" },
    { label: "Garden", value: "Flower2" },
    { label: "Travel", value: "Plane" },
    { label: "Coffee", value: "Coffee" },
    { label: "Photography", value: "Camera" },
    { label: "Rewards", value: "Trophy" },
    { label: "Location", value: "MapPin" },
    { label: "Luxury", value: "Crown" },
    { label: "Adventure", value: "Mountain" },
    { label: "Day", value: "Sun" },
    { label: "Night", value: "Moon" },
    { label: "Recurring", value: "TimerReset" },
    { label: "Markets", value: "CandlestickChart" },
    { label: "Global", value: "Globe2" },
    { label: "Marine", value: "Anchor" },
    { label: "Eco", value: "Leaf" },
    { label: "Giving", value: "BookHeart" },
    { label: "Civic", value: "Landmark" },
];

export function getCategoryIconComponent(name: string): LucideIcon {
    if (name in ICON_COMPONENTS) {
        return ICON_COMPONENTS[name as CategoryIconName];
    }

    return Wallet;
}
