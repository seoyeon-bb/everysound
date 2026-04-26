import { BottomTabBar } from "@/components/nav/BottomTabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
