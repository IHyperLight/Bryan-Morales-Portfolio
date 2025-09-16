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

        // Only use will-change on capable devices to reduce memory pressure
        if (capabilities.performanceLevel !== "low" && capabilities.hasGPU) {
            element.style.willChange = property;
            this.activeElements.add(element);
        }
    },

    clear(element, delay = 100) {
        if (!element || !this.activeElements.has(element)) return;

        const timerId = setTimeout(() => {
            if (element.style) {
                element.style.willChange = "auto";
                this.activeElements.delete(element);
            }
            performanceCache.timers.delete(timerId);
        }, delay);
        performanceCache.timers.add(timerId);
    },

    clearAll() {
        // Cleanup function for page unload
        this.activeElements = new WeakSet();
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
        // Mobile-specific detection
        isMobile: false,
        isTouch: false,
        deviceMemory: navigator.deviceMemory || 4,
        connectionType: 'unknown',
        batteryLevel: 1,
        screenDensity: window.devicePixelRatio || 1,
        isLowPowerMode: false,
        mobileType: 'unknown' // 'ios', 'android', 'other'
    };

    // Test GPU acceleration capabilities
    const testGPUSupport = () => {
        try {
            // Advanced mobile detection
            const userAgent = navigator.userAgent.toLowerCase();
            capabilities.isMobile = /mobile|android|iphone|ipad|phone|tablet/.test(userAgent) || 
                                   window.innerWidth <= 768 || 
                                   'ontouchstart' in window ||
                                   navigator.maxTouchPoints > 0;
            
            // Touch capability detection
            capabilities.isTouch = 'ontouchstart' in window || 
                                 navigator.maxTouchPoints > 0 || 
                                 window.DocumentTouch && document instanceof window.DocumentTouch;
            
            // Mobile platform detection
            if (/iphone|ipad|ipod/.test(userAgent)) {
                capabilities.mobileType = 'ios';
            } else if (/android/.test(userAgent)) {
                capabilities.mobileType = 'android';
            } else if (capabilities.isMobile) {
                capabilities.mobileType = 'other';
            }
            
            // Connection detection for mobile optimization
            if (navigator.connection) {
                capabilities.connectionType = navigator.connection.effectiveType || 'unknown';
                capabilities.isLowPowerMode = navigator.connection.saveData || false;
            }
            
            // Battery API for mobile optimization
            if (navigator.getBattery) {
                navigator.getBattery().then(battery => {
                    capabilities.batteryLevel = battery.level;
                    capabilities.isLowPowerMode = capabilities.isLowPowerMode || battery.level < 0.2;
                }).catch(() => {
                    // Silent fail for battery API
                });
            }

            // Test for 3D transform support
            const testEl = document.createElement("div");
            testEl.style.transform = "translate3d(0,0,0)";
            capabilities.hasTransform3D = testEl.style.transform !== "";

            // Test for backdrop-filter support
            capabilities.hasBackdropFilter =
                CSS.supports("backdrop-filter", "blur(1px)") ||
                CSS.supports("-webkit-backdrop-filter", "blur(1px)");

            // Enhanced mobile device detection for low-end classification
            const isOldMobile = /Android [2-4]\.|iPhone.*OS [5-9]_|iPad.*OS [5-9]_/.test(navigator.userAgent);
            const isLowMemoryDevice = capabilities.deviceMemory < 2;
            const isSlowConnection = capabilities.connectionType === 'slow-2g' || capabilities.connectionType === '2g';
            
            // Detect low-end devices with mobile-specific criteria
            capabilities.isLowEndDevice =
                capabilities.hardwareConcurrency < 4 ||
                isLowMemoryDevice ||
                isOldMobile ||
                (capabilities.isMobile && (isSlowConnection || capabilities.isLowPowerMode));

            // Determine performance level with mobile-specific adjustments
            if (capabilities.isLowEndDevice || !capabilities.hasTransform3D) {
                capabilities.performanceLevel = "low";
                capabilities.hasGPU = false;
            } else if (
                capabilities.hardwareConcurrency < 8 ||
                !capabilities.hasBackdropFilter ||
                capabilities.deviceMemory < 8 || // More conservative memory threshold
                (capabilities.isMobile && capabilities.deviceMemory < 4) // Even more conservative for mobile
            ) {
                capabilities.performanceLevel = "medium";
            } else {
                capabilities.performanceLevel = "high";
            }
            
            // Additional mobile performance downgrade
            if (capabilities.isMobile && capabilities.performanceLevel === "high") {
                // Most mobile devices should be medium at most
                capabilities.performanceLevel = "medium";
            }
            
        } catch (e) {
            capabilities.hasGPU = false;
            capabilities.hasTransform3D = false;
            capabilities.performanceLevel = "low";
            capabilities.isMobile = /mobile/i.test(navigator.userAgent);
        }

        return capabilities;
    };

    // Apply performance optimizations based on capabilities
    const applyOptimizations = () => {
        const root = document.documentElement;

        if (!capabilities.hasGPU || capabilities.performanceLevel === "low") {
            // Apply CPU-optimized styles
            root.style.setProperty("--gpu-layer", "scale(1)");
            root.style.setProperty("--gpu-transform3d", "translate(0, 0)");
            root.classList.add("cpu-optimized");
        }

        if (!capabilities.hasBackdropFilter) {
            // Apply backdrop-filter fallbacks
            root.classList.add("no-backdrop-filter");
        }

        if (capabilities.isLowEndDevice) {
            root.classList.add("low-end-device");
        }

        // Mobile-specific optimizations
        if (capabilities.isMobile) {
            root.classList.add("mobile-device");
            
            // Add mobile type specific classes
            if (capabilities.mobileType !== 'unknown') {
                root.classList.add(`mobile-${capabilities.mobileType}`);
            }
            
            // Touch-specific optimizations
            if (capabilities.isTouch) {
                root.classList.add("touch-device");
            }
            
            // Low power mode optimizations
            if (capabilities.isLowPowerMode) {
                root.classList.add("low-power-mode");
            }
            
            // Connection-based optimizations
            if (capabilities.connectionType && capabilities.connectionType !== 'unknown') {
                root.classList.add(`connection-${capabilities.connectionType}`);
            }
        }

        // Set performance level class
        root.classList.add(`performance-${capabilities.performanceLevel}`);
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

    // Mobile-optimized Intersection Observer for carousel visibility
    const createCarouselObserver = () => {
        const capabilities = hardwareCapabilities.getCapabilities();
        
        // Mobile-specific optimizations
        const observerOptions = {
            threshold: capabilities.isMobile ? 0.25 : 0.15, // More conservative threshold for mobile
            rootMargin: capabilities.isMobile ? "50px 0px" : "100px 0px", // Smaller margin for mobile to save battery
        };
        
        return new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const projectContainer = entry.target;
                    const carouselState = projectContainer._carouselState;

                    if (!carouselState) return;

                    // Queue update for throttled processing - longer delay for mobile
                    const updateDelay = capabilities.isMobile ? 100 : 50; // Slower updates for mobile to save battery
                    
                    const update = () => {
                        if (entry.isIntersecting) {
                            // Carousel is visible - resume autoplay if not manually paused
                            visibleCarousels.add(projectContainer);
                            carouselState.setVisibility(true);
                        } else {
                            // Carousel is not visible - pause to save resources
                            visibleCarousels.delete(projectContainer);
                            carouselState.setVisibility(false);
                        }
                    };

                    pendingUpdates.add(update);

                    // Throttle updates for better performance
                    if (!updateTimeout) {
                        updateTimeout = setTimeout(processPendingUpdates, updateDelay);
                    }
                });
            },
            observerOptions
        );
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

