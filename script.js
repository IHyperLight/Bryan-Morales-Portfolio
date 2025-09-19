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
    set(element, property = "transform") {
        if (element) element.style.willChange = property;
    },
    clear(element, delay = 100) {
        if (!element) return;
        const timerId = setTimeout(() => {
            element.style.willChange = "auto";
            performanceCache.timers.delete(timerId);
        }, delay);
        performanceCache.timers.add(timerId);
    },
};

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

    // Cache frequently used elements for performance
    performanceCache.body = document.body;
    performanceCache.viewport = document.querySelector(".portfolio-container");
    performanceCache.projectItems = document.querySelectorAll(".project-item");

    // Mobile memory pressure detection
    if ("memory" in performance) {
        try {
            const memoryInfo = performance.memory;
            const memoryPressure =
                memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

            // If memory usage is high, optimize carousel performance
            if (memoryPressure > 0.8) {
                console.warn(
                    "High memory pressure detected, optimizing carousel performance"
                );
                window._carouselMemoryOptimized = true;
            }
        } catch (error) {
            console.warn("Could not access memory info:", error);
        }
    }

    // Listen for memory pressure events (if supported)
    if ("onmemorywarning" in window) {
        window.addEventListener(
            "memorywarning",
            () => {
                console.warn(
                    "Memory warning detected, pausing non-visible carousels"
                );
                window._carouselMemoryOptimized = true;

                // Pause all non-visible carousels
                const projectItems = performanceCache.projectItems;
                if (projectItems) {
                    projectItems.forEach((item) => {
                        const media = item.querySelector(".project-media");
                        if (
                            media?._carouselState &&
                            !isElementInViewport(item)
                        ) {
                            try {
                                media._carouselState.pauseForViewport();
                            } catch (error) {
                                console.warn(
                                    "Error pausing carousel on memory warning:",
                                    error
                                );
                            }
                        }
                    });
                }
            },
            { passive: true }
        );
    }

    // Initialize critical components immediately
    perfMonitor.mark("critical-init-start");
    initializeFilters();
    initializeProjectCarousel();
    perfMonitor.measure("critical-init", "critical-init-start");

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

// Helper function to check if element is in viewport
function isElementInViewport(element) {
    if (!element) return false;
    try {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
                (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
                (window.innerWidth || document.documentElement.clientWidth)
        );
    } catch (error) {
        console.warn("Error checking viewport:", error);
        return false;
    }
}

