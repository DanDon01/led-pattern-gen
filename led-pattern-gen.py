import tkinter as tk
from tkinter import colorchooser
import json
from tkinter import filedialog  # Add to imports at top

class LEDPatternRecorder:
    def __init__(self, root, leds_per_side, led_size=15):
        self.root = root
        self.leds_per_side = leds_per_side
        self.led_size = led_size
        self.sequence = []
        self.leds = {}
        self.selected_colour = None  # For storing selected brush colour
        self.current_step = 0
        self.sequence_steps = [[]]  # List of lists, each inner list contains [(led_index, color), ...]
        self.is_playing = False
        self.preview_speed = 1000  # 1 second delay between steps
        self.gradient_mode = False
        self.gradient_start = None
        self.gradient_color1 = None
        self.gradient_color2 = None
        self.mouse_down = False

        # Create a canvas to draw the LED grid
        canvas_size = leds_per_side * led_size
        self.canvas = tk.Canvas(root, width=canvas_size, height=canvas_size, bg="white")
        self.canvas.pack()

        # Draw the LED outline on the canvas
        self.create_square_outline()

        # Place control buttons and colour palette in the centre
        self.create_central_controls()

        # Bind canvas click events
        self.canvas.tag_bind("led", "<Button-1>", self.start_paint)
        self.canvas.tag_bind("led", "<B1-Motion>", self.paint_drag)
        self.canvas.tag_bind("led", "<ButtonRelease-1>", self.stop_paint)

        # Add to existing init and bindings
        self.canvas.bind("<MouseWheel>", self.on_mouse_wheel)  # Windows
        self.canvas.bind("<Button-4>", lambda e: self.on_mouse_wheel(e, 1))  # Linux scroll up
        self.canvas.bind("<Button-5>", lambda e: self.on_mouse_wheel(e, -1))  # Linux scroll down

    def create_square_outline(self):
        # Draw LEDs on the top, right, bottom, and left edges of the square
        for i in range(self.leds_per_side):
            # Top side
            self.draw_led(i * self.led_size, 0, i)

            # Right side
            self.draw_led((self.leds_per_side - 1) * self.led_size, i * self.led_size, self.leds_per_side + i)

            # Bottom side
            self.draw_led((self.leds_per_side - 1 - i) * self.led_size, (self.leds_per_side - 1) * self.led_size, 2 * self.leds_per_side + i)

            # Left side
            self.draw_led(0, (self.leds_per_side - 1 - i) * self.led_size, 3 * self.leds_per_side + i)

    def draw_led(self, x, y, index):
        # Draw a rectangle representing an LED with a white border
        led = self.canvas.create_rectangle(x, y, x + self.led_size, y + self.led_size, outline="white", fill="black", tags="led")
        self.leds[led] = index

    def paint_led(self, event):
        led_item = self.canvas.find_closest(event.x, event.y)[0]
        if "led" not in self.canvas.gettags(led_item):
            return
            
        index = self.leds[led_item]
        
        # Handle pattern painting
        if hasattr(self, 'pattern_colors'):
            start_index = index
            for i, color in enumerate(self.pattern_colors):
                curr_index = (start_index + i) % (self.leds_per_side * 4)
                led_item = [k for k, v in self.leds.items() if v == curr_index][0]
                self.canvas.itemconfig(led_item, fill=color)
                self.sequence_steps[self.current_step].append((curr_index, color))
            return

        # Normal single color painting
        if not self.selected_colour:
            color = colorchooser.askcolor()[1]
            if color:
                self.canvas.itemconfig(led_item, fill=color)
                self.sequence_steps[self.current_step].append((index, color))
        else:
            self.canvas.itemconfig(led_item, fill=self.selected_colour)
            self.sequence_steps[self.current_step].append((index, self.selected_colour))

    def create_central_controls(self):
        # Create a frame to hold control buttons and palette, place it at the center of the canvas
        center_x = (self.leds_per_side * self.led_size) // 2
        center_y = (self.leds_per_side * self.led_size) // 2

        self.controls_frame = tk.Frame(self.canvas, bg="white")
        self.canvas.create_window(center_x, center_y, window=self.controls_frame)

        # Add Save and Export buttons
        save_btn = tk.Button(self.controls_frame, text="Save Pattern", command=self.save_pattern)
        save_btn.grid(row=0, column=0, padx=5, pady=5)

        export_btn = tk.Button(self.controls_frame, text="Export to JSON", command=self.export_to_json)
        export_btn.grid(row=0, column=1, padx=5, pady=5)

        # Add Deselect Brush button next to Save and Export buttons
        deselect_btn = tk.Button(self.controls_frame, text="Deselect Brush", command=self.deselect_colour)
        deselect_btn.grid(row=0, column=2, padx=5, pady=5)

        # Add after Save/Export buttons
        load_btn = tk.Button(self.controls_frame, text="Load Pattern", command=self.load_pattern)
        load_btn.grid(row=0, column=3, padx=5, pady=5)

        # Add sequence control buttons
        prev_btn = tk.Button(self.controls_frame, text="Previous Step", command=self.previous_step)
        prev_btn.grid(row=1, column=0, padx=5, pady=5)

        next_btn = tk.Button(self.controls_frame, text="Next Step", command=self.next_step)
        next_btn.grid(row=1, column=1, padx=5, pady=5)

        # Step counter label
        self.step_label = tk.Label(self.controls_frame, text="Step: 1")
        self.step_label.grid(row=1, column=2, padx=5, pady=5)

        # Add after existing buttons
        clear_step_btn = tk.Button(self.controls_frame, text="Clear Step", command=self.clear_current_step)
        clear_step_btn.grid(row=1, column=3, padx=5, pady=5)
        
        reset_all_btn = tk.Button(self.controls_frame, text="Reset All", command=self.reset_sequence)
        reset_all_btn.grid(row=1, column=4, padx=5, pady=5)

        # Add the colour palette to the inside right of the square
        self.create_colour_palette()

        # Add preview button
        preview_btn = tk.Button(self.controls_frame, text="Preview Pattern", command=self.toggle_preview)
        preview_btn.grid(row=2, column=0, columnspan=2, padx=5, pady=5)

        # Add speed control slider
        speed_label = tk.Label(self.controls_frame, text="Preview Speed:")
        speed_label.grid(row=3, column=0, padx=5, pady=5)
        
        self.speed_slider = tk.Scale(
            self.controls_frame,
            from_=0,
            to=10,
            orient=tk.HORIZONTAL,
            command=self.update_preview_speed
        )
        self.speed_slider.set(5)  # Default middle value
        self.speed_slider.grid(row=3, column=1, columnspan=2, padx=5, pady=5, sticky="ew")

        # Add gradient mode button
        gradient_btn = tk.Button(self.controls_frame, text="Gradient Mode", command=self.toggle_gradient)
        gradient_btn.grid(row=4, column=0, columnspan=2, padx=5, pady=5)

        # Add after existing buttons (before gradient button)
        copy_prev_btn = tk.Button(self.controls_frame, text="Copy Previous Step", command=self.copy_previous_step)
        copy_prev_btn.grid(row=2, column=2, padx=5, pady=5)

        # Add after existing controls
        rotation_frame = tk.Frame(self.controls_frame)
        rotation_frame.grid(row=5, column=0, columnspan=3, padx=5, pady=5)

        # Rotation controls
        rotate_left = tk.Button(rotation_frame, text="⟲", command=lambda: self.rotate_pattern(-1))
        rotate_left.grid(row=0, column=0, padx=5)

        # Center label
        rotation_label = tk.Label(rotation_frame, text="Rotate")
        rotation_label.grid(row=0, column=1, padx=5)

        rotate_right = tk.Button(rotation_frame, text="⟳", command=lambda: self.rotate_pattern(1))
        rotate_right.grid(row=0, column=2, padx=5)

        # Add pattern presets
        self.create_pattern_presets()

        # Add quick tools
        self.create_quick_tools()

    def update_preview_speed(self, value):
        # Convert slider value (0-10) to delay (2000ms - 100ms)
        # 0 = slowest (2000ms), 10 = fastest (100ms)
        self.preview_speed = 2000 - (int(float(value)) * 190)
        print(f"Preview delay: {self.preview_speed}ms")

    def create_colour_palette(self):
        # Define LED-friendly colors
        colours = [
            # Basic colors
            "#FF0000", "#00FF00", "#0000FF",  # Pure RGB
            "#FFFF00", "#FF00FF", "#00FFFF",  # Pure CMY
            "#FFFFFF", "#000000",              # White & Black
            
            # Neon colors
            "#FF1493", "#FF69B4", "#FF8C00",  # Hot pink, Light pink, Dark orange
            "#FFA500", "#FFD700", "#ADFF2F",  # Orange, Gold, Green yellow
            "#7FFF00", "#00FF7F", "#00FFFF",  # Chartreuse, Spring green, Cyan
            "#1E90FF", "#00BFFF", "#87CEEB",  # Dodger blue, Deep sky blue, Sky blue
            
            # LED matrix common colors
            "#32CD32", "#FF4500", "#9400D3",  # Lime green, Orange red, Dark violet
            "#8A2BE2", "#4B0082", "#800080",  # Blue violet, Indigo, Purple
            "#FF1493", "#FF69B4", "#DDA0DD",  # Deep pink, Hot pink, Plum
            
            # Pastel variations
            "#FFB6C1", "#98FB98", "#87CEFA",  # Light pink, Pale green, Light blue
            "#DDA0DD", "#F0E68C", "#E6E6FA"   # Plum, Khaki, Lavender
        ]

        # Create colour buttons within the controls frame
        palette_frame = tk.Frame(self.canvas, bg="white")
        palette_x = (self.leds_per_side - 10) * self.led_size
        palette_y = (self.leds_per_side // 2 - 4) * self.led_size
        self.canvas.create_window(palette_x, palette_y, window=palette_frame, anchor="nw")

        # Arrange in 4x8 grid
        for i, color in enumerate(colours):
            btn = tk.Button(palette_frame, bg=color, width=2, height=1, 
                           command=lambda c=color: self.select_colour(c))
            btn.grid(row=i // 4, column=i % 4, padx=2, pady=2)

    def select_colour(self, color):
        self.selected_colour = color
        print(f"Selected color: {color}")  # Debug feedback

    def deselect_colour(self):
        self.selected_colour = None
        print("Brush deselected - Click LEDs to use color picker")

    def save_pattern(self):
        pattern = {
            "steps": self.sequence_steps,
            "total_steps": len(self.sequence_steps)
        }
        with open("pattern.json", "w") as f:
            json.dump(pattern, f, indent=4)
        self.generate_arduino_script()

    def export_to_json(self):
        pattern = [{"index": step[0], "color": step[1]} for step in self.sequence]
        with open("pattern.json", "w") as f:
            json.dump(pattern, f, indent=4)
        print("Pattern exported to pattern.json")

    def generate_arduino_script(self):
        arduino_script = """
#include <Adafruit_NeoPixel.h>
#define PIN 6
#define NUM_LEDS 200
Adafruit_NeoPixel strip = Adafruit_NeoPixel(NUM_LEDS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
    strip.begin();
    strip.show();
}

void loop() {
"""
        for step in range(len(self.sequence_steps)):
            arduino_script += f"    // Step {step + 1}\n"
            for index, color in self.sequence_steps[step]:
                r, g, b = self.hex_to_rgb(color)
                arduino_script += f"    strip.setPixelColor({index}, strip.Color({r}, {g}, {b}));\n"
            arduino_script += "    strip.show();\n"
            arduino_script += "    delay(1000);\n\n"

        arduino_script += "}\n"

        with open("arduino_script.ino", "w") as f:
            f.write(arduino_script)
        print("Arduino animation script saved")

    def hex_to_rgb(self, hex):
        # Convert hex color to RGB
        hex = hex.lstrip('#')
        return tuple(int(hex[i:i+2], 16) for i in (0, 2, 4))

    def next_step(self):
        # Save current step
        self.current_step += 1
        if self.current_step >= len(self.sequence_steps):
            self.sequence_steps.append([])  # Add new empty step
        
        # Update step counter
        self.step_label.config(text=f"Step: {self.current_step + 1}")
        
        # Clear and display new step
        self.clear_leds()
        if self.sequence_steps[self.current_step]:  # If step has data
            self.display_step(self.current_step)

    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.step_label.config(text=f"Step: {self.current_step + 1}")
            self.clear_leds()
            self.display_step(self.current_step)

    def clear_leds(self):
        # Clear all LEDs to black
        for led_id in self.leds.keys():
            self.canvas.itemconfig(led_id, fill="black")

    def display_step(self, step):
        # Display all LEDs for the given step
        for index, color in self.sequence_steps[step]:
            # Find the LED canvas item by its index
            led_item = [k for k, v in self.leds.items() if v == index][0]
            self.canvas.itemconfig(led_item, fill=color)

    def toggle_preview(self):
        if not self.is_playing:
            self.is_playing = True
            self.preview_step(0)
        else:
            self.is_playing = False

    def preview_step(self, step_index):
        if not self.is_playing:
            return
        
        if step_index >= len(self.sequence_steps):
            step_index = 0  # Loop back to start
        
        # Clear and show current step
        self.clear_leds()
        self.display_step(step_index)
        self.step_label.config(text=f"Preview Step: {step_index + 1}")
    
        # Schedule next step
        self.root.after(self.preview_speed, lambda: self.preview_step(step_index + 1))

    def toggle_gradient(self):
        self.gradient_mode = not self.gradient_mode
        if not self.gradient_mode:
            self.gradient_start = None
            self.gradient_color1 = None
            self.gradient_color2 = None

    def create_gradient(self, start_index, end_index, color1, color2):
        # Convert hex colors to RGB
        r1, g1, b1 = self.hex_to_rgb(color1)
        r2, g2, b2 = self.hex_to_rgb(color2)
        
        # Get LED indices between start and end
        led_range = self.get_led_range(start_index, end_index)
        steps = len(led_range)
        
        if steps < 2:
            return
            
        # Calculate color increments
        r_step = (r2 - r1) / (steps - 1)
        g_step = (g2 - g1) / (steps - 1)
        b_step = (b2 - b1) / (steps - 1)
        
        # Apply gradient colors
        for i, led_index in enumerate(led_range):
            r = int(r1 + (r_step * i))
            g = int(g1 + (g_step * i))
            b = int(b1 + (b_step * i))
            color = f"#{r:02x}{g:02x}{b:02x}"
            
            # Find LED item and update color
            led_item = [k for k, v in self.leds.items() if v == led_index][0]
            self.canvas.itemconfig(led_item, fill=color)
            self.sequence_steps[self.current_step].append((led_index, color))

    def get_led_range(self, start, end):
        # Helper to get sequential LED indices around the square
        total_leds = self.leds_per_side * 4
        if start <= end:
            return range(start, end + 1)
        else:
            # Handle wrapping around the square
            return list(range(start, total_leds)) + list(range(0, end + 1))

    def hex_to_rgb(self, hex_color):
        # Convert hex color to RGB values
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def copy_previous_step(self):
        if self.current_step > 0:
            # Copy all LED colors from previous step
            previous_step = self.sequence_steps[self.current_step - 1]
            self.sequence_steps[self.current_step] = previous_step.copy()
            
            # Display the copied pattern
            self.clear_leds()
            self.display_step(self.current_step)
            print(f"Copied step {self.current_step} to step {self.current_step + 1}")

    def rotate_pattern(self, direction):
        if not self.sequence_steps[self.current_step]:
            return

        total_leds = self.leds_per_side * 4
        new_pattern = []

        # Shift all LED indices
        for led_index, color in self.sequence_steps[self.current_step]:
            new_index = (led_index + direction) % total_leds
            new_pattern.append((new_index, color))

        # Update current step with rotated pattern
        self.sequence_steps[self.current_step] = new_pattern

        # Redraw pattern
        self.clear_leds()
        self.display_step(self.current_step)

    def start_paint(self, event):
        self.mouse_down = True
        self.paint_led(event)

    def stop_paint(self, event):
        self.mouse_down = False

    def paint_drag(self, event):
        if self.mouse_down:
            # Find the LED under cursor
            led_item = self.canvas.find_closest(event.x, event.y)[0]
            if "led" in self.canvas.gettags(led_item):
                index = self.leds[led_item]
                
                # Check if this LED was already painted in this step
                for idx, _ in self.sequence_steps[self.current_step]:
                    if idx == index:
                        return  # Skip if already painted
                        
                # Paint the LED
                if self.selected_colour:
                    self.canvas.itemconfig(led_item, fill=self.selected_colour)
                    self.sequence_steps[self.current_step].append((index, self.selected_colour))

    def load_pattern(self):
        filename = filedialog.askopenfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if filename:
            try:
                with open(filename, 'r') as f:
                    pattern = json.load(f)
                
                # Reset current state
                self.current_step = 0
                self.sequence_steps = []
                
                # Load steps from file
                if isinstance(pattern, dict) and 'steps' in pattern:
                    self.sequence_steps = pattern['steps']
                else:
                    # Handle old format
                    self.sequence_steps = [[(item['index'], item['color']) for item in pattern]]
                
                # Update display
                self.clear_leds()
                if self.sequence_steps:
                    self.display_step(0)
                
                # Update step counter
                self.step_label.config(text=f"Step: 1")
                print(f"Pattern loaded from {filename}")
                
            except Exception as e:
                print(f"Error loading pattern: {e}")

    def clear_current_step(self):
        # Clear current step's data
        self.sequence_steps[self.current_step] = []
        # Clear display
        self.clear_leds()
        print(f"Cleared step {self.current_step + 1}")

    def reset_sequence(self):
        # Reset all sequence data
        self.sequence_steps = [[]]
        self.current_step = 0
        # Update display
        self.clear_leds()
        self.step_label.config(text="Step: 1")
        print("Reset all steps")

    def on_mouse_wheel(self, event, direction=None):
        if direction is None:
            # Windows mouse wheel
            direction = 1 if event.delta > 0 else -1
        
        # Use existing rotation method
        self.rotate_pattern(direction)

    def create_pattern_presets(self):
        # Create frame for pattern presets
        preset_frame = tk.Frame(self.canvas, bg="white")
        
        # Adjust position to top left inside LED ring
        preset_x = (self.leds_per_side * 0.2) * self.led_size  # Move to ~20% from left
        preset_y = (self.leds_per_side * 0.2) * self.led_size  # Move to ~20% from top
        
        self.canvas.create_window(preset_x, preset_y, window=preset_frame, anchor="nw")

        # RGB Pattern
        rgb_pattern = ["#FF0000", "#00FF00", "#0000FF"] * 3  # RGBRGBRGB
        self.create_pattern_button(preset_frame, "RGB", rgb_pattern, row=0)

    def create_pattern_button(self, parent, name, colors, row):
        # Create frame for pattern preview
        pattern_frame = tk.Frame(parent, bd=2, relief="raised")
        pattern_frame.grid(row=row, column=0, padx=5, pady=5)

        # Create mini LED previews
        for i, color in enumerate(colors):
            mini_led = tk.Canvas(pattern_frame, width=10, height=10, bg=color, 
                               highlightthickness=1, highlightbackground="white")
            mini_led.grid(row=0, column=i, padx=1)

        # Add click handler
        pattern_frame.bind("<Button-1>", lambda e: self.select_pattern(colors))

    def select_pattern(self, pattern_colors):
        self.pattern_colors = pattern_colors
        self.selected_colour = None  # Disable single color brush
        print(f"Selected pattern with {len(pattern_colors)} colors")

    def create_quick_tools(self):
        tools_frame = tk.Frame(self.controls_frame)
        tools_frame.grid(row=6, column=0, columnspan=4, pady=5)
        
        # Mirror controls
        mirror_btn = tk.Button(tools_frame, text="Mirror Pattern", command=self.mirror_pattern)
        mirror_btn.grid(row=0, column=0, padx=2)
        
        # Quick fill tools
        corners_btn = tk.Button(tools_frame, text="Fill Corners", command=self.fill_corners)
        corners_btn.grid(row=0, column=1, padx=2)
        
        sides_btn = tk.Button(tools_frame, text="Fill Sides", command=self.fill_sides)
        sides_btn.grid(row=0, column=2, padx=2)
        
        alternate_btn = tk.Button(tools_frame, text="Alternate LEDs", command=self.alternate_leds)
        alternate_btn.grid(row=0, column=3, padx=2)

    def mirror_pattern(self):
        """Mirror current pattern across diagonal"""
        if not self.sequence_steps[self.current_step]:
            return
            
        total_leds = self.leds_per_side * 4
        current_pattern = self.sequence_steps[self.current_step]
        mirrored = []
        
        for index, color in current_pattern:
            mirror_index = (total_leds - index) % total_leds
            mirrored.append((mirror_index, color))
        
        self.sequence_steps[self.current_step].extend(mirrored)
        self.display_step(self.current_step)

    def fill_corners(self):
        """Fill all corners with selected color"""
        if not self.selected_colour:
            return
            
        corner_indices = [0, 
                         self.leds_per_side - 1,
                         self.leds_per_side * 2 - 1,
                         self.leds_per_side * 3 - 1]
                         
        for index in corner_indices:
            led_item = [k for k, v in self.leds.items() if v == index][0]
            self.canvas.itemconfig(led_item, fill=self.selected_colour)
            self.sequence_steps[self.current_step].append((index, self.selected_colour))

    def alternate_leds(self):
        """Fill every other LED with selected color"""
        if not self.selected_colour:
            return
            
        total_leds = self.leds_per_side * 4
        for i in range(0, total_leds, 2):
            led_item = [k for k, v in self.leds.items() if v == i][0]
            self.canvas.itemconfig(led_item, fill=self.selected_colour)
            self.sequence_steps[self.current_step].append((i, self.selected_colour))

    def fill_sides(self):
        """Fill all sides with selected color"""
        if not self.selected_colour:
            return
            
        # Get indices for each side
        top = range(self.leds_per_side)
        right = range(self.leds_per_side, 2 * self.leds_per_side)
        bottom = range(2 * self.leds_per_side, 3 * self.leds_per_side)
        left = range(3 * self.leds_per_side, 4 * self.leds_per_side)
        
        # Fill each side
        for index in list(top) + list(right) + list(bottom) + list(left):
            led_item = [k for k, v in self.leds.items() if v == index][0]
            self.canvas.itemconfig(led_item, fill=self.selected_colour)
            self.sequence_steps[self.current_step].append((index, self.selected_colour))

if __name__ == "__main__":
    root = tk.Tk()
    root.title("LED Pattern Recorder")
    app = LEDPatternRecorder(root, 50)  # Set to 50 LEDs per side for 50x50 layout
    root.mainloop()
