class FourHumorsPuzzle {
    constructor(configPath = 'puzzle-config.json') {
        this.svg = document.getElementById('puzzle-svg');
        this.draggableGroup = document.getElementById('draggable-arcs');
        this.centerX = 300;
        this.centerY = 300;

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
            this.humorData = {};

            // Transform the config format to internal format
            Object.keys(config.humors).forEach(humorKey => {
                const humor = config.humors[humorKey];
                this.humorData[humorKey] = {
                    color: humor.color,
                    gradientId: humor.gradientId,
                    startAngle: humor.startAngle,
                    ringLabels: this.distributeArcsToRings(humor.arcs)
                };
            });
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    distributeArcsToRings(arcs) {
        // Distribute arcs across rings based on ring segments
        // Ring 0: 1 segment, Ring 1: 2 segments, Ring 2: 3 segments
        const ringLabels = [];
        let arcIndex = 0;

        this.rings.forEach((ring, ringIndex) => {
            const segmentsPerHumor = ring.segments / 4; // 4 humors
            const labelsForRing = [];

            for (let i = 0; i < segmentsPerHumor; i++) {
                labelsForRing.push(arcs[arcIndex] || '');
                arcIndex++;
            }

            ringLabels.push(labelsForRing);
        });

        return ringLabels;
    }

    createArcSegments() {
        const humors = Object.keys(this.humorData);

        this.rings.forEach((ring, ringIndex) => {
            const segmentAngle = 360 / ring.segments;
            const segmentsPerHumor = ring.segments / humors.length;

            humors.forEach((humorKey) => {
                const humor = this.humorData[humorKey];
                const labelsForRing = humor.ringLabels[ringIndex] || [];

                if (labelsForRing.length !== segmentsPerHumor) {
                    console.warn(`Ring ${ringIndex} for ${humorKey} expects ${segmentsPerHumor} labels but received ${labelsForRing.length}.`);
                }

                for (let i = 0; i < segmentsPerHumor; i++) {
                    const correctAngle = (humor.startAngle + i * segmentAngle) % 360;
                    const label = labelsForRing[i] || '';

                    const arcData = {
                        id: `arc-${ringIndex}-${humorKey}-${i}`,
                        ringIndex,
                        segmentIndex: i,
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
                }
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

        if (this.gradientsAvailable) {
            path.setAttribute('fill', `url(#${this.humorData[arcData.humor].gradientId})`);
        } else {
            path.setAttribute('fill', this.humorData[arcData.humor].color);
        }

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
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const midRadius = (arcData.innerRadius + arcData.outerRadius) / 2;
        const midAngle = (arcData.currentAngle + arcData.segmentAngle / 2 - 90) * Math.PI / 180;

        const x = this.centerX + midRadius * Math.cos(midAngle);
        const y = this.centerY + midRadius * Math.sin(midAngle);

        textElement.setAttribute('x', x);
        textElement.setAttribute('y', y);
        textElement.setAttribute('class', 'arc-text');
        textElement.textContent = text;

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
        document.getElementById('shuffle-btn').addEventListener('click', this.shufflePieces.bind(this));
        document.getElementById('reset-btn').addEventListener('click', this.resetPuzzle.bind(this));
        document.getElementById('debug-zoom-btn').addEventListener('click', this.showMedievalZoomCall.bind(this));
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

        // Find the correct humor section for this piece
        const targetPositions = this.getValidPositionsForHumor(arcData.humor, arcData.ringIndex);

        // Check if current position is close to any valid position for this humor
        for (const targetAngle of targetPositions) {
            const angleDiff = Math.abs(arcData.currentAngle - targetAngle);
            const wrappedDiff = Math.min(angleDiff, 360 - angleDiff);

            // Bigger snap threshold for inner rings
            const snapThreshold = arcData.ringIndex === 0 ? 45 : 30; // Increased thresholds

            if (wrappedDiff <= snapThreshold) {
                // Check if this position is already occupied
                if (!this.isPositionOccupied(targetAngle, arcData.ringIndex, arcData.id)) {
                    // Animate to correct position
                    this.animateArcToPosition(arcData, targetAngle, 300);

                    setTimeout(() => {
                        arcData.currentAngle = targetAngle;
                        arcData.snapped = true;
                        element.classList.add('snapped');
                        // Move snapped pieces to back of rendering order
                        this.draggableGroup.insertBefore(element, this.draggableGroup.firstChild);
                        this.updateArcPosition(element, arcData);

                        // Push away any overlapping pieces when snapping
                        this.pushAwayOverlappingPieces(arcData);

                        this.checkWinCondition();
                    }, 300);
                    return; // Exit after first valid snap
                }
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
                // Calculate which edge of the arc is closer to determine push direction
                const snappedStart = snappedArc.currentAngle;
                const snappedEnd = (snappedArc.currentAngle + snappedArc.segmentAngle) % 360;
                const arcStart = arc.currentAngle;
                const arcEnd = (arc.currentAngle + arc.segmentAngle) % 360;

                // Calculate distances from arc's start to snapped piece's edges
                const distToSnappedStart = Math.abs(this.getShortestAngularDistance(arcStart, snappedStart));
                const distToSnappedEnd = Math.abs(this.getShortestAngularDistance(arcStart, snappedEnd));

                // Push in the direction of the closer edge
                const pushForce = 25;
                let direction;

                if (distToSnappedStart < distToSnappedEnd) {
                    // Snapped piece's start is closer, push counterclockwise
                    direction = -1;
                } else {
                    // Snapped piece's end is closer, push clockwise
                    direction = 1;
                }

                const newAngle = (arc.currentAngle + direction * pushForce + 360) % 360;

                setTimeout(() => {
                    this.animateArcToPosition(arc, newAngle, 250);
                }, index * 30);
            });
        }
    }

    /**
     * Calculates all valid snap positions for a specific humor within a ring.
     * Each humor occupies 1/4 of the circle, so positions are evenly distributed
     * within that 90-degree sector.
     *
     * @param {string} humor - The humor type ('choleric', 'sanguine', etc.)
     * @param {number} ringIndex - The ring index (0=inner, 1=middle, 2=outer)
     * @returns {number[]} Array of valid angles in degrees for this humor
     */
    getValidPositionsForHumor(humor, ringIndex) {
        const humorStartAngle = this.humorData[humor].startAngle;
        const ring = this.rings[ringIndex];
        const segmentAngle = 360 / ring.segments;
        const segmentsPerHumor = ring.segments / 4; // 4 humors divide the circle

        const positions = [];
        for (let i = 0; i < segmentsPerHumor; i++) {
            positions.push((humorStartAngle + i * segmentAngle) % 360);
        }
        return positions;
    }

    /**
     * Checks if a specific angular position is already occupied by a snapped piece.
     * Used to prevent multiple pieces from snapping to the same location.
     *
     * @param {number} angle - The angle in degrees to check
     * @param {number} ringIndex - The ring index to check within
     * @param {string} excludeId - ID of piece to exclude from check (usually the piece being placed)
     * @returns {boolean} True if position is occupied, false if available
     */
    isPositionOccupied(angle, ringIndex, excludeId) {
        const tolerance = 5; // degrees - small buffer for floating point comparison
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

        // Update text position if it exists
        const text = element.querySelector('text');
        if (text) {
            const midRadius = (arcData.innerRadius + arcData.outerRadius) / 2;
            const midAngle = (arcData.currentAngle + arcData.segmentAngle / 2 - 90) * Math.PI / 180;

            const x = this.centerX + midRadius * Math.cos(midAngle);
            const y = this.centerY + midRadius * Math.sin(midAngle);

            text.setAttribute('x', x);
            text.setAttribute('y', y);
        }
    }

    getPointerAngle(clientX, clientY) {
        const rect = this.svg.getBoundingClientRect();

        // Convert from screen coordinates to SVG coordinate space
        // The SVG has a viewBox="0 0 600 600" but may be rendered at different sizes
        const scaleX = 600 / rect.width;
        const scaleY = 600 / rect.height;

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
                    { offset: '0%', color: '#fff5d6', opacity: 1 },
                    { offset: '55%', color: '#f2b632', opacity: 1 },
                    { offset: '100%', color: '#a86b06', opacity: 1 }
                ]
            },
            {
                id: 'sanguineGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#ffe4de', opacity: 1 },
                    { offset: '55%', color: '#d84732', opacity: 1 },
                    { offset: '100%', color: '#7b1405', opacity: 1 }
                ]
            },
            {
                id: 'melancholicGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#d9e3ef', opacity: 1 },
                    { offset: '55%', color: '#334b5f', opacity: 1 },
                    { offset: '100%', color: '#182231', opacity: 1 }
                ]
            },
            {
                id: 'phlegmaticGradient',
                type: 'radialGradient',
                stops: [
                    { offset: '0%', color: '#e1f3ff', opacity: 1 },
                    { offset: '55%', color: '#328bc4', opacity: 1 },
                    { offset: '100%', color: '#145173', opacity: 1 }
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
                arcData.currentAngle = Math.random() * 360;
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
            this.updateArcPosition(element, arcData);
        });
    }

    checkWinCondition() {
        const allSnapped = this.arcSegments.every(arc => arc.snapped);
        if (allSnapped) {
            setTimeout(() => {
                this.showMedievalZoomCall();
            }, 500);
        }
    }

    showMedievalZoomCall() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'zoom-popup';

        popup.innerHTML = `
            <div class="zoom-header">
                <div class="zoom-title">Ye Olde Scrying Mirror</div>
                <div class="zoom-status">Connecting to the Council...</div>
            </div>
            <div class="zoom-body">
                <div class="connection-animation">
                    <div class="mystical-circle"></div>
                    <div class="mystical-circle"></div>
                    <div class="mystical-circle"></div>
                </div>
                <p class="connection-text">Balancing the humors...</p>
                <p class="connection-subtext">The realm's wisest scholars await thee</p>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Animate in
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

        // Find overlapping arcs
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

        return overlap1 > 8; // Increased threshold to reduce sensitivity
    }

    getAngularOverlap(start1, end1, start2, end2) {
        // Normalize angles to 0-360
        start1 = ((start1 % 360) + 360) % 360;
        end1 = ((end1 % 360) + 360) % 360;
        start2 = ((start2 % 360) + 360) % 360;
        end2 = ((end2 % 360) + 360) % 360;

        // Handle wrapping around 360/0
        if (end1 < start1) end1 += 360;
        if (end2 < start2) end2 += 360;

        // Check for overlap
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);

        if (overlapStart < overlapEnd) {
            return overlapEnd - overlapStart;
        }

        // Check for wrapped overlap
        if (start1 <= start2 + 360 && end1 >= start2 + 360) {
            return Math.min(end1, start2 + 360) - Math.max(start1, start2);
        }
        if (start2 <= start1 + 360 && end2 >= start1 + 360) {
            return Math.min(end2, start1 + 360) - Math.max(start2, start1);
        }

        return 0;
    }

    /**
     * Resolves collisions between a dropped arc and overlapping arcs by pushing
     * the overlapping pieces away. Ensures pushed pieces don't collide with
     * snapped (locked) pieces.
     *
     * @param {Object} droppedArc - The arc data for the piece being dropped
     * @param {Object[]} overlappingArcs - Array of arc data for overlapping pieces
     */
    resolveCollisions(droppedArc, overlappingArcs) {
        overlappingArcs.forEach((arc, index) => {
            // Calculate centers of both arcs
            const droppedCenter = droppedArc.currentAngle + droppedArc.segmentAngle / 2;
            const arcCenter = arc.currentAngle + arc.segmentAngle / 2;

            // Find shortest angular distance FROM existing arc TO dropped arc
            const angleDiff = this.getShortestAngularDistance(arcCenter, droppedCenter);

            // Calculate overlap amount to determine push force
            const overlapAmount = this.getAngularOverlap(
                droppedArc.currentAngle,
                droppedArc.currentAngle + droppedArc.segmentAngle,
                arc.currentAngle,
                arc.currentAngle + arc.segmentAngle
            );

            // Scale push force based on overlap (min 3°, max 12°)
            const pushForce = Math.min(12, Math.max(3, overlapAmount * 0.8));

            // Try pushing in the preferred direction first
            const preferredDirection = angleDiff > 0 ? -1 : 1;
            let newAngle = (arc.currentAngle + preferredDirection * pushForce + 360) % 360;

            // Check if this would collide with a snapped piece
            if (this.wouldCollideWithSnappedPiece(newAngle, arc)) {
                // Try the opposite direction
                const oppositeDirection = -preferredDirection;
                newAngle = (arc.currentAngle + oppositeDirection * pushForce + 360) % 360;

                // If both directions cause collisions, find the nearest safe spot
                if (this.wouldCollideWithSnappedPiece(newAngle, arc)) {
                    newAngle = this.findNearestSafePosition(arc, pushForce);
                }
            }

            // Simple, fast animation
            setTimeout(() => {
                this.animateArcToPosition(arc, newAngle, 200);
            }, index * 20);
        });
    }

    /**
     * Checks if moving an arc to a specific angle would cause it to collide
     * with any snapped (locked) pieces in the same ring.
     *
     * @param {number} testAngle - The angle to test for collision
     * @param {Object} arcData - The arc data for the piece being moved
     * @returns {boolean} True if collision would occur, false otherwise
     */
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

    /**
     * Finds the nearest safe position for an arc that doesn't collide with
     * snapped pieces, searching in increments around the circle.
     *
     * @param {Object} arcData - The arc data for the piece being moved
     * @param {number} minDistance - Minimum distance to move from current position
     * @returns {number} Safe angle in degrees, or current angle if none found
     */
    findNearestSafePosition(arcData, minDistance) {
        const increment = 5; // degrees to check in each step
        const maxSearchAngle = 180; // don't search more than half the circle

        // Try positions at increasing distances from current position
        for (let distance = minDistance; distance <= maxSearchAngle; distance += increment) {
            // Try clockwise first
            let testAngle = (arcData.currentAngle + distance + 360) % 360;
            if (!this.wouldCollideWithSnappedPiece(testAngle, arcData)) {
                return testAngle;
            }

            // Try counterclockwise
            testAngle = (arcData.currentAngle - distance + 360) % 360;
            if (!this.wouldCollideWithSnappedPiece(testAngle, arcData)) {
                return testAngle;
            }
        }

        // If no safe position found, return current position
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

            // Simple linear ease-out
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

    // Enhanced shuffle with collision avoidance
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