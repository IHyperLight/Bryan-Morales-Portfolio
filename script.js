// Portfolio Interactive Functionality - Performance Optimized

// Performance monitoring
const perfMonitor = (() => {
    if (typeof performance === "undefined" || !console.time)
        return { mark: () => {}, measure: () => {} };

    return {
        mark(name) {
            if (performance.mark) performance.mark(name);
        },

        measure(name, startMark) {
            if (
                performance.measure &&
                performance.getEntriesByName(startMark).length > 0
            ) {
                try {
                    performance.measure(name, startMark);
                } catch (e) {
                    // Silent fail in production
                }
            }
        },
    };
})();

// Pre-create commonly used elements
const performanceCache = {
    body: null,
    viewport: null,
    projectItems: null,
    rafIds: new Set(),
    timers: new Set(),
};

// Utility for optimized will-change management
const willChangeManager = {
    activeElements: new WeakSet(),

    set(element, property = "transform") {
        if (!element) return;

        const capabilities = hardwareCapabilities.getCapabilities();

        // Ultra-conservative approach for ultra-low end devices
        if (capabilities.performanceLevel === "ultra-low") {
            // Never use will-change on ultra-low end to save memory
            return;
        }

        // Conservative approach for low-end devices
        if (
            capabilities.performanceLevel &&
            capabilities.performanceLevel.includes("low")
        ) {
            // Only use will-change for critical animations and for short durations
            if (property !== "transform" && property !== "opacity") {
                return; // Skip non-essential properties
            }

            // Limit concurrent will-change elements
            if (this.activeElements.size && this.activeElements.size >= 2) {
                return; // Max 2 elements with will-change on low-end
            }
        }

        // Intelligent will-change management for medium devices
        if (capabilities.performanceLevel === "medium") {
            // Medium devices: Strategic will-change usage
            if (property !== "transform" && property !== "opacity" && property !== "filter") {
                return; // Only allow essential properties on medium devices
            }
            
            // Limit concurrent will-change elements for medium devices (max 4)
            if (this.activeElements.size && this.activeElements.size >= 4) {
                return; // Max 4 elements with will-change on medium
            }
            
            // Prioritize transform and opacity over filter
            if (property === "filter" && this.activeElements.size >= 2) {
                return; // Avoid filter will-change when already 2+ elements active
            }
        }

        // Only use will-change on capable devices to reduce memory pressure
        if (capabilities.performanceLevel !== "low" && capabilities.hasGPU) {
            element.style.willChange = property;
            this.activeElements.add(element);
        }
    },

    clear(element, delay = 100) {
        if (!element || !this.activeElements.has(element)) return;

        const capabilities = hardwareCapabilities.getCapabilities();

        // Clear immediately on low-end devices to free memory faster
        // Medium devices get moderate delay for balance between performance and UX
        let clearDelay = delay;
        if (capabilities.performanceLevel && capabilities.performanceLevel.includes("low")) {
            clearDelay = 0; // Immediate for low-end
        } else if (capabilities.performanceLevel === "medium") {
            clearDelay = Math.min(delay, 50); // Max 50ms delay for medium devices
        }

        const timerId = setTimeout(() => {
            if (element.style) {
                element.style.willChange = "auto";
                this.activeElements.delete(element);
            }
            performanceCache.timers.delete(timerId);
        }, clearDelay);
        performanceCache.timers.add(timerId);
    },

    clearAll() {
        // Enhanced cleanup function for low-end devices
        this.activeElements = new WeakSet();

        // Force clear all will-change properties on low-end devices
        // Medium devices get selective cleanup - only clear non-essential properties
        const capabilities = hardwareCapabilities.getCapabilities();
        if (
            capabilities.performanceLevel &&
            capabilities.performanceLevel.includes("low")
        ) {
            const allElements = document.querySelectorAll(
                '[style*="will-change"]'
            );
            allElements.forEach((el) => {
                if (el.style.willChange && el.style.willChange !== "auto") {
                    el.style.willChange = "auto";
                }
            });
        } else if (capabilities.performanceLevel === "medium") {
            // Medium devices: Only clear non-essential will-change properties
            const allElements = document.querySelectorAll(
                '[style*="will-change"]'
            );
            allElements.forEach((el) => {
                if (el.style.willChange && 
                    el.style.willChange !== "auto" && 
                    el.style.willChange !== "transform" && 
                    el.style.willChange !== "opacity") {
                    // Clear non-essential properties like filter, but keep transform/opacity
                    el.style.willChange = "auto";
                }
            });
        }
    },
};

// Hardware Capability Detection and Progressive Enhancement System
const hardwareCapabilities = (() => {
    let capabilities = {
        hasGPU: true,
        hasBackdropFilter: true,
        hasTransform3D: true,
        hardwareConcurrency: navigator.hardwareConcurrency || 1,
        isLowEndDevice: false,
        performanceLevel: "high", // 'high', 'medium', 'low'
    };

    // Test GPU acceleration capabilities
    const testGPUSupport = () => {
        try {
            // Test for 3D transform support
            const testEl = document.createElement("div");
            testEl.style.transform = "translate3d(0,0,0)";
            capabilities.hasTransform3D = testEl.style.transform !== "";

            // Test for backdrop-filter support
            capabilities.hasBackdropFilter =
                CSS.supports("backdrop-filter", "blur(1px)") ||
                CSS.supports("-webkit-backdrop-filter", "blur(1px)");

            // Enhanced multi-factor low-end device detection
            const getDeviceMemory = () =>
                navigator.deviceMemory ||
                (navigator.storage && navigator.storage.estimate ? 2 : 1);

            const getConnectionSpeed = () => {
                if ("connection" in navigator) {
                    const conn = navigator.connection;
                    return {
                        effectiveType: conn.effectiveType || "unknown",
                        downlink: conn.downlink || 0,
                        saveData: conn.saveData || false,
                    };
                }
                return {
                    effectiveType: "unknown",
                    downlink: 0,
                    saveData: false,
                };
            };

            const deviceMemory = getDeviceMemory();
            const connection = getConnectionSpeed();

            // Multi-factor ultra-low-end device detection with granular scoring
            const ultraLowEndFactors = [
                capabilities.hardwareConcurrency < 2,
                deviceMemory < 1.5,
                /Android.*[2-4]\.|iPhone.*OS [4-8]_/.test(navigator.userAgent),
                connection.effectiveType === "slow-2g",
                screen.width <= 320 && deviceMemory < 2,
                navigator.maxTouchPoints > 0 && deviceMemory < 1,
            ];

            const lowEndFactors = [
                capabilities.hardwareConcurrency < 4,
                deviceMemory < 3,
                /Android.*4\.|iPhone.*OS [5-9]_|Windows Phone/.test(
                    navigator.userAgent
                ),
                connection.effectiveType === "2g",
                connection.saveData === true,
                screen.width <= 480 && deviceMemory < 2,
                navigator.maxTouchPoints > 0 && deviceMemory < 3,
            ];

            const ultraLowScore = ultraLowEndFactors.filter(Boolean).length;
            const lowScore = lowEndFactors.filter(Boolean).length;

            // Granular performance level classification
            if (ultraLowScore >= 2) {
                capabilities.isLowEndDevice = true;
                capabilities.performanceLevel = "ultra-low";
                capabilities.hasGPU = false;
                capabilities.lowEndSeverity = "ultra";
            } else if (lowScore >= 3) {
                capabilities.isLowEndDevice = true;
                capabilities.performanceLevel = "low";
                capabilities.hasGPU = false;
                capabilities.lowEndSeverity = "severe";
            } else if (lowScore >= 1 || ultraLowScore >= 1) {
                capabilities.isLowEndDevice = true;
                capabilities.performanceLevel = "low-medium";
                capabilities.hasGPU = capabilities.hasTransform3D;
                capabilities.lowEndSeverity = "moderate";
            } else {
                capabilities.isLowEndDevice = false;
                capabilities.lowEndSeverity = "none";

                // High-end classification
                if (
                    capabilities.hardwareConcurrency >= 12 &&
                    deviceMemory >= 16 &&
                    connection.downlink > 10
                ) {
                    capabilities.performanceLevel = "ultra-high";
                } else if (
                    capabilities.hardwareConcurrency >= 8 &&
                    capabilities.hasBackdropFilter &&
                    deviceMemory >= 8
                ) {
                    capabilities.performanceLevel = "high";
                } else {
                    capabilities.performanceLevel = "medium";
                }
            }

            // Store additional metrics for fine-tuning
            capabilities.deviceMetrics = {
                memory: deviceMemory,
                cores: capabilities.hardwareConcurrency,
                connection: connection.effectiveType,
                saveData: connection.saveData,
                downlink: connection.downlink,
                ultraLowScore,
                lowScore,
            };
        } catch (e) {
            capabilities.hasGPU = false;
            capabilities.hasTransform3D = false;
            capabilities.performanceLevel = "low";
        }

        return capabilities;
    };

    // Apply performance optimizations based on capabilities
    const applyOptimizations = () => {
        const root = document.documentElement;

        // GPU and transform optimizations
        if (
            !capabilities.hasGPU ||
            capabilities.performanceLevel.includes("low")
        ) {
            // Apply CPU-optimized styles
            root.style.setProperty("--gpu-layer", "scale(1)");
            root.style.setProperty("--gpu-transform3d", "translate(0, 0)");
            root.classList.add("cpu-optimized");
        }

        // Backdrop filter optimizations
        if (!capabilities.hasBackdropFilter) {
            root.classList.add("no-backdrop-filter");
        }

        // Ultra-granular low-end device classifications
        if (capabilities.isLowEndDevice) {
            root.classList.add("low-end-device");

            // Apply severity-specific optimizations
            if (capabilities.performanceLevel === "ultra-low") {
                root.classList.add("performance-ultra-low");
                // Disable all non-essential visual effects
                root.style.setProperty("--transition-fast", "none");
                root.style.setProperty("--transition-medium", "none");
                root.style.setProperty("--transition-smooth", "none");
                // Reduce animation complexity
                root.style.setProperty("--enable-animations", "0");
                root.style.setProperty("--raf-throttle", "50"); // 20fps
            } else if (capabilities.performanceLevel === "low") {
                root.classList.add("performance-low");
                // Reduce transition durations significantly
                root.style.setProperty("--transition-fast", "50ms");
                root.style.setProperty("--transition-medium", "100ms");
                root.style.setProperty("--transition-smooth", "150ms");
                root.style.setProperty("--raf-throttle", "33"); // 30fps
            } else if (capabilities.performanceLevel === "low-medium") {
                root.classList.add("performance-low-medium");
                // Moderate reductions
                root.style.setProperty("--transition-fast", "100ms");
                root.style.setProperty("--transition-medium", "200ms");
                root.style.setProperty("--transition-smooth", "300ms");
                root.style.setProperty("--raf-throttle", "22"); // 45fps
            }
        } else if (capabilities.performanceLevel === "medium") {
            // Medium devices: Balanced optimizations for optimal performance
            root.classList.add("performance-medium");
            // Slightly reduced transition durations for better responsiveness
            root.style.setProperty("--transition-fast", "120ms");
            root.style.setProperty("--transition-medium", "250ms");
            root.style.setProperty("--transition-smooth", "350ms");
            root.style.setProperty("--raf-throttle", "18"); // 55fps optimized
            
            // Enable selective optimizations for medium devices
            root.style.setProperty("--enable-will-change", "selective");
            root.style.setProperty("--enable-containment", "1");
            root.style.setProperty("--backdrop-filter-quality", "medium");
        }

        // Set performance level class for all levels
        root.classList.add(`performance-${capabilities.performanceLevel}`);

        // Memory pressure optimizations
        if (capabilities.performanceLevel === "ultra-low") {
            // Disable intersection observers for non-critical elements
            root.style.setProperty("--enable-intersection-observers", "0");
            // Disable will-change usage entirely
            root.style.setProperty("--enable-will-change", "0");
        } else if (capabilities.performanceLevel.includes("low")) {
            // Reduce will-change usage
            root.style.setProperty("--enable-will-change", "limited");
        } else if (capabilities.performanceLevel === "medium") {
            // Medium devices: Intelligent resource management
            root.style.setProperty("--enable-intersection-observers", "throttled");
            root.style.setProperty("--intersection-threshold", "0.25");
            root.style.setProperty("--intersection-margin", "50px");
        }
    };

    return {
        init() {
            testGPUSupport();
            applyOptimizations();
            return capabilities;
        },
        getCapabilities: () => capabilities,
        isGPUEnabled: () => capabilities.hasGPU,
        getPerformanceLevel: () => capabilities.performanceLevel,
    };
})();