// Mobile-specific Image Lazy Loading Manager
const mobileImageManager = (() => {
    const imageObserver = new Map();
    const loadedImages = new WeakSet();
    
    const createImageObserver = () => {
        const capabilities = hardwareCapabilities.getCapabilities();
        
        // More aggressive lazy loading for mobile devices
        const observerOptions = {
            threshold: 0,
            rootMargin: capabilities.isMobile ? "100px 0px" : "200px 0px", // Smaller preload distance on mobile
        };
        
        return new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Skip if already loaded
                    if (loadedImages.has(img)) return;
                    
                    // For mobile, add a small delay to prevent loading all images at once
                    const loadDelay = capabilities.isMobile ? 50 : 0;
                    
                    setTimeout(() => {
                        if (img.dataset.src && !loadedImages.has(img)) {
                            const originalSrc = img.dataset.src;
                            
                            // Create a new image to preload
                            const newImg = new Image();
                            newImg.onload = () => {
                                img.src = originalSrc;
                                img.removeAttribute('data-src');
                                loadedImages.add(img);
                                // Unobserve after loading
                                if (imageObserver.has(img)) {
                                    imageObserver.get(img).unobserve(img);
                                    imageObserver.delete(img);
                                }
                            };
                            newImg.onerror = () => {
                                // Fallback: load anyway
                                img.src = originalSrc;
                                img.removeAttribute('data-src');
                                loadedImages.add(img);
                            };
                            newImg.src = originalSrc;
                        }
                    }, loadDelay);
                }
            });
        }, observerOptions);
    };
    
    const observeImage = (img) => {
        if (!img.dataset.src || loadedImages.has(img)) return;
        
        const observer = createImageObserver();
        imageObserver.set(img, observer);
        observer.observe(img);
    };
    
    const cleanup = () => {
        for (const [img, observer] of imageObserver) {
            observer.unobserve(img);
            observer.disconnect();
        }
        imageObserver.clear();
    };
    
    return {
        observeImage,
        cleanup
    };
})();

