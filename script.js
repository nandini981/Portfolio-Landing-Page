// Typing Effect
const typingText = document.getElementById('typingText');
const phrases = [
    'Web Developer',
    'Project Manager',
    'UI/UX Enthusiast',
    'E-Commerce Specialist',
    'Team Leader'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeEffect() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
        typingText.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
    } else {
        typingText.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at end
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typingSpeed = 500; // Pause before next phrase
    }

    setTimeout(typeEffect, typingSpeed);
}

// Start typing effect when page loads
window.addEventListener('load', () => {
    setTimeout(typeEffect, 1000);
});

// Kinetic Waves Animation
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a); // Dark background to match theme
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

const canvasContainer = document.getElementById('canvas-container');
const width = canvasContainer.offsetWidth;
const height = canvasContainer.offsetHeight;

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

if (canvasContainer) {
    canvasContainer.appendChild(renderer.domElement);
}

// Configuration
const CONFIG = {
    gridSize: 40,
    spacing: 0.9,
    boxSize: 0.6,
    waveSpeed: 1.5,
    waveHeight: 2.5,
    mouseRadius: 10,
    mouseStrength: 4,
    chaos: 0 // New property for explosion chaos
};

// Create InstancedMesh
const geometry = new THREE.BoxGeometry(CONFIG.boxSize, CONFIG.boxSize, CONFIG.boxSize);
// Shiny, metallic material for "glowier" look
const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White base for instance colors
    roughness: 0.2,  // Slightly rougher to catch more light
    metalness: 0.6,  // Less metallic so it shows its own color more
    emissive: 0x111111, // Slight self-illumination
    emissiveIntensity: 0.2
});

const count = CONFIG.gridSize * CONFIG.gridSize;
const mesh = new THREE.InstancedMesh(geometry, material, count);
mesh.castShadow = true;
mesh.receiveShadow = true;

// Initialize Instance Colors - Lighter base color
const baseColor = new THREE.Color(0x444444);
for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, baseColor);
}
mesh.instanceColor.needsUpdate = true;

scene.add(mesh); // Add mesh to scene

// Lighting - High intensity for shine
const ambientLight = new THREE.AmbientLight(0x404040, 4); // Stronger ambient light
scene.add(ambientLight);

// Mouse Light for dynamic reflections
const mouseLight = new THREE.PointLight(0xffffff, 2, 15);
scene.add(mouseLight);

// Main directional light
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Colored lights - High intensity (Matches theme: #667eea, #764ba2, #00f2fe)
const pointLight1 = new THREE.PointLight(0x667eea, 5, 100);
pointLight1.position.set(0, 10, 0);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x764ba2, 5, 100);
pointLight2.position.set(20, 10, 20);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0x00f2fe, 5, 100);
pointLight3.position.set(-20, 10, -20);
scene.add(pointLight3);

// State
const dummy = new THREE.Object3D();
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let mousePos3D = new THREE.Vector3();
let isExploding = false;
let cameraAngle = 0; // Horizontal rotation
let cameraPhi = Math.PI / 4; // Start higher up
let currentGlowColor = new THREE.Color(0x00f2fe); // Default glow (Cyan)

// Initialize Grid Positions & Random Offsets
const initialPositions = [];
const randomOffsets = [];
for (let i = 0; i < CONFIG.gridSize; i++) {
    for (let j = 0; j < CONFIG.gridSize; j++) {
        const x = (i - CONFIG.gridSize / 2) * CONFIG.spacing;
        const z = (j - CONFIG.gridSize / 2) * CONFIG.spacing;
        initialPositions.push({ x, y: 0, z, ox: x, oz: z });

        // Pre-calculate random rotation axes for explosion
        randomOffsets.push({
            rx: (Math.random() - 0.5) * 2,
            ry: (Math.random() - 0.5) * 2,
            rz: (Math.random() - 0.5) * 2
        });
    }
}

// Interaction
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let startDragX = 0;
let startDragY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
    startDragX = e.clientX;
    startDragY = e.clientY;
});

window.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Handle Rotation
    if (isDragging) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;

        cameraAngle -= deltaX * 0.005;
        cameraPhi -= deltaY * 0.005;

        // Expanded range: Allow going lower (closer to horizon/floor) and higher (top down)
        // 0.1 (Top) to Math.PI / 1.8 (Low angle)
        cameraPhi = Math.max(0.1, Math.min(Math.PI / 1.8, cameraPhi));

        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }

    // Check bounds for ripple inside canvas
    if (mouse.x < -1 || mouse.x > 1 || mouse.y < -1 || mouse.y > 1) return;

    // Handle Ripple & Glow
    raycaster.setFromCamera(mouse, camera);

    // Ripple Physics (Plane intersection)
    const target = new THREE.Vector3();
    const intersection = raycaster.ray.intersectPlane(plane, target);

    if (intersection) {
        // Direct update for instant response, or very fast tween
        gsap.to(mousePos3D, {
            x: target.x,
            z: target.z,
            duration: 0.1, // Much faster for better accuracy
            ease: "power2.out"
        });

        // Move mouse light
        mouseLight.position.set(target.x, 5, target.z);
    }
});

window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    // Check if it was a click (minimal movement < 5px)
    const moveDist = Math.sqrt(
        Math.pow(e.clientX - startDragX, 2) +
        Math.pow(e.clientY - startDragY, 2)
    );

    if (moveDist < 5) {
        triggerExplosion();
    }
});