// Viewport Visibility Manager for Performance Optimization
const viewportManager = (() => {
    const visibleCarousels = new Set();
    const carouselObservers = new Map();

    // Throttled intersection handler for better performance
    let updateTimeout = null;
    const pendingUpdates = new Set();

    const processPendingUpdates = () => {
        updateTimeout = null;
        for (const update of pendingUpdates) {
            update();
        }
        pendingUpdates.clear();
    };

    // Intersection Observer for carousel visibility
    const createCarouselObserver = () => {
        const performanceLevel = hardwareCapabilities.getPerformanceLevel();
        
        // Get optimal settings based on device performance
        const observerConfig = getCarouselObserverConfig(performanceLevel);
        
        return new IntersectionObserver(
            (entries) => {
                // Use device-specific throttling for intersection callbacks
                processCarouselIntersections(entries, performanceLevel);
            },
            observerConfig
        );
    };

    const getCarouselObserverConfig = (performanceLevel) => {
        switch(performanceLevel) {
            case 'ultra-low':
                return {
                    threshold: 0.5, // Higher threshold to reduce callbacks
                    rootMargin: "200px 0px", // Large margin for early loading
                };
            case 'low':
                return {
                    threshold: 0.3,
                    rootMargin: "150px 0px",
                };
            case 'low-medium':
                return {
                    threshold: 0.2,
                    rootMargin: "120px 0px",
                };
            case 'medium':
                return {
                    threshold: [0.1, 0.25, 0.5], // Multiple thresholds for balanced control
                    rootMargin: "80px 20px", // Optimized margin for medium devices
                };
            case 'high':
                return {
                    threshold: [0.05, 0.15, 0.35, 0.65],
                    rootMargin: "50px 0px",
                };
            case 'ultra-high':
                return {
                    threshold: [0.0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9],
                    rootMargin: "25px 0px",
                };
            default:
                return {
                    threshold: 0.15,
                    rootMargin: "100px 0px",
                };
        }
    };

    const processCarouselIntersections = (entries, performanceLevel) => {
        if (performanceLevel === 'medium') {
            // Medium devices: Intelligent throttling with RAF scheduling
            entries.forEach((entry) => {
                const projectContainer = entry.target;
                const carouselState = projectContainer._carouselState;

                if (!carouselState) return;

                // Use RAF scheduler for smooth medium device performance
                const update = () => {
                    if (entry.isIntersecting) {
                        // Apply medium-specific visibility optimizations
                        applyMediumCarouselVisibility(projectContainer, carouselState, true);
                    } else {
                        applyMediumCarouselVisibility(projectContainer, carouselState, false);
                    }
                };

                rafScheduler.schedule(update, 'carousel-intersection-medium');
            });
            return;
        }

        // Handle other performance levels
        entries.forEach((entry) => {
            const projectContainer = entry.target;
            const carouselState = projectContainer._carouselState;

            if (!carouselState) return;

            const update = () => {
                if (entry.isIntersecting) {
                    visibleCarousels.add(projectContainer);
                    carouselState.setVisibility(true);
                } else {
                    visibleCarousels.delete(projectContainer);
                    carouselState.setVisibility(false);
                }
            };

            pendingUpdates.add(update);

            // Adaptive throttling based on performance level
            const throttleDelay = getIntersectionThrottleDelay(performanceLevel);
            if (!updateTimeout) {
                updateTimeout = setTimeout(processPendingUpdates, throttleDelay);
            }
        });
    };

    const applyMediumCarouselVisibility = (projectContainer, carouselState, isVisible) => {
        if (isVisible) {
            // Medium device specific optimizations when carousel becomes visible
            visibleCarousels.add(projectContainer);
            carouselState.setVisibility(true);
            
            // Apply medium-specific will-change optimizations
            willChangeManager.add(projectContainer.querySelector('.carousel-viewport'), 'transform');
            
            // Optimize carousel media for medium devices
            const carouselImages = projectContainer.querySelectorAll('.carousel-slide img');
            carouselImages.forEach(img => {
                // Enhance image quality for medium devices
                img.style.imageRendering = '-webkit-optimize-contrast';
            });
        } else {
            // Clean up medium device optimizations when carousel not visible
            visibleCarousels.delete(projectContainer);
            carouselState.setVisibility(false);
            
            // Clear will-change with medium device timing
            willChangeManager.clear(projectContainer.querySelector('.carousel-viewport'), 50);
        }
    };

    const getIntersectionThrottleDelay = (performanceLevel) => {
        switch(performanceLevel) {
            case 'ultra-low': return 100; // 10fps
            case 'low': return 67; // 15fps
            case 'low-medium': return 50; // 20fps
            case 'medium': return 33; // 30fps for medium devices
            case 'high': return 16; // 60fps
            case 'ultra-high': return 8; // 120fps
            default: return 50;
        }
    };

    const observeCarousel = (projectContainer) => {
        if (carouselObservers.has(projectContainer)) return;

        const observer = createCarouselObserver();
        observer.observe(projectContainer);
        carouselObservers.set(projectContainer, observer);
    };

    const unobserveCarousel = (projectContainer) => {
        const observer = carouselObservers.get(projectContainer);
        if (observer) {
            observer.unobserve(projectContainer);
            observer.disconnect();
            carouselObservers.delete(projectContainer);
        }
        visibleCarousels.delete(projectContainer);
    };

    // Cleanup function
    const cleanup = () => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
        }
        pendingUpdates.clear();
        carouselObservers.forEach((observer) => observer.disconnect());
        carouselObservers.clear();
        visibleCarousels.clear();
    };

    return {
        observeCarousel,
        unobserveCarousel,
        isVisible: (projectContainer) => visibleCarousels.has(projectContainer),
        cleanup,
    };
})();

