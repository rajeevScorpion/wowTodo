import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { SectionWrapper } from "@/components/SectionWrapper"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronDown } from "lucide-react"

const sourceOptions = [
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "friend", label: "Friend or Colleague" },
  { value: "other", label: "Other" },
]

export function CTA() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [source, setSource] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <SectionWrapper id="cta" className="py-32 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="bg-foreground text-background rounded-[3rem] p-12 md:p-24 relative overflow-hidden shadow-2xl"
      >
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-white blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight text-background">
            Say it. Share it. <br />
            <span className="text-background/50">Done.</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-background/80 font-light">
            Join the waitlist for the calmest execution tool ever built.
            </p>

            <AnimatePresence mode="wait">
              {!isFormOpen ? (
                <motion.div 
                  key="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                >
                  <Button 
                      size="lg" 
                      onClick={() => setIsFormOpen(true)}
                      className="rounded-full px-10 py-8 text-lg bg-background text-foreground hover:bg-background/90 shadow-xl border-none"
                  >
                      Get Early Access
                      <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  className="pt-4 max-w-md mx-auto space-y-4 text-left"
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (!source) {
                      alert("Please select how you heard about us.");
                      return;
                    }
                    alert("Thanks for joining!"); 
                    setIsFormOpen(false); 
                  }}
                >
                  <div className="space-y-2">
                    <input 
                      id="name" 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 rounded-xl bg-background/10 border border-background/20 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-background/50" 
                      placeholder="Name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <input 
                      id="email" 
                      type="email" 
                      required 
                      className="w-full px-4 py-3 rounded-xl bg-background/10 border border-background/20 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-background/50" 
                      placeholder="Email" 
                    />
                  </div>
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-3 rounded-xl bg-background/10 border border-background/20 text-background focus:outline-none focus:ring-2 focus:ring-background/50 flex items-center justify-between text-left"
                    >
                      <span className={source ? "text-background" : "text-background/40"}>
                        {source ? sourceOptions.find(o => o.value === source)?.label : "How did you hear about us?"}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-background/40 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 w-full mt-2 bg-foreground border border-background/20 rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                          {sourceOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSource(option.value)
                                setIsDropdownOpen(false)
                              }}
                              className="w-full px-4 py-3 text-left text-background/80 hover:bg-background/10 hover:text-background transition-colors"
                            >
                              {option.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <input type="hidden" name="source" value={source} required />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full rounded-xl py-6 text-lg bg-background text-foreground hover:bg-background/90 shadow-xl border-none mt-4"
                  >
                    Get Beta Link
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
            
            <p className="text-sm text-background/40 pt-8">
                Coming soon to iOS and Web.
            </p>
        </div>
      </motion.div>
    </SectionWrapper>
  )
}