// Performance utility: High-frequency RAF scheduler
const rafScheduler = (() => {
    const callbacks = new Set();
    let rafId = null;

    const tick = () => {
        for (const callback of callbacks) {
            try {
                callback();
            } catch (e) {
                console.warn("RAF callback error:", e);
            }
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
            if (!rafId) rafId = requestAnimationFrame(tick);
        },
        remove(callback) {
            callbacks.delete(callback);
        },
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

    // Background video optimization - Enhanced mobile optimization
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) {
        const capabilities = hardwareCapabilities.getCapabilities();
        
        // Enhanced mobile video optimization
        if (capabilities.isMobile) {
            // Check if device should show video based on multiple factors
            const shouldShowVideo = !capabilities.isLowEndDevice && 
                                   !capabilities.isLowPowerMode &&
                                   capabilities.connectionType !== 'slow-2g' &&
                                   capabilities.connectionType !== '2g' &&
                                   capabilities.batteryLevel > 0.3; // Don't show video if battery is low
            
            if (!shouldShowVideo) {
                // Hide video and use solid background
                bgVideo.style.display = 'none';
                document.body.style.background = '#000';
            } else {
                // Mobile-optimized video settings
                bgVideo.preload = 'none'; // Don't preload on mobile
                bgVideo.muted = true;
                bgVideo.playsInline = true;
                
                // Only start video when user interacts (save bandwidth)
                const startVideoOnInteraction = () => {
                    if (bgVideo.paused) {
                        bgVideo.preload = 'metadata';
                        bgVideo.play().catch(() => {
                            // Fallback to background color if video fails
                            bgVideo.style.display = 'none';
                            document.body.style.background = '#000';
                        });
                    }
                    // Remove listener after first interaction
                    document.removeEventListener('touchstart', startVideoOnInteraction, { once: true });
                    document.removeEventListener('click', startVideoOnInteraction, { once: true });
                };
                
                document.addEventListener('touchstart', startVideoOnInteraction, { once: true, passive: true });
                document.addEventListener('click', startVideoOnInteraction, { once: true, passive: true });
            }
        } else {
            // Desktop behavior - apply performance optimizations based on hardware capabilities
            if (capabilities.performanceLevel === "low") {
                bgVideo.style.filter = "brightness(0.6)"; // Simpler filter for low-end devices
            }
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

    // Mobile-optimized touch events
    const capabilities = hardwareCapabilities.getCapabilities();
    if (capabilities.isMobile && capabilities.isTouch) {
        // Use touch events for mobile
        viewport.addEventListener("touchstart", onEnter, { passive: true });
        viewport.addEventListener("touchend", onLeave, { passive: true });
        
        // Add mobile-specific touch handling for carousel navigation
        let touchStartX = 0;
        let touchStartY = 0;
        let isScrolling = false;
        
        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isScrolling = false;
        };
        
        const handleTouchMove = (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const diffX = touchStartX - touchX;
            const diffY = touchStartY - touchY;
            
            // Determine if user is scrolling vertically
            if (Math.abs(diffY) > Math.abs(diffX)) {
                isScrolling = true;
                return;
            }
            
            // Prevent horizontal scroll if swiping on carousel
            if (Math.abs(diffX) > 10 && !isScrolling) {
                e.preventDefault();
            }
        };
        
        const handleTouchEnd = (e) => {
            if (!touchStartX || isScrolling) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const diffX = touchStartX - touchEndX;
            const threshold = 50; // Minimum swipe distance
            
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // Swipe left - next slide
                    next();
                    animatePress(nextBtn);
                } else {
                    // Swipe right - previous slide
                    prev();
                    animatePress(prevBtn);
                }
            }
            
            // Reset values
            touchStartX = 0;
            touchStartY = 0;
            isScrolling = false;
        };
        
        viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
        viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
        viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
    } else {
        // Desktop pointer events
        viewport.addEventListener("pointerenter", onEnter);
        viewport.addEventListener("pointerleave", onLeave);
    }

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
    const passiveEvents = new Set(['scroll', 'wheel', 'touchstart', 'touchmove', 'touchend']);
    const nonPassiveEvents = new Set(['touchstart', 'touchend', 'click']);

    function addDelegatedListener(
        container,
        selector,
        event,
        handler,
        options = {}
    ) {
        const key = `${event}-${selector}`;

        if (delegateMap.has(key)) return; // Prevent duplicate listeners

        // Mobile-specific event optimization
        const capabilities = hardwareCapabilities.getCapabilities();
        let finalOptions = { ...options };
        
        if (capabilities.isMobile) {
            // Auto-detect if event should be passive for better mobile performance
            if (passiveEvents.has(event) && !nonPassiveEvents.has(event)) {
                finalOptions.passive = true;
            }
            
            // Use capture for touch events on mobile for better responsiveness
            if (event.startsWith('touch')) {
                finalOptions.capture = options.capture !== false;
            }
        } else {
            // Desktop behavior
            finalOptions.passive = passiveEvents.has(event);
            finalOptions.capture = false;
        }

        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                // Mobile-specific touch optimization
                if (capabilities.isMobile && capabilities.isTouch && e.type.startsWith('touch')) {
                    // Prevent ghost clicks on mobile
                    if (e.type === 'touchend') {
                        e.preventDefault();
                    }
                }
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
        
        // Clean up mobile image manager
        mobileImageManager.cleanup();
    },

    // Mobile-specific memory management
    mobileMemoryOptimization() {
        const capabilities = hardwareCapabilities.getCapabilities();
        
        if (capabilities.isMobile) {
            // More aggressive cleanup on mobile
            const aggressiveCleanup = () => {
                // Force garbage collection if available (Chrome DevTools)
                if (window.gc) {
                    window.gc();
                }
                
                // Clear unnecessary caches
                performanceCache.rafIds.clear();
                
                // Clean up mobile image manager if low on memory
                if (capabilities.isLowEndDevice || capabilities.deviceMemory < 2) {
                    mobileImageManager.cleanup();
                }
            };
            
            // Run aggressive cleanup periodically on mobile
            const cleanupInterval = setInterval(aggressiveCleanup, 30000); // Every 30 seconds
            this.addTimer(cleanupInterval);
            
            // Clean up on visibility change (when app goes to background)
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    aggressiveCleanup();
                    // Pause all carousels when app goes to background
                    performanceCache.projectItems?.forEach(item => {
                        const carouselState = item._carouselState;
                        if (carouselState) {
                            carouselState.pauseAutoplay();
                        }
                    });
                }
            };
            
            this.addListener(document, 'visibilitychange', handleVisibilityChange, { passive: true });
            
            // Clean up on memory pressure (if supported)
            if ('memory' in performance) {
                const checkMemoryPressure = () => {
                    const memInfo = performance.memory;
                    const memoryUsageRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
                    
                    if (memoryUsageRatio > 0.8) { // 80% memory usage
                        aggressiveCleanup();
                    }
                };
                
                const memoryCheckInterval = setInterval(checkMemoryPressure, 10000); // Every 10 seconds
                this.addTimer(memoryCheckInterval);
            }
        }
    }
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

// Initialize performance manager cleanup on page unload
window.addEventListener('beforeunload', () => {
    performanceManager.cleanup();
});

// Initialize mobile memory optimization
performanceManager.mobileMemoryOptimization();