// Performance utility: High-frequency RAF scheduler with adaptive throttling
const rafScheduler = (() => {
    const callbacks = new Set();
    let rafId = null;
    let lastFrameTime = 0;
    let frameCount = 0;
    let throttleInterval = 16; // Default 60fps

    // Set throttle interval based on device capabilities
    const setThrottleBasedOnDevice = () => {
        if (typeof hardwareCapabilities !== 'undefined') {
            const capabilities = hardwareCapabilities.getCapabilities();
            switch (capabilities.performanceLevel) {
                case 'ultra-low':
                    throttleInterval = 50; // 20fps
                    break;
                case 'low':
                    throttleInterval = 33; // 30fps
                    break;
                case 'low-medium':
                    throttleInterval = 22; // 45fps
                    break;
                case 'medium':
                    throttleInterval = 18; // 55fps - optimized for medium devices
                    break;
                case 'high':
                case 'ultra-high':
                default:
                    throttleInterval = 16; // 60fps
                    break;
            }
        }
    };

    const tick = (currentTime) => {
        // Adaptive throttling for medium and lower-end devices
        if (currentTime - lastFrameTime >= throttleInterval) {
            frameCount++;
            
            // Dynamic adjustment for medium devices based on performance
            if (typeof hardwareCapabilities !== 'undefined') {
                const capabilities = hardwareCapabilities.getCapabilities();
                if (capabilities.performanceLevel === 'medium') {
                    // Adjust throttle based on callback load
                    if (callbacks.size > 3) {
                        throttleInterval = 20; // Reduce to 50fps when busy
                    } else if (callbacks.size <= 1) {
                        throttleInterval = 16; // Back to 60fps when light
                    } else {
                        throttleInterval = 18; // Maintain 55fps for moderate load
                    }
                }
            }

            for (const callback of callbacks) {
                try {
                    callback(currentTime, frameCount);
                } catch (e) {
                    console.warn("RAF callback error:", e);
                }
            }
            lastFrameTime = currentTime;
        }
        
        if (callbacks.size > 0) {
            rafId = requestAnimationFrame(tick);
        } else {
            rafId = null;
        }
    };

    return {
        add(callback) {
            callbacks.add(callback);
            if (!rafId) {
                setThrottleBasedOnDevice();
                rafId = requestAnimationFrame(tick);
            }
        },
        remove(callback) {
            callbacks.delete(callback);
        },
        // Method to manually adjust throttle for medium devices during runtime
        adjustForMediumDevice(isHeavyLoad = false) {
            if (typeof hardwareCapabilities !== 'undefined') {
                const capabilities = hardwareCapabilities.getCapabilities();
                if (capabilities.performanceLevel === 'medium') {
                    throttleInterval = isHeavyLoad ? 20 : 18; // 50fps vs 55fps
                }
            }
        }
    };
})();

// Idle callback scheduler for non-critical tasks
const idleScheduler = (() => {
    const tasks = [];
    let running = false;

    const runTasks = (deadline) => {
        running = true;
        while (
            tasks.length > 0 &&
            (deadline.timeRemaining() > 0 || deadline.didTimeout)
        ) {
            const task = tasks.shift();
            try {
                task();
            } catch (e) {
                console.warn("Idle task error:", e);
            }
        }

        if (tasks.length > 0) {
            scheduleNext();
        } else {
            running = false;
        }
    };

    const scheduleNext = () => {
        if (window.requestIdleCallback) {
            window.requestIdleCallback(runTasks, { timeout: 1000 });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(
                () => runTasks({ timeRemaining: () => 5, didTimeout: false }),
                0
            );
        }
    };

    return {
        schedule(task) {
            tasks.push(task);
            if (!running) scheduleNext();
        },
    };
})();

document.addEventListener("DOMContentLoaded", function () {
    perfMonitor.mark("dom-ready");

    // Initialize hardware capability detection first
    const capabilities = hardwareCapabilities.init();

    // Cache frequently used elements for performance
    performanceCache.body = document.body;
    performanceCache.viewport = document.querySelector(".portfolio-container");
    performanceCache.projectItems = document.querySelectorAll(".project-item");

    // Initialize critical components immediately
    perfMonitor.mark("critical-init-start");
    initializeFilters();
    initializeProjectCarousel();
    perfMonitor.measure("critical-init", "critical-init-start");

    // Background video optimization - Removed mobile restriction
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) {
        // Apply performance optimizations based on hardware capabilities
        const capabilities = hardwareCapabilities.getCapabilities();
        if (capabilities.performanceLevel === "low") {
            bgVideo.style.filter = "brightness(0.6)"; // Simpler filter for low-end devices
        }
    }

    // Schedule non-critical initializations during idle time
    idleScheduler.schedule(() => {
        perfMonitor.mark("idle-init-start");
        initializeContactButtons();
        initializeSocialButtons();
        initializeDownloadButtons();
        initializeFullscreenModal();
        initializeSocialLayout();
        initializeMenuButton();
        initializeScrollEffects();
        initializeCertificateLinks();
        initializeProjectLink();
        perfMonitor.measure("idle-init", "idle-init-start");
        perfMonitor.measure("total-init", "dom-ready");
    });
});

// Utility functions
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Performance-optimized animation function with CPU/GPU fallbacks
function animatePress(el, scale = 0.9, duration = 150) {
    if (!el) return;

    const capabilities = hardwareCapabilities.getCapabilities();

    if (capabilities.hasGPU && capabilities.performanceLevel !== "low") {
        // GPU-accelerated path
        el.style.transform = `scale(${scale}) translateZ(0)`;
        willChangeManager.set(el);
    } else {
        // CPU-optimized path
        el.style.transform = `scale(${scale})`;
        // Skip will-change on low-end devices to reduce memory pressure
        if (capabilities.performanceLevel !== "low") {
            willChangeManager.set(el);
        }
    }

    const timerId = setTimeout(() => {
        if (capabilities.hasGPU && capabilities.performanceLevel !== "low") {
            el.style.transform = "translateZ(0)";
        } else {
            el.style.transform = "scale(1)";
        }

        if (capabilities.performanceLevel !== "low") {
            willChangeManager.clear(el, 0);
        } else {
            el.style.willChange = "auto";
        }

        performanceCache.timers.delete(timerId);
    }, duration);

    performanceCache.timers.add(timerId);
}

// Filter functionality
function initializeFilters() {
    const filterButtons = document.querySelectorAll(".filter-btn");
    const container = document.querySelector(".filter-container");
    const selector = document.querySelector(".filter-selector");

    const positionSelector = (btn, animate = true) => {
        if (!container || !selector || !btn) return;
        if (animate) container.classList.add("animating");
        else container.classList.remove("animating");

        const buttons = Array.from(container.querySelectorAll(".filter-btn"));
        const gap = parseFloat(getComputedStyle(container).gap) || 0;
        const idx = buttons.indexOf(btn);
        const x = idx * (btn.offsetWidth + gap);
        selector.style.transform = `translate(${x}px, -50%)`;
    };

    // Initialize selector position
    const currentActive =
        document.querySelector(".filter-btn.active") || filterButtons[0];
    if (currentActive && selector) {
        const prev = selector.style.transition;
        selector.style.transition = "none";
        positionSelector(currentActive, false);
        requestAnimationFrame(() => {
            selector.style.transition =
                prev || "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
        });
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", function () {
            // Update active state
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            // Move selector with animation
            positionSelector(this, true);

            // Safety guard for animation cleanup
            if (container) {
                if (container._animGuard) clearTimeout(container._animGuard);
                container._animGuard = setTimeout(() => {
                    container.classList.remove("animating");
                    container._animGuard = null;
                }, 600);
            }

            // Remove persistent focus
            this.blur();
            document.body.focus({ preventScroll: true });
        });
    });

    // Handle window resize
    window.addEventListener("resize", () => {
        const active = document.querySelector(".filter-btn.active");
        if (active) positionSelector(active, false);
    });

    // Clean up animation class on transition end
    if (selector) {
        selector.addEventListener("transitionend", (e) => {
            if (e.propertyName === "transform") {
                container?.classList.remove("animating");
                if (container?._animGuard) {
                    clearTimeout(container._animGuard);
                    container._animGuard = null;
                }
            }
        });
    }
}

// Project carousel with autoplay and pause functionality - Updated for multiple projects
function initializeProjectCarousel() {
    // Use cached project items for better performance
    const projectItems = performanceCache.projectItems;

    projectItems.forEach((projectItem) => {
        initializeSingleCarousel(projectItem);
    });
}

