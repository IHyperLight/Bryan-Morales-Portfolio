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

    // Initialize critical components immediately
    perfMonitor.mark("critical-init-start");
    initializeFilters();
    initializeProjectCarousel();
    // CRITICAL: Initialize scroll effects IMMEDIATELY to prevent projects appearing without animation
    // This must run synchronously before any elements enter viewport
    initializeScrollEffects();
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

// Viewport-based carousel activation system - ROBUSTLY REFACTORED
// This system prevents carousels from consuming resources when not visible,
// significantly improving performance especially on mobile devices.
//
// Key features:
// - Lazy initialization: Carousels only start when they enter the viewport
// - Smart pause/resume: Carousels pause when leaving viewport and resume when returning
// - Sin conflictos con otras pausas (viewport/fullscreen)
// - Memory efficient: Proper cleanup prevents memory leaks
// - Configurable thresholds: 30% visibility required, 50px margin for smooth transitions
// - Robust error handling: Recovery from corrupted states
const carouselViewportObserver = (() => {
    let observer = null;
    const observedCarousels = new Map();
    let isDestroying = false;

    const initObserver = () => {
        if (observer || isDestroying) return observer;

        try {
            observer = new IntersectionObserver(
                (entries) => {
                    if (isDestroying) return;

                    entries.forEach((entry) => {
                        try {
                            const carouselData = observedCarousels.get(
                                entry.target
                            );
                            if (!carouselData || isDestroying) return;

                            const { carouselState, isInitialized } =
                                carouselData;

                            // Validate carousel state
                            if (
                                !carouselState ||
                                typeof carouselState.initialize !== "function"
                            ) {
                                console.warn(
                                    "Invalid carousel state detected, removing from observer"
                                );
                                unobserve(entry.target);
                                return;
                            }

                            if (entry.isIntersecting) {
                                // Carousel enters viewport
                                if (!isInitialized.value) {
                                    // First time initialization
                                    carouselState.initialize();
                                    isInitialized.value = true;
                                } else {
                                    // Resume from viewport pause
                                    carouselState.resumeFromViewportPause();
                                }
                            } else {
                                // Carousel exits viewport
                                if (isInitialized.value) {
                                    carouselState.pauseForViewport();
                                }
                            }
                        } catch (error) {
                            console.warn(
                                "Carousel viewport observer error:",
                                error
                            );
                            // Attempt to remove problematic carousel
                            try {
                                unobserve(entry.target);
                            } catch (e) {
                                console.warn(
                                    "Failed to unobserve problematic carousel:",
                                    e
                                );
                            }
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: "50px 0px", // Start/stop slightly before entering/leaving viewport
                    threshold: 0.3, // 30% of carousel must be visible
                }
            );
        } catch (error) {
            console.error("Failed to create IntersectionObserver:", error);
            observer = null;
        }

        return observer;
    };

    const observe = (projectContainer, carouselState) => {
        if (isDestroying || !projectContainer || !carouselState) return;

        try {
            const obs = initObserver();
            if (!obs) return;

            const isInitialized = { value: false };

            observedCarousels.set(projectContainer, {
                carouselState,
                isInitialized,
            });

            obs.observe(projectContainer);
        } catch (error) {
            console.warn("Failed to observe carousel:", error);
        }
    };

    const unobserve = (projectContainer) => {
        if (!projectContainer) return;

        try {
            if (observer) {
                observer.unobserve(projectContainer);
            }
            observedCarousels.delete(projectContainer);
        } catch (error) {
            console.warn("Failed to unobserve carousel:", error);
        }
    };

    const cleanup = () => {
        isDestroying = true;

        try {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            observedCarousels.clear();
        } catch (error) {
            console.warn("Failed to cleanup viewport observer:", error);
        } finally {
            isDestroying = false;
        }
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

// Initialize carousel for a single project - ROBUSTLY REFACTORED
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

    // State management with validation
    let index = 0;
    const intervalMs = 5000;
    let timer = null;
    let animationFrame = null;
    let startTs = 0;
    let pauseElapsed = 0;
    let paused = false;
    let viewportPaused = false;
    let initialized = false;
    let destroyed = false;
    // Fullscreen/viewport coordination flags
    let pausedByFullscreen = false; // true cuando el modal de pantalla completa pausa el carrusel
    let shouldAutoStart = false; // iniciar autoplay al entrar en viewport o al inicializar
    let isInViewport = false; // estado actual de intersección
    // Handler para sincronizar con el fin de la transición de la barra
    let progressEndHandler = null;

    // Cleanup tracking (separado para mayor control)
    const cleanupFns = new Set();
    const cleanupTimeouts = new Set();
    const cleanupRafs = new Set();

    const validateState = () => {
        if (destroyed) {
            console.warn("Carousel operation on destroyed instance");
            return false;
        }
        return true;
    };

    const setActive = (i, { animate = true, resetProgress = false } = {}) => {
        if (!validateState()) return;

        try {
            const newIndex = (i + slides.length) % slides.length;

            // Only proceed if index actually changed or force reset requested
            if (newIndex === index && !resetProgress) return;

            index = newIndex;

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

            // Always reset progress bar completely on manual changes
            if (resetProgress && progressFill) {
                progressFill.style.transition = "none";
                progressFill.style.width = "0%";
                void progressFill.offsetWidth;
            }
        } catch (error) {
            console.warn("Error in setActive:", error);
        }
    };

    const completeProgressReset = () => {
        if (!validateState()) return;

        try {
            // Stop any ongoing automation immediately
            stopAuto();

            // Force reset progress bar to 0
            if (progressFill) {
                progressFill.style.transition = "none";
                progressFill.style.width = "0%";
                void progressFill.offsetWidth;
            }

            // Reset timing variables
            pauseElapsed = 0;
            startTs = 0;
        } catch (error) {
            console.warn("Error in completeProgressReset:", error);
        }
    };

    const next = () => {
        if (!validateState()) return;
        completeProgressReset();
        setActive(index + 1, { resetProgress: true });
    };

    const prev = () => {
        if (!validateState()) return;
        completeProgressReset();
        setActive(index - 1, { resetProgress: true });
    };

    const stopAuto = () => {
        if (!validateState()) return;

        try {
            // Quitar listener de fin de transición si existe
            if (progressFill && progressEndHandler) {
                progressFill.removeEventListener(
                    "transitionend",
                    progressEndHandler
                );
                progressEndHandler = null;
            }

            if (timer) {
                const t = timer;
                clearTimeout(t);
                cleanupTimeouts.delete(t);
                timer = null;
            }

            if (animationFrame) {
                const raf = animationFrame;
                cancelAnimationFrame(raf);
                cleanupRafs.delete(raf);
                animationFrame = null;
            }

            if (progressFill) {
                // Capturar el ancho actual con más precisión
                const computed = window.getComputedStyle(progressFill);
                const currentWidth = computed.width;

                // Detener la transición inmediatamente
                progressFill.style.transition = "none";
                progressFill.style.width = currentWidth;

                // Forzar reflow para aplicar cambios
                void progressFill.offsetWidth;
            }
        } catch (error) {
            console.warn("Error in stopAuto:", error);
        }
    };

    const startAuto = () => {
        if (!validateState() || viewportPaused) return;

        try {
            // Always stop any existing automation first
            stopAuto();

            // Calculate remaining time, defaulting to full interval if no elapsed time
            const remaining = Math.max(16, intervalMs - pauseElapsed);

            // Set up progress bar animation
            if (progressFill) {
                const currentPct = Math.max(
                    0,
                    Math.min(1, pauseElapsed / intervalMs)
                );

                // Set current position without transition
                progressFill.style.transition = "none";
                progressFill.style.width = `${currentPct * 100}%`;
                void progressFill.offsetWidth; // Force reflow

                // Enable smooth transition to 100%
                progressFill.style.transition = `width ${remaining}ms linear`;

                // Función unificada para avanzar al siguiente slide exactamente al terminar la transición
                let advanced = false;
                const advance = (source) => {
                    if (advanced) return;
                    if (viewportPaused || destroyed || paused) return;
                    advanced = true;

                    // Limpieza previa
                    if (progressFill && progressEndHandler) {
                        progressFill.removeEventListener(
                            "transitionend",
                            progressEndHandler
                        );
                        progressEndHandler = null;
                    }
                    if (timer) {
                        clearTimeout(timer);
                        cleanupTimeouts.delete(timer);
                        timer = null;
                    }
                    if (animationFrame) {
                        cancelAnimationFrame(animationFrame);
                        cleanupRafs.delete(animationFrame);
                        animationFrame = null;
                    }

                    // Reiniciar ciclo
                    pauseElapsed = 0;
                    setActive(index + 1, { resetProgress: true });
                    startAuto();
                };

                // Listener preciso de fin de transición
                progressEndHandler = (e) => {
                    if (
                        e.target === progressFill &&
                        e.propertyName === "width"
                    ) {
                        advance("transitionend");
                    }
                };
                progressFill.addEventListener(
                    "transitionend",
                    progressEndHandler,
                    { once: true }
                );

                // Start progress animation on next frame
                animationFrame = requestAnimationFrame(() => {
                    const raf = animationFrame;
                    if (
                        progressFill &&
                        !viewportPaused &&
                        !destroyed &&
                        !paused
                    ) {
                        progressFill.style.width = "100%";
                    }
                    if (raf != null) cleanupRafs.delete(raf);
                    animationFrame = null;
                });
                cleanupRafs.add(animationFrame);

                // Temporizador de respaldo SOLO para casos extremos donde transitionend no se dispara
                // Aumentamos el margen a 200ms para evitar que se dispare antes de tiempo
                timer = setTimeout(() => {
                    if (!viewportPaused && !destroyed && !paused && !advanced) {
                        advance("timeout-fallback");
                    }
                    if (timer != null) cleanupTimeouts.delete(timer);
                    timer = null;
                }, remaining + 200);
                cleanupTimeouts.add(timer);
            }

            // Set timestamp for elapsed time calculation
            startTs = performance.now() - pauseElapsed;
            // El avance se controla por transitionend; el temporizador anterior ahora es solo respaldo
        } catch (error) {
            console.warn("Error in startAuto:", error);
        }
    };

    const pauseAutoplay = () => {
        if (!validateState() || paused) return;

        try {
            paused = true;

            // Calculate elapsed time more precisely using timestamp
            const now = performance.now();
            const elapsed = startTs ? now - startTs : 0;
            pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));

            // Stop automation and preserve current progress position
            stopAuto();

            // Set progress bar to current position with high precision
            if (progressFill) {
                const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
                progressFill.style.transition = "none";
                progressFill.style.width = `${pct * 100}%`;
                void progressFill.offsetWidth;
            }
        } catch (error) {
            console.warn("Error in pauseAutoplay:", error);
        }
    };

    const resumeAutoplay = () => {
        if (!validateState() || !paused || viewportPaused) return;

        try {
            paused = false;
            startAuto();
        } catch (error) {
            console.warn("Error in resumeAutoplay:", error);
        }
    };

    const pauseForViewport = () => {
        if (!validateState() || viewportPaused) return;

        try {
            viewportPaused = true;
            isInViewport = false;

            // Save current state before pausing
            if (timer && !paused) {
                const elapsed = performance.now() - startTs;
                pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
            }

            stopAuto();

            // Pause progress bar
            if (progressFill) {
                const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
                progressFill.style.transition = "none";
                progressFill.style.width = `${pct * 100}%`;
            }
        } catch (error) {
            console.warn("Error in pauseForViewport:", error);
        }
    };

    const resumeFromViewportPause = () => {
        if (!validateState()) return;

        try {
            viewportPaused = false;
            isInViewport = true;

            // No auto-start if fullscreen is open
            if (pausedByFullscreen) return;

            // If there's a pending auto-start request (e.g., from closing fullscreen), honor it
            if (shouldAutoStart) {
                shouldAutoStart = false;
                paused = false;
                completeProgressReset();
                startAuto();
                return;
            }

            // Otherwise, resume only if not manually paused (e.g., fullscreen)
            if (!paused) {
                startAuto();
            }
        } catch (error) {
            console.warn("Error in resumeFromViewportPause:", error);
        }
    };

    const initialize = () => {
        if (!validateState() || initialized) return;

        try {
            initialized = true;
            isInViewport = true; // initialize solo se llama cuando intersecta

            // Set initial state with complete reset
            if (slides.length > 0) {
                completeProgressReset();
                setActive(0, { resetProgress: true });

                // Si hay una pausa por fullscreen, no iniciar aún
                if (pausedByFullscreen) {
                    shouldAutoStart = true; // iniciar cuando se cierre fullscreen y/o vuelva a viewport
                    return;
                }

                // Start autoplay after a small delay to ensure everything is ready
                const initTimer = setTimeout(() => {
                    if (!viewportPaused && !destroyed && !paused) {
                        startAuto();
                    }
                    cleanupTimeouts.delete(initTimer);
                }, 100);
                cleanupTimeouts.add(initTimer);
            }
        } catch (error) {
            console.warn("Error in initialize:", error);
        }
    };

    // Fullscreen coordination API
    const onFullscreenOpen = () => {
        if (!validateState()) return;

        try {
            pausedByFullscreen = true;

            // Si aún no se ha inicializado, marcar para iniciar luego y simular pausa
            if (!initialized) {
                paused = true;
                shouldAutoStart = true;
                return;
            }

            // Si ya está inicializado, pausar de forma segura
            pauseAutoplay();
        } catch (error) {
            console.warn("Error in onFullscreenOpen:", error);
        }
    };

    const onFullscreenClose = () => {
        if (!validateState()) return;

        try {
            pausedByFullscreen = false;

            // Si está en viewport e inicializado, reanudar inmediatamente
            if (initialized && isInViewport) {
                paused = false;
                shouldAutoStart = false;
                completeProgressReset();
                startAuto();
                return;
            }

            // Si aún no está en viewport o no se ha inicializado, marcar para auto-start posterior
            paused = false;
            shouldAutoStart = true;
        } catch (error) {
            console.warn("Error in onFullscreenClose:", error);
        }
    };

    const resetProgress = () => {
        if (!validateState()) return;

        try {
            if (progressFill) {
                progressFill.style.transition = "none";
                progressFill.style.width = "0%";
                void progressFill.offsetWidth;
            }
        } catch (error) {
            console.warn("Error in resetProgress:", error);
        }
    };

    // Control event listeners
    nextBtn?.addEventListener("click", () => {
        if (!validateState()) return;

        try {
            next();
            // Restart autoplay immediately if not paused
            if (!paused && !viewportPaused) {
                startAuto();
            } else if (paused) {
                resetProgress();
            }
        } catch (error) {
            console.warn("Error in nextBtn click:", error);
        }
    });

    prevBtn?.addEventListener("click", () => {
        if (!validateState()) return;

        try {
            prev();
            // Restart autoplay immediately if not paused
            if (!paused && !viewportPaused) {
                startAuto();
            } else if (paused) {
                resetProgress();
            }
        } catch (error) {
            console.warn("Error in prevBtn click:", error);
        }
    });

    dots.forEach((d, idx) =>
        d.addEventListener("click", () => {
            if (!validateState()) return;

            try {
                completeProgressReset();
                setActive(idx, { resetProgress: true });
                // Restart autoplay immediately if not paused
                if (!paused && !viewportPaused) {
                    startAuto();
                } else if (paused) {
                    resetProgress();
                }
            } catch (error) {
                console.warn("Error in dot click:", error);
            }
        })
    );

    // Teclado (no reanuda si está pausado por viewport o fullscreen)
    media.addEventListener("keydown", (e) => {
        if (!validateState()) return;

        try {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                next();
                if (!paused && !viewportPaused) {
                    startAuto();
                } else if (paused) {
                    resetProgress();
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                prev();
                if (!paused && !viewportPaused) {
                    startAuto();
                } else if (paused) {
                    resetProgress();
                }
            }
        } catch (error) {
            console.warn("Error in keyboard navigation:", error);
        }
    });

    // Click navigation on image (left/right side)
    viewport.addEventListener("click", (e) => {
        if (!validateState()) return;

        try {
            const rect = viewport.getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (e.clientX >= mid) {
                next();
            } else {
                prev();
            }

            if (!paused && !viewportPaused) {
                startAuto();
            } else if (paused) {
                resetProgress();
            }
        } catch (error) {
            console.warn("Error in viewport click:", error);
        }
    });

    // (Pausa por hover eliminada intencionalmente)

    // Adjust progress bar width to match indicators
    const adjustProgressWidth = () => {
        if (!validateState()) return;

        try {
            const indicators = projectContainer.querySelector(
                ".carousel-controls .carousel-indicators"
            );
            const progress = projectContainer.querySelector(
                ".carousel-controls .carousel-progress"
            );
            if (indicators && progress) {
                progress.style.width = `${indicators.offsetWidth}px`;
            }
        } catch (error) {
            console.warn("Error in adjustProgressWidth:", error);
        }
    };

    // Window resize handler with cleanup tracking
    const resizeObserver = new ResizeObserver(() => {
        if (!destroyed) {
            adjustProgressWidth();
        }
    });

    cleanupFns.add(() => {
        resizeObserver.disconnect();
    });

    resizeObserver.observe(projectContainer);
    adjustProgressWidth();

    // Extended carousel state for viewport management
    const carouselState = {
        // Original functions
        pauseAutoplay,
        resumeAutoplay,
        next,
        prev,
        setActive,
        getCurrentIndex: () => index,
        getSlides: () => slides,

        // New viewport-aware functions
        initialize,
        pauseForViewport,
        resumeFromViewportPause,
        onFullscreenOpen,
        onFullscreenClose,

        // State getters
        isInitialized: () => initialized,
        isViewportPaused: () => viewportPaused,
        isDestroyed: () => destroyed,
        isPausedByFullscreen: () => pausedByFullscreen,
        isInViewport: () => isInViewport,

        // Comprehensive cleanup function
        cleanup: () => {
            if (destroyed) return;

            try {
                destroyed = true;

                // Stop all automation
                stopAuto();

                // (Timeouts de hover eliminados)

                // Execute function cleanups
                cleanupFns.forEach((fn) => {
                    try {
                        fn();
                    } catch (error) {
                        console.warn("Error in cleanup fn:", error);
                    }
                });
                cleanupFns.clear();

                // Cancel rAFs
                cleanupRafs.forEach((id) => {
                    try {
                        cancelAnimationFrame(id);
                    } catch {}
                });
                cleanupRafs.clear();

                // Clear timeouts
                cleanupTimeouts.forEach((id) => {
                    try {
                        clearTimeout(id);
                    } catch {}
                });
                cleanupTimeouts.clear();

                // Reset state
                initialized = false;
                paused = false;
                viewportPaused = false;
                pauseElapsed = 0;
                index = 0;

                // Limpieza del carrusel completada (log eliminado para evitar ruido)
            } catch (error) {
                console.warn("Error in carousel cleanup:", error);
            }
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
        // Trigger when at least 5% of the element is visible (more sensitive)
        threshold: 0.05,
        // Trigger animation 100px BEFORE element enters viewport for smooth effect
        // Negative bottom margin means: start observing when element is this far from entering
        rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Mark as animated to prevent re-processing
                if (!entry.target.classList.contains("scroll-animated")) {
                    // Remove inline styles to allow CSS classes to take control
                    entry.target.style.opacity = "";
                    entry.target.style.transform = "";
                    // Apply animation class immediately
                    entry.target.classList.add("scroll-animated");
                    entry.target.classList.remove("scroll-pending");
                }
                // Unobserve after animation to save resources
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll(
        ".glass-card, .certificate-item, .filter-container"
    );

    sections.forEach((section) => {
        // Only apply initial state if not already animated
        if (!section.classList.contains("scroll-animated")) {
            // Los certificados y filtros que ya están visibles deben animarse inmediatamente
            const isCertificateOrFilter =
                section.classList.contains("certificate-item") ||
                section.classList.contains("filter-container");

            if (isCertificateOrFilter) {
                // Verificar si el elemento ya está en viewport al cargar
                const rect = section.getBoundingClientRect();
                const isInViewport =
                    rect.top < window.innerHeight && rect.bottom > 0;

                if (isInViewport) {
                    // Animar inmediatamente sin observar
                    requestAnimationFrame(() => {
                        section.style.opacity = "";
                        section.style.transform = "";
                        section.classList.add("scroll-animated");
                        section.classList.remove("scroll-pending");
                    });
                } else {
                    // Si no está visible, observar normalmente
                    section.classList.add("scroll-pending");
                    observer.observe(section);
                }
            } else {
                // Proyectos siempre observados para animación al scroll
                section.classList.add("scroll-pending");
                observer.observe(section);
            }
        }
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
    // Animation handling now done by IntersectionObserver in initializeScrollEffects
});

// Dynamic styles for keyboard navigation
const style = document.createElement("style");
style.textContent = `
    .keyboard-navigation *:focus {
        outline: 2px solid var(--text-primary) !important;
        outline-offset: 2px !important;
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

        // Clean up carousel viewport observer
        carouselViewportObserver.cleanup();

        // Clean up all carousel states
        const projectItems = performanceCache.projectItems;
        if (projectItems) {
            projectItems.forEach((projectItem) => {
                const media = projectItem.querySelector(".project-media");
                if (media && media._carouselState) {
                    media._carouselState.cleanup();
                }
            });
        }

        // Clean up all managed resources
        performanceManager.cleanup();

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
        if (originalCarousel) {
            if (typeof originalCarousel.onFullscreenOpen === "function") {
                originalCarousel.onFullscreenOpen();
            } else if (typeof originalCarousel.pauseAutoplay === "function") {
                originalCarousel.pauseAutoplay();
            }
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
            if (!originalCarousel) return;
            if (typeof originalCarousel.onFullscreenClose === "function") {
                originalCarousel.onFullscreenClose();
            } else if (typeof originalCarousel.resumeAutoplay === "function") {
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
