import tkinter as tk
from led_pattern_gen import LEDPatternRecorder

def main():
    root = tk.Tk()
    root.title("LED Pattern Recorder")
    app = LEDPatternRecorder(root, 50)  # Creates a 50x50 LED grid
    root.mainloop()

if __name__ == "__main__":
    main()