// Initialize carousel for a single project with viewport optimization
function initializeSingleCarousel(projectContainer) {
    const media = projectContainer.querySelector(".project-media");
    if (!media) return;

    const viewport = media.querySelector(".carousel-viewport");
    const slides = Array.from(media.querySelectorAll(".carousel-slide"));
    const nextBtn = projectContainer.querySelector(
        ".carousel-controls .carousel-btn.next"
    );
    const prevBtn = projectContainer.querySelector(
        ".carousel-controls .carousel-btn.prev"
    );
    const dots = Array.from(
        projectContainer.querySelectorAll(".carousel-controls .carousel-dot")
    );
    const progressFill = projectContainer.querySelector(
        ".carousel-controls .carousel-progress-fill"
    );

    if (!viewport || slides.length === 0) return;

    let index = 0;
    const intervalMs = 5000;
    let timer = null;
    let startTs = 0;
    let pauseElapsed = 0;
    let paused = false;
    let hoverExitTO = null;
    let manuallyPaused = false; // Track manual pause state
    let isVisible = true; // Assume visible initially

    const setActive = (i, { animate = true } = {}) => {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, idx) => {
            const isActive = idx === index;
            s.classList.toggle("is-active", isActive);
            s.setAttribute("aria-hidden", !isActive);
        });
        dots.forEach((d, idx) => {
            const isActive = idx === index;
            d.classList.toggle("is-active", isActive);
            if (isActive) {
                d.setAttribute("aria-current", "true");
            } else {
                d.removeAttribute("aria-current");
            }
        });
        if (!paused && progressFill) {
            progressFill.style.transition = "none";
            progressFill.style.width = "0%";
            void progressFill.offsetWidth;
        }
    };

    const next = () => setActive(index + 1);
    const prev = () => setActive(index - 1);

    const stopAuto = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            // Remove from performance cache if exists
            performanceCache.timers.delete(timer);
        }
        if (progressFill) {
            const computed = getComputedStyle(progressFill).width;
            progressFill.style.transition = "none";
            const track = progressFill.parentElement;
            const px = parseFloat(computed) || 0;
            const total = track ? track.clientWidth || 0 : 0;
            if (total > 0) {
                const pct = Math.max(0, Math.min(100, (px / total) * 100));
                progressFill.style.width = `${pct}%`;
            } else {
                progressFill.style.width = computed;
            }
        }
    };

    const startAuto = () => {
        // Only start if carousel is visible and not manually paused
        if (!isVisible || manuallyPaused) return;

        stopAuto();
        const remaining = Math.max(16, intervalMs - pauseElapsed);
        if (progressFill) {
            const currentPct = Math.max(
                0,
                Math.min(1, pauseElapsed / intervalMs)
            );
            progressFill.style.transition = "none";
            progressFill.style.width = `${currentPct * 100}%`;
            void progressFill.offsetWidth;
            progressFill.style.transition = `width ${remaining}ms linear`;
            requestAnimationFrame(() => {
                if (progressFill && isVisible) {
                    progressFill.style.width = "100%";
                }
            });
        }
        startTs = performance.now() - pauseElapsed;
        timer = setTimeout(() => {
            if (isVisible && !manuallyPaused) {
                next();
                pauseElapsed = 0;
                startAuto();
            }
        }, remaining);

        // Track timer for cleanup
        if (timer) {
            performanceCache.timers.add(timer);
        }
    };

    const pauseAutoplay = () => {
        if (paused) return;
        paused = true;
        const elapsed = performance.now() - startTs;
        pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
        if (progressFill) {
            const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
            progressFill.style.transition = "none";
            progressFill.style.width = `${pct * 100}%`;
        }
        stopAuto();
    };

    const resumeAutoplay = () => {
        if (!paused) return;
        // Only resume if carousel is visible and not manually paused
        if (!isVisible || manuallyPaused) return;
        paused = false;
        startAuto();
    };

    // Enhanced pause function for manual control
    const pauseManually = () => {
        manuallyPaused = true;
        pauseAutoplay();
    };

    // Enhanced resume function for manual control
    const resumeManually = () => {
        manuallyPaused = false;
        // Only resume if carousel is visible
        if (isVisible) {
            resumeAutoplay();
        }
    };

    // Visibility change handler
    const setVisibility = (visible) => {
        const wasVisible = isVisible;
        isVisible = visible;

        if (visible && !wasVisible) {
            // Becoming visible - resume only if not manually paused
            if (!manuallyPaused && paused) {
                resumeAutoplay();
            }
        } else if (!visible && wasVisible) {
            // Becoming invisible - pause to save resources
            if (!paused) {
                pauseAutoplay();
            }
        }
    };

    const resetProgress = () => {
        if (progressFill) {
            progressFill.style.transition = "none";
            progressFill.style.width = "0%";
        }
    };

    // Control event listeners
    nextBtn?.addEventListener("click", () => {
        next();
        pauseElapsed = 0;
        paused ? resetProgress() : startAuto();
    });

    prevBtn?.addEventListener("click", () => {
        prev();
        pauseElapsed = 0;
        paused ? resetProgress() : startAuto();
    });

    dots.forEach((d, idx) =>
        d.addEventListener("click", () => {
            setActive(idx);
            pauseElapsed = 0;
            paused ? resetProgress() : startAuto();
        })
    );

    // Teclado (no reanuda si está pausado por hover)
    media.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
            pauseElapsed = 0;
            if (paused) {
                if (progressFill) {
                    progressFill.style.transition = "none";
                    progressFill.style.width = "0%";
                }
            } else {
                startAuto();
            }
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
            pauseElapsed = 0;
            if (paused) {
                if (progressFill) {
                    progressFill.style.transition = "none";
                    progressFill.style.width = "0%";
                }
            } else {
                startAuto();
            }
        }
    });

    // Click navigation on image (left/right side)
    viewport.addEventListener("click", (e) => {
        const rect = viewport.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        if (e.clientX >= mid) next();
        else prev();
        pauseElapsed = 0;
        paused ? resetProgress() : startAuto();
    });

    // Hover pause on image viewport only - using manual pause system
    const onEnter = () => {
        if (hoverExitTO) {
            clearTimeout(hoverExitTO);
            hoverExitTO = null;
        }
        pauseManually();
    };

    const onLeave = () => {
        if (hoverExitTO) {
            clearTimeout(hoverExitTO);
            performanceCache.timers.delete(hoverExitTO);
        }
        hoverExitTO = setTimeout(() => {
            hoverExitTO = null;
            resumeManually();
        }, 60);

        // Track hover timeout for cleanup
        if (hoverExitTO) {
            performanceCache.timers.add(hoverExitTO);
        }
    };

    viewport.addEventListener("pointerenter", onEnter);
    viewport.addEventListener("pointerleave", onLeave);

    // Adjust progress bar width to match indicators
    const adjustProgressWidth = () => {
        const indicators = projectContainer.querySelector(
            ".carousel-controls .carousel-indicators"
        );
        const progress = projectContainer.querySelector(
            ".carousel-controls .carousel-progress"
        );
        if (indicators && progress) {
            progress.style.width = `${indicators.offsetWidth}px`;
        }
    };

    // Window resize handler
    const resizeObserver = new ResizeObserver(adjustProgressWidth);
    resizeObserver.observe(projectContainer);
    adjustProgressWidth();

    // Initialize carousel
    if (slides.length > 0) {
        // Ensure progress bar is reset initially
        if (progressFill) {
            progressFill.style.transition = "none";
            progressFill.style.width = "0%";
            void progressFill.offsetWidth;
        }
        setActive(0);
        // Small delay to ensure DOM is ready and viewport observation is active
        setTimeout(() => {
            // Only start auto if visible and not manually paused
            if (isVisible && !manuallyPaused) {
                startAuto();
            }
        }, 150);
    }

    // Exponer el estado del carousel para funcionalidad de pantalla completa y viewport management
    const carouselState = {
        pauseAutoplay: pauseManually,
        resumeAutoplay: resumeManually,
        next,
        prev,
        setActive,
        getCurrentIndex: () => index,
        getSlides: () => slides,
        setVisibility,
        _isPaused: () => paused,
        _manuallyPaused: () => manuallyPaused,
        _wasAutoPlaying: false,
    };

    // Store state reference and start viewport observation
    projectContainer._carouselState = carouselState;
    viewportManager.observeCarousel(projectContainer);

    exposeCarouselState(projectContainer, carouselState);
}

// Event delegation system - Enhanced for better performance
const eventDelegator = (() => {
    const delegateMap = new Map();
    const passiveEvents = new Set([
        "scroll",
        "wheel",
        "touchstart",
        "touchmove",
    ]);

    function addDelegatedListener(
        container,
        selector,
        event,
        handler,
        options = {}
    ) {
        const key = `${event}-${selector}`;

        if (delegateMap.has(key)) return; // Prevent duplicate listeners

        // Auto-detect if event should be passive for better performance
        const finalOptions = {
            passive: passiveEvents.has(event),
            capture: false,
            ...options,
        };

        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        };

        container.addEventListener(event, delegatedHandler, finalOptions);
        delegateMap.set(key, {
            container,
            event,
            handler: delegatedHandler,
            options: finalOptions,
        });
    }

    function removeAllListeners() {
        for (const [
            key,
            { container, event, handler, options },
        ] of delegateMap) {
            try {
                container.removeEventListener(event, handler, options);
            } catch (e) {
                // Silent cleanup
            }
        }
        delegateMap.clear();
    }

    return { addDelegatedListener, removeAllListeners };
})();