function triggerExplosion() {
    if (isExploding) return;
    isExploding = true;

    // More dramatic explosion
    const tl = gsap.timeline({ onComplete: () => { isExploding = false; } });

    tl.to(CONFIG, {
        spacing: 4,
        chaos: 1, // Increase chaos
        duration: 0.4,
        ease: "power4.out"
    })
        .to(CONFIG, {
            spacing: 0.9,
            chaos: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.3)"
        });

    // Flash effect
    gsap.to(pointLight1, { intensity: 10, duration: 0.1, yoyo: true, repeat: 1 });
    gsap.to(pointLight2, { intensity: 10, duration: 0.1, yoyo: true, repeat: 1 });
    gsap.to(pointLight3, { intensity: 10, duration: 0.1, yoyo: true, repeat: 1 });
}

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    let i = 0;
    for (let x = 0; x < CONFIG.gridSize; x++) {
        for (let z = 0; z < CONFIG.gridSize; z++) {
            const pos = initialPositions[i];
            const offset = randomOffsets[i];

            const dx = pos.ox - mousePos3D.x;
            const dz = pos.oz - mousePos3D.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            let y = Math.sin(dist * 0.4 - time * CONFIG.waveSpeed) * 0.8;

            if (dist < CONFIG.mouseRadius) {
                const force = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseStrength;
                y += Math.sin(dist * 1.5 - time * 4) * force;
            }

            const currentSpacing = CONFIG.spacing;
            const finalX = (x - CONFIG.gridSize / 2) * currentSpacing;
            const finalZ = (z - CONFIG.gridSize / 2) * currentSpacing;

            dummy.position.set(finalX, y, finalZ);

            // Rotation: Base wave rotation + Explosion Chaos
            dummy.rotation.x = (y * 0.1) + (offset.rx * CONFIG.chaos * 2);
            dummy.rotation.y = (offset.ry * CONFIG.chaos * 2);
            dummy.rotation.z = (y * 0.1) + (offset.rz * CONFIG.chaos * 2);

            const scale = 1 + y * 0.2;
            dummy.scale.set(scale, scale, scale);

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            // Proximity Glow
            if (dist < CONFIG.mouseRadius * 0.8) {
                const intensity = 1 - (dist / (CONFIG.mouseRadius * 0.8));
                const r = THREE.MathUtils.lerp(baseColor.r, currentGlowColor.r, intensity);
                const g = THREE.MathUtils.lerp(baseColor.g, currentGlowColor.g, intensity);
                const b = THREE.MathUtils.lerp(baseColor.b, currentGlowColor.b, intensity);
                mesh.setColorAt(i, new THREE.Color(r, g, b));
            } else {
                mesh.setColorAt(i, baseColor);
            }

            i++;
        }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;

    // Camera rotation controlled by mouse drag
    const radius = 45;

    // Spherical coordinates for full orbit
    const targetX = radius * Math.sin(cameraPhi) * Math.sin(cameraAngle);
    const targetY = radius * Math.cos(cameraPhi);
    const targetZ = radius * Math.sin(cameraPhi) * Math.cos(cameraAngle);

    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.y += (targetY - camera.position.y) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

animate();

// Resize canvas on window resize
window.addEventListener('resize', () => {
    const width = canvasContainer.offsetWidth;
    const height = canvasContainer.offsetHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Scroll Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Animate skill bars when they come into view
            if (entry.target.classList.contains('skill-category')) {
                const skillItems = entry.target.querySelectorAll('.skill-item');
                skillItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('animate');
                    }, index * 100);
                });
            }
        }
    });
}, observerOptions);

// Observe all fade-in elements
const fadeElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
fadeElements.forEach(el => observer.observe(el));

// Observe skill categories
const skillCategories = document.querySelectorAll('.skill-category');
skillCategories.forEach(category => observer.observe(category));

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = document.querySelector('nav').offsetHeight;
            const targetPosition = target.offsetTop - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            if (window.innerWidth <= 968) {
                navLinks.classList.remove('active');
                mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        }
    });
});

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');

    // Toggle icon
    if (navLinks.classList.contains('active')) {
        mobileMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
    } else {
        mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
});

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-content');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - (scrolled / 700);
    }
});

// Add hover effect to timeline items
const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach(item => {
    item.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.02)';
    });

    item.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
    });
});

// Add animation to cards on hover
const cards = document.querySelectorAll('.glass-card, .education-card, .cert-card');
cards.forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transition = 'all 0.3s ease';
    });
});

// Preload animations for better performance
document.addEventListener('DOMContentLoaded', () => {
    // Add initial fade-in to hero elements
    setTimeout(() => {
        document.querySelectorAll('.hero .fade-in').forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('visible');
            }, index * 200);
        });
    }, 300);
});

// Add active state to navigation based on scroll position
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add cursor trail effect (optional - can be removed if too much)
const coords = { x: 0, y: 0 };
const circles = document.querySelectorAll('.cursor-circle');

if (circles.length > 0) {
    circles.forEach(function (circle) {
        circle.x = 0;
        circle.y = 0;
    });

    window.addEventListener('mousemove', function (e) {
        coords.x = e.clientX;
        coords.y = e.clientY;
    });

    function animateCursor() {
        let x = coords.x;
        let y = coords.y;

        circles.forEach(function (circle, index) {
            circle.style.left = x - 12 + 'px';
            circle.style.top = y - 12 + 'px';

            circle.style.scale = (circles.length - index) / circles.length;

            circle.x = x;
            circle.y = y;

            const nextCircle = circles[index + 1] || circles[0];
            x += (nextCircle.x - x) * 0.3;
            y += (nextCircle.y - y) * 0.3;
        });

        requestAnimationFrame(animateCursor);
    }

    animateCursor();
}

// Performance optimization: Reduce grid size on mobile (Implementation dependent)
if (window.innerWidth < 768) {
    // CONFIG.gridSize = 25; // Example if config was modifiable after init
}

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

console.log('Portfolio loaded successfully! 🚀');
console.log('Designed and developed by Nandini Saini');
