class LEDPatternGenerator {
    constructor() {
        this.canvas = document.getElementById('ledCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ledsPerSide = 50;
        this.ledSize = 18; // Increased LED size from 15 to 20. Adjust as needed.
        this.setupCanvas();
        this.initializeState();
        this.setupEventListeners();
        this.createColorPalette();
        this.createPatternPresets();
        this.draw();
        this.feedbackElement = document.getElementById('feedback'); // Add this line to reference the feedback element
        this.updateFeedback("Select a color and click an LED."); // Initialize feedback message
    }

    setupCanvas() {
        const padding = 20; // Add padding around the LED grid
        const size = this.ledsPerSide * this.ledSize + padding * 2;
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
    }

    initializeState() {
        this.selectedColor = null;
        this.currentStep = 0;
        this.sequenceSteps = [new Map()]; // Initialize with a new Map
        this.isPlaying = false;
        this.previewSpeed = 1000;
        this.gradientMode = false;
        this.mouseDown = false;
        this.leds = this.createLEDMap();
        this.ledColors = new Map(); // Add this line to store LED colors
        this.gradientStart = null; // Add this line to store the start of the gradient
        this.gradientStartColor = null; // Add this line to store the start color of the gradient
    }

    createLEDMap() {
        const leds = new Map();
        let index = 0;
        const padding = 20; // Ensure LED positions include padding

        const ledsPerSide = this.ledsPerSide; // 50 LEDs per side

        // Top edge
        for (let i = 0; i < ledsPerSide; i++) { // 0 to49
            leds.set(index++, { x: padding + i * this.ledSize, y: padding });
        }

        // Right edge
        for (let i = 1; i < ledsPerSide; i++) { // 50 to99
            leds.set(index++, { x: padding + (ledsPerSide - 1) * this.ledSize, y: padding + i * this.ledSize });
        }

        // Bottom edge
        for (let i = ledsPerSide - 2; i >= 0; i--) { //100 to149
            leds.set(index++, { x: padding + i * this.ledSize, y: padding + (ledsPerSide - 1) * this.ledSize });
        }

        // Left edge
        for (let i = ledsPerSide - 2; i >= 1; i--) { //150 to199
            leds.set(index++, { x: padding, y: padding + i * this.ledSize });
        }

        return leds;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1E1E1E';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Define corner indices for correct styling
        const cornerIndices = [0, this.ledsPerSide - 1, 2 * this.ledsPerSide - 1, 3 * this.ledsPerSide - 1]; // [0,49,99,149]

        // Draw all LEDs
        this.leds.forEach((pos, index) => {
            // Use the stored color or default to black
            this.ctx.fillStyle = this.ledColors.get(index) || 'black';
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 1;
            
            // Draw LED
            this.ctx.fillRect(pos.x, pos.y, this.ledSize, this.ledSize);
            this.ctx.strokeRect(pos.x, pos.y, this.ledSize, this.ledSize);
            
            // Draw LED number
            if (cornerIndices.includes(index)) {
                // Special styling for corner LEDs
                this.ctx.fillStyle = 'white'; // Changed from 'yellow' to 'white'
                this.ctx.strokeStyle = 'black'; // Add outline to text
                this.ctx.lineWidth = 2;
                this.ctx.font = '8px Arial'; // Decreased font size from '12px Arial'
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                // Draw outline
                this.ctx.strokeText(index + 1, pos.x + this.ledSize / 2, pos.y + this.ledSize / 2);
                // Draw text
                this.ctx.fillText(index + 1, pos.x + this.ledSize / 2, pos.y + this.ledSize / 2);
            } else {
                // Default styling for other LEDs
                this.ctx.fillStyle = 'white';
                this.ctx.font = '10px Arial'; // Decreased font size from '12px Arial'
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(index + 1, pos.x + this.ledSize / 2, pos.y + this.ledSize / 2);
            }
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        document.getElementById('gradientMode').addEventListener('click', () => this.toggleGradientMode());
        document.getElementById('mirrorPattern').addEventListener('click', () => this.mirrorPattern()); // Add this line
        document.getElementById('flipPattern').addEventListener('click', () => this.flipPattern());
    }

    handleMouseDown(e) {
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.paintLED(x, y);
    }

    handleMouseMove(e) {
        if (!this.mouseDown) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.paintLED(x, y);
    }

    handleMouseUp() {
        this.mouseDown = false;
    }

    paintLED(x, y) {
        let clicked = false; // Track if a LED was clicked

        this.leds.forEach((pos, index) => {
            if (x >= pos.x && x < pos.x + this.ledSize &&
                y >= pos.y && y < pos.y + this.ledSize && !clicked) { // Ensure only one LED is processed
                clicked = true; // Prevent multiple LEDs from being processed in a single click

                if (this.gradientMode) {
                    if (this.gradientStart === null) {
                        // Check if selectedColor is set
                        if (this.selectedColor) {
                            this.gradientStart = index;
                            this.gradientStartColor = this.selectedColor;
                            // Color the first LED immediately
                            this.ledColors.set(index, this.selectedColor);
                            this.updateFeedback("First LED colored. Select the second LED for gradient.");
                        } else {
                            alert("Please select a color before starting a gradient.");
                        }
                    } else {
                        if (this.selectedColor) {
                            this.applyGradient(this.gradientStart, index, this.gradientStartColor, this.selectedColor);
                            this.gradientStart = null;
                            this.gradientStartColor = null;
                            this.updateFeedback("Gradient applied. Select the first LED to continue.");
                        } else {
                            alert("Please select an end color for the gradient.");
                        }
                    }
                } else {
                    this.ledColors.set(index, this.selectedColor);
                    this.updateFeedback("Color applied. Select a color and click another LED.");
                }
                this.draw();
            }
        });

        if (!clicked && this.gradientMode) {
            this.updateFeedback("Click on a valid LED to apply color.");
        }
    }

    toggleGradientMode() {
        this.gradientMode = !this.gradientMode;
        this.gradientStart = null; // Reset the gradient start point
        this.gradientStartColor = null; // Reset the gradient start color
        const gradientButton = document.getElementById('gradientMode');
        if (this.gradientMode) {
            gradientButton.classList.add('active');
            // Show feedback message
            this.feedbackElement.style.display = 'block';
            this.updateFeedback("Gradient mode activated. Select the first LED.");
        } else {
            gradientButton.classList.remove('active');
            // Hide feedback message
            this.feedbackElement.style.display = 'none';
            this.updateFeedback("Gradient mode deactivated. Select a color and click an LED.");
        }
    }

    applyGradient(startIndex, endIndex, startColor, endColor) {
        const totalLEDs = this.leds.size;

        if (!startColor || !endColor) {
            console.error("Start color or end color is undefined.");
            return;
        }

        const gradientColors = this.calculateGradientColors(startColor, endColor, startIndex, endIndex);

        let currentIndex = startIndex;
        while (currentIndex !== endIndex) {
            if (gradientColors.has(currentIndex)) {
                this.ledColors.set(currentIndex, gradientColors.get(currentIndex));
            }
            currentIndex = (currentIndex + 1) % totalLEDs;
        }
        this.ledColors.set(endIndex, endColor); // Set the end color
    }

    calculateGradientColors(startColor, endColor, startIndex, endIndex) {
        const startRGB = this.hexToRgb(startColor);
        const endRGB = this.hexToRgb(endColor);

        const gradientColors = new Map();
        const totalSteps = (endIndex - startIndex + this.leds.size) % this.leds.size;
        for (let i = 0; i <= totalSteps; i++) {
            const ratio = i / totalSteps;
            const r = Math.round(startRGB.r + ratio * (endRGB.r - startRGB.r));
            const g = Math.round(startRGB.g + ratio * (endRGB.g - startRGB.g));
            const b = Math.round(startRGB.b + ratio * (endRGB.b - startRGB.b));
            const color = this.rgbToHex(r, g, b);
            const index = (startIndex + i) % this.leds.size;
            gradientColors.set(index, color);
        }
        return gradientColors;
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    // 1. Replace hslToHex with a more accurate conversion
    hslToHex(h, s, l) {
        // Convert HSL to RGB first
        s /= 100;
        l /= 100;
        const C = (1 - Math.abs(2 * l - 1)) * s;
        const X = C * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - C / 2;
        let rPrime, gPrime, bPrime;

        if (0 <= h && h < 60) {
            rPrime = C; gPrime = X; bPrime = 0;
        } else if (60 <= h && h < 120) {
            rPrime = X; gPrime = C; bPrime = 0;
        } else if (120 <= h && h < 180) {
            rPrime = 0; gPrime = C; bPrime = X;
        } else if (180 <= h && h < 240) {
            rPrime = 0; gPrime = X; bPrime = C;
        } else if (240 <= h && h < 300) {
            rPrime = X; gPrime = 0; bPrime = C;
        } else {
            rPrime = C; gPrime = 0; bPrime = X;
        }

        const r = Math.round((rPrime + m) * 255);
        const g = Math.round((gPrime + m) * 255);
        const b = Math.round((bPrime + m) * 255);

        // Convert RGB to Hex
        return `#${((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()}`;
    }

    createColorPalette() {
        const palette = document.getElementById('colorPalette');
        palette.innerHTML = ''; // Clear existing palette
        
        // Create SVG element for the color wheel
        const size = 500; // Set Size Here
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.style.borderRadius = "50%";
        
        // Get canvas position
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate center position
        const centerX = canvasRect.left + (this.canvas.width / 2);
        const centerY = canvasRect.top + (this.canvas.height / 2);
        
        // Position the SVG element
        svg.style.position = "fixed";
        svg.style.left = `${centerX - size / 2}px`;
        svg.style.top = `${centerY - size / 2}px`;
        
        // Create color segments
        const center = size / 2;
        const numSegments = 48; // Increase number of segments
        const rings = 3; // Change to 3 rings
        
        for (let ring = 0; ring < rings; ring++) { // Reverse the order of rings
            const outerRadius = (ring + 1) * (center / rings);
            const innerRadius = ring * (center / rings);
            const lightness = 50 + (ring * 10); // Brighter colors on outer rings
            
            for (let i = 0; i < numSegments; i++) {
                const hue = (i * 360 / numSegments);
                const startAngle = (i * 360 / numSegments) * (Math.PI / 180);
                const endAngle = ((i + 1) * 360 / numSegments) * (Math.PI / 180);
                
                // Calculate path coordinates
                const x1 = center + innerRadius * Math.cos(startAngle);
                const y1 = center + innerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(startAngle);
                const y2 = center + outerRadius * Math.sin(startAngle);
                const x3 = center + outerRadius * Math.cos(endAngle);
                const y3 = center + outerRadius * Math.sin(endAngle);
                const x4 = center + innerRadius * Math.cos(endAngle);
                const y4 = center + innerRadius * Math.sin(endAngle);
                
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const d = [
                    `M ${x1} ${y1}`,
                    `L ${x2} ${y2}`,
                    `A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}`,
                    `L ${x4} ${y4}`,
                    `A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`,
                    'Z'
                ].join(' ');
                
                path.setAttribute('d', d);
                path.setAttribute('fill', `hsl(${hue}, 100%, ${lightness}%)`);
                path.style.cursor = 'pointer';
                
                // 2. Update click handler to use hex colors
                path.addEventListener('click', () => {
                    const color = `hsl(${hue}, 100%, ${lightness}%)`;
                    const hexColor = this.hslToHex(hue, 100, lightness);
                    this.selectedColor = hexColor;
                    // Remove selection border from all segments
                    svg.querySelectorAll('path').forEach(p => p.setAttribute('stroke', 'none'));
                    // Add selection indicator
                    path.setAttribute('stroke', 'yellow');
                    path.setAttribute('stroke-width', '2');
                });
                
                svg.appendChild(path);
            }
        }
        
        palette.appendChild(svg);
    }

    createPatternPresets() {
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('rotateBtn').addEventListener('click', () => this.rotate());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveStep());
        document.getElementById('prevStep').addEventListener('click', () => this.prevStep());
        document.getElementById('nextStep').addEventListener('click', () => this.nextStep());
        document.getElementById('clearStep').addEventListener('click', () => this.clearStep());
        document.getElementById('resetAll').addEventListener('click', () => this.resetAll());
        document.getElementById('previewPattern').addEventListener('click', () => this.togglePreview());
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            const speedValue = e.target.value;
            this.previewSpeed = (11 - speedValue) * 100; // Adjust speed (slider value 1-10)
            if (this.isPlaying) {
                this.stopPreview();
                this.startPreview();
            }
        });
        document.getElementById('rotateLeft').addEventListener('click', () => this.rotateRight());
        document.getElementById('rotateRight').addEventListener('click', () => this.rotateLeft());
        document.getElementById('savePattern').addEventListener('click', () => this.savePattern());
        document.getElementById('loadPattern').addEventListener('click', () => this.loadPattern());
        // Remove the exportPattern event listener
    }

    saveStep() {
        this.sequenceSteps[this.currentStep] = new Map(this.ledColors);
        if (this.currentStep === this.sequenceSteps.length - 1) {
            this.sequenceSteps.push(new Map());
        }
        this.currentStep++;
        this.ledColors = new Map(this.sequenceSteps[this.currentStep]);
        this.draw();
        this.updateStepLabel();
    }

    prevStep() {
        this.sequenceSteps[this.currentStep] = new Map(this.ledColors);
        if (this.currentStep > 0) {
            this.currentStep--;
            this.ledColors = new Map(this.sequenceSteps[this.currentStep]);
            this.draw();
            this.updateStepLabel();
        }
    }

    nextStep() {
        this.sequenceSteps[this.currentStep] = new Map(this.ledColors);
        if (this.currentStep < this.sequenceSteps.length - 1) {
            this.currentStep++;
            this.ledColors = new Map(this.sequenceSteps[this.currentStep]);
        } else {
            this.currentStep++;
            // Copy the previous step's pattern
            this.ledColors = new Map(this.sequenceSteps[this.currentStep - 1]);
            this.sequenceSteps.push(new Map(this.ledColors));
        }
        this.draw();
        this.updateStepLabel();
    }

    clearStep() {
        this.ledColors.clear();
        this.sequenceSteps[this.currentStep] = new Map();
        this.draw();
    }

    resetAll() {
        this.sequenceSteps = [new Map()];
        this.currentStep = 0;
        this.ledColors.clear();
        this.draw();
        this.updateStepLabel();
    }

    updateStepLabel() {
        document.getElementById('stepLabel').textContent = `Step: ${this.currentStep + 1}`;
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.playSequence();
        }
    }