// Contact buttons functionality
function initializeContactButtons() {
    // Use event delegation for better performance
    const container = performanceCache.viewport;
    if (!container) return;

    eventDelegator.addDelegatedListener(
        container,
        ".contact-btn",
        "click",
        function () {
            animatePress(this);
            const href = this.getAttribute("data-href");
            if (href && href !== "#") {
                const w = window.open(href, "_blank", "noopener,noreferrer");
                if (w) w.opener = null;
            }
        },
        { passive: false }
    );
}

// Social media buttons functionality
function initializeSocialButtons() {
    // Use event delegation for better performance
    const container = performanceCache.viewport;
    if (!container) return;

    eventDelegator.addDelegatedListener(
        container,
        ".social-btn",
        "click",
        function () {
            animatePress(this);
            const url = this.getAttribute("data-url");
            if (url) {
                const w = window.open(url, "_blank", "noopener,noreferrer");
                if (w) w.opener = null;
            }
        },
        { passive: false }
    );
}

// Detects when social media buttons wrap and applies corresponding class
function initializeSocialLayout() {
    const container = document.querySelector(".social-media");
    if (!container) return;
    const lines = container.querySelector(".social-lines");
    if (!lines) return;

    const measureAndApply = () => {
        container.classList.remove("is-wrapping");
        void container.offsetHeight;
        void lines.offsetHeight;

        const items = Array.from(lines.querySelectorAll(".social-btn"));
        if (items.length < 2) return;

        requestAnimationFrame(() => {
            const firstItemTop = items[0].getBoundingClientRect().top;
            const hasWrapping = items.some((item, index) => {
                if (index === 0) return false;
                const itemTop = item.getBoundingClientRect().top;
                return Math.abs(itemTop - firstItemTop) > 25;
            });

            if (hasWrapping) {
                container.classList.add("is-wrapping");
            }
        });
    };

    const onResize = debounce(measureAndApply, 250);
    window.addEventListener("resize", onResize);

    // Optimized initialization sequence
    measureAndApply();
    requestAnimationFrame(() => measureAndApply());

    // After font loading
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measureAndApply);
    }
}

// Menu button functionality
function initializeMenuButton() {
    const menuButton = document.querySelector(".menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", function () {
            this.style.transform = "rotate(90deg) scale(0.9)";
            setTimeout(() => {
                this.style.transform = "";
            }, 200);
        });
    }
}

// Scroll effects
function initializeScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
        // Performance optimization
        passive: true,
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Use RAF for smooth animations
                rafScheduler.add(() => {
                    entry.target.style.opacity = "1";
                    entry.target.style.transform = "translateY(0)";
                });
                // Unobserve after animation to save resources
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll(
        ".glass-card, .certificate-item, .filter-container"
    );
    sections.forEach((section) => {
        section.style.opacity = "0";
        section.style.transform = "translateY(20px)";
        section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(section);
    });
}

// Certificate links functionality
function initializeCertificateLinks() {
    const items = document.querySelectorAll(".certificate-item.glass-pill");
    items.forEach((item) => {
        const btn = item.querySelector(".external-link");
        const url = btn?.getAttribute("data-url");
        if (!url) return;

        if (btn) {
            btn.setAttribute("tabindex", "-1");
            btn.setAttribute("aria-hidden", "true");
        }

        const openLink = () => {
            const w = window.open(url, "_blank", "noopener,noreferrer");
            if (w) w.opener = null;
            animatePress(item, 0.98);
        };

        item.addEventListener("click", (e) => {
            e.stopPropagation();
            openLink();
        });

        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLink();
            }
        });
    });
}

// Project links functionality - Updated for multiple projects
function initializeProjectLink() {
    const projectLinks = document.querySelectorAll(".project-link");

    projectLinks.forEach((projectLink) => {
        const url = projectLink.getAttribute("data-url");
        if (!url) return;

        const openUrl = () => {
            const w = window.open(url, "_blank", "noopener,noreferrer");
            if (w) w.opener = null;
            animatePress(projectLink, 0.98);
        };

        projectLink.addEventListener("click", openUrl);
        projectLink.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openUrl();
            }
        });
    });
}

// Loading states and animations
window.addEventListener("load", function () {
    document.body.classList.add("loaded");

    const elements = document.querySelectorAll(
        ".glass-card, .certificate-item"
    );
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add("fade-in");
        }, index * 100);
    });
});

// Dynamic styles for keyboard navigation and animations
const style = document.createElement("style");
style.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid var(--text-primary) !important;
        outline-offset: 2px !important;
    }
    
    .fade-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }
