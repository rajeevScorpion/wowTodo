import { useState, useEffect } from "react"
import { motion, useScroll, useMotionValueEvent } from "motion/react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link, useLocation } from "react-router-dom"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const location = useLocation()

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20)
  })

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "How it works", href: "/#how-it-works" },
    { name: "Use cases", href: "/#use-cases" },
    { name: "Pricing", href: "/pricing" },
  ]

  return (
    <motion.nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-border/40 shadow-sm"
          : "bg-transparent"
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
            W
          </div>
          <span className="font-semibold text-lg tracking-tight">WowTodo</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.href.startsWith("/#") ? (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            )
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Button size="sm" className="rounded-full px-6" asChild>
            <a href="/#cta">Get Started</a>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-background border-b border-border/40 overflow-hidden"
        >
          <div className="px-6 py-8 flex flex-col gap-6">
            {navLinks.map((link) => (
              link.href.startsWith("/#") ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg font-medium text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-lg font-medium text-foreground"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              )
            ))}
            <Button className="w-full rounded-full mt-4" asChild onClick={() => setIsMobileMenuOpen(false)}>
              <a href="/#cta">Get Started</a>
            </Button>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
