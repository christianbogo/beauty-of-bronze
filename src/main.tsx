import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { HomePage } from "./pages/HomePage";
import { ContentPage } from "./pages/ContentPage";
import { Providers } from "./components/Providers";
import { AdminHomePage } from "./pages/AdminHomePage";
import { AdminGalleryPage } from "./pages/AdminGalleryPage";
import { AdminContentEditorPage } from "./pages/AdminContentEditorPage";
import faviconUrl from "./assets/favicon.png?url";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "/admin", element: <AdminHomePage /> },
      { path: "/admin/gallery", element: <AdminGalleryPage /> },
      { path: "/admin/content/:page", element: <AdminContentEditorPage /> },
      {
        path: "/what-we-do",
        element: <ContentPage page="what-we-do" title="What We Do" />,
      },
      {
        path: "/who-we-are",
        element: <ContentPage page="who-we-are" title="Who We Are" />,
      },
      {
        path: "/events",
        element: <ContentPage page="events" title="Events" />,
      },
      {
        path: "/supporters",
        element: (
          <ContentPage page="supporters" title="Supporters & Sponsors" />
        ),
      },
      {
        path: "/gallery",
        element: <ContentPage page="gallery" title="Gallery" />,
      },
      {
        path: "/testimonials",
        element: <ContentPage page="testimonials" title="Testimonials" />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
);

// Set favicon from src/assets at runtime (works in dev and build)
(() => {
  try {
    const link = (document.querySelector('link[rel="icon"]') as HTMLLinkElement) ||
      document.head.appendChild(document.createElement("link"));
    link.rel = "icon";
    link.type = "image/png";
    link.href = faviconUrl;
  } catch {}
})();