`;
document.head.appendChild(style);

// Memory cleanup and resource management
const performanceManager = {
    observers: new Set(),
    timers: new Set(),
    listeners: new Set(),

    addObserver(observer) {
        this.observers.add(observer);
        return observer;
    },

    addTimer(timer) {
        this.timers.add(timer);
        return timer;
    },

    addListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.listeners.add({ element, event, handler, options });
    },

    cleanup() {
        // Disconnect all observers
        for (const observer of this.observers) {
            observer.disconnect();
        }

        // Clear all timers
        for (const timer of this.timers) {
            clearTimeout(timer);
            clearInterval(timer);
        }

        // Remove all listeners
        for (const { element, event, handler } of this.listeners) {
            element.removeEventListener(event, handler);
        }

        // Clear all sets
        this.observers.clear();
        this.timers.clear();
        this.listeners.clear();

        // Clean up viewport manager
        viewportManager.cleanup();
    },
};

// Memory cleanup on page unload
window.addEventListener(
    "beforeunload",
    () => {
        // Clean up RAF callbacks
        for (const id of performanceCache.rafIds) {
            cancelAnimationFrame(id);
        }

        // Clean up timers
        for (const id of performanceCache.timers) {
            clearTimeout(id);
        }

        // Clean up all managed resources
        performanceManager.cleanup();

        // Clean up event delegator
        eventDelegator.removeAllListeners();

        // Clean up will-change properties
        willChangeManager.clearAll();

        // Clear caches
        performanceCache.rafIds.clear();
        performanceCache.timers.clear();
    },
    { once: true }
);

// Enhanced scroll indicator with drag functionality and smooth scrolling - Updated for multiple projects
document.addEventListener("DOMContentLoaded", () => {
    // Use cached project items for better performance
    const projectItems = performanceCache.projectItems;

    projectItems.forEach((projectItem) => {
        initializeProjectScroll(projectItem);
    });
});

// Initialize scroll functionality for a single project description
function initializeProjectScroll(projectContainer) {
    const desc = projectContainer.querySelector(
        ".project-description .description-content"
    );
    const track = projectContainer.querySelector(
        ".project-description .scroll-track"
    );
    const thumb = projectContainer.querySelector(
        ".project-description .scroll-thumb"
    );
    if (!desc || !track || !thumb) return;

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    const updateThumb = () => {
        const { scrollTop, scrollHeight, clientHeight } = desc;
        const hasOverflow = scrollHeight > clientHeight + 1;

        track.parentElement.style.display = hasOverflow ? "block" : "none";
        desc.style.overflowY = hasOverflow ? "auto" : "hidden";

        if (!hasOverflow) {
            thumb.style.height = "0px";
            thumb.style.transform = "translateY(0)";
            desc.style.maskImage = "none";
            desc.style.webkitMaskImage = "none";
            return;
        }

        // Update thumb with progressive enhancement for CPU/GPU
        const capabilities = hardwareCapabilities.getCapabilities();
        const ratio = clientHeight / scrollHeight;
        const thumbH = Math.max(20, track.clientHeight * ratio);
        const maxThumbTop = track.clientHeight - thumbH;
        const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1);
        const top = maxThumbTop * scrollRatio;

        thumb.style.height = `${thumbH}px`;

        if (
            capabilities.hasGPU &&
            capabilities.hasTransform3D &&
            capabilities.performanceLevel !== "low"
        ) {
            // GPU-accelerated path with 3D transforms
            thumb.style.transform = `translate3d(0, ${
                Math.round(top * 100) / 100
            }px, 0)`;
        } else {
            // CPU-optimized path with 2D transforms
            thumb.style.transform = `translateY(${
                Math.round(top * 100) / 100
            }px)`;
        }

        // Dynamic will-change optimization based on device capabilities
        if (isDragging && capabilities.performanceLevel !== "low") {
            willChangeManager.set(thumb);
        } else if (capabilities.performanceLevel !== "low") {
            willChangeManager.clear(thumb);
        }

        // Dynamic mask based on scroll position
        const fadeThreshold = 20;
        const topFade = Math.min(scrollTop / fadeThreshold, 1);
        const bottomFade = Math.min(
            (scrollHeight - clientHeight - scrollTop) / fadeThreshold,
            1
        );

        let maskGradient;
        if (scrollTop <= 5) {
            maskGradient = `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 85%, rgba(0,0,0,${
                bottomFade * 0.15
            }) 95%, rgba(0,0,0,0) 100%)`;
        } else if (scrollTop >= scrollHeight - clientHeight - 5) {
            maskGradient = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${
                topFade * 0.15
            }) 5%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 100%)`;
        } else {
            maskGradient = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${
                topFade * 0.2
            }) 4%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 88%, rgba(0,0,0,${
                bottomFade * 0.2
            }) 96%, rgba(0,0,0,0) 100%)`;
        }

        desc.style.maskImage = maskGradient;
        desc.style.webkitMaskImage = maskGradient;
    };

    // Ultra-smooth drag functionality
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left mouse button

        isDragging = true;
        startY = e.clientY;
        startScrollTop = desc.scrollTop;

        // Optimize for maximum dragging performance
        document.body.style.userSelect = "none";
        document.body.style.pointerEvents = "none"; // Disable pointer events on body
        thumb.style.pointerEvents = "auto"; // Keep thumb interactive
        track.style.pointerEvents = "auto"; // Keep track interactive
        thumb.style.transition = "none"; // Remove all transitions during drag

        // Disable smooth scrolling for instant response
        desc.style.scrollBehavior = "auto";

        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        // Ultra-high precision calculation with immediate response
        const deltaY = e.clientY - startY;
        const trackHeight = track.clientHeight;
        const thumbHeight = parseFloat(thumb.style.height) || 20;
        const maxThumbTop = trackHeight - thumbHeight;

        if (maxThumbTop <= 0) return;

        const ratio = deltaY / maxThumbTop;
        const { scrollHeight, clientHeight } = desc;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll <= 0) return;

        const newScrollTop = Math.max(
            0,
            Math.min(maxScroll, startScrollTop + ratio * maxScroll)
        );

        // Direct assignment for zero-latency scrolling
        desc.scrollTop = newScrollTop;

        e.preventDefault();
    };

    const handleMouseUp = (e) => {
        if (!isDragging) return;

        isDragging = false;

        // Restore all original styles
        document.body.style.userSelect = "";
        document.body.style.pointerEvents = "";
        thumb.style.pointerEvents = "";
        track.style.pointerEvents = "";
        thumb.style.transition = ""; // Restore smooth transitions

        // Re-enable smooth scrolling
        desc.style.scrollBehavior = "smooth";

        e.preventDefault();
    };

    // Event listeners optimized for ultra-smooth performance
    document.addEventListener(
        "mousedown",
        (e) => {
            if (e.target === thumb) {
                handleMouseDown(e);
            }
        },
        { passive: false }
    );

    document.addEventListener("mousemove", handleMouseMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp, { passive: false });

    // Enhanced track click with smooth animation
    track.addEventListener(
        "click",
        (e) => {
            if (e.target === thumb || isDragging) return;

            const rect = track.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const trackHeight = track.clientHeight;
            const clickRatio = Math.max(0, Math.min(1, clickY / trackHeight));

            const { scrollHeight, clientHeight } = desc;
            const maxScroll = scrollHeight - clientHeight;
            const targetScrollTop = clickRatio * maxScroll;

            // Smooth animated scroll to target
            desc.style.scrollBehavior = "smooth";
            desc.scrollTo({ top: targetScrollTop });

            e.preventDefault();
        },
        { passive: false }
    );

    // High performance scroll handling optimized for 60fps
    let scrollTicking = false;
    let lastScrollTime = 0;
    const SCROLL_THROTTLE = 16; // 60fps - optimal balance of smoothness and performance

    const handleScroll = () => {
        const currentTime = performance.now();

        if (!scrollTicking && currentTime - lastScrollTime >= SCROLL_THROTTLE) {
            rafScheduler.add(() => {
                updateThumb();
                scrollTicking = false;
                lastScrollTime = performance.now();
                rafScheduler.remove(handleScroll);
            });
            scrollTicking = true;
        }
    };

    desc.addEventListener("scroll", handleScroll, { passive: true });

    // Optimized resize handler with proper debounce
    const resizeHandler = debounce(() => {
        rafScheduler.add(updateThumb);
    }, 100);

    window.addEventListener("resize", resizeHandler, { passive: true });

    // Initialize with optimized performance settings
    desc.style.scrollBehavior = "smooth";

    // Performance-optimized initialization with progressive enhancement
    const initUpdate = () => {
        updateThumb();

        const capabilities = hardwareCapabilities.getCapabilities();

        if (capabilities.hasGPU && capabilities.performanceLevel !== "low") {
            // GPU-accelerated path
            thumb.style.transform += " translateZ(0)";
            thumb.style.backfaceVisibility = "hidden";
            thumb.style.perspective = "1000px";
            desc.style.transform = "translateZ(0)";
            desc.style.backfaceVisibility = "hidden";
        } else {
            // CPU-optimized path - avoid 3D transforms
            thumb.style.backfaceVisibility = "hidden";
            desc.style.backfaceVisibility = "hidden";
        }

        // Layout containment is beneficial for all devices
        desc.style.contain = "layout style";
    };

    // Optimized initialization sequence
    rafScheduler.add(initUpdate);
    requestAnimationFrame(() => rafScheduler.add(initUpdate));
    window.addEventListener("load", () => rafScheduler.add(initUpdate), {
        once: true,
    });
}

// Fullscreen Modal Functionality - Completamente reescrita
function initializeFullscreenModal() {
    // Crear modal solo una vez
    let modal = document.getElementById("fullscreen-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "fullscreen-modal";
        modal.className = "carousel-fullscreen-modal";
        modal.innerHTML = `
            <div class="carousel-fullscreen-content">
                <button class="carousel-fullscreen-close" aria-label="Cerrar pantalla completa"></button>
                <div class="carousel-fullscreen-viewport">
                    <img class="carousel-fullscreen-image" alt="" />
                </div>
                <div class="carousel-fullscreen-nav">
                    <button class="carousel-fullscreen-prev" aria-label="Imagen anterior"></button>
                    <button class="carousel-fullscreen-next" aria-label="Imagen siguiente"></button>
                </div>
                <div class="carousel-fullscreen-counter">1 / 1</div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    let currentImages = [];
    let currentIndex = 0;
    let originalCarousel = null;

    // Referencias a elementos del modal
    const closeBtn = modal.querySelector(".carousel-fullscreen-close");
    const image = modal.querySelector(".carousel-fullscreen-image");
    const prevBtn = modal.querySelector(".carousel-fullscreen-prev");
    const nextBtn = modal.querySelector(".carousel-fullscreen-next");
    const counter = modal.querySelector(".carousel-fullscreen-counter");

    // Funciones del modal
    function openModal(images, startIndex, carousel) {
        currentImages = images;
        currentIndex = startIndex;
        originalCarousel = carousel;

        // Pausar carousel original si existe
        if (originalCarousel && originalCarousel.pauseAutoplay) {
            originalCarousel.pauseAutoplay();
        }

        showCurrentImage();
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        modal.classList.remove("active");
        document.body.style.overflow = "";

        // Reanudar carousel original si existe
        setTimeout(() => {
            if (originalCarousel && originalCarousel.resumeAutoplay) {
                originalCarousel.resumeAutoplay();
            }
        }, 300);
    }

    function showCurrentImage() {
        if (currentImages.length > 0) {
            image.src = currentImages[currentIndex].src;
            image.alt = currentImages[currentIndex].alt || "";
            counter.textContent = `${currentIndex + 1} / ${
                currentImages.length
            }`;

            // Mostrar/ocultar botones de navegación
            prevBtn.style.display = currentImages.length > 1 ? "flex" : "none";
            nextBtn.style.display = currentImages.length > 1 ? "flex" : "none";
        }
    }

    function nextImage() {
        if (currentImages.length > 1) {
            currentIndex = (currentIndex + 1) % currentImages.length;
            showCurrentImage();
        }
    }

    function prevImage() {
        if (currentImages.length > 1) {
            currentIndex =
                (currentIndex - 1 + currentImages.length) %
                currentImages.length;
            showCurrentImage();
        }
    }

    // Event listeners
    closeBtn.addEventListener("click", closeModal);
    nextBtn.addEventListener("click", nextImage);
    prevBtn.addEventListener("click", prevImage);

    // Cerrar al hacer clic fuera de la imagen (pero NO en los controles)
    modal.addEventListener("click", (e) => {
        // Solo cerrar si se hace click directamente en el modal o en el content,
        // pero NO en la imagen, botones de navegación, o botón cerrar
        const clickedElement = e.target;
        const isBackground = clickedElement === modal;
        const isContent =
            clickedElement ===
            modal.querySelector(".carousel-fullscreen-content");
        const isViewport =
            clickedElement ===
            modal.querySelector(".carousel-fullscreen-viewport");

        if (isBackground || isContent || isViewport) {
            closeModal();
        }
    });

    // Navegación por teclado
    document.addEventListener("keydown", (e) => {
        if (!modal.classList.contains("active")) return;

        switch (e.key) {
            case "Escape":
                closeModal();
                break;
            case "ArrowRight":
                e.preventDefault();
                nextImage();
                break;
            case "ArrowLeft":
                e.preventDefault();
                prevImage();
                break;
        }
    });

    // Agregar botones de pantalla completa a los carousels inmediatamente
    const carousels = document.querySelectorAll(".project-media");
    carousels.forEach((carousel) => {
        // Verificar si ya tiene botón
        if (carousel.querySelector(".carousel-fullscreen-btn")) return;

        const slides = carousel.querySelectorAll(".carousel-slide img");
        if (slides.length === 0) return;

        // Crear botón de pantalla completa
        const fullscreenBtn = document.createElement("button");
        fullscreenBtn.className = "carousel-fullscreen-btn";
        fullscreenBtn.setAttribute("aria-label", "Ver en pantalla completa");
        fullscreenBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M16 3H19C20.1046 3 21 3.89543 21 5V8M8 21H5C3.89543 21 3 20.1046 3 19V16M16 21H19C20.1046 21 21 20.1046 21 19V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Obtener el contenedor de controles y agregarlo
        const controlsContainer = carousel.parentElement.querySelector(
            ".carousel-controls .carousel-controls-top"
        );
        if (controlsContainer) {
            controlsContainer.appendChild(fullscreenBtn);
        }

        // Event listener para abrir modal
        fullscreenBtn.addEventListener("click", () => {
            const images = Array.from(slides);
            const activeSlideIndex = Array.from(
                carousel.querySelectorAll(".carousel-slide")
            ).findIndex((slide) => slide.classList.contains("is-active"));

            // Obtener estado del carousel si está disponible
            const media = carousel;
            const carouselState = media._carouselState || null;

            openModal(images, Math.max(0, activeSlideIndex), carouselState);
        });
    });
}

