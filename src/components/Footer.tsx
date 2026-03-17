import { SectionWrapper } from "@/components/SectionWrapper"
import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/40 py-12">
      <SectionWrapper className="py-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                W
              </div>
              <span className="font-semibold text-base tracking-tight">
                WowTodo
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An intelligent execution companion that transforms intent into
              action.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Download</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} WowTodo. All rights reserved.</p>
        </div>
      </SectionWrapper>
    </footer>
  )
}