    playSequence() {
        if (!this.isPlaying) return;
        
        this.currentStep = (this.currentStep + 1) % (this.sequenceSteps.length - 1);
        this.ledColors = new Map(this.sequenceSteps[this.currentStep]);
        this.draw();
        
        setTimeout(() => this.playSequence(), this.previewSpeed);
    }

    togglePreview() {
        if (this.isPlaying) {
            this.stopPreview();
        } else {
            this.startPreview();
        }
    }

    startPreview() {
        this.isPlaying = true;
        this.playNextStep();
    }

    playNextStep() {
        if (!this.isPlaying) return;

        this.currentStep = (this.currentStep + 1) % this.sequenceSteps.length;
        this.ledColors = new Map(this.sequenceSteps[this.currentStep]);
        this.draw();
        this.updateStepLabel();

        this.previewTimeout = setTimeout(() => this.playNextStep(), this.previewSpeed);
    }

    stopPreview() {
        this.isPlaying = false;
        clearTimeout(this.previewTimeout);
    }

    rotateLeft() {
        const totalLEDs = this.leds.size;
        const newLedColors = new Map();
        this.ledColors.forEach((color, index) => {
            const newIndex = (index + 1) % totalLEDs; // Add 1 for clockwise rotation
            newLedColors.set(newIndex, color);
        });
        this.ledColors = newLedColors;
        this.draw();
    }