// Modificar initializeSingleCarousel para exponer el estado del carousel
function exposeCarouselState(projectContainer, carouselState) {
    const media = projectContainer.querySelector(".project-media");
    if (media) {
        media._carouselState = carouselState;
    }
}

// Initialize Download Buttons
function initializeDownloadButtons() {
    const downloadBtns = document.querySelectorAll(
        ".download-btn[data-download]"
    );

    downloadBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const downloadUrl = btn.getAttribute("data-download");
            if (downloadUrl) {
                window.open(downloadUrl, "_blank", "noopener,noreferrer");
            }
        });

        btn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                btn.click();
            }
        });
    });
}

// Global error handler to prevent runtime.lastError warnings
window.addEventListener("error", function (e) {
    // Silently handle extension-related errors that don't affect functionality
    if (e.message && e.message.includes("Extension context invalidated")) {
        e.preventDefault();
        return true;
    }
});

// Ultra-Low End Device Memory Management System
(() => {
    "use strict";

    // Enhanced memory cleanup system for ultra-low end devices
    const ultraLowEndOptimizer = {
        cleanupInterval: null,
        isUltraLowEnd: false,
        lastCleanup: Date.now(),

        init() {
            // Check if we're on an ultra-low end device
            this.detectUltraLowEndDevice();

            if (this.isUltraLowEnd) {
                this.setupAggressiveCleanup();
                console.log("🔧 Ultra-low end optimizations activated");
            }
            
            // Create temporary device type indicator
            this.createDeviceIndicator();
        },

        createDeviceIndicator() {
            // Get the performance level from hardwareCapabilities if available
            let deviceType = 'unknown';
            
            if (typeof hardwareCapabilities !== 'undefined') {
                try {
                    const capabilities = hardwareCapabilities.getCapabilities();
                    deviceType = capabilities.performanceLevel || 'unknown';
                } catch (e) {
                    deviceType = this.isUltraLowEnd ? 'ultra-low' : 'unknown';
                }
            } else {
                deviceType = this.isUltraLowEnd ? 'ultra-low' : 'unknown';
            }

            // Create indicator element
            const indicator = document.createElement('div');
            indicator.id = 'device-type-indicator';
            indicator.textContent = deviceType;
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
                border: 1px solid #00ff00;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;

            // Add to document
            document.body.appendChild(indicator);

            // Auto-remove after 30 seconds (temporary)
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 30000);
        },

        detectUltraLowEndDevice() {
            try {
                const factors = [
                    (navigator.hardwareConcurrency || 1) < 2,
                    (navigator.deviceMemory || 4) < 2,
                    /Android.*[2-4]\.|iPhone.*OS [4-8]_/.test(
                        navigator.userAgent
                    ),
                    navigator.connection &&
                        navigator.connection.effectiveType === "slow-2g",
                    screen.width <= 480 && (navigator.deviceMemory || 4) < 2,
                ];

                const score = factors.filter(Boolean).length;
                this.isUltraLowEnd = score >= 2;
            } catch (e) {
                this.isUltraLowEnd = false;
            }
        },

        setupAggressiveCleanup() {
            // Cleanup every 15 seconds for ultra-low end devices
            this.cleanupInterval = setInterval(() => {
                this.performAggressiveCleanup();
            }, 15000);

            // Additional cleanup on visibility change
            document.addEventListener(
                "visibilitychange",
                () => {
                    if (document.hidden) {
                        this.performAggressiveCleanup();
                    }
                },
                { passive: true }
            );
        },

        performAggressiveCleanup() {
            try {
                // Clear will-change properties aggressively
                if (typeof willChangeManager !== "undefined") {
                    const elements = document.querySelectorAll(
                        '[style*="will-change"]'
                    );
                    elements.forEach((el) => {
                        if (
                            el.style.willChange &&
                            el.style.willChange !== "auto"
                        ) {
                            el.style.willChange = "auto";
                        }
                    });
                }

                // Clear unused RAF callbacks
                if (
                    typeof performanceCache !== "undefined" &&
                    performanceCache.rafIds
                ) {
                    if (performanceCache.rafIds.size > 1) {
                        const idsArray = Array.from(performanceCache.rafIds);
                        idsArray.slice(0, -1).forEach((id) => {
                            cancelAnimationFrame(id);
                            performanceCache.rafIds.delete(id);
                        });
                    }
                }

                // Clear old timers
                if (
                    typeof performanceCache !== "undefined" &&
                    performanceCache.timers
                ) {
                    if (performanceCache.timers.size > 3) {
                        const timersArray = Array.from(performanceCache.timers);
                        timersArray.slice(0, -2).forEach((timer) => {
                            clearTimeout(timer);
                            performanceCache.timers.delete(timer);
                        });
                    }
                }

                // Suggest garbage collection if available
                if (window.gc && typeof window.gc === "function") {
                    try {
                        window.gc();
                    } catch (e) {
                        // GC not available in this context
                    }
                }

                this.lastCleanup = Date.now();
            } catch (e) {
                console.warn("Cleanup error:", e);
            }
        },

        destroy() {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
        },
    };

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            ultraLowEndOptimizer.init();
        });
    } else {
        ultraLowEndOptimizer.init();
    }

    // Enhanced cleanup on page unload
    window.addEventListener(
        "beforeunload",
        () => {
            try {
                ultraLowEndOptimizer.destroy();

                // Final aggressive cleanup
                if (ultraLowEndOptimizer.isUltraLowEnd) {
                    ultraLowEndOptimizer.performAggressiveCleanup();
                }
            } catch (e) {
                // Silent cleanup on unload
            }
        },
        { once: true }
    );
})();

// ========================================================================
// MEDIUM DEVICE MEMORY MANAGEMENT - ULTRA-METICULOUS
// ========================================================================

