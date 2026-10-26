import { requirePage } from "@/server/pages";
import WaiterScreen from "@/components/screens/WaiterScreen";
export default async function Page() { await requirePage("waiter"); return <WaiterScreen />; }
