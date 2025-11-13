import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function TalkingKing() {
  const mountRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [angryEyebrows, setAngryEyebrows] = useState(false);
  const [showGrin, setShowGrin] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [introPhase, setIntroPhase] = useState(0); // 0=start, 1=middle, 2=end, 3=main animation
  const [introElapsed, setIntroElapsed] = useState(0);
  const [outroPhase, setOutroPhase] = useState(0); // 0=none, 1=static1, 2=garbled, 3=green-static+logo (FINAL)
  const [outroElapsed, setOutroElapsed] = useState(0);
  const grinTransitionRef = useRef(0);
  const angryTransitionRef = useRef(0);
  const startTimeRef = useRef(null);
  const pauseTimeRef = useRef(0);
  const audioRef = useRef(null);
  const introStartTimeRef = useRef(Date.now());
  const garbleAmountRef = useRef(0);
  const outroStartedRef = useRef(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);

  // Handle intro sequence timing
  useEffect(() => {
    if (introPhase >= 3) return; // Already in main animation

    const interval = setInterval(() => {
      const elapsed = (Date.now() - introStartTimeRef.current) / 1000;
      setIntroElapsed(elapsed);

      if (elapsed < 2) {
        setIntroPhase(0); // Show start image
      } else if (elapsed < 4) {
        setIntroPhase(1); // Fade to middle image
      } else if (elapsed < 6) {
        setIntroPhase(2); // Fade to end image
      } else {
        setIntroPhase(3); // Switch to main animation
        startTimeRef.current = Date.now(); // Start main animation timer
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [introPhase]);

  // Handle fade transition overlay (5.75s to 6.25s)
  useEffect(() => {
    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - introStartTimeRef.current) / 1000;

      let opacity = 0;
      if (elapsed >= 5.75 && elapsed < 6) {
        // Fade in over 0.25 seconds
        opacity = (elapsed - 5.75) / 0.25;
      } else if (elapsed >= 6 && elapsed < 6.25) {
        // Fade out over 0.25 seconds
        opacity = 1 - (elapsed - 6) / 0.25;
      }

      setFadeOpacity(opacity);

      // Stop the interval after fade completes
      if (elapsed >= 6.25) {
        setFadeOpacity(0);
        clearInterval(fadeInterval);
      }
    }, 16); // ~60fps

    return () => clearInterval(fadeInterval);
  }, []);

  // Handle outro sequence timing - run once when outro starts
  // store a ref to the interval so we can clear it later
  const outroIntervalRef = useRef(null);

  useEffect(() => {
    if (outroPhase !== 1 || outroStartedRef.current) return;

    outroStartedRef.current = true;
    const outroStartTime = Date.now();

    outroIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - outroStartTime) / 1000;
      setOutroElapsed(elapsed);

      if (elapsed < 0.5) {
        garbleAmountRef.current = 0;
      } else if (elapsed < 1.5) {
        garbleAmountRef.current = 1;
        setOutroPhase(2);
      } else {
        garbleAmountRef.current = 0;
        setOutroPhase(3);
        // You can optionally clear the interval here if nothing else needs it:
        // clearInterval(outroIntervalRef.current);
      }
    }, 50);

    // 🚫 Note: no cleanup return here — we don’t want to clear the interval on phase change
  }, [outroPhase]);

  // ✅ Separate effect: clear on unmount
  useEffect(() => {
    return () => {
      if (outroIntervalRef.current) {
        clearInterval(outroIntervalRef.current);
        outroIntervalRef.current = null;
      }
      outroStartedRef.current = false;
    };
  }, []);

  // TV Static component
  const TVStatic = ({ colorTint = 'white' }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Optimize: Use lower resolution for static effect (scale up for performance)
      const scale = 4; // Render at 1/4 resolution
      const staticWidth = Math.floor(canvas.width / scale);
      const staticHeight = Math.floor(canvas.height / scale);

      let animationId;
      let lastFrameTime = 0;
      const frameDelay = 1000 / 30; // Limit to 30fps instead of 60fps

      const drawStatic = (currentTime) => {
        // Throttle to ~30fps for performance
        if (currentTime - lastFrameTime < frameDelay) {
          animationId = requestAnimationFrame(drawStatic);
          return;
        }
        lastFrameTime = currentTime;

        const imageData = ctx.createImageData(staticWidth, staticHeight);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.random() * 255;

          if (colorTint === 'white') {
            data[i] = gray; // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
          } else if (colorTint === 'green') {
            // Calculate green tint progress (0 to 1 over 3 seconds)
            // Phase 3 starts at 1.5s, so progress is (elapsed - 1.5) / 3
            const progress = Math.min(1, (outroElapsed - 1.5) / 3);
            data[i] = gray * (1 - progress * 0.4); // R - reduce
            data[i + 1] = gray; // G - full
            data[i + 2] = gray * (1 - progress * 0.4); // B - reduce
          }
          data[i + 3] = 255; // A
        }

        // Create temporary canvas to scale up the low-res static
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = staticWidth;
        tempCanvas.height = staticHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);

        // Scale up and draw to main canvas
        ctx.imageSmoothingEnabled = false; // Pixelated look
        ctx.drawImage(
          tempCanvas,
          0,
          0,
          staticWidth,
          staticHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        animationId = requestAnimationFrame(drawStatic);
      };

      animationId = requestAnimationFrame(drawStatic);

      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }, [colorTint, outroElapsed]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
  };

  // Load audio for desktop deployment
  useEffect(() => {
    const audio = new Audio(
      'https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/Lord-Brayn-Audio.mp3'
    );
    audioRef.current = audio;

    // Start playing audio immediately when app loads
    audio.play().catch((err) => console.log('Audio play failed:', err));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // NOTE: External audio cannot be loaded in Claude artifacts due to Content Security Policy
  // Audio will need to be added separately when deploying this animation outside of artifacts
  // The timing is preserved so audio can be synced externally

  useEffect(() => {
    if (
      !mountRef.current ||
      introPhase < 3 ||
      (outroPhase > 0 && outroPhase !== 2)
    )
      return; // Wait for intro, allow garbled phase

    const talkingPeriods = [
      [1.5, 3],
      [3.75, 6.15],
      [7.5, 14.5],
      [15.75, 27.5],
      [28.5, 33],
      [34, 35],
      [35.5, 48.5],
      [49, 58.5],
      [59.25, 60.5],
      [61.5, 62.25],
      [62.6, 64.6],
      [65.75, 66.5],
      [68.1, 69.5],
      [70.5, 71.5],
      [72.8, 75.3],
      [77.2, 77.7],
      [79, 82.1],
      [82.9, 84.1],
      [85.7, 90.5],
      [91.25, 94],
      [95.75, 98],
      [99.2, 102.6],
      [103.2, 109],
    ];

    const angryPeriods = [
      [33.75, 35.75],
      [51, 59],
      [64, 83],
      [103, 993],
    ];

    const grinPeriods = [
      [29.8, 34],
      [97, 993],
    ];

    const talkingSpeedTransitions = [
      [0, 1.6],
      [15, 2.1],
      [27, 1.6],
      [35, 2.1],
      [49, 1.9],
      [59, 2.1],
      [77, 1.6],
      [86, 2.1],
      [89, 1.6],
      [103, 3.3],
    ];

    const getTalkingSpeed = (time) => {
      let speed = 1.6; // default slow
      for (let i = 0; i < talkingSpeedTransitions.length; i++) {
        if (time >= talkingSpeedTransitions[i][0]) {
          speed = talkingSpeedTransitions[i][1];
        } else {
          break;
        }
      }
      return speed;
    };

    const isInPeriod = (time, periods) => {
      return periods.some(([start, end]) => time >= start && time <= end);
    };

    // Scene setup
    const scene = new THREE.Scene();
    // Transparent background so SVG shows through

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 10.5); // Start at intermediate zoom

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // Dramatic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffddaa, 1.2);
    keyLight.position.set(4, 4, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xaa8855, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Materials - low poly style
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xe5c4a8,
      flatShading: true,
      shininess: 5,
    });

    const eyebrowMaterial = new THREE.MeshPhongMaterial({
      color: 0xe5e5e5,
      flatShading: true,
      shininess: 10,
    });

    const brainMaterial = new THREE.MeshPhongMaterial({
      color: 0xd4827e,
      flatShading: true,
      shininess: 8,
    });

    const crownMaterial = new THREE.MeshPhongMaterial({
      color: 0xd4a137,
      flatShading: true,
      shininess: 60,
      specular: 0x886622,
    });

    const crownBandMaterial = new THREE.MeshPhongMaterial({
      color: 0xd4a137,
      flatShading: true,
      shininess: 40,
    });

    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1410,
      flatShading: true,
    });

    // Create king head group
    const kingGroup = new THREE.Group();

    // Base Y position for the entire king face+crown+beard
    const kingBaseY = 0.75; // adjust this value to move the face up/down

    // Head base - angular and stern
    const headGeometry = new THREE.IcosahedronGeometry(1.2, 0);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.y = 0.5;
    head.scale.set(1, 1.15, 0.9);
    kingGroup.add(head);

    // Forehead prominence
    const foreheadGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const forehead = new THREE.Mesh(foreheadGeometry, skinMaterial);
    forehead.position.set(0, 1.3, 0.5);
    forehead.scale.set(1.4, 0.6, 1);
    kingGroup.add(forehead);

    // Strong angry brow ridge
    const browRidgeLeft = new THREE.BoxGeometry(0.9, 0.3, 0.5);
    const leftBrowRidge = new THREE.Mesh(browRidgeLeft, skinMaterial);
    leftBrowRidge.position.set(-0.45, 0.85, 0.7);
    leftBrowRidge.rotation.set(-0.3, 0, -0.25);
    kingGroup.add(leftBrowRidge);

    const browRidgeRight = new THREE.BoxGeometry(0.9, 0.3, 0.5);
    const rightBrowRidge = new THREE.Mesh(browRidgeRight, skinMaterial);
    rightBrowRidge.position.set(0.45, 0.85, 0.7);
    rightBrowRidge.rotation.set(-0.3, 0, 0.25);
    kingGroup.add(rightBrowRidge);

    // Massive extending eyebrows
    const eyebrowShape = new THREE.Shape();
    eyebrowShape.moveTo(0, 0);
    eyebrowShape.lineTo(1.8, 0.4);
    eyebrowShape.lineTo(1.9, 0.2);
    eyebrowShape.lineTo(2.0, 0.45);
    eyebrowShape.lineTo(1.8, 0.15);
    eyebrowShape.lineTo(0.1, -0.15);
    eyebrowShape.lineTo(0, 0);

    const eyebrowGeometry = new THREE.ExtrudeGeometry(eyebrowShape, {
      depth: 0.4,
      bevelEnabled: false,
    });

    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.3, 0.95, 0.7);
    leftEyebrow.rotation.set(-0.3, 0, 0.1);
    kingGroup.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.3, 0.95, 0.7);
    rightEyebrow.rotation.set(-0.3, 0, -0.1);
    rightEyebrow.scale.x = -1;
    kingGroup.add(rightEyebrow);

    // Deep-set scowling eyes
    const eyeGeometry = new THREE.IcosahedronGeometry(0.22, 0);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.35, 0.75, 0.775);
    leftEye.scale.set(1.3, 0.8, 0.9);
    kingGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.35, 0.75, 0.775);
    rightEye.scale.set(1.3, 0.8, 0.9);
    kingGroup.add(rightEye);

    // Angular nose
    const noseGeometry = new THREE.ConeGeometry(0.25, 0.6, 4);
    const nose = new THREE.Mesh(noseGeometry, skinMaterial);
    nose.position.set(0, 0.4, 1);
    nose.rotation.x = Math.PI / 2;
    kingGroup.add(nose);

    // White mustache
    const mustacheShape = new THREE.Shape();
    mustacheShape.moveTo(0, 0.18);
    mustacheShape.lineTo(0.55, 0.13);
    mustacheShape.lineTo(0.65, -0.22);
    mustacheShape.lineTo(0.13, -0.08);
    mustacheShape.lineTo(0, 0.18);

    const mustacheGeometry = new THREE.ExtrudeGeometry(mustacheShape, {
      depth: 0.18,
      bevelEnabled: false,
    });

    const leftMustache = new THREE.Mesh(mustacheGeometry, eyebrowMaterial);
    leftMustache.position.set(-0.02, -0.15, 0.7);
    kingGroup.add(leftMustache);

    const rightMustache = new THREE.Mesh(mustacheGeometry, eyebrowMaterial);
    rightMustache.position.set(0.02, -0.15, 0.7);
    rightMustache.scale.x = -1;
    kingGroup.add(rightMustache);

    // Lower jaw - animated for talking
    const lowerJawGeometry = new THREE.IcosahedronGeometry(0.6, 0);
    const lowerJaw = new THREE.Mesh(lowerJawGeometry, skinMaterial);
    lowerJaw.position.set(0, -0.6, 0.5);
    lowerJaw.scale.set(1.3, 0.8, 1);
    kingGroup.add(lowerJaw);

    // Scowling mouth
    const mouthGeometry = new THREE.PlaneGeometry(0.9, 0.3);
    const mouth = new THREE.Mesh(mouthGeometry, eyeMaterial);
    mouth.position.set(0, -0.3, 0.82);
    kingGroup.add(mouth);

    // Sharp interlocking teeth for grin
    const upperTeethGroup = new THREE.Group();
    const lowerTeethGroup = new THREE.Group();
    const upperToothGeometry = new THREE.ConeGeometry(0.06, 0.2, 3);
    const lowerToothGeometry = new THREE.ConeGeometry(0.06, 0.3, 3);

    // Upper teeth
    for (let i = 0; i < 14; i++) {
      const tooth = new THREE.Mesh(upperToothGeometry, eyebrowMaterial);
      const xPos = -0.41 + i * 0.06;
      const normalizedPos = (i - 6.5) / 6.5;
      const curveAmount = Math.abs(normalizedPos) * 0.14;
      tooth.position.set(xPos, -(0.15 - curveAmount), 0.84);
      tooth.rotation.x = Math.PI;
      tooth.rotation.z = normalizedPos * 0.15;
      upperTeethGroup.add(tooth);
    }

    // Lower teeth
    for (let i = 0; i < 13; i++) {
      const tooth = new THREE.Mesh(lowerToothGeometry, eyebrowMaterial);
      const xPos = -0.38 + i * 0.06;
      const normalizedPos = (i - 6) / 6;
      const curveAmount = Math.abs(normalizedPos) * 0.14;
      tooth.position.set(xPos, 0.15 + curveAmount, 0.84);
      tooth.rotation.z = normalizedPos * 0.15;
      lowerTeethGroup.add(tooth);
    }

    upperTeethGroup.position.y = -0.17;
    lowerTeethGroup.position.y = -0.79;

    upperTeethGroup.visible = false;
    lowerTeethGroup.visible = false;
    kingGroup.add(upperTeethGroup);
    kingGroup.add(lowerTeethGroup);

    // Large angular beard
    const beardLowerGeometry = new THREE.ConeGeometry(0.8, 1.8, 4);
    const beardLower = new THREE.Mesh(beardLowerGeometry, eyebrowMaterial);
    beardLower.position.set(0, -1.3, 0.65);
    beardLower.rotation.x = 0.1;
    kingGroup.add(beardLower);

    const beardSidesGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const beardLeft = new THREE.Mesh(beardSidesGeometry, eyebrowMaterial);
    beardLeft.position.set(-0.6, -0.5, 0.4);
    beardLeft.scale.set(0.8, 1.2, 0.9);
    kingGroup.add(beardLeft);

    const beardRight = new THREE.Mesh(beardSidesGeometry, eyebrowMaterial);
    beardRight.position.set(0.6, -0.5, 0.4);
    beardRight.scale.set(0.8, 1.2, 0.9);
    kingGroup.add(beardRight);

    // Exposed wrinkly brain
    const brainGroup = new THREE.Group();

    const brainCoreGeometry = new THREE.IcosahedronGeometry(1.15, 1);
    const brainCore = new THREE.Mesh(brainCoreGeometry, brainMaterial);
    brainCore.scale.set(1, 0.75, 1);
    brainGroup.add(brainCore);

    brainGroup.position.set(0, 1.85, 0);
    kingGroup.add(brainGroup);

    // Crown on top of brain
    const crownGroup = new THREE.Group();

    const bandGeometry = new THREE.CylinderGeometry(1.1, 1.15, 0.35, 8);
    const band = new THREE.Mesh(bandGeometry, crownBandMaterial);
    crownGroup.add(band);

    const pointGeometry = new THREE.ConeGeometry(0.25, 1, 4);
    const positions = [
      { x: 0, z: 1.1, scale: 1.3 },
      { x: -0.78, z: 0.78, scale: 0.9 },
      { x: 0.78, z: 0.78, scale: 0.9 },
      { x: -1.1, z: 0, scale: 0.7 },
      { x: 1.1, z: 0, scale: 0.7 },
      { x: -0.78, z: -0.78, scale: 0.6 },
      { x: 0.78, z: -0.78, scale: 0.6 },
      { x: 0, z: -1.1, scale: 0.5 },
    ];

    positions.forEach((pos) => {
      const point = new THREE.Mesh(pointGeometry, crownMaterial);
      point.position.set(pos.x, 0.5 + pos.scale * 0.3, pos.z);
      point.scale.y = pos.scale;
      crownGroup.add(point);
    });

    crownGroup.position.set(0, 2.5, 0);
    kingGroup.add(crownGroup);

    // Shoulder/collar elements
    const shoulderGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const leftShoulder = new THREE.Mesh(shoulderGeometry, crownBandMaterial);
    leftShoulder.position.set(-1.2, -1.8, 0);
    leftShoulder.rotation.z = 0.4;
    kingGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeometry, crownBandMaterial);
    rightShoulder.position.set(1.2, -1.8, 0);
    rightShoulder.rotation.z = -0.4;
    kingGroup.add(rightShoulder);

    scene.add(kingGroup);

    let animationId;

    // Initialize timer
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    function onMouseMove(event) {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    window.addEventListener('mousemove', onMouseMove);

    // Animation loop
    function animate() {
      animationId = requestAnimationFrame(animate);

      // Calculate elapsed time in seconds
      let elapsedTime;
      if (isPlaying) {
        elapsedTime = (Date.now() - startTimeRef.current) / 1000;
        pauseTimeRef.current = elapsedTime;

        // Check if main animation is complete (after last talking period ends at 109s)
        if (elapsedTime >= 109 && outroPhase === 0) {
          setOutroPhase(1);
          setOutroElapsed(0);
        }
      } else {
        elapsedTime = pauseTimeRef.current;
        // Adjust start time so when we resume, time continues from where we paused
        startTimeRef.current = Date.now() - pauseTimeRef.current * 1000;
      }
      setCurrentTime(elapsedTime);

      // Determine current state based on time
      const isTalking = isInPeriod(elapsedTime, talkingPeriods);
      const isAngry = isInPeriod(elapsedTime, angryPeriods);
      const isGrinning = isInPeriod(elapsedTime, grinPeriods);
      const talkingSpeed = getTalkingSpeed(elapsedTime);

      if (isPlaying) {
        // Use actual elapsed time for animations instead of frame-based increment
        const time = elapsedTime * 6;

        // Talking animation - only move jaw during talking periods with variable speed
        const speechPattern = Math.sin(time * talkingSpeed) * 0.5 + 0.5;
        const baseJawOpen = isTalking ? speechPattern * 0.4 : 0;

        // When grinning, keep mouth more open (minimum opening of 0.25) and increase range
        const jawOpen = isGrinning
          ? Math.max(baseJawOpen * 1.5, 0.25)
          : baseJawOpen;

        lowerJaw.rotation.x = jawOpen * 0.8;
        lowerJaw.position.y = -0.6 - jawOpen * 0.2;

        mouth.position.y = -0.3 - jawOpen * 0.1;
        mouth.scale.y = 1 + jawOpen * 0.6;

        // Eyebrow waggling
        const eyebrowTrigger = Math.sin(time * 0.35) > 0.3;
        const eyebrowPivot =
          jawOpen > 0.1 && eyebrowTrigger ? Math.sin(time * 0.9) * 0.04 : 0;

        // Smooth interpolation for angry eyebrows
        const targetAngry = isAngry ? 1 : 0;
        angryTransitionRef.current +=
          (targetAngry - angryTransitionRef.current) * 0.03;

        const leftBaseRotation = 0.1 + angryTransitionRef.current * 0.25;
        const rightBaseRotation = -0.1 + angryTransitionRef.current * -0.25;
        const eyebrowYOffset = angryTransitionRef.current * -0.15;

        leftEyebrow.rotation.z = leftBaseRotation - eyebrowPivot;
        rightEyebrow.rotation.z = rightBaseRotation + eyebrowPivot;
        leftEyebrow.position.y = 0.95 + eyebrowYOffset;
        rightEyebrow.position.y = 0.95 + eyebrowYOffset;

        const browRidgeAngle = -0.25 + angryTransitionRef.current * -0.3;
        leftBrowRidge.rotation.z = browRidgeAngle;
        rightBrowRidge.rotation.z = -browRidgeAngle;

        // Animate teeth smoothly
        const targetProgress = isGrinning ? 1 : 0;
        grinTransitionRef.current +=
          (targetProgress - grinTransitionRef.current) * 0.03;

        // Keep teeth visible throughout entire animation
        upperTeethGroup.visible = grinTransitionRef.current > 0.001;
        lowerTeethGroup.visible = grinTransitionRef.current > 0.001;

        upperTeethGroup.scale.y = grinTransitionRef.current;
        lowerTeethGroup.scale.y = grinTransitionRef.current * 1.5; // Make lower teeth 50% taller to extend into chin

        // Mustache follows smile - interpolate smoothly with grin progress
        const mustacheRotation = grinTransitionRef.current * 0.15;
        const mustacheZ = 0.7 + grinTransitionRef.current * 0.05;

        leftMustache.rotation.z = mustacheRotation;
        rightMustache.rotation.z = -mustacheRotation;
        leftMustache.position.z = mustacheZ;
        rightMustache.position.z = mustacheZ;

        // Beard follows jaw
        beardLower.rotation.x = 0.1 + jawOpen * 0.25;
        beardLeft.position.y = -0.5 - jawOpen * 0.08;
        beardRight.position.y = -0.5 - jawOpen * 0.08;

        leftMustache.position.y = -0.15 - jawOpen * 0.03;
        rightMustache.position.y = -0.15 - jawOpen * 0.03;

        // Angry breathing
        const breath = Math.sin(time * 0.5) * 0.015;
        kingGroup.scale.set(1 + breath, 1 + breath, 1 + breath);

        // Subtle head movement
        kingGroup.position.y = kingBaseY + Math.sin(time * 0.3) * 0.05;
        kingGroup.rotation.z = Math.cos(time * 0.25) * 0.02;

        // Brain pulse
        brainGroup.scale.set(
          1 + Math.sin(time * 0.7) * 0.02,
          1 + Math.sin(time * 0.7) * 0.02,
          1 + Math.sin(time * 0.7) * 0.02
        );

        // Crown sway
        crownGroup.rotation.y = Math.sin(time * 0.4) * 0.03;

        // Follow mouse
        const targetRotationY = mouseX * 0.25;
        const targetRotationX = -mouseY * 0.15;
        kingGroup.rotation.y += (targetRotationY - kingGroup.rotation.y) * 0.03;
        kingGroup.rotation.x += (targetRotationX - kingGroup.rotation.x) * 0.03;

        // Apply garble effect for outro phase 2
        if (garbleAmountRef.current > 0) {
          kingGroup.children.forEach((child) => {
            if (child.geometry && child.geometry.attributes.position) {
              const positions = child.geometry.attributes.position;
              const originalPositions = child.userData.originalPositions;

              // Store original positions if not already stored
              if (!originalPositions) {
                child.userData.originalPositions = new Float32Array(
                  positions.array
                );
              }

              // Apply random displacement
              for (let i = 0; i < positions.count; i++) {
                const original = child.userData.originalPositions;
                positions.array[i * 3] =
                  original[i * 3] +
                  (Math.random() - 0.5) * 0.3 * garbleAmountRef.current;
                positions.array[i * 3 + 1] =
                  original[i * 3 + 1] +
                  (Math.random() - 0.5) * 0.3 * garbleAmountRef.current;
                positions.array[i * 3 + 2] =
                  original[i * 3 + 2] +
                  (Math.random() - 0.5) * 0.3 * garbleAmountRef.current;
              }
              positions.needsUpdate = true;
            }
          });
        }
      }

      // Fast zoom animations (outside isPlaying check so it updates even when paused)
      let targetZoom = 10.5; // Default intermediate zoom
      if (elapsedTime >= 64 && elapsedTime < 66) {
        // Fast zoom IN from 10.5 to 6.5 over 2 seconds (more dramatic)
        const zoomProgress = (elapsedTime - 64) / 2;
        targetZoom = 10.5 - 4 * zoomProgress; // 10.5 to 6.5
      } else if (elapsedTime >= 66 && elapsedTime < 77) {
        targetZoom = 6.5; // Stay zoomed in
      } else if (elapsedTime >= 77 && elapsedTime < 78) {
        // Fast zoom OUT from 6.5 to 10.5 over 1 second
        const zoomProgress = (elapsedTime - 77) / 1;
        targetZoom = 6.5 + 4 * zoomProgress; // 6.5 to 10.5
      }
      camera.position.z += (targetZoom - camera.position.z) * 0.1;

      renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    function handleResize() {
      if (!mountRef.current) return;
      camera.aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationId);
      if (
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isPlaying, angryEyebrows, showGrin, introPhase, outroPhase]);

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden">
      {/* Intro Sequence */}
      {introPhase < 3 && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          {/* All images centered and stacked - only fade in, don't fade out */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Start Image - stays visible */}
            <img
              src="https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/Patryon_start.png"
              alt="Intro Start"
              className="absolute max-w-full max-h-full object-contain"
              style={{
                opacity: 1,
                transition: 'opacity 0.1s linear',
              }}
            />
            {/* Middle Image - fades in on top at 2s */}
            <img
              src="https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/Patryon_middle.png"
              alt="Intro Middle"
              className="absolute max-w-full max-h-full object-contain"
              style={{
                opacity: introElapsed < 2 ? 0 : Math.min(1, introElapsed - 2),
                transition: 'opacity 0.1s linear',
              }}
            />
            {/* End Image - fades in on top at 4s */}
            <img
              src="https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/Patryon_end.png"
              alt="Intro End"
              className="absolute max-w-full max-h-full object-contain"
              style={{
                opacity: introElapsed < 4 ? 0 : Math.min(1, introElapsed - 4),
                transition: 'opacity 0.1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Main Animation - show after intro, during normal play and garbled phase */}
      {introPhase >= 3 && (outroPhase === 0 || outroPhase === 2) && (
        <>
          {/* SVG Background */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url("https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/MottoBG.svg")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {/*<div className="absolute top-4 left-4 z-10 space-y-2">
            <div className="bg-gray-900 bg-opacity-80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-yellow-700">
              <span className="text-lg font-semibold">
                Time: {currentTime.toFixed(1)}s
              </span>
            </div>
            <div className="bg-gray-900 bg-opacity-80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-yellow-700 flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-lg font-semibold hover:text-yellow-400 transition-colors"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => {
                  setIntroPhase(0);
                  setIntroElapsed(0);
                  setOutroPhase(0);
                  setOutroElapsed(0);
                  garbleAmountRef.current = 0;
                  outroStartedRef.current = false;
                  introStartTimeRef.current = Date.now();
                  startTimeRef.current = null;
                  setCurrentTime(0);
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current
                      .play()
                      .catch((err) => console.log('Audio play failed:', err));
                  }
                }}
                className="text-lg font-semibold hover:text-yellow-400 transition-colors"
              >
                🔄 Reset
              </button>
              <button
                onClick={() => {
                  // Skip to time = 100s by adjusting startTimeRef
                  startTimeRef.current = Date.now() - 100 * 1000;
                  pauseTimeRef.current = 100;
                }}
                className="text-lg font-semibold hover:text-yellow-400 transition-colors"
              >
                ⏩ Skip to 100s
              </button>
            </div>
          </div>
              */}
          <div ref={mountRef} className="w-full h-full absolute inset-0" />
        </>
      )}

      {/* Outro Sequence */}
      {outroPhase === 1 && (
        <div className="absolute inset-0 z-50">
          <TVStatic colorTint="white" />
        </div>
      )}

      {outroPhase === 2 && (
        /* Garbled animation - show main animation with garble effect */
        <></>
      )}

      {outroPhase === 3 && (
        <div className="absolute inset-0 z-50">
          {/* Green static background */}
          <TVStatic colorTint="green" />

          {/* Anarchy Flower logo fading in over static (starts fading at 1.5s, fully visible by 3s) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: Math.min(1, (outroElapsed - 1.5) / 1.5), // Fade in over 1.5 seconds
              transition: 'opacity 0.1s linear',
            }}
          >
            <img
              src="https://raw.githubusercontent.com/nvanschmidt/nvanschmidt.github.io/refs/heads/main/FloralAnarchy.png"
              alt="Anarchy Flower"
              style={{ width: '1000px', height: 'auto' }}
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Fade transition overlay - appears during intro to main transition */}
      {fadeOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{
            opacity: fadeOpacity,
            zIndex: 100,
          }}
        />
      )}
    </div>
  );
}