    rotateRight() {
        const totalLEDs = this.leds.size;
        const newLedColors = new Map();
        this.ledColors.forEach((color, index) => {
            const newIndex = (index - 1 + totalLEDs) % totalLEDs; // Subtract 1 for anticlockwise rotation
            newLedColors.set(newIndex, color);
        });
        this.ledColors = newLedColors;
        this.draw();
    }

    savePattern() {
        // Convert the Map to an array and ensure keys are numbers
        const patternData = {
            ledColors: Array.from(this.ledColors.entries())
        };
        const dataStr = JSON.stringify(patternData);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `pattern_step${this.currentStep + 1}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    exportPattern() {
        // Convert the Map to an array and ensure keys are numbers
        const patternData = Array.from(this.ledColors.entries()).map(([key, value]) => `${key}:${value}`).join(',');
        const dataStr = `ledColors:${patternData}`;
        const blob = new Blob([dataStr], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `pattern_step${this.currentStep + 1}.txt`;
        a.click();

        URL.revokeObjectURL(url);
    }

    loadPattern() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const patternData = JSON.parse(e.target.result);
                    // Convert keys back to numbers
                    const ledColorsArray = patternData.ledColors.map(([key, value]) => [Number(key), value]);
                    this.ledColors = new Map(ledColorsArray);
                    this.sequenceSteps[this.currentStep] = new Map(this.ledColors);
                    this.draw();
                } catch (err) {
                    console.error('Error loading pattern:', err);
                }
            };
            reader.readAsText(file);
        });

        input.click();
    }

    // 1. Add method to update feedback messages
    updateFeedback(message) {
        if (this.feedbackElement) {
            this.feedbackElement.textContent = message;
        }
    }

    // 1. Add method to mirror lit LEDs across the vertical center
    mirrorPattern() {
        const totalLEDs = this.leds.size;
        const half = totalLEDs / 2;
        const newLedColors = new Map(this.ledColors); // Clone current LED colors

        this.ledColors.forEach((color, index) => {
            const mirroredIndex = (index + half) % totalLEDs;
            newLedColors.set(mirroredIndex, color);
        });

        this.ledColors = newLedColors;
        this.draw();
        this.updateFeedback("Pattern mirrored across the vertical center.");
    }

    flipPattern() {
        const totalLEDs = this.leds.size;
        const ledsPerSide = this.ledsPerSide;
        const newLedColors = new Map();

        // Flip the pattern by mapping each lit LED to its mirror index
        this.ledColors.forEach((color, index) => {
            const mirrorIndex = this.getMirrorIndex(index);
            newLedColors.set(mirrorIndex, color);
        });

        this.ledColors = newLedColors;
        this.draw();
        this.updateFeedback("Pattern flipped across the center.");
    }

    // Helper function to compute the mirror index
    getMirrorIndex(index) {
        const totalLEDs = this.leds.size;
        const ledsPerSide = this.ledsPerSide;

        const topEdgeStart = 0;
        const topEdgeEnd = ledsPerSide - 1; // Indices 0 to 49
        const rightEdgeStart = topEdgeEnd + 1;
        const rightEdgeEnd = rightEdgeStart + ledsPerSide - 2; // Indices 50 to 98
        const bottomEdgeStart = rightEdgeEnd + 1;
        const bottomEdgeEnd = bottomEdgeStart + ledsPerSide - 1; // Indices 99 to 148
        const leftEdgeStart = bottomEdgeEnd + 1;
        const leftEdgeEnd = totalLEDs - 1; // Indices 149 to totalLEDs - 1

        let mirrorIndex;

        if (index >= topEdgeStart && index <= topEdgeEnd) {
            // Top edge
            const position = index - topEdgeStart;
            mirrorIndex = bottomEdgeEnd - position;
        } else if (index >= bottomEdgeStart && index <= bottomEdgeEnd) {
            // Bottom edge
            const position = index - bottomEdgeStart;
            mirrorIndex = topEdgeEnd - position;
        } else if (index >= rightEdgeStart && index <= rightEdgeEnd) {
            // Right edge
            const position = index - rightEdgeStart;
            mirrorIndex = leftEdgeEnd - position;
        } else if (index >= leftEdgeStart && index <= leftEdgeEnd) {
            // Left edge
            const position = index - leftEdgeStart;
            mirrorIndex = rightEdgeEnd - position;
        } else {
            mirrorIndex = index; // Default to same index
        }

        return mirrorIndex;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line no-unused-vars
    const app = new LEDPatternGenerator();
});