class FourHumorsPuzzle {
    constructor(configPath = 'puzzle-config.json') {
        this.svg = document.getElementById('puzzle-svg');
        this.draggableGroup = document.getElementById('draggable-arcs');
        this.centerX = 400;
        this.centerY = 400;

        this.draggedElement = null;
        this.dragAngleOffset = 0;
        this.arcSegments = [];
        this.animationFrameId = null;
        this.physicsEnabled = true;

        this.configPath = configPath;
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.gradientsAvailable = this.injectGradients();
        this.createISMarkers();
        this.createCenterLabels();
        this.createCrossPattern();
        this.createArcSegments();
        this.setupEventListeners();
        this.shufflePieces();
    }

    async loadConfig() {
        try {
            const response = await fetch(this.configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.statusText}`);
            }
            const config = await response.json();

            this.rings = config.rings;
            this.crossSections = config.crossSections;
            this.humorData = {};

            // Transform the config format to internal format
            Object.keys(config.humors).forEach(humorKey => {
                const humor = config.humors[humorKey];
                this.humorData[humorKey] = {
                    color: humor.color,
                    gradientId: humor.gradientId,
                    startAngle: humor.startAngle,
                    label: humor.label,
                    arcs: humor.arcs
                };
            });
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    createISMarkers() {
        const isMarkersGroup = document.getElementById('is-markers');
        const angles = [0, 90, 180, 270]; // Four cardinal directions
        const radius = 150; // Between rings - centered in the wider gap

        angles.forEach(angle => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('is-marker');

            // Create triangle pointing outward
            const angleRad = (angle - 90) * Math.PI / 180;
            const x = this.centerX + radius * Math.cos(angleRad);
            const y = this.centerY + radius * Math.sin(angleRad);
            // Add "IS" text - positioned in the gap and rotated
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y + 12);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('transform', `rotate(${angle}, ${x}, ${y + 6})`);
            text.textContent = 'IS';
            group.appendChild(text);

            isMarkersGroup.appendChild(group);
        });
    }

    createCenterLabels() {
        const centerLabelsGroup = document.getElementById('center-labels');
        const centerRadius = 80; // Radius of center circle
        const labelRadius = 55; // Position labels inside the center circle

        Object.keys(this.humorData).forEach(humorKey => {
            const humor = this.humorData[humorKey];
            const angle = humor.startAngle + 45; // Add 45 degrees to position between wedges
            const angleRad = (angle - 90) * Math.PI / 180;

            // Calculate position based on startAngle + 45
            const x = this.centerX + labelRadius * Math.cos(angleRad);
            const y = this.centerY + labelRadius * Math.sin(angleRad);

            // Check if label contains newline
            const labelParts = humor.label.split('\n');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', 'Cinzel, serif');
            text.setAttribute('font-size', labelParts.length > 1 ? '10' : '11');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#FFFFFF');
            text.setAttribute('stroke', '#000000');
            text.setAttribute('stroke-width', '0.3');
            text.setAttribute('paint-order', 'stroke');
            text.setAttribute('transform', `rotate(${angle}, ${x}, ${y})`);

            if (labelParts.length > 1) {
                // Multi-line label
                labelParts.forEach((part, index) => {
                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tspan.setAttribute('x', x);
                    tspan.setAttribute('y', y + (index - 0.5) * 12 + 6);
                    tspan.textContent = part;
                    text.appendChild(tspan);
                });
            } else {
                // Single line label
                text.setAttribute('x', x);
                text.setAttribute('y', y);
                text.textContent = labelParts[0];
            }

            centerLabelsGroup.appendChild(text);
        });
    }

    createCrossPattern() {
        const crossGroup = document.getElementById('cross-pattern');
        
        // Create four large triangular black sections with labels
        this.crossSections.forEach(section => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('cross-segment');

            // Calculate the triangular section from center to outer edge - narrower
            const angleStart = section.angle - 12; // Narrower 24 degree spread
            const angleEnd = section.angle + 12;
            
            const outerRadius = 300;
            
            // Create path for triangular section
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = this.createTrianglePath(
                this.centerX, this.centerY,
                outerRadius,
                angleStart, angleEnd
            );
            path.setAttribute('d', pathData);
            group.appendChild(path);

            // Add label text
            const labelAngle = (section.angle - 90) * Math.PI / 180;
            const labelRadius = 182; // Positioned closer to center, in ring 1 (165-200)
            const labelX = this.centerX + labelRadius * Math.cos(labelAngle);
            const labelY = this.centerY + labelRadius * Math.sin(labelAngle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', labelX);
            text.setAttribute('y', labelY + 5);
            text.setAttribute('class', 'cross-label');
            text.setAttribute('transform', `rotate(${section.angle + 90}, ${labelX}, ${labelY})`);
            text.textContent = section.label;
            group.appendChild(text);

            crossGroup.appendChild(group);
        });
    }

    createTrianglePath(centerX, centerY, radius, startAngle, endAngle) {
        const startAngleRad = (startAngle - 90) * Math.PI / 180;
        const endAngleRad = (endAngle - 90) * Math.PI / 180;

        const x1 = centerX + radius * Math.cos(startAngleRad);
        const y1 = centerY + radius * Math.sin(startAngleRad);
        const x2 = centerX + radius * Math.cos(endAngleRad);
        const y2 = centerY + radius * Math.sin(endAngleRad);

        return [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');
    }

    createArcSegments() {
        const humors = Object.keys(this.humorData);

        this.rings.forEach((ring, ringIndex) => {
            const fullSegmentAngle = 360 / ring.segments; // 90 degrees
            const segmentAngle = 66; // Narrower to not cover black triangles (90 - 24)

            humors.forEach((humorKey) => {
                const humor = this.humorData[humorKey];
                const label = humor.arcs[ringIndex] || '';

                // Center the arc in its 90-degree quadrant
                const centerOffset = (fullSegmentAngle - segmentAngle) / 2;
                const correctAngle = (humor.startAngle + centerOffset) % 360;

                const arcData = {
                    id: `arc-${ringIndex}-${humorKey}`,
                    ringIndex,
                    humor: humorKey,
                    correctAngle,
                    currentAngle: correctAngle,
                    innerRadius: ring.innerRadius,
                    outerRadius: ring.outerRadius,
                    segmentAngle,
                    label,
                    snapped: false
                };

                const arcElement = this.createArcElement(arcData);
                this.draggableGroup.appendChild(arcElement);
                this.arcSegments.push(arcData);
            });
        });
    }

    createArcElement(arcData) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', arcData.id);
        group.classList.add('arc-segment', arcData.humor, `ring-${arcData.ringIndex}`);

        // Create the arc path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.createArcPath(
            this.centerX, this.centerY,
            arcData.innerRadius, arcData.outerRadius,
            arcData.currentAngle, arcData.currentAngle + arcData.segmentAngle
        );

        path.setAttribute('d', pathData);
        // Initially white, will show gradient when snapped
        path.setAttribute('fill', '#ffffff');

        group.appendChild(path);

        // Add text label if applicable
        if (arcData.label) {
            const text = this.createArcText(arcData, arcData.label);
            group.appendChild(text);
        }

        return group;
    }

    createArcPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
        const startAngleRad = (startAngle - 90) * Math.PI / 180;
        const endAngleRad = (endAngle - 90) * Math.PI / 180;

        const x1 = centerX + innerRadius * Math.cos(startAngleRad);
        const y1 = centerY + innerRadius * Math.sin(startAngleRad);
        const x2 = centerX + outerRadius * Math.cos(startAngleRad);
        const y2 = centerY + outerRadius * Math.sin(startAngleRad);

        const x3 = centerX + outerRadius * Math.cos(endAngleRad);
        const y3 = centerY + outerRadius * Math.sin(endAngleRad);
        const x4 = centerX + innerRadius * Math.cos(endAngleRad);
        const y4 = centerY + innerRadius * Math.sin(endAngleRad);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            `M ${x1} ${y1}`,
            `L ${x2} ${y2}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
            `L ${x4} ${y4}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
            'Z'
        ].join(' ');
    }

    createArcText(arcData, text) {
        const midRadius = (arcData.innerRadius + arcData.outerRadius) / 2;
        const pathId = `arc-path-${arcData.id}`;
        
        // Ensure defs exists
        let defs = this.svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            this.svg.insertBefore(defs, this.svg.firstChild);
        }
        
        // Create the arc path for text to follow
        const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcPath.setAttribute('id', pathId);
        
        // Calculate arc path coordinates
        const startAngleRad = (arcData.currentAngle - 90) * Math.PI / 180;
        const endAngleRad = (arcData.currentAngle + arcData.segmentAngle - 90) * Math.PI / 180;
        
        const x1 = this.centerX + midRadius * Math.cos(startAngleRad);
        const y1 = this.centerY + midRadius * Math.sin(startAngleRad);
        const x2 = this.centerX + midRadius * Math.cos(endAngleRad);
        const y2 = this.centerY + midRadius * Math.sin(endAngleRad);
        
        const largeArcFlag = arcData.segmentAngle <= 180 ? "0" : "1";
        const sweepFlag = "1"; // Always sweep clockwise
        
        const pathData = `M ${x1} ${y1} A ${midRadius} ${midRadius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
        arcPath.setAttribute('d', pathData);
        arcPath.setAttribute('fill', 'none');
        arcPath.setAttribute('stroke', 'none');
        
        defs.appendChild(arcPath);
        
        // Create text element with textPath
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('class', 'arc-text');
        // Center text vertically relative to the path
        textElement.setAttribute('dominant-baseline', 'middle');
        
        const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        // Use xlink:href for maximum browser compatibility
        textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
        textPath.setAttribute('startOffset', '50%');
        textPath.setAttribute('text-anchor', 'middle');
        textPath.textContent = text;
        
        textElement.appendChild(textPath);
        
        return textElement;
    }

    setupEventListeners() {
        // Mouse events
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Touch events for mobile
        this.svg.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Button events
        const shuffleBtn = document.getElementById('shuffle-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        if (shuffleBtn) shuffleBtn.addEventListener('click', this.shufflePieces.bind(this));
        if (resetBtn) resetBtn.addEventListener('click', this.resetPuzzle.bind(this));
    }

    handleMouseDown(e) {
        const target = this.getArcSegment(e.target);
        if (target && !this.getArcData(target).snapped) {
            this.startDrag(target, e.clientX, e.clientY);
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const target = this.getArcSegment(e.target);
        if (target && !this.getArcData(target).snapped) {
            const touch = e.touches[0];
            this.startDrag(target, touch.clientX, touch.clientY);
        }
    }

    startDrag(element, clientX, clientY) {
        this.draggedElement = element;
        element.classList.add('dragging');

        // Move selected arc to top of rendering order
        this.draggableGroup.appendChild(element);

        const pointerAngle = this.getPointerAngle(clientX, clientY);
        const arcData = this.getArcData(element);
        this.dragAngleOffset = (arcData.currentAngle - pointerAngle + 360) % 360;
    }

    handleMouseMove(e) {
        if (this.draggedElement) {
            this.updateDragPosition(e.clientX, e.clientY);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (this.draggedElement) {
            const touch = e.touches[0];
            this.updateDragPosition(touch.clientX, touch.clientY);
        }
    }

    updateDragPosition(clientX, clientY) {
        const pointerAngle = this.getPointerAngle(clientX, clientY);
        const arcData = this.getArcData(this.draggedElement);
        const normalizedAngle = (pointerAngle + this.dragAngleOffset + 360) % 360;
        arcData.currentAngle = normalizedAngle;

        this.updateArcPosition(this.draggedElement, arcData);
    }

    handleMouseUp(e) {
        this.endDrag();
    }

    handleTouchEnd(e) {
        this.endDrag();
    }

    endDrag() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');

            // Move to top again after dragging to ensure it stays on top
            this.draggableGroup.appendChild(this.draggedElement);

            // Apply physics push before checking for snap
            if (this.physicsEnabled) {
                this.applyPhysicsPush(this.draggedElement);
            }

            this.checkForSnap(this.draggedElement);
            this.draggedElement = null;
        }
    }

    checkForSnap(element) {
        const arcData = this.getArcData(element);

        // Check if close to correct position
        const targetAngle = arcData.correctAngle;
        const angleDiff = Math.abs(arcData.currentAngle - targetAngle);
        const wrappedDiff = Math.min(angleDiff, 360 - angleDiff);

        const snapThreshold = 30;

        if (wrappedDiff <= snapThreshold) {
            // Check if position is occupied
            if (!this.isPositionOccupied(targetAngle, arcData.ringIndex, arcData.id)) {
                // Animate to correct position
                this.animateArcToPosition(arcData, targetAngle, 300);

                setTimeout(() => {
                    arcData.currentAngle = targetAngle;
                    arcData.snapped = true;
                    element.classList.add('snapped');
                    
                    // Change fill to gradient
                    const path = element.querySelector('path');
                    if (this.gradientsAvailable) {
                        path.setAttribute('fill', `url(#${this.humorData[arcData.humor].gradientId})`);
                    } else {
                        path.setAttribute('fill', this.humorData[arcData.humor].color);
                    }
                    
                    // Move snapped pieces to back of rendering order
                    this.draggableGroup.insertBefore(element, this.draggableGroup.firstChild);
                    this.updateArcPosition(element, arcData);

                    // Push away any overlapping pieces when snapping
                    this.pushAwayOverlappingPieces(arcData);

                    this.checkWinCondition();
                }, 300);
                return;
            }
        }
    }

    pushAwayOverlappingPieces(snappedArc) {
        const sameRingArcs = this.arcSegments.filter(arc =>
            arc.ringIndex === snappedArc.ringIndex &&
            arc.id !== snappedArc.id &&
            !arc.snapped
        );

        const overlapping = [];

        // Find overlapping arcs
        sameRingArcs.forEach(arc => {
            if (this.checkArcOverlap(snappedArc, arc)) {
                overlapping.push(arc);
            }
        });

        if (overlapping.length > 0) {
            overlapping.forEach((arc, index) => {
                const snappedStart = snappedArc.currentAngle;
                const snappedEnd = (snappedArc.currentAngle + snappedArc.segmentAngle) % 360;
                const arcStart = arc.currentAngle;

                const distToSnappedStart = Math.abs(this.getShortestAngularDistance(arcStart, snappedStart));
                const distToSnappedEnd = Math.abs(this.getShortestAngularDistance(arcStart, snappedEnd));

                const pushForce = 45;
                let direction;

                if (distToSnappedStart < distToSnappedEnd) {
                    direction = -1;
                } else {
                    direction = 1;
                }

                const newAngle = (arc.currentAngle + direction * pushForce + 360) % 360;

                setTimeout(() => {
                    this.animateArcToPosition(arc, newAngle, 250);
                }, index * 30);
            });
        }
    }

    isPositionOccupied(angle, ringIndex, excludeId) {
        const tolerance = 5;
        return this.arcSegments.some(arc =>
            arc.ringIndex === ringIndex &&
            arc.id !== excludeId &&
            arc.snapped &&
            Math.abs(arc.currentAngle - angle) < tolerance
        );
    }

    updateArcPosition(element, arcData) {
        const path = element.querySelector('path');
        const pathData = this.createArcPath(
            this.centerX, this.centerY,
            arcData.innerRadius, arcData.outerRadius,
            arcData.currentAngle, arcData.currentAngle + arcData.segmentAngle
        );
        path.setAttribute('d', pathData);

        // Update text path if it exists
        const text = element.querySelector('text');
        if (text) {
            const textPath = text.querySelector('textPath');
            if (textPath) {
                const pathId = `arc-path-${arcData.id}`;
                const arcPath = this.svg.querySelector(`#${pathId}`);
                
                if (arcPath) {
                    const midRadius = (arcData.innerRadius + arcData.outerRadius) / 2;
                    const startAngleRad = (arcData.currentAngle - 90) * Math.PI / 180;
                    const endAngleRad = (arcData.currentAngle + arcData.segmentAngle - 90) * Math.PI / 180;
                    
                    const x1 = this.centerX + midRadius * Math.cos(startAngleRad);
                    const y1 = this.centerY + midRadius * Math.sin(startAngleRad);
                    const x2 = this.centerX + midRadius * Math.cos(endAngleRad);
                    const y2 = this.centerY + midRadius * Math.sin(endAngleRad);
                    
                    const largeArcFlag = arcData.segmentAngle <= 180 ? "0" : "1";
                    const sweepFlag = "1";
                    
                    const newPathData = `M ${x1} ${y1} A ${midRadius} ${midRadius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
                    arcPath.setAttribute('d', newPathData);
                }
            }
        }
    }

    getPointerAngle(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();

        const scaleX = 800 / rect.width;
        const scaleY = 800 / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

        return (angle + 360) % 360;
    }

    injectGradients() {
        const gradients = [
            {
                id: 'cholericGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#F4B827', opacity: 1 },
                    { offset: '100%', color: '#B8860B', opacity: 1 }
                ]
            },
            {
                id: 'sanguineGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#FFB6C1', opacity: 1 },
                    { offset: '100%', color: '#E88DA8', opacity: 1 }
                ]
            },
            {
                id: 'melancholicGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#C0C9FF', opacity: 1 },
                    { offset: '100%', color: '#7B68EE', opacity: 1 }
                ]
            },
            {
                id: 'phlegmaticGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#B0E0E6', opacity: 1 },
                    { offset: '100%', color: '#2BE7D7', opacity: 1 }
                ]
            }
        ];

        let defs = this.svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            this.svg.insertBefore(defs, this.svg.firstChild);
        }

        let allInjected = true;

        gradients.forEach(({ id, type, stops }) => {
            if (this.svg.querySelector(`#${id}`)) {
                return;
            }

            const gradient = document.createElementNS('http://www.w3.org/2000/svg', type);
            gradient.setAttribute('id', id);
            gradient.setAttribute('cx', '50%');
            gradient.setAttribute('cy', '50%');
            gradient.setAttribute('r', '65%');

            stops.forEach(stopDef => {
                const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop.setAttribute('offset', stopDef.offset);
                stop.setAttribute('stop-color', stopDef.color);
                if (typeof stopDef.opacity !== 'undefined') {
                    stop.setAttribute('stop-opacity', stopDef.opacity);
                }
                gradient.appendChild(stop);
            });

            try {
                defs.appendChild(gradient);
            } catch (error) {
                console.warn('Failed to inject gradient', id, error);
                allInjected = false;
            }
        });

        return allInjected;
    }

    getArcSegment(element) {
        while (element && !element.classList.contains('arc-segment')) {
            element = element.parentElement;
        }
        return element;
    }

    getArcData(element) {
        return this.arcSegments.find(arc => arc.id === element.id);
    }

    shufflePieces() {
        this.arcSegments.forEach(arcData => {
            if (!arcData.snapped) {
                let attempts = 0;
                let newAngle;

                do {
                    newAngle = Math.random() * 360;
                    attempts++;
                } while (attempts < 10 && this.wouldCauseOverlap(arcData, newAngle));

                arcData.currentAngle = newAngle;
                const element = document.getElementById(arcData.id);
                this.updateArcPosition(element, arcData);
            }
        });
    }

    resetPuzzle() {
        this.arcSegments.forEach(arcData => {
            arcData.snapped = false;
            arcData.currentAngle = Math.random() * 360;
            const element = document.getElementById(arcData.id);
            element.classList.remove('snapped');
            
            // Reset to white
            const path = element.querySelector('path');
            path.setAttribute('fill', '#ffffff');
            
            this.updateArcPosition(element, arcData);
        });
    }

    checkWinCondition() {
        const allSnapped = this.arcSegments.every(arc => arc.snapped);
        if (allSnapped) {
            this.showSuccessMessage();
            // setTimeout(() => {
            //     this.showSuccessMessage();
            // }, 500);
        }
    }

    showSuccessMessage() {
        const overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';

        const popup = document.createElement('div');
        popup.className = 'zoom-popup';

        popup.innerHTML = `
            <div class="zoom-header">
                <div class="zoom-title">Access Granted</div>
                <div class="zoom-status">Harmony Restored</div>
            </div>
            <div class="zoom-body">
                <div class="connection-animation">
                    <div class="mystical-circle"></div>
                    <div class="mystical-circle"></div>
                    <div class="mystical-circle"></div>
                </div>
                <p class="connection-text">The humors are balanced...</p>
                <p class="connection-subtext">Welcome to PATRYON</p>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        setTimeout(() => overlay.classList.add('active'), 10);
    }

    // Physics system for arc collision and pushing
    applyPhysicsPush(droppedElement) {
        const droppedArc = this.getArcData(droppedElement);
        if (!droppedArc || droppedArc.snapped) return;

        const sameRingArcs = this.arcSegments.filter(arc =>
            arc.ringIndex === droppedArc.ringIndex &&
            arc.id !== droppedArc.id &&
            !arc.snapped
        );

        const overlapping = [];

        sameRingArcs.forEach(arc => {
            if (this.checkArcOverlap(droppedArc, arc)) {
                overlapping.push(arc);
            }
        });

        if (overlapping.length > 0) {
            this.resolveCollisions(droppedArc, overlapping);
        }
    }

    checkArcOverlap(arc1, arc2) {
        const overlap1 = this.getAngularOverlap(
            arc1.currentAngle,
            arc1.currentAngle + arc1.segmentAngle,
            arc2.currentAngle,
            arc2.currentAngle + arc2.segmentAngle
        );

        return overlap1 > 8;
    }

    getAngularOverlap(start1, end1, start2, end2) {
        start1 = ((start1 % 360) + 360) % 360;
        end1 = ((end1 % 360) + 360) % 360;
        start2 = ((start2 % 360) + 360) % 360;
        end2 = ((end2 % 360) + 360) % 360;

        if (end1 < start1) end1 += 360;
        if (end2 < start2) end2 += 360;

        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
            return overlapEnd - overlapStart;
        }

        if (start1 <= start2 + 360 && end1 >= start2 + 360) {
            return Math.min(end1, start2 + 360) - Math.max(start1, start2);
        }
        if (start2 <= start1 + 360 && end2 >= start1 + 360) {
            return Math.min(end2, start1 + 360) - Math.max(start2, start1);
        }

        return 0;
    }

    resolveCollisions(droppedArc, overlappingArcs) {
        overlappingArcs.forEach((arc, index) => {
            const droppedCenter = droppedArc.currentAngle + droppedArc.segmentAngle / 2;
            const arcCenter = arc.currentAngle + arc.segmentAngle / 2;

            const angleDiff = this.getShortestAngularDistance(arcCenter, droppedCenter);

            const overlapAmount = this.getAngularOverlap(
                droppedArc.currentAngle,
                droppedArc.currentAngle + droppedArc.segmentAngle,
                arc.currentAngle,
                arc.currentAngle + arc.segmentAngle
            );

            const pushForce = Math.min(30, Math.max(10, overlapAmount * 0.8));

            const preferredDirection = angleDiff > 0 ? -1 : 1;
            let newAngle = (arc.currentAngle + preferredDirection * pushForce + 360) % 360;

            if (this.wouldCollideWithSnappedPiece(newAngle, arc)) {
                const oppositeDirection = -preferredDirection;
                newAngle = (arc.currentAngle + oppositeDirection * pushForce + 360) % 360;

                if (this.wouldCollideWithSnappedPiece(newAngle, arc)) {
                    newAngle = this.findNearestSafePosition(arc, pushForce);
                }
            }

            setTimeout(() => {
                this.animateArcToPosition(arc, newAngle, 200);
            }, index * 20);
        });
    }

    wouldCollideWithSnappedPiece(testAngle, arcData) {
        const testArc = {
            ...arcData,
            currentAngle: testAngle
        };

        const snappedArcsInRing = this.arcSegments.filter(arc =>
            arc.ringIndex === arcData.ringIndex &&
            arc.id !== arcData.id &&
            arc.snapped
        );

        return snappedArcsInRing.some(snappedArc =>
            this.checkArcOverlap(testArc, snappedArc)
        );
    }

    findNearestSafePosition(arcData, minDistance) {
        const increment = 5;
        const maxSearchAngle = 180;

        for (let distance = minDistance; distance <= maxSearchAngle; distance += increment) {
            let testAngle = (arcData.currentAngle + distance + 360) % 360;
            if (!this.wouldCollideWithSnappedPiece(testAngle, arcData)) {
                return testAngle;
            }

            testAngle = (arcData.currentAngle - distance + 360) % 360;
            if (!this.wouldCollideWithSnappedPiece(testAngle, arcData)) {
                return testAngle;
            }
        }

        return arcData.currentAngle;
    }

    getShortestAngularDistance(angle1, angle2) {
        const diff = angle2 - angle1;
        return ((diff + 180) % 360) - 180;
    }

    animateArcToPosition(arcData, targetAngle, duration = 200) {
        const startAngle = arcData.currentAngle;
        const angleDiff = this.getShortestAngularDistance(startAngle, targetAngle);
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = 1 - (1 - progress) * (1 - progress);

            const currentAngle = (startAngle + angleDiff * easeProgress + 360) % 360;
            arcData.currentAngle = currentAngle;

            const element = document.getElementById(arcData.id);
            if (element) {
                this.updateArcPosition(element, arcData);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    wouldCauseOverlap(arcData, testAngle) {
        const sameRingArcs = this.arcSegments.filter(arc =>
            arc.ringIndex === arcData.ringIndex &&
            arc.id !== arcData.id &&
            !arc.snapped
        );

        const testArc = {
            ...arcData,
            currentAngle: testAngle
        };

        return sameRingArcs.some(arc => this.checkArcOverlap(testArc, arc));
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FourHumorsPuzzle();
});
