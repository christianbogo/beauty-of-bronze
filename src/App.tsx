import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { Footer } from "./components/Footer";
import { FullScreenNav } from "./components/FullScreenNav";

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAdmin = location.pathname.startsWith("/admin");
  if (isAdmin) {
    return (
      <div className="min-h-full">
        <Outlet />
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-col">
      <TopBar mode={isHome ? "home" : "default"} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FullScreenNav />
    </div>
  );
}