const mediumDeviceOptimizer = (() => {
    let isMediumDevice = false;
    let cleanupInterval = null;
    let memoryObserver = null;
    let lastCleanup = 0;
    let memoryPressureLevel = 0;

    return {
        init() {
            const performanceLevel = hardwareCapabilities.getPerformanceLevel();
            this.isMediumDevice = performanceLevel === 'medium';
            
            if (this.isMediumDevice) {
                this.setupMediumOptimizations();
                this.setupIntelligentCleanup();
                this.setupMemoryPressureMonitoring();
            }
        },

        setupMediumOptimizations() {
            try {
                // Apply medium-specific CSS properties
                const root = document.documentElement;
                root.style.setProperty('--medium-transition-duration', '120ms');
                root.style.setProperty('--medium-animation-timing', 'ease-out');
                root.style.setProperty('--medium-blur-quality', 'blur(6px)');
                
                // Enable strategic CSS containment for medium devices
                this.enableStrategicContainment();
                
                // Setup intelligent resource management
                this.setupResourceManagement();
                
            } catch (e) {
                console.warn('Medium device optimization setup failed:', e);
            }
        },

        enableStrategicContainment() {
            // Apply containment to key performance areas
            const containmentTargets = [
                '.glass-card',
                '.project-item',
                '.carousel-viewport',
                '.profile-section'
            ];

            containmentTargets.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.contain = 'layout style';
                });
            });
        },

        setupResourceManagement() {
            // Intelligent image loading for medium devices
            const images = document.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                img.addEventListener('load', () => {
                    // Optimize loaded images for medium devices
                    img.style.imageRendering = '-webkit-optimize-contrast';
                }, { once: true });
            });

            // Monitor will-change usage
            this.monitorWillChangeUsage();
        },

        monitorWillChangeUsage() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.style.willChange && target.style.willChange !== 'auto') {
                            // Track will-change usage for cleanup
                            willChangeManager.track(target);
                        }
                    }
                });
            });

            observer.observe(document.body, {
                attributes: true,
                subtree: true,
                attributeFilter: ['style']
            });

            this.memoryObserver = observer;
        },

        setupIntelligentCleanup() {
            // Moderate cleanup interval for medium devices (30 seconds)
            this.cleanupInterval = setInterval(() => {
                this.performIntelligentCleanup();
            }, 30000);

            // Cleanup on visibility change with medium device timing
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    setTimeout(() => {
                        this.performIntelligentCleanup();
                    }, 100); // Slight delay for medium devices
                }
            }, { passive: true });

            // Cleanup on memory pressure
            if ('memory' in performance) {
                this.setupMemoryPressureCleanup();
            }
        },

        setupMemoryPressureMonitoring() {
            if ('memory' in performance) {
                // Monitor memory usage every 10 seconds for medium devices
                setInterval(() => {
                    this.checkMemoryPressure();
                }, 10000);
            }
        },

        checkMemoryPressure() {
            try {
                const memInfo = performance.memory;
                const usedMemory = memInfo.usedJSHeapSize;
                const totalMemory = memInfo.totalJSHeapSize;
                const memoryUsageRatio = usedMemory / totalMemory;

                // Update pressure level for medium devices
                if (memoryUsageRatio > 0.85) {
                    this.memoryPressureLevel = 3; // High pressure
                } else if (memoryUsageRatio > 0.7) {
                    this.memoryPressureLevel = 2; // Medium pressure
                } else if (memoryUsageRatio > 0.5) {
                    this.memoryPressureLevel = 1; // Low pressure
                } else {
                    this.memoryPressureLevel = 0; // No pressure
                }

                // Trigger cleanup if memory pressure is high
                if (this.memoryPressureLevel >= 2) {
                    this.performPressureBasedCleanup();
                }
            } catch (e) {
                // Memory API not available
                this.memoryPressureLevel = 0;
            }
        },

        setupMemoryPressureCleanup() {
            // Additional cleanup when memory pressure is detected
            setInterval(() => {
                if ('memory' in performance) {
                    const memInfo = performance.memory;
                    const memoryRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
                    
                    if (memoryRatio > 0.75) {
                        this.performMemoryPressureCleanup();
                    }
                }
            }, 15000); // Check every 15 seconds for medium devices
        },

        performIntelligentCleanup() {
            try {
                const now = Date.now();
                
                // Skip if cleaned up recently (minimum 5 seconds for medium devices)
                if (now - this.lastCleanup < 5000) return;

                // Intelligent will-change cleanup for medium devices
                this.cleanupWillChangeIntelligently();

                // Cleanup RAF callbacks with medium device strategy
                this.cleanupRAFCallbacks();

                // Clear unused event listeners
                this.cleanupEventListeners();

                // Medium device memory optimization
                this.optimizeMemoryForMediumDevices();

                this.lastCleanup = now;
            } catch (e) {
                console.warn('Medium device cleanup error:', e);
            }
        },

        cleanupWillChangeIntelligently() {
            if (typeof willChangeManager !== 'undefined') {
                // For medium devices, keep 4 most recent will-change properties
                const elements = document.querySelectorAll('[style*="will-change"]');
                if (elements.length > 4) {
                    // Remove will-change from older elements
                    Array.from(elements).slice(0, -4).forEach(el => {
                        if (el.style.willChange && el.style.willChange !== 'auto') {
                            willChangeManager.clear(el, 0); // Immediate cleanup
                        }
                    });
                }
            }
        },

        cleanupRAFCallbacks() {
            if (typeof rafScheduler !== 'undefined' && rafScheduler.pendingCallbacks) {
                // For medium devices, keep only essential RAF callbacks
                const callbacks = rafScheduler.pendingCallbacks;
                if (callbacks.size > 8) {
                    // Cancel older non-essential callbacks
                    let count = 0;
                    for (let [id, callback] of callbacks) {
                        if (count++ > 6) {
                            if (!callback.priority || callback.priority < 2) {
                                cancelAnimationFrame(id);
                                callbacks.delete(id);
                            }
                        }
                    }
                }
            }
        },

        cleanupEventListeners() {
            // Clean up temporary event listeners for medium devices
            const tempListeners = document.querySelectorAll('[data-temp-listener]');
            tempListeners.forEach(el => {
                if (el.dataset.tempListener === 'true') {
                    // Remove temp attribute to trigger cleanup
                    el.removeAttribute('data-temp-listener');
                }
            });
        },

        optimizeMemoryForMediumDevices() {
            // Optimize carousel memory usage
            this.optimizeCarouselMemory();
            
            // Clean up unused DOM references
            this.cleanupDOMReferences();
            
            // Optimize CSS custom properties
            this.optimizeCSSCustomProperties();
        },

        optimizeCarouselMemory() {
            // For medium devices, unload off-screen carousel images
            const carousels = document.querySelectorAll('.carousel-viewport');
            carousels.forEach(carousel => {
                const slides = carousel.querySelectorAll('.carousel-slide');
                slides.forEach((slide, index) => {
                    const img = slide.querySelector('img');
                    if (img && !this.isSlideVisible(slide)) {
                        // For medium devices, reduce image quality when not visible
                        if (img.dataset.originalSrc) {
                            img.style.imageRendering = 'auto';
                        }
                    }
                });
            });
        },

        isSlideVisible(slide) {
            const rect = slide.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
        },

        cleanupDOMReferences() {
            // Clean up any cached DOM references that might be leaking
            if (window.domCache) {
                const cacheKeys = Object.keys(window.domCache);
                if (cacheKeys.length > 20) {
                    // For medium devices, keep only the 15 most recent cache entries
                    cacheKeys.slice(0, -15).forEach(key => {
                        delete window.domCache[key];
                    });
                }
            }
        },

        optimizeCSSCustomProperties() {
            // For medium devices, clean up unused CSS custom properties
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);
            
            // Remove temporary CSS properties that may have accumulated
            const tempProperties = [
                '--temp-transform',
                '--temp-opacity',
                '--temp-filter'
            ];
            
            tempProperties.forEach(prop => {
                if (computedStyle.getPropertyValue(prop)) {
                    root.style.removeProperty(prop);
                }
            });
        },

        performPressureBasedCleanup() {
            // Aggressive cleanup when memory pressure is detected
            this.performIntelligentCleanup();
            
            // Additional cleanup for medium devices under pressure
            if (this.memoryPressureLevel >= 3) {
                this.performEmergencyCleanup();
            }
        },

        performMemoryPressureCleanup() {
            try {
                // Emergency cleanup for medium devices
                this.cleanupWillChangeIntelligently();
                
                // Clear all non-essential RAF callbacks immediately
                if (typeof rafScheduler !== 'undefined') {
                    rafScheduler.clearAll();
                }

                // Force cleanup of carousel observers
                if (typeof carouselObservers !== 'undefined') {
                    carouselObservers.forEach((observer, container) => {
                        if (!this.isElementVisible(container)) {
                            observer.disconnect();
                            carouselObservers.delete(container);
                        }
                    });
                }
            } catch (e) {
                console.warn('Memory pressure cleanup failed:', e);
            }
        },

        performEmergencyCleanup() {
            try {
                // Emergency cleanup for critical memory pressure
                willChangeManager.clearAll();
                
                // Disable non-essential animations temporarily
                const root = document.documentElement;
                root.style.setProperty('--emergency-mode', '1');
                
                // Re-enable after 5 seconds
                setTimeout(() => {
                    root.style.removeProperty('--emergency-mode');
                }, 5000);
                
            } catch (e) {
                console.warn('Emergency cleanup failed:', e);
            }
        },

        isElementVisible(element) {
            const rect = element.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
        },

        destroy() {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
            
            if (this.memoryObserver) {
                this.memoryObserver.disconnect();
                this.memoryObserver = null;
            }
        }
    };
})();

// Initialize medium device optimizer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mediumDeviceOptimizer.init();
    });
} else {
    mediumDeviceOptimizer.init();
}

// Enhanced cleanup on page unload for medium devices
window.addEventListener('beforeunload', () => {
    try {
        mediumDeviceOptimizer.destroy();
        
        // Final cleanup for medium devices
        if (mediumDeviceOptimizer.isMediumDevice) {
            mediumDeviceOptimizer.performIntelligentCleanup();
        }
    } catch (e) {
        // Silent cleanup on unload
    }
}, { once: true });
