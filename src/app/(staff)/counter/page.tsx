import { requirePage } from "@/server/pages";
import CounterScreen from "@/components/screens/CounterScreen";
export default async function Page() { await requirePage("counter"); return <CounterScreen />; }
