import { requirePage } from "@/server/pages";
import KitchenScreen from "@/components/screens/KitchenScreen";
export default async function Page() { await requirePage("kitchen"); return <KitchenScreen />; }
