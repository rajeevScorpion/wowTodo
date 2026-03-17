import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/ThemeProvider"
import { Home } from "@/pages/Home"
import { Pricing } from "@/pages/Pricing"
import { Privacy } from "@/pages/Privacy"
import { Terms } from "@/pages/Terms"

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="wowtodo-theme">
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden transition-colors duration-500">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  )
}

