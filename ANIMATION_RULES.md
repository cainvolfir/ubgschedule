# UBG Schedule: Neubrutalism Animation Rules
ALWAYS apply these rules when adding or modifying animations using Framer Motion.

1. **Physics Config (Mechanical & Snappy):**
   - Use `type: "spring"`, `stiffness: 400` (or higher), `damping: 25`, `mass: 0.5`. 
   - Never use `ease-in-out` or long durations (>0.3s) unless strictly required for a layout shift.
2. **Micro-interactions (Click/Tap):**
   - Buttons and Cards: `whileTap={{ scale: 0.95, x: 2, y: 2, boxShadow: "0px 0px 0px #000" }}`.
   - This simulates a hard, physical button press, killing the brutalist shadow instantly.
3. **Staggered Lists:**
   - Container: `variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}`.
   - Items: `variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 25 } } }}`.
4. **Layout Shifts:**
   - Use the `layout` prop on `motion.div` for grid changes (e.g., center upload box moving to the left). Keep the transition duration under `0.3s`.
