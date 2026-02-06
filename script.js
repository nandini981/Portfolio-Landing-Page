window.onerror = function (msg, url, line, col, error) {
    console.error("GLOBAL ERROR: ", msg, " at ", url, " line: ", line);
    const errDiv = document.createElement("div");
    errDiv.style.position = "fixed";
    errDiv.style.top = "0";
    errDiv.style.left = "0";
    errDiv.style.background = "red";
    errDiv.style.color = "white";
    errDiv.style.zIndex = "100000";
    errDiv.innerText = "JS Error: " + msg + " at " + line;
    document.body.appendChild(errDiv);
    return false;
};

import * as THREE from "https://cdn.skypack.dev/three@0.160.0";
import { Pane } from "https://cdn.skypack.dev/tweakpane@4.0.4";
import { EffectComposer } from "https://cdn.skypack.dev/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.skypack.dev/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.skypack.dev/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://cdn.skypack.dev/three@0.160.0/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "https://cdn.skypack.dev/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js";

// Preloader management
class PreloaderManager {
    constructor() {
        this.preloader = document.getElementById("preloader");
        this.mainContent = document.getElementById("main-content");
        this.portfolioRoot = document.getElementById("portfolio-root");
        this.progressBar = document.querySelector(".progress-bar");
        this.loadingSteps = 0;
        this.totalSteps = 5;
        this.isComplete = false;
    }

    updateProgress(step) {
        this.loadingSteps = Math.min(step, this.totalSteps);
        const percentage = (this.loadingSteps / this.totalSteps) * 100;
        if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
    }

    complete(canvas) {
        if (this.isComplete) return;
        this.isComplete = true;

        this.updateProgress(this.totalSteps);

        setTimeout(() => {
            // Fade out preloader
            if (this.preloader) this.preloader.classList.add("fade-out");

            // Fade in content and canvas
            if (this.mainContent) this.mainContent.classList.add("fade-in");
            if (canvas) canvas.classList.add("fade-in");

            // Reveal portfolio
            setTimeout(() => {
                if (this.portfolioRoot) {
                    this.portfolioRoot.style.display = "block";
                    // Set opacity for smooth appearance if original site uses it
                    this.portfolioRoot.style.opacity = "1";
                }
                document.body.classList.add("allow-scroll");

                // Trigger resize to fix any layout issues in original site
                window.dispatchEvent(new Event('resize'));

                // Final cleanup
                setTimeout(() => {
                    if (this.preloader) this.preloader.style.display = "none";
                }, 1000);
            }, 2500);
        }, 1500);
    }
}

const preloader = new PreloaderManager();
document.body.style.transform = "translateZ(0)";
preloader.updateProgress(1);

// Scene Setup
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;
preloader.updateProgress(2);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "2";
renderer.domElement.style.pointerEvents = "none";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3, 1.25, 0.0
);
composer.addPass(bloomPass);
preloader.updateProgress(3);

const analogDecayShader = {
    uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uAnalogGrain: { value: 0.4 },
        uAnalogBleeding: { value: 1.0 },
        uAnalogVSync: { value: 1.0 },
        uAnalogScanlines: { value: 1.0 },
        uAnalogVignette: { value: 1.0 },
        uAnalogJitter: { value: 0.4 },
        uAnalogIntensity: { value: 0.6 },
        uLimboMode: { value: 0.0 }
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uAnalogJitter;
        uniform float uAnalogIntensity;
        uniform float uLimboMode;
        varying vec2 vUv;
        
        float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
        void main() {
            vec2 uv = vUv;
            float time = uTime * 1.8;
            vec2 jitteredUV = uv;
            if (uAnalogJitter > 0.01) jitteredUV.x += (random(vec2(floor(time * 60.0))) - 0.5) * 0.003 * uAnalogJitter * uAnalogIntensity;
            vec4 color = texture2D(tDiffuse, jitteredUV);
            if (uLimboMode > 0.5) {
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                color.rgb = vec3(gray);
            }
            gl_FragColor = color;
        }
    `
};

const analogDecayPass = new ShaderPass(analogDecayShader);
composer.addPass(analogDecayPass);
composer.addPass(new OutputPass());

const params = {
    bodyColor: 0x0f2027,
    glowColor: 0xff4500,
    emissiveIntensity: 5.8,
    followSpeed: 0.075,
    wobbleAmount: 0.35,
    floatSpeed: 1.6,
    limboMode: false
};

const ghostGroup = new THREE.Group();
scene.add(ghostGroup);

const ghostGeometry = new THREE.SphereGeometry(2, 40, 40);
const ghostMaterial = new THREE.MeshStandardMaterial({
    color: params.bodyColor,
    transparent: true,
    opacity: 0.88,
    emissive: params.glowColor,
    emissiveIntensity: params.emissiveIntensity,
});

const ghostBody = new THREE.Mesh(ghostGeometry, ghostMaterial);
ghostGroup.add(ghostBody);
preloader.updateProgress(4);

const mouse = new THREE.Vector2();
window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function animate(t) {
    requestAnimationFrame(animate);
    const time = t * 0.001;
    analogDecayPass.uniforms.uTime.value = time;
    ghostGroup.position.x += (mouse.x * 12 - ghostGroup.position.x) * params.followSpeed;
    ghostGroup.position.y += (mouse.y * 8 - ghostGroup.position.y) * params.followSpeed;
    ghostGroup.position.y += Math.sin(time * params.floatSpeed) * 0.1;
    ghostBody.rotation.z = Math.sin(time) * 0.1 * params.wobbleAmount;
    composer.render();
}

preloader.updateProgress(5);
setTimeout(() => preloader.complete(renderer.domElement), 1000);
animate(0);

// Portfolio original logic (Intersection Observer for reveal)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in, .slide-in').forEach(el => observer.observe(el));