// Utility functions
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Performance-optimized animation function
function animatePress(el, scale = 0.9, duration = 150) {
    if (!el) return;

    // Use transform for hardware acceleration
    el.style.transform = `scale(${scale}) translateZ(0)`;
    willChangeManager.set(el);

    const timerId = setTimeout(() => {
        el.style.transform = "translateZ(0)";
        willChangeManager.clear(el, 0);
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

// Viewport-based carousel activation system
// This system prevents carousels from consuming resources when not visible,
// significantly improving performance especially on mobile devices.
//
// Key features:
// - Lazy initialization: Carousels only start when they enter the viewport
// - Smart pause/resume: Carousels pause when leaving viewport and resume when returning
// - No conflicts: Works seamlessly with hover pause/resume functionality
// - Memory efficient: Proper cleanup prevents memory leaks
// - Configurable thresholds: 30% visibility required, 50px margin for smooth transitions
// - Mobile optimized: Robust state management prevents timer conflicts
const carouselViewportObserver = (() => {
    let observer = null;
    const observedCarousels = new Map();
    let isCleaningUp = false;

    const initObserver = () => {
        if (observer || isCleaningUp) return observer;

        try {
            observer = new IntersectionObserver(
                (entries) => {
                    if (isCleaningUp) return;

                    entries.forEach((entry) => {
                        const carouselData = observedCarousels.get(
                            entry.target
                        );
                        if (!carouselData) return;

                        const { carouselState, isInitialized } = carouselData;

                        // Validate carousel state before proceeding
                        if (
                            !carouselState ||
                            typeof carouselState.initialize !== "function"
                        ) {
                            console.warn(
                                "Invalid carousel state detected, skipping"
                            );
                            return;
                        }

                        if (entry.isIntersecting) {
                            // Carousel enters viewport
                            if (!isInitialized.value) {
                                // First time initialization
                                requestAnimationFrame(() => {
                                    if (
                                        !isCleaningUp &&
                                        carouselState.initialize
                                    ) {
                                        carouselState.initialize();
                                        isInitialized.value = true;
                                    }
                                });
                            } else {
                                // Resume from viewport pause
                                requestAnimationFrame(() => {
                                    if (
                                        !isCleaningUp &&
                                        carouselState.resumeFromViewportPause
                                    ) {
                                        carouselState.resumeFromViewportPause();
                                    }
                                });
                            }
                        } else {
                            // Carousel exits viewport
                            if (isInitialized.value) {
                                requestAnimationFrame(() => {
                                    if (
                                        !isCleaningUp &&
                                        carouselState.pauseForViewport
                                    ) {
                                        carouselState.pauseForViewport();
                                    }
                                });
                            }
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: "50px 0px", // Start/stop slightly before entering/leaving viewport
                    threshold: [0.1, 0.3, 0.5], // Multiple thresholds for better mobile detection
                }
            );
        } catch (error) {
            console.error("Failed to create IntersectionObserver:", error);
            return null;
        }

        return observer;
    };

    const observe = (projectContainer, carouselState) => {
        if (isCleaningUp || !projectContainer || !carouselState) return;

        const obs = initObserver();
        if (!obs) return;

        const isInitialized = { value: false };

        // Clean up any existing observation
        if (observedCarousels.has(projectContainer)) {
            obs.unobserve(projectContainer);
        }

        observedCarousels.set(projectContainer, {
            carouselState,
            isInitialized,
        });

        try {
            obs.observe(projectContainer);
        } catch (error) {
            console.error("Failed to observe carousel:", error);
            observedCarousels.delete(projectContainer);
        }
    };

    const unobserve = (projectContainer) => {
        if (!projectContainer) return;

        if (observer) {
            try {
                observer.unobserve(projectContainer);
            } catch (error) {
                console.warn("Error unobserving carousel:", error);
            }
        }
        observedCarousels.delete(projectContainer);
    };

    const cleanup = () => {
        isCleaningUp = true;

        if (observer) {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn("Error disconnecting observer:", error);
            }
            observer = null;
        }
        observedCarousels.clear();

        // Reset flag after cleanup
        setTimeout(() => {
            isCleaningUp = false;
        }, 100);
    };

    return { observe, unobserve, cleanup };
})();

// Project carousel with autoplay and pause functionality - Updated for multiple projects
function initializeProjectCarousel() {
    // Use cached project items for better performance
    const projectItems = performanceCache.projectItems;

    projectItems.forEach((projectItem) => {
        initializeSingleCarousel(projectItem);
    });
}

// Initialize carousel for a single project - Mobile Optimized
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

    // State variables with robust initialization
    let index = 0;
    const intervalMs = 5000;
    let timer = null;
    let progressTimer = null;
    let startTs = 0;
    let pauseElapsed = 0;
    let paused = false;
    let hoverExitTO = null;
    let viewportPaused = false;
    let initialized = false;
    let isDestroyed = false;

    // Robust timer cleanup function
    const clearAllTimers = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (progressTimer) {
            clearTimeout(progressTimer);
            progressTimer = null;
        }
        if (hoverExitTO) {
            clearTimeout(hoverExitTO);
            hoverExitTO = null;
        }
    };

    const setActive = (i, { animate = true } = {}) => {
        if (isDestroyed || slides.length === 0) return;

        index = ((i % slides.length) + slides.length) % slides.length;

        slides.forEach((slide, idx) => {
            const isActive = idx === index;
            slide.classList.toggle("is-active", isActive);
            if (isActive) {
                slide.removeAttribute("inert");
            } else {
                slide.setAttribute("inert", "");
            }
        });

        dots.forEach((dot, idx) => {
            dot.classList.toggle("is-active", idx === index);
        });

        willChangeManager.set(viewport);
        willChangeManager.clear(viewport, 300);
    };

    const next = () => {
        if (isDestroyed) return;
        setActive(index + 1);
    };

    const prev = () => {
        if (isDestroyed) return;
        setActive(index - 1);
    };

    const stopAuto = () => {
        clearAllTimers();

        if (progressFill && !isDestroyed) {
            try {
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
            } catch (error) {
                console.warn("Error stopping progress animation:", error);
                if (progressFill) {
                    progressFill.style.width = "0%";
                }
            }
        }
    };

    const startAuto = () => {
        if (isDestroyed || viewportPaused || slides.length === 0) return;

        clearAllTimers();

        const remaining = Math.max(100, intervalMs - pauseElapsed);

        // Animate progress bar
        if (progressFill) {
            try {
                const currentPct = Math.max(
                    0,
                    Math.min(1, pauseElapsed / intervalMs)
                );
                progressFill.style.transition = "none";
                progressFill.style.width = `${currentPct * 100}%`;

                // Force reflow
                void progressFill.offsetWidth;

                progressFill.style.transition = `width ${remaining}ms linear`;

                // Use separate timer for progress animation
                progressTimer = setTimeout(() => {
                    if (!isDestroyed && progressFill && !viewportPaused) {
                        progressFill.style.width = "100%";
                    }
                }, 16);
            } catch (error) {
                console.warn("Error starting progress animation:", error);
            }
        }

        startTs = performance.now() - pauseElapsed;

        // Set main timer for slide change
        timer = setTimeout(() => {
            if (!isDestroyed && !viewportPaused) {
                next();
                pauseElapsed = 0;

                // Restart autoplay with delay to prevent rapid cycling
                setTimeout(() => {
                    if (!isDestroyed && !viewportPaused) {
                        startAuto();
                    }
                }, 50);
            }
        }, remaining);
    };

    const pauseAutoplay = () => {
        if (paused || isDestroyed) return;

        paused = true;

        if (timer) {
            const elapsed = performance.now() - startTs;
            pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
        }

        if (progressFill) {
            try {
                const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
                progressFill.style.transition = "none";
                progressFill.style.width = `${pct * 100}%`;
            } catch (error) {
                console.warn("Error pausing progress:", error);
            }
        }

        stopAuto();
    };

    const resumeAutoplay = () => {
        if (!paused || viewportPaused || isDestroyed) return;

        paused = false;

        // Small delay to prevent immediate restart conflicts
        setTimeout(() => {
            if (!paused && !viewportPaused && !isDestroyed) {
                startAuto();
            }
        }, 50);
    };

    // Viewport-specific pause functions with enhanced validation
    const pauseForViewport = () => {
        if (viewportPaused || isDestroyed) return;

        viewportPaused = true;

        // Save current state before pausing
        if (timer && !paused) {
            try {
                const elapsed = performance.now() - startTs;
                pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
            } catch (error) {
                pauseElapsed = 0;
                console.warn("Error calculating elapsed time:", error);
            }
        }

        stopAuto();

        // Pause progress bar with error handling
        if (progressFill) {
            try {
                const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
                progressFill.style.transition = "none";
                progressFill.style.width = `${pct * 100}%`;
            } catch (error) {
                console.warn("Error pausing viewport progress:", error);
            }
        }
    };

    const resumeFromViewportPause = () => {
        if (!viewportPaused || isDestroyed) return;

        viewportPaused = false;

        // Resume only if not manually paused (hover) and carousel is initialized
        if (!paused && initialized) {
            // Small delay to ensure state consistency
            setTimeout(() => {
                if (!viewportPaused && !paused && !isDestroyed && initialized) {
                    startAuto();
                }
            }, 100);
        }
    };

    // Enhanced initialization function with better error handling
    const initialize = () => {
        if (initialized || isDestroyed) return;

        initialized = true;

        // Set initial state with validation
        if (slides.length > 0) {
            if (progressFill) {
                try {
                    progressFill.style.transition = "none";
                    progressFill.style.width = "0%";
                    void progressFill.offsetWidth;
                } catch (error) {
                    console.warn("Error initializing progress bar:", error);
                }
            }

            setActive(0);

            // Start autoplay after initialization delay
            setTimeout(() => {
                if (!viewportPaused && !isDestroyed && initialized) {
                    startAuto();
                }
            }, 200);
        }
    };

    const resetProgress = () => {
        if (progressFill && !isDestroyed) {
            try {
                progressFill.style.transition = "none";
                progressFill.style.width = "0%";
                pauseElapsed = 0;
            } catch (error) {
                console.warn("Error resetting progress:", error);
            }
        }
    };

    // Control event listeners with enhanced validation
    nextBtn?.addEventListener("click", () => {
        if (isDestroyed) return;

        next();
        pauseElapsed = 0;

        if (paused) {
            resetProgress();
        } else if (!viewportPaused && initialized) {
            setTimeout(() => {
                if (!paused && !viewportPaused && !isDestroyed) {
                    startAuto();
                }
            }, 100);
        }
    });

    prevBtn?.addEventListener("click", () => {
        if (isDestroyed) return;

        prev();
        pauseElapsed = 0;

        if (paused) {
            resetProgress();
        } else if (!viewportPaused && initialized) {
            setTimeout(() => {
                if (!paused && !viewportPaused && !isDestroyed) {
                    startAuto();
                }
            }, 100);
        }
    });

    dots.forEach((d, idx) =>
        d.addEventListener("click", () => {
            if (isDestroyed) return;

            setActive(idx);
            pauseElapsed = 0;

            if (paused) {
                resetProgress();
            } else if (!viewportPaused && initialized) {
                setTimeout(() => {
                    if (!paused && !viewportPaused && !isDestroyed) {
                        startAuto();
                    }
                }, 100);
            }
        })
    );

    // Keyboard navigation
    media.addEventListener("keydown", (e) => {
        if (isDestroyed) return;

        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();

            if (e.key === "ArrowLeft") {
                prev();
            } else {
                next();
            }

            pauseElapsed = 0;

            if (paused) {
                resetProgress();
            } else if (!viewportPaused && initialized) {
                setTimeout(() => {
                    if (!paused && !viewportPaused && !isDestroyed) {
                        startAuto();
                    }
                }, 100);
            }
        }
    });

    // Click navigation on image (left/right side)
    viewport.addEventListener("click", (e) => {
        if (isDestroyed) return;

        const rect = viewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isRightSide = x > rect.width / 2;

        if (isRightSide) {
            next();
        } else {
            prev();
        }
    });

    // Hover pause with improved state management
    const onEnter = () => {
        if (isDestroyed || viewportPaused) return;

        if (hoverExitTO) {
            clearTimeout(hoverExitTO);
            hoverExitTO = null;
        }
        pauseAutoplay();
    };

    const onLeave = () => {
        if (isDestroyed || viewportPaused) return;

        hoverExitTO = setTimeout(() => {
            if (!isDestroyed && !viewportPaused) {
                resumeAutoplay();
            }
            hoverExitTO = null;
        }, 150);
    };

    viewport.addEventListener("pointerenter", onEnter);
    viewport.addEventListener("pointerleave", onLeave);

    // Adjust progress bar width to match indicators
    const adjustProgressWidth = () => {
        if (isDestroyed) return;

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

    // Enhanced carousel state for viewport management
    const carouselState = {
        // Original functions
        pauseAutoplay,
        resumeAutoplay,
        next,
        prev,
        setActive,
        getCurrentIndex: () => index,
        getSlides: () => slides,

        // Viewport-aware functions
        initialize,
        pauseForViewport,
        resumeFromViewportPause,

        // State getters with validation
        isInitialized: () => initialized && !isDestroyed,
        isViewportPaused: () => viewportPaused,
        isHoverPaused: () => paused,
        isDestroyed: () => isDestroyed,

        // Enhanced cleanup function
        cleanup: () => {
            if (isDestroyed) return;

            isDestroyed = true;

            // Clear all timers first
            clearAllTimers();

            // Clean up resize observer
            if (resizeObserver) {
                try {
                    resizeObserver.disconnect();
                } catch (error) {
                    console.warn("Error disconnecting resize observer:", error);
                }
            }

            // Reset progress bar
            if (progressFill) {
                try {
                    progressFill.style.transition = "none";
                    progressFill.style.width = "0%";
                } catch (error) {
                    console.warn("Error resetting progress on cleanup:", error);
                }
            }

            // Reset state
            paused = false;
            viewportPaused = false;
            initialized = false;
            pauseElapsed = 0;
            index = 0;
        },
    };

    // Register with viewport observer instead of auto-initializing
    carouselViewportObserver.observe(projectContainer, carouselState);

    // Expose state for fullscreen functionality
    exposeCarouselState(projectContainer, carouselState);
}

// Event delegation system
const eventDelegator = (() => {
    const delegateMap = new Map();

    function addDelegatedListener(
        container,
        selector,
        event,
        handler,
        options = {}
    ) {
        const key = `${event}-${selector}`;
        if (!delegateMap.has(key)) {
            const delegatedHandler = (e) => {
                const target = e.target.closest(selector);
                if (target && container.contains(target)) {
                    handler.call(target, e);
                }
            };

            container.addEventListener(event, delegatedHandler, options);
            delegateMap.set(key, { container, handler: delegatedHandler });
        }
    }

    return { addDelegatedListener };
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
    },
};

// Memory cleanup on page unload - Enhanced for mobile devices
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

        // Clean up carousel viewport observer
        carouselViewportObserver.cleanup();

        // Clean up all carousel states with enhanced validation
        const projectItems = performanceCache.projectItems;
        if (projectItems) {
            projectItems.forEach((projectItem) => {
                const media = projectItem.querySelector(".project-media");
                if (media?._carouselState?.cleanup) {
                    try {
                        media._carouselState.cleanup();
                    } catch (error) {
                        console.warn(
                            "Error cleaning up carousel state:",
                            error
                        );
                    }
                }
            });
        }

        // Clean up all managed resources
        performanceManager.cleanup();

        // Clear caches
        performanceCache.rafIds.clear();
        performanceCache.timers.clear();

        // Force garbage collection hint for mobile
        if (window.gc) {
            try {
                window.gc();
            } catch (e) {
                // Silently ignore if gc is not available
            }
        }
    },
    { once: true, passive: true }
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

        // Update thumb with maximum hardware acceleration and performance
        const ratio = clientHeight / scrollHeight;
        const thumbH = Math.max(20, track.clientHeight * ratio);
        const maxThumbTop = track.clientHeight - thumbH;
        const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1);
        const top = maxThumbTop * scrollRatio;

        // Use translate3d with will-change for maximum GPU acceleration
        thumb.style.height = `${thumbH}px`;
        thumb.style.transform = `translate3d(0, ${
            Math.round(top * 100) / 100
        }px, 0)`;

        // Dynamic will-change optimization
        if (isDragging) {
            willChangeManager.set(thumb);
        } else {
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
    const SCROLL_THROTTLE = 32; // 30fps - optimal balance of smoothness and performance

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

    // Performance-optimized initialization with RAF scheduler
    const initUpdate = () => {
        updateThumb();
        // Only enable hardware acceleration when needed
        thumb.style.transform += " translateZ(0)";
        thumb.style.backfaceVisibility = "hidden";
        thumb.style.perspective = "1000px";
        // Optimize the container too
        desc.style.transform = "translateZ(0)";
        desc.style.backfaceVisibility = "hidden";
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
