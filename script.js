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
                } catch (e) {}
            }
        },
    };
})();

const performanceCache = {
    viewport: null,
    projectItems: null,
    timers: new Set(),
};

const willChangeManager = {
    pending: new WeakMap(),
    set(element, property = "transform") {
        if (!element) return;
        const timerId = this.pending.get(element);
        if (timerId) {
            clearTimeout(timerId);
            performanceCache.timers.delete(timerId);
            this.pending.delete(element);
        }
        element.style.willChange = property;
    },
    clear(element, delay = 100) {
        if (!element || this.pending.has(element)) return;
        const timerId = setTimeout(() => {
            element.style.willChange = "auto";
            performanceCache.timers.delete(timerId);
            this.pending.delete(element);
        }, delay);
        this.pending.set(element, timerId);
        performanceCache.timers.add(timerId);
    },
};

const rafScheduler = (() => {
    const pending = new Set();
    let rafId = null;

    const tick = () => {
        rafId = null;
        const batch = Array.from(pending);
        pending.clear();
        for (const callback of batch) {
            try {
                callback();
            } catch (e) {
                console.warn("RAF callback error:", e);
            }
        }
    };

    return {
        schedule(callback) {
            pending.add(callback);
            if (!rafId) rafId = requestAnimationFrame(tick);
        },
        cancel(callback) {
            pending.delete(callback);
        },
    };
})();

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
            setTimeout(
                () => runTasks({ timeRemaining: () => 5, didTimeout: false }),
                0,
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

    performanceCache.viewport = document.querySelector(".portfolio-container");
    performanceCache.projectItems = document.querySelectorAll(".project-item");

    perfMonitor.mark("critical-init-start");

    initializeThemeToggle();
    initializeProjectCarousel();
    initializeScrollEffects();
    perfMonitor.measure("critical-init", "critical-init-start");

    idleScheduler.schedule(() => {
        perfMonitor.mark("idle-init-start");
        initializeContactButtons();
        initializeSocialButtons();
        initializeDownloadButtons();
        initializeFullscreenModal();
        initializeNavigationMenu();
        initializeCertificateLinks();
        initializeProjectLink();
        initializeProjectTechTagIcons();
        initializeTechStackDivider();
        initializeScrollTopButton();
        initializeDetailGallery();
        initializeContactForm();
        perfMonitor.measure("idle-init", "idle-init-start");
        perfMonitor.measure("total-init", "dom-ready");
    });
});

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function animatePress(el, scale = 0.9, duration = 150) {
    if (!el) return;

    el.style.transform = `scale(${scale}) translateZ(0)`;
    willChangeManager.set(el);

    const timerId = setTimeout(() => {
        el.style.transform = "translateZ(0)";
        willChangeManager.clear(el, 0);
        performanceCache.timers.delete(timerId);
    }, duration);

    performanceCache.timers.add(timerId);
}

function applyScrollFade(element) {
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    if (scrollHeight <= clientHeight + 2) {
        element.style.maskImage = "none";
        element.style.webkitMaskImage = "none";
        return;
    }

    const threshold = 20;
    const topFade = Math.min(scrollTop / threshold, 1);
    const bottomFade = Math.min(
        (scrollHeight - clientHeight - scrollTop) / threshold,
        1,
    );

    let gradient;
    if (scrollTop <= 5) {
        gradient = `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 85%, rgba(0,0,0,${
            bottomFade * 0.15
        }) 95%, rgba(0,0,0,0) 100%)`;
    } else if (scrollTop >= scrollHeight - clientHeight - 5) {
        gradient = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${
            topFade * 0.15
        }) 5%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 100%)`;
    } else {
        gradient = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${
            topFade * 0.2
        }) 4%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 88%, rgba(0,0,0,${
            bottomFade * 0.2
        }) 96%, rgba(0,0,0,0) 100%)`;
    }

    element.style.maskImage = gradient;
    element.style.webkitMaskImage = gradient;
}

function attachCustomScrollbar(
    scrollEl,
    track,
    thumb,
    { onUpdate, reserveSpace = false } = {},
) {
    if (!scrollEl || !track || !thumb) return null;

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    const update = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollEl;
        const hasOverflow = scrollHeight > clientHeight + 2;

        const indicator = track.parentElement;
        if (indicator) {
            if (reserveSpace) {
                indicator.style.visibility = hasOverflow ? "visible" : "hidden";
            } else {
                indicator.style.display = hasOverflow ? "block" : "none";
            }
        }

        if (!hasOverflow) {
            thumb.style.height = "0px";
            thumb.style.transform = "translateY(0)";
        } else {
            const ratio = clientHeight / scrollHeight;
            const thumbH = Math.max(20, track.clientHeight * ratio);
            const maxThumbTop = track.clientHeight - thumbH;
            const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1);

            thumb.style.height = `${thumbH}px`;
            thumb.style.transform = `translate3d(0, ${
                Math.round(maxThumbTop * scrollRatio * 100) / 100
            }px, 0)`;

            if (isDragging) {
                willChangeManager.set(thumb);
            } else {
                willChangeManager.clear(thumb);
            }
        }

        onUpdate?.({ hasOverflow, scrollTop, scrollHeight, clientHeight });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const thumbHeight = parseFloat(thumb.style.height) || 20;
        const maxThumbTop = track.clientHeight - thumbHeight;
        if (maxThumbTop <= 0) return;

        const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
        if (maxScroll <= 0) return;

        const ratio = (e.clientY - startY) / maxThumbTop;
        scrollEl.scrollTop = Math.max(
            0,
            Math.min(maxScroll, startScrollTop + ratio * maxScroll),
        );

        e.preventDefault();
    };

    const handleMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        document.body.style.userSelect = "";
        document.body.style.pointerEvents = "";
        thumb.style.pointerEvents = "";
        track.style.pointerEvents = "";
        thumb.style.transition = "";

        scrollEl.style.scrollBehavior = "smooth";
        e.preventDefault();
    };

    thumb.addEventListener(
        "mousedown",
        (e) => {
            if (e.button !== 0 || e.target !== thumb) return;

            isDragging = true;
            startY = e.clientY;
            startScrollTop = scrollEl.scrollTop;

            document.addEventListener("mousemove", handleMouseMove, {
                passive: false,
            });
            document.addEventListener("mouseup", handleMouseUp, {
                passive: false,
            });

            document.body.style.userSelect = "none";
            document.body.style.pointerEvents = "none";
            thumb.style.pointerEvents = "auto";
            track.style.pointerEvents = "auto";
            thumb.style.transition = "none";

            scrollEl.style.scrollBehavior = "auto";

            e.preventDefault();
            e.stopPropagation();
        },
        { passive: false },
    );

    track.addEventListener(
        "click",
        (e) => {
            if (e.target === thumb || isDragging) return;

            const rect = track.getBoundingClientRect();
            const clickRatio = Math.max(
                0,
                Math.min(1, (e.clientY - rect.top) / track.clientHeight),
            );
            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;

            scrollEl.style.scrollBehavior = "smooth";
            scrollEl.scrollTo({ top: clickRatio * maxScroll });

            e.preventDefault();
        },
        { passive: false },
    );

    scrollEl.addEventListener("scroll", () => rafScheduler.schedule(update), {
        passive: true,
    });
    window.addEventListener(
        "resize",
        debounce(() => rafScheduler.schedule(update), 100),
        {
            passive: true,
        },
    );

    scrollEl.style.scrollBehavior = "smooth";

    return { update };
}

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
                                entry.target,
                            );
                            if (!carouselData || isDestroying) return;

                            const { carouselState, isInitialized } =
                                carouselData;

                            if (
                                !carouselState ||
                                typeof carouselState.initialize !== "function"
                            ) {
                                console.warn(
                                    "Invalid carousel state detected, removing from observer",
                                );
                                unobserve(entry.target);
                                return;
                            }

                            if (entry.isIntersecting) {
                                if (!isInitialized.value) {
                                    carouselState.initialize();
                                    isInitialized.value = true;
                                } else {
                                    carouselState.resumeFromViewportPause();
                                }
                            } else {
                                if (isInitialized.value) {
                                    carouselState.pauseForViewport();
                                }
                            }
                        } catch (error) {
                            console.warn(
                                "Carousel viewport observer error:",
                                error,
                            );
                            try {
                                unobserve(entry.target);
                            } catch (e) {
                                console.warn(
                                    "Failed to unobserve problematic carousel:",
                                    e,
                                );
                            }
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: "50px 0px",
                    threshold: 0.3,
                },
            );
        } catch (error) {
            console.error("Failed to create IntersectionObserver:", error);
            observer = null;
        }

        return observer;
    };

    const observe = (target, carouselState) => {
        if (isDestroying || !target || !carouselState) return;

        try {
            const obs = initObserver();
            if (!obs) return;

            const isInitialized = { value: false };

            observedCarousels.set(target, {
                carouselState,
                isInitialized,
            });

            obs.observe(target);
        } catch (error) {
            console.warn("Failed to observe carousel:", error);
        }
    };

    const unobserve = (target) => {
        if (!target) return;

        try {
            if (observer) {
                observer.unobserve(target);
            }
            observedCarousels.delete(target);
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

function initializeProjectCarousel() {
    const projectItems = performanceCache.projectItems;

    projectItems.forEach((projectItem) => {
        initializeSingleCarousel(projectItem);
    });
}

function initializeSingleCarousel(projectContainer) {
    const media = projectContainer.querySelector(".project-media");
    if (!media) return;

    const viewport = media.querySelector(".carousel-viewport");
    const slides = Array.from(media.querySelectorAll(".carousel-slide"));
    const nextBtn = projectContainer.querySelector(
        ".carousel-controls .carousel-btn.next",
    );
    const prevBtn = projectContainer.querySelector(
        ".carousel-controls .carousel-btn.prev",
    );
    const dots = Array.from(
        projectContainer.querySelectorAll(".carousel-controls .carousel-dot"),
    );
    const progressFill = projectContainer.querySelector(
        ".carousel-controls .carousel-progress-fill",
    );

    if (!viewport || slides.length === 0) return;

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
    let pausedByFullscreen = false;
    let shouldAutoStart = false;
    let isInViewport = false;
    let wasManuallyPausedBeforeFullscreen = false;
    let progressEndHandler = null;

    let pageHidden = false;
    let hiddenTimestamp = 0;

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
            stopAuto();

            if (progressFill) {
                progressFill.style.transition = "none";
                progressFill.style.width = "0%";
                void progressFill.offsetWidth;
            }

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
            if (progressFill && progressEndHandler) {
                progressFill.removeEventListener(
                    "transitionend",
                    progressEndHandler,
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
                const computed = window.getComputedStyle(progressFill);
                const currentWidth = computed.width;

                progressFill.style.transition = "none";
                progressFill.style.width = currentWidth;

                void progressFill.offsetWidth;

                const track = progressFill.parentElement;
                if (track && track.clientWidth > 0) {
                    const currentPx = parseFloat(currentWidth) || 0;
                    const totalPx = track.clientWidth;
                    const currentPct = Math.max(
                        0,
                        Math.min(1, currentPx / totalPx),
                    );
                    pauseElapsed = Math.round(currentPct * intervalMs);
                }
            }
        } catch (error) {
            console.warn("Error in stopAuto:", error);
        }
    };
    const startAuto = () => {
        if (!validateState() || viewportPaused || pageHidden) return;

        try {
            stopAuto();

            if (document.hidden) {
                pageHidden = true;
                return;
            }

            const remaining = Math.max(16, intervalMs - pauseElapsed);

            if (progressFill) {
                const currentPct = Math.max(
                    0,
                    Math.min(1, pauseElapsed / intervalMs),
                );

                progressFill.style.transition = "none";
                progressFill.style.width = `${currentPct * 100}%`;
                void progressFill.offsetWidth;

                progressFill.style.transition = `width ${remaining}ms linear`;

                let advanced = false;
                const advance = (source) => {
                    if (advanced) return;
                    if (viewportPaused || destroyed || paused || pageHidden)
                        return;
                    advanced = true;

                    if (progressFill && progressEndHandler) {
                        progressFill.removeEventListener(
                            "transitionend",
                            progressEndHandler,
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

                    if (document.hidden) {
                        pageHidden = true;
                        pauseElapsed = 0;
                        return;
                    }

                    pauseElapsed = 0;
                    setActive(index + 1, { resetProgress: true });

                    if (
                        !viewportPaused &&
                        !destroyed &&
                        !paused &&
                        !pageHidden
                    ) {
                        startAuto();
                    }
                };

                progressEndHandler = (e) => {
                    if (
                        e.target === progressFill &&
                        e.propertyName === "width" &&
                        !document.hidden
                    ) {
                        advance("transitionend");
                    }
                };
                progressFill.addEventListener(
                    "transitionend",
                    progressEndHandler,
                    { once: true },
                );

                animationFrame = requestAnimationFrame(() => {
                    const raf = animationFrame;
                    if (
                        progressFill &&
                        !viewportPaused &&
                        !destroyed &&
                        !paused &&
                        !document.hidden
                    ) {
                        progressFill.style.width = "100%";
                    }
                    if (raf != null) cleanupRafs.delete(raf);
                    animationFrame = null;
                });
                cleanupRafs.add(animationFrame);

                timer = setTimeout(() => {
                    if (
                        !viewportPaused &&
                        !destroyed &&
                        !paused &&
                        !advanced &&
                        !document.hidden
                    ) {
                        advance("timeout-fallback");
                    }
                    if (timer != null) cleanupTimeouts.delete(timer);
                    timer = null;
                }, remaining + 250);
                cleanupTimeouts.add(timer);
            }

            startTs = performance.now() - pauseElapsed;
        } catch (error) {
            console.warn("Error in startAuto:", error);
        }
    };

    const pauseAutoplay = () => {
        if (!validateState() || paused) return;

        try {
            paused = true;

            const now = performance.now();
            const elapsed = startTs ? now - startTs : 0;

            if (progressFill) {
                const computed = window.getComputedStyle(progressFill);
                const track = progressFill.parentElement;
                if (track && track.clientWidth > 0) {
                    const currentPx = parseFloat(computed.width) || 0;
                    const totalPx = track.clientWidth;
                    const actualPct = Math.max(
                        0,
                        Math.min(1, currentPx / totalPx),
                    );

                    const calculatedElapsed = Math.max(
                        0,
                        Math.min(intervalMs, elapsed),
                    );
                    const actualElapsed = Math.round(actualPct * intervalMs);
                    pauseElapsed = Math.max(calculatedElapsed, actualElapsed);
                } else {
                    pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
                }
            } else {
                pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
            }

            stopAuto();

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

            if (startTs && !paused) {
                const now = performance.now();
                const elapsed = now - startTs;

                if (progressFill) {
                    const computed = window.getComputedStyle(progressFill);
                    const track = progressFill.parentElement;
                    if (track && track.clientWidth > 0) {
                        const currentPx = parseFloat(computed.width) || 0;
                        const totalPx = track.clientWidth;
                        const actualPct = Math.max(
                            0,
                            Math.min(1, currentPx / totalPx),
                        );

                        const calculatedElapsed = Math.max(
                            0,
                            Math.min(intervalMs, elapsed),
                        );
                        const actualElapsed = Math.round(
                            actualPct * intervalMs,
                        );
                        pauseElapsed = Math.max(
                            calculatedElapsed,
                            actualElapsed,
                        );
                    } else {
                        pauseElapsed = Math.max(
                            0,
                            Math.min(intervalMs, elapsed),
                        );
                    }
                } else {
                    pauseElapsed = Math.max(0, Math.min(intervalMs, elapsed));
                }
            }

            stopAuto();

            if (progressFill) {
                const pct = Math.max(0, Math.min(1, pauseElapsed / intervalMs));
                progressFill.style.transition = "none";
                progressFill.style.width = `${pct * 100}%`;
                void progressFill.offsetWidth;
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

            if (pausedByFullscreen) return;

            if (shouldAutoStart) {
                shouldAutoStart = false;
                paused = false;
                completeProgressReset();
                startAuto();
                return;
            }

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
            isInViewport = true;

            if (slides.length > 0) {
                completeProgressReset();
                setActive(0, { resetProgress: true });

                if (pausedByFullscreen) {
                    shouldAutoStart = true;
                    return;
                }

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

    const onFullscreenOpen = () => {
        if (!validateState()) return;

        try {
            wasManuallyPausedBeforeFullscreen = paused;
            pausedByFullscreen = true;

            if (!initialized) {
                paused = true;
                shouldAutoStart = !wasManuallyPausedBeforeFullscreen;
                return;
            }

            pauseAutoplay();
        } catch (error) {
            console.warn("Error in onFullscreenOpen:", error);
        }
    };

    const onFullscreenClose = () => {
        if (!validateState()) return;

        try {
            pausedByFullscreen = false;

            if (wasManuallyPausedBeforeFullscreen) {
                paused = true;
                shouldAutoStart = false;
                wasManuallyPausedBeforeFullscreen = false;
                return;
            }

            if (initialized && isInViewport) {
                paused = false;
                shouldAutoStart = false;
                completeProgressReset();
                startAuto();
                return;
            }

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

    const handleVisibilityChange = () => {
        if (!validateState()) return;

        try {
            const isHidden = document.hidden;

            if (isHidden && !pageHidden) {
                pageHidden = true;
                hiddenTimestamp = performance.now();

                if (
                    initialized &&
                    isInViewport &&
                    !viewportPaused &&
                    !paused &&
                    !pausedByFullscreen
                ) {
                    if (startTs) {
                        const elapsed = performance.now() - startTs;
                        pauseElapsed = Math.max(
                            0,
                            Math.min(intervalMs, elapsed),
                        );
                    }

                    stopAuto();
                }
            } else if (!isHidden && pageHidden) {
                pageHidden = false;

                if (
                    initialized &&
                    isInViewport &&
                    !viewportPaused &&
                    !paused &&
                    !pausedByFullscreen
                ) {
                    const timeHidden = performance.now() - hiddenTimestamp;

                    if (timeHidden > 100) {
                        completeProgressReset();

                        const recalibrationTimer = setTimeout(() => {
                            if (
                                !destroyed &&
                                !viewportPaused &&
                                !paused &&
                                !pausedByFullscreen
                            ) {
                                startAuto();
                            }
                            cleanupTimeouts.delete(recalibrationTimer);
                        }, 50);
                        cleanupTimeouts.add(recalibrationTimer);
                    } else {
                        startAuto();
                    }
                }

                hiddenTimestamp = 0;
            }
        } catch (error) {
            console.warn("Error in handleVisibilityChange:", error);
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    cleanupFns.add(() => {
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
    });

    nextBtn?.addEventListener("click", () => {
        if (!validateState()) return;

        try {
            next();
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
                if (!paused && !viewportPaused) {
                    startAuto();
                } else if (paused) {
                    resetProgress();
                }
            } catch (error) {
                console.warn("Error in dot click:", error);
            }
        }),
    );

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

    const adjustProgressWidth = () => {
        if (!validateState()) return;

        try {
            const indicators = projectContainer.querySelector(
                ".carousel-controls .carousel-indicators",
            );
            const progress = projectContainer.querySelector(
                ".carousel-controls .carousel-progress",
            );
            if (indicators && progress) {
                progress.style.width = `${indicators.offsetWidth}px`;
            }
        } catch (error) {
            console.warn("Error in adjustProgressWidth:", error);
        }
    };

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

    const carouselState = {
        pauseAutoplay,
        resumeAutoplay,
        next,
        prev,
        setActive,

        isPaused: () => paused,
        isViewportPaused: () => viewportPaused,

        togglePause: () => {
            if (!validateState()) return paused;

            if (paused) {
                paused = false;
                if (!viewportPaused && !pausedByFullscreen && initialized) {
                    startAuto();
                }
                return false;
            } else {
                pauseAutoplay();
                return true;
            }
        },

        initialize,
        pauseForViewport,
        resumeFromViewportPause,
        onFullscreenOpen,
        onFullscreenClose,

        cleanup: () => {
            if (destroyed) return;

            try {
                stopAuto();

                destroyed = true;

                cleanupFns.forEach((fn) => {
                    try {
                        fn();
                    } catch (error) {
                        console.warn("Error in cleanup fn:", error);
                    }
                });
                cleanupFns.clear();

                cleanupRafs.forEach((id) => {
                    try {
                        cancelAnimationFrame(id);
                    } catch {}
                });
                cleanupRafs.clear();

                cleanupTimeouts.forEach((id) => {
                    try {
                        clearTimeout(id);
                    } catch {}
                });
                cleanupTimeouts.clear();

                initialized = false;
                paused = false;
                viewportPaused = false;
                pauseElapsed = 0;
                index = 0;
            } catch (error) {
                console.warn("Error in carousel cleanup:", error);
            }
        },
    };

    carouselViewportObserver.observe(media, carouselState);

    exposeCarouselState(projectContainer, carouselState);
}

const eventDelegator = (() => {
    const delegateMap = new Map();

    function addDelegatedListener(
        container,
        selector,
        event,
        handler,
        options = {},
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

function initializeContactButtons() {
    const container = performanceCache.viewport;
    if (!container) return;

    eventDelegator.addDelegatedListener(
        container,
        ".contact-btn",
        "click",
        function () {
            animatePress(this);
            const href = this.getAttribute("data-href");
            if (!href || href === "#") return;

            if (/^(mailto|tel):/i.test(href)) {
                window.location.href = href;
                return;
            }
            window.open(href, "_blank", "noopener,noreferrer");
        },
        { passive: false },
    );
}

function initializeSocialButtons() {
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
                window.open(url, "_blank", "noopener,noreferrer");
            }
        },
        { passive: false },
    );
}

function initializeNavigationMenu() {
    const menuButton = document.querySelector(".menu-button");
    const navMenu = document.querySelector(".nav-menu");
    const navMenuOverlay = document.querySelector(".nav-menu-overlay");
    const navMenuList = document.querySelector(".nav-menu-list");

    if (!menuButton || !navMenu || !navMenuList) return;

    if (navMenuList.dataset.initialized === "true") {
        if (navMenuList.dataset.navLocked === "true") {
            delete navMenuList.dataset.navLocked;
            navMenuList.style.pointerEvents = "";
            navMenuList.removeAttribute("aria-disabled");
        }
        if (menuButton.dataset.navLocked === "true") {
            delete menuButton.dataset.navLocked;
            menuButton.removeAttribute("aria-disabled");
            menuButton.style.pointerEvents = "";
            if (typeof menuButton.disabled === "boolean") {
                menuButton.disabled = false;
            }
        }
        return;
    }
    navMenuList.dataset.initialized = "true";

    let fadeObserver = null;
    let fadeScrollHandler = null;

    const navInteractionState = {
        active: false,
        releaseTimer: null,
        timers: new Set(),
        rafId: null,
    };
    const clearNavigationTimers = () => {
        navInteractionState.timers.forEach((id) => {
            clearTimeout(id);
        });
        navInteractionState.timers.clear();
    };

    const stopNavigationRaf = () => {
        if (navInteractionState.rafId !== null) {
            cancelAnimationFrame(navInteractionState.rafId);
            navInteractionState.rafId = null;
        }
    };

    const setNavigationPointerState = (locked) => {
        if (navMenuList) {
            if (locked) {
                navMenuList.dataset.navLocked = "true";
                navMenuList.style.pointerEvents = "none";
                navMenuList.setAttribute("aria-disabled", "true");
            } else {
                delete navMenuList.dataset.navLocked;
                navMenuList.style.pointerEvents = "";
                navMenuList.removeAttribute("aria-disabled");
            }
        }

        if (menuButton) {
            if (locked) {
                menuButton.dataset.navLocked = "true";
                menuButton.setAttribute("aria-disabled", "true");
                menuButton.style.pointerEvents = "none";
                if (typeof menuButton.disabled === "boolean") {
                    menuButton.disabled = true;
                }
            } else {
                delete menuButton.dataset.navLocked;
                menuButton.removeAttribute("aria-disabled");
                menuButton.style.pointerEvents = "";
                if (typeof menuButton.disabled === "boolean") {
                    menuButton.disabled = false;
                }
            }
        }
    };

    const scheduleNavigationTask = (callback, delay) => {
        const timerId = setTimeout(() => {
            navInteractionState.timers.delete(timerId);
            try {
                callback();
            } catch (error) {
                console.error("Navigation task error:", error);
                releaseNavigationLock("task-error", { force: true });
            }
        }, delay);

        navInteractionState.timers.add(timerId);
        return timerId;
    };

    const releaseNavigationLock = (
        reason = "complete",
        { force = false } = {},
    ) => {
        if (!navInteractionState.active && !force) {
            if (navInteractionState.releaseTimer) {
                clearTimeout(navInteractionState.releaseTimer);
                navInteractionState.releaseTimer = null;
            }
            return;
        }

        if (navInteractionState.releaseTimer) {
            clearTimeout(navInteractionState.releaseTimer);
            navInteractionState.releaseTimer = null;
        }

        clearNavigationTimers();

        stopNavigationRaf();

        navInteractionState.active = false;
        setNavigationPointerState(false);
    };

    const acquireNavigationLock = (
        reason = "navigation",
        fallbackMs = 6000,
    ) => {
        if (navInteractionState.active) {
            return false;
        }

        navInteractionState.active = true;

        clearNavigationTimers();
        stopNavigationRaf();

        setNavigationPointerState(true);

        if (navInteractionState.releaseTimer) {
            clearTimeout(navInteractionState.releaseTimer);
        }

        navInteractionState.releaseTimer = setTimeout(() => {
            releaseNavigationLock("timeout", { force: true });
        }, fallbackMs);

        return true;
    };

    const monitorScrollCompletion = (targetPosition) => {
        let stableFrames = 0;
        let lastY = window.scrollY;
        let checksCount = 0;
        const tolerance = 2;
        const maxChecks = 180;

        const checkScroll = () => {
            if (!navInteractionState.active) {
                navInteractionState.rafId = null;
                return;
            }

            checksCount++;
            const currentY = window.scrollY;

            const scrollStopped = Math.abs(currentY - lastY) <= 0.5;
            lastY = currentY;

            const nearTarget = Math.abs(currentY - targetPosition) <= tolerance;

            if (nearTarget || scrollStopped) {
                stableFrames += 1;
            } else {
                stableFrames = 0;
            }

            if (stableFrames >= 6 || checksCount >= maxChecks) {
                releaseNavigationLock("stabilized");
                return;
            }

            if (navInteractionState.active) {
                navInteractionState.rafId = requestAnimationFrame(checkScroll);
            }
        };

        navInteractionState.rafId = requestAnimationFrame(checkScroll);
    };

    const getSections = () => {
        if (Array.isArray(window.PORTFOLIO_SECTIONS)) {
            return window.PORTFOLIO_SECTIONS;
        }

        const fallback = [
            {
                id: "profile-section",
                page: "about.html",
                title: "🪄 About Me",
                category: null,
                description: "",
            },
        ];

        document
            .querySelectorAll(".project-item[id^='project-']")
            .forEach((project) => {
                fallback.push({
                    id: project.id,
                    page: `${project.id.replace(/^project-/, "")}.html`,
                    title: project.dataset.projectTitle || "Untitled Project",
                    category: project.dataset.projectCategory || "Project",
                    description: project.dataset.projectDescription || "",
                });
            });

        return fallback;
    };

    const populateMenu = () => {
        navMenuList.replaceChildren();

        const currentPage = document.body.dataset.page || "index.html";

        getSections().forEach((section) => {
            const { id, page, title, category, description } = section;

            const li = document.createElement("li");
            const link = document.createElement("a");

            link.href = page;
            link.className = "nav-menu-item";
            link.dataset.target = id;

            if (page === currentPage) {
                link.setAttribute("aria-current", "page");
            }

            const content = document.createElement("div");
            content.className = "nav-item-content";

            const titleEl = document.createElement("span");
            titleEl.className = "nav-item-title";
            titleEl.textContent = title;
            content.appendChild(titleEl);

            if (!category) {
                link.appendChild(content);
                li.appendChild(link);
                navMenuList.appendChild(li);
                return;
            }

            const metaEl = document.createElement("div");
            metaEl.className = "nav-item-meta";

            const iconWrapper = document.createElement("div");
            iconWrapper.className = "nav-item-icon";
            const icon = document.createElement("img");
            const isDesignProject =
                category.toLowerCase().includes("design") ||
                category.toLowerCase().includes("ui/ux");
            icon.src = isDesignProject
                ? "assets/icons/design.svg"
                : "assets/icons/code.svg";
            icon.alt = "";
            icon.setAttribute("aria-hidden", "true");
            icon.width = 16;
            icon.height = 16;
            icon.loading = "lazy";
            icon.decoding = "async";
            iconWrapper.appendChild(icon);

            const categoryEl = document.createElement("p");
            categoryEl.className = "nav-item-category";

            const strong = document.createElement("strong");
            strong.textContent = category;

            const separator = document.createElement("span");
            separator.className = "separator";
            separator.textContent = " · ";

            const descText = document.createTextNode(description);

            categoryEl.appendChild(strong);
            categoryEl.appendChild(separator);
            categoryEl.appendChild(descText);

            metaEl.appendChild(iconWrapper);
            metaEl.appendChild(categoryEl);

            content.appendChild(metaEl);

            link.appendChild(content);
            li.appendChild(link);
            navMenuList.appendChild(li);
        });
    };

    const openMenu = () => {
        if (navInteractionState.active) return;

        navMenu.classList.add("active");
        document.body.classList.add("menu-open");
        menuButton.classList.add("active");
        menuButton.setAttribute("aria-label", "Close menu");

        const menuItems = navMenuList.querySelectorAll("li");
        menuItems.forEach((item, index) => {
            item.style.animationDelay = `${0.05 + index * 0.05}s`;
        });
    };

    const closeMenu = ({ preserveLock = false } = {}) => {
        navMenu.classList.remove("active");
        document.body.classList.remove("menu-open");
        menuButton.classList.remove("active");
        menuButton.setAttribute("aria-label", "Open menu");

        clearNavigationTimers();

        if (!preserveLock) {
            releaseNavigationLock("menu-closed", { force: true });
        }
    };

    const scrollToTarget = (targetId) => {
        if (!acquireNavigationLock("menu-navigation")) {
            return;
        }

        const target = document.getElementById(targetId);
        if (!target) {
            releaseNavigationLock("missing-target", { force: true });
            return;
        }

        closeMenu({ preserveLock: true });

        const offset = 80;
        const targetPosition =
            target.getBoundingClientRect().top + window.pageYOffset - offset;

        let userScrollDetected = false;
        let listenersRegistered = false;

        const cleanupScrollListeners = () => {
            if (listenersRegistered) {
                window.removeEventListener("wheel", handleUserScroll);
                window.removeEventListener("touchmove", handleUserScroll);
                listenersRegistered = false;
            }
        };

        const handleUserScroll = () => {
            const currentScroll = window.scrollY;
            const distanceToTarget = Math.abs(currentScroll - targetPosition);

            if (distanceToTarget > 100) {
                userScrollDetected = true;
                cleanupScrollListeners();
                releaseNavigationLock("user-interrupted", { force: true });
            }
        };

        scheduleNavigationTask(() => {
            try {
                window.addEventListener("wheel", handleUserScroll, {
                    passive: true,
                    once: false,
                });
                window.addEventListener("touchmove", handleUserScroll, {
                    passive: true,
                    once: false,
                });
                listenersRegistered = true;

                window.scrollTo({
                    top: targetPosition,
                    behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                    ).matches
                        ? "auto"
                        : "smooth",
                });

                monitorScrollCompletion(targetPosition);

                scheduleNavigationTask(() => {
                    cleanupScrollListeners();

                    if (userScrollDetected) return;

                    target.style.transition = "transform 0.3s ease-out";
                    target.style.transform = "scale(1.01)";

                    scheduleNavigationTask(() => {
                        if (userScrollDetected) return;

                        target.style.transform = "";

                        scheduleNavigationTask(() => {
                            target.style.transition = "";
                            releaseNavigationLock("animation-complete");
                        }, 300);
                    }, 300);
                }, 800);
            } catch (error) {
                cleanupScrollListeners();
                throw error;
            }
        }, 300);
    };

    const handleMenuButtonClick = () => {
        if (navInteractionState.active) return;

        if (navMenu.classList.contains("active")) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    const handleMenuItemClick = (e) => {
        const menuItem = e.target.closest(".nav-menu-item");
        if (!menuItem) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;

        const targetId = menuItem.dataset.target;

        if (!targetId || !document.getElementById(targetId)) return;

        e.preventDefault();
        e.stopPropagation();

        if (navInteractionState.active) return;

        scrollToTarget(targetId);
    };

    const handleOverlayClick = () => {
        if (navInteractionState.active) return;
        closeMenu();
    };

    const handleEscapeKey = (e) => {
        if (e.key === "Escape" && navMenu.classList.contains("active")) {
            if (navInteractionState.active) return;
            closeMenu();
        }
    };

    const trapFocus = (e) => {
        if (!navMenu.classList.contains("active")) return;

        const focusableElements = navMenu.querySelectorAll(
            'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.key === "Tab") {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            releaseNavigationLock("visibility-change", { force: true });
            if (navMenu && navMenu.classList.contains("active")) {
                navMenu.classList.remove("active");
                document.body.classList.remove("menu-open");
                menuButton.classList.remove("active");
                menuButton.setAttribute("aria-label", "Open menu");
            }
        } else {
            requestAnimationFrame(() => {
                if (
                    navInteractionState.active &&
                    !navMenu.classList.contains("active")
                ) {
                    releaseNavigationLock("visibility-restore", {
                        force: true,
                    });
                }
            });
        }
    };

    let resizeTimer = null;
    const handleResize = () => {
        if (navInteractionState.active) {
            if (resizeTimer) {
                navInteractionState.timers.delete(resizeTimer);
                clearTimeout(resizeTimer);
            }
            resizeTimer = scheduleNavigationTask(() => {
                if (navInteractionState.active) {
                    releaseNavigationLock("resize-safety", { force: true });
                }
                resizeTimer = null;
            }, 500);
        }
    };

    const cleanup = () => {
        releaseNavigationLock("cleanup", { force: true });

        if (fadeObserver) {
            fadeObserver.disconnect();
            fadeObserver = null;
        }
        if (fadeScrollHandler && navMenuList) {
            navMenuList.removeEventListener("scroll", fadeScrollHandler);
            fadeScrollHandler = null;
        }

        menuButton.removeEventListener("click", handleMenuButtonClick);
        if (navMenuOverlay) {
            navMenuOverlay.removeEventListener("click", handleOverlayClick);
        }
        navMenuList.removeEventListener("click", handleMenuItemClick);
        document.removeEventListener("keydown", handleEscapeKey);
        document.removeEventListener("keydown", trapFocus);
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
        window.removeEventListener("resize", handleResize);
    };

    menuButton.removeEventListener("click", handleMenuButtonClick);
    if (navMenuOverlay) {
        navMenuOverlay.removeEventListener("click", handleOverlayClick);
    }
    navMenuList.removeEventListener("click", handleMenuItemClick);
    document.removeEventListener("keydown", handleEscapeKey);
    document.removeEventListener("keydown", trapFocus);

    menuButton.addEventListener("click", handleMenuButtonClick);
    if (navMenuOverlay) {
        navMenuOverlay.addEventListener("click", handleOverlayClick);
    }
    navMenuList.addEventListener("click", handleMenuItemClick);
    document.addEventListener("keydown", handleEscapeKey);
    document.addEventListener("keydown", trapFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize, { passive: true });

    window.addEventListener("beforeunload", cleanup, { once: true });

    const initializeNavMenuScrollFade = () => {
        const updateNavFade = () => {
            if (!navMenuList || !navMenuList.isConnected) return;
            applyScrollFade(navMenuList);
        };

        if (fadeScrollHandler) {
            navMenuList.removeEventListener("scroll", fadeScrollHandler);
        }

        fadeScrollHandler = updateNavFade;

        navMenuList.addEventListener("scroll", fadeScrollHandler, {
            passive: true,
        });

        if (fadeObserver) {
            fadeObserver.disconnect();
        }

        fadeObserver = new MutationObserver(() => {
            if (navMenu && navMenu.classList.contains("active")) {
                setTimeout(updateNavFade, 100);
            }
        });
        fadeObserver.observe(navMenu, {
            attributes: true,
            attributeFilter: ["class"],
        });

        updateNavFade();
    };

    populateMenu();

    initializeNavMenuScrollFade();
}

function revealSection(element) {
    element.dataset.revealed = "true";
    element.style.opacity = "";
    element.style.transform = "";
    element.classList.remove("scroll-pending");
    element.classList.add("scroll-animated");

    let fallbackId;

    // scroll-animated fija transform y transition con !important; si se queda
    // puesto anula el hover y la transición de tema del elemento.
    const settle = (event) => {
        if (event && event.target !== element) return;
        element.removeEventListener("transitionend", settle);
        clearTimeout(fallbackId);
        performanceCache.timers.delete(fallbackId);
        element.classList.remove("scroll-animated");
    };

    element.addEventListener("transitionend", settle);
    fallbackId = setTimeout(settle, 1200);
    performanceCache.timers.add(fallbackId);
}

function initializeScrollEffects() {
    if (document.body.classList.contains("detail-page")) return;

    const observerOptions = {
        threshold: 0.05,
        rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                if (!entry.target.dataset.revealed) revealSection(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll(
        ".glass-card, .certificate-item",
    );

    sections.forEach((section) => {
        if (section.dataset.revealed) return;

        const isCertificate = section.classList.contains("certificate-item");
        const rect = section.getBoundingClientRect();
        const isInViewport =
            isCertificate && rect.top < window.innerHeight && rect.bottom > 0;

        if (isInViewport) {
            requestAnimationFrame(() => revealSection(section));
        } else {
            section.classList.add("scroll-pending");
            observer.observe(section);
        }
    });
}

function initializeCertificateLinks() {
    const container = performanceCache.viewport;
    if (!container) return;

    const items = document.querySelectorAll(".certificate-item.glass-pill");
    items.forEach((item) => {
        const btn = item.querySelector(".external-link");
        if (btn) {
            btn.setAttribute("tabindex", "-1");
            btn.setAttribute("aria-hidden", "true");
        }
    });

    eventDelegator.addDelegatedListener(
        container,
        ".certificate-item.glass-pill",
        "click",
        function (e) {
            e.stopPropagation();
            const btn = this.querySelector(".external-link");
            const url = btn?.getAttribute("data-url");
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                animatePress(this, 0.98);
            }
        },
        { passive: false },
    );

    eventDelegator.addDelegatedListener(
        container,
        ".certificate-item.glass-pill",
        "keydown",
        function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const btn = this.querySelector(".external-link");
                const url = btn?.getAttribute("data-url");
                if (url) {
                    window.open(url, "_blank", "noopener,noreferrer");
                    animatePress(this, 0.98);
                }
            }
        },
        { passive: false },
    );
}

function initializeProjectLink() {
    const container = performanceCache.viewport;
    if (!container) return;

    eventDelegator.addDelegatedListener(
        container,
        ".project-link",
        "click",
        function () {
            const url = this.getAttribute("data-url");
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                animatePress(this, 0.98);
            }
        },
        { passive: false },
    );

    eventDelegator.addDelegatedListener(
        container,
        ".project-link",
        "keydown",
        function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const url = this.getAttribute("data-url");
                if (url) {
                    window.open(url, "_blank", "noopener,noreferrer");
                    animatePress(this, 0.98);
                }
            }
        },
        { passive: false },
    );
}

function initializeProjectTechTagIcons() {
    const projectTechTags = document.querySelectorAll(
        ".projects-section .tech-stack .tech-tag",
    );
    if (!projectTechTags.length) return;

    const technologyIconMap = {
        javascript: {
            file: "javascript.svg",
            label: "JavaScript",
            dataTech: "javascript",
        },
        html: { file: "html.svg", label: "HTML", dataTech: "html" },
        css: { file: "css.svg", label: "CSS", dataTech: "css" },
        react: { file: "react.svg", label: "React", dataTech: "react" },
        "node.js": {
            file: "nodejs.svg",
            label: "Node.js",
            dataTech: "nodejs",
        },
        nodejs: { file: "nodejs.svg", label: "Node.js", dataTech: "nodejs" },
        express: {
            file: "expressjs.svg",
            label: "Express",
            dataTech: "express",
        },
        "express.js": {
            file: "expressjs.svg",
            label: "Express",
            dataTech: "express",
        },
        python: { file: "python.svg", label: "Python", dataTech: "python" },
        java: { file: "java.svg", label: "Java", dataTech: "java" },
        postgresql: {
            file: "postgresql.svg",
            label: "PostgreSQL",
            dataTech: "postgresql",
        },
        pgadmin: { file: "pgadmin.svg", label: "pgAdmin", dataTech: "pgadmin" },
        mysql: { file: "mysql.svg", label: "MySQL", dataTech: "mysql" },
        mongodb: {
            file: "mongodb.svg",
            label: "MongoDB",
            dataTech: "mongodb",
        },
        docker: { file: "docker.svg", label: "Docker", dataTech: "docker" },
        git: { file: "git.svg", label: "Git", dataTech: "git" },
        github: { file: "github.svg", label: "GitHub", dataTech: "github" },
        bootstrap: {
            file: "bootstrap.svg",
            label: "Bootstrap",
            dataTech: "bootstrap",
        },
        sass: { file: "sass.svg", label: "Sass", dataTech: "sass" },
        postman: { file: "postman.svg", label: "Postman", dataTech: "postman" },
        vscode: { file: "vscode.svg", label: "VS Code", dataTech: "vscode" },
        "vs code": { file: "vscode.svg", label: "VS Code", dataTech: "vscode" },
        linux: { file: "linux.svg", label: "Linux", dataTech: "linux" },
        windows: { file: "windows.svg", label: "Windows", dataTech: "windows" },
        "android studio": {
            file: "androidstudio.svg",
            label: "Android Studio",
            dataTech: "androidstudio",
        },
        apache: { file: "apache.svg", label: "Apache", dataTech: "apache" },
        aws: { file: "aws.svg", label: "AWS", dataTech: "aws" },
        django: { file: "django.svg", label: "Django", dataTech: "django" },
        electron: {
            file: "electron.svg",
            label: "Electron",
            dataTech: "electron",
        },
        eslint: { file: "eslint.svg", label: "ESLint", dataTech: "eslint" },
        figma: { file: "figma.svg", label: "Figma", dataTech: "figma" },
        flask: { file: "flask.svg", label: "Flask", dataTech: "flask" },
        flutter: { file: "flutter.svg", label: "Flutter", dataTech: "flutter" },
        npm: { file: "npm.svg", label: "npm", dataTech: "npm" },
        numpy: { file: "numpy.svg", label: "NumPy", dataTech: "numpy" },
        render: { file: "render.svg", label: "Render", dataTech: "render" },
        spring: { file: "spring.svg", label: "Spring", dataTech: "spring" },
        sqlite: { file: "sqlite.svg", label: "SQLite", dataTech: "sqlite" },
        "c++": { file: "cplusplus.svg", label: "C++", dataTech: "cplusplus" },
        jsx: { file: "jsx.svg", label: "JSX", dataTech: "jsx" },
    };

    const stripLeadingDecorators = (text) =>
        text.replace(/^[^A-Za-z0-9]+/, "").trim();

    projectTechTags.forEach((tag) => {
        if (tag.dataset.iconized === "true") return;

        const rawText = (tag.textContent || "").replace(/\s+/g, " ").trim();
        if (!rawText) return;

        const labelText = stripLeadingDecorators(rawText);
        const normalizedLabel = labelText.toLowerCase();
        const iconMeta = technologyIconMap[normalizedLabel];

        if (!iconMeta) return;

        const icon = document.createElement("img");
        icon.src = `assets/tech/${iconMeta.file}`;
        icon.alt = iconMeta.label;
        icon.width = 18;
        icon.height = 18;
        icon.className = "tech-tag-icon";
        icon.loading = "lazy";
        icon.decoding = "async";

        const text = document.createElement("span");
        text.textContent = iconMeta.label;

        tag.textContent = "";
        tag.append(icon, text);
        tag.dataset.tech = iconMeta.dataTech;
        tag.dataset.iconized = "true";
    });
}

function initializeTechStackDivider() {
    if (!document.body.classList.contains("detail-project")) return;

    const stack = document.querySelector(".tech-stack");
    if (!stack || stack.querySelector(".tech-divider")) return;

    const tags = Array.from(stack.querySelectorAll(".tech-tag"));

    let lastTech = -1;
    for (let i = tags.length - 1; i >= 0; i--) {
        if (tags[i].dataset.iconized === "true") {
            lastTech = i;
            break;
        }
    }

    if (lastTech === -1 || lastTech === tags.length - 1) return;

    const divider = document.createElement("span");
    divider.className = "tech-divider";
    divider.setAttribute("aria-hidden", "true");
    tags[lastTech].after(divider);
}

window.addEventListener(
    "beforeunload",
    () => {
        for (const id of performanceCache.timers) {
            clearTimeout(id);
        }

        carouselViewportObserver.cleanup();

        const projectItems = performanceCache.projectItems;
        if (projectItems) {
            projectItems.forEach((projectItem) => {
                const media = projectItem.querySelector(".project-media");
                if (media && media._carouselState) {
                    media._carouselState.cleanup();
                }
            });
        }

        performanceCache.timers.clear();
    },
    { once: true },
);

document.addEventListener("DOMContentLoaded", () => {
    const projectItems = performanceCache.projectItems;

    projectItems.forEach((projectItem) => {
        initializeProjectScroll(projectItem);
    });
});

function initializeProjectScroll(projectContainer) {
    const desc = projectContainer.querySelector(
        ".project-description .description-content",
    );
    const track = projectContainer.querySelector(
        ".project-description .scroll-track",
    );
    const thumb = projectContainer.querySelector(
        ".project-description .scroll-thumb",
    );
    if (!desc || !track || !thumb) return;

    const scrollbar = attachCustomScrollbar(desc, track, thumb, {
        onUpdate: ({ hasOverflow }) => {
            desc.style.overflowY = hasOverflow ? "auto" : "hidden";
            applyScrollFade(desc);
        },
    });
    if (!scrollbar) return;

    const initUpdate = () => {
        scrollbar.update();
        desc.style.transform = "translateZ(0)";
        desc.style.backfaceVisibility = "hidden";
        desc.style.contain = "layout style";
        thumb.style.backfaceVisibility = "hidden";
    };

    rafScheduler.schedule(initUpdate);
    requestAnimationFrame(() => rafScheduler.schedule(initUpdate));
    window.addEventListener("load", () => rafScheduler.schedule(initUpdate), {
        once: true,
    });
}

function initializeFullscreenModal() {
    let modal = document.getElementById("fullscreen-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "fullscreen-modal";
        modal.className = "carousel-fullscreen-modal";
        modal.innerHTML = `
            <div class="carousel-fullscreen-content">
                <button class="carousel-fullscreen-close" aria-label="Close fullscreen"></button>
                <div class="carousel-fullscreen-viewport">
                    <img class="carousel-fullscreen-image" alt="" />
                </div>
                <div class="carousel-fullscreen-nav">
                    <button class="carousel-fullscreen-prev" aria-label="Previous image"></button>
                    <button class="carousel-fullscreen-next" aria-label="Next image"></button>
                </div>
                <div class="carousel-fullscreen-counter">1 / 1</div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    let currentImages = [];
    let currentIndex = 0;
    let originalCarousel = null;

    const closeBtn = modal.querySelector(".carousel-fullscreen-close");
    const image = modal.querySelector(".carousel-fullscreen-image");
    const prevBtn = modal.querySelector(".carousel-fullscreen-prev");
    const nextBtn = modal.querySelector(".carousel-fullscreen-next");
    const counter = modal.querySelector(".carousel-fullscreen-counter");

    function openModal(images, startIndex, carousel) {
        currentImages = images;
        currentIndex = startIndex;
        originalCarousel = carousel;

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

    closeBtn.addEventListener("click", closeModal);
    nextBtn.addEventListener("click", nextImage);
    prevBtn.addEventListener("click", prevImage);

    modal.addEventListener("click", (e) => {
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

    const modalKeyHandler = (e) => {
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
    };

    if (modal._keyHandler) {
        document.removeEventListener("keydown", modal._keyHandler);
    }
    modal._keyHandler = modalKeyHandler;
    document.addEventListener("keydown", modalKeyHandler);

    document.addEventListener("click", (e) => {
        const thumb = e.target.closest(".detail-gallery-item");
        if (!thumb) return;

        const media = thumb
            .closest(".project-item")
            ?.querySelector(".project-media");
        const slides = media?.querySelectorAll(".carousel-slide img");
        if (!slides || slides.length === 0) return;

        const idx = Number(thumb.dataset.index);
        openModal(
            Array.from(slides),
            Number.isInteger(idx) && idx >= 0 && idx < slides.length ? idx : 0,
            media._carouselState || null,
        );
    });

    const carousels = document.querySelectorAll(".project-media");
    carousels.forEach((carousel) => {
        if (carousel.querySelector(".carousel-fullscreen-btn")) return;

        const slides = carousel.querySelectorAll(".carousel-slide img");
        if (slides.length === 0) return;

        const pauseBtn = document.createElement("button");
        pauseBtn.className = "carousel-pause-btn";
        pauseBtn.setAttribute("aria-label", "Pause carousel");
        pauseBtn.setAttribute("data-playing", "true");

        const playSvg = `<svg class="play-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" fill="currentColor"/>
        </svg>`;

        const pauseSvg = `<svg class="pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
        </svg>`;

        pauseBtn.innerHTML = pauseSvg + playSvg;

        const updatePauseButtonState = (isPaused) => {
            pauseBtn.setAttribute("data-playing", isPaused ? "false" : "true");
            pauseBtn.setAttribute(
                "aria-label",
                isPaused ? "Resume carousel" : "Pause carousel",
            );
        };

        pauseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const media = carousel;
            const carouselState = media._carouselState;

            if (
                carouselState &&
                typeof carouselState.togglePause === "function"
            ) {
                const nowPaused = carouselState.togglePause();
                updatePauseButtonState(nowPaused);
            }
        });

        carousel._pauseBtn = pauseBtn;
        carousel._updatePauseButtonState = updatePauseButtonState;

        carousel.appendChild(pauseBtn);

        const fullscreenBtn = document.createElement("button");
        fullscreenBtn.className = "carousel-fullscreen-btn";
        fullscreenBtn.setAttribute("aria-label", "View fullscreen");
        fullscreenBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M16 3H19C20.1046 3 21 3.89543 21 5V8M8 21H5C3.89543 21 3 20.1046 3 19V16M16 21H19C20.1046 21 21 20.1046 21 19V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        carousel.appendChild(fullscreenBtn);

        fullscreenBtn.addEventListener("click", () => {
            const images = Array.from(slides);
            const activeSlideIndex = Array.from(
                carousel.querySelectorAll(".carousel-slide"),
            ).findIndex((slide) => slide.classList.contains("is-active"));

            const media = carousel;
            const carouselState = media._carouselState || null;

            openModal(images, Math.max(0, activeSlideIndex), carouselState);
        });
    });
}

function exposeCarouselState(projectContainer, carouselState) {
    const media = projectContainer.querySelector(".project-media");
    if (media) {
        media._carouselState = carouselState;
    }
}

function initializeDownloadButtons() {
    const container = performanceCache.viewport;
    if (!container) return;

    eventDelegator.addDelegatedListener(
        container,
        ".download-btn[data-download]",
        "click",
        function () {
            const downloadUrl = this.getAttribute("data-download");
            if (downloadUrl) {
                window.open(downloadUrl, "_blank", "noopener,noreferrer");
            }
        },
        { passive: false },
    );

    eventDelegator.addDelegatedListener(
        container,
        ".download-btn[data-download]",
        "keydown",
        function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.click();
            }
        },
        { passive: false },
    );
}

function initializeThemeToggle() {
    const themeToggleButton = document.querySelector(".theme-toggle-button");
    const bgVideo = document.getElementById("bg-video");
    const THEME_KEY = "portfolio-theme";

    if (!themeToggleButton) return;

    document.documentElement.classList.remove("obsidian-theme-loading");

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    const readTheme = () => {
        try {
            return localStorage.getItem(THEME_KEY);
        } catch {
            return null;
        }
    };
    const writeTheme = (value) => {
        try {
            localStorage.setItem(THEME_KEY, value);
        } catch {}
    };

    const playBgVideo = () => {
        if (!bgVideo) return;

        if (prefersReducedMotion) {
            bgVideo.currentTime = 0;
            bgVideo.pause();
        } else {
            bgVideo.play().catch(() => {});
        }
    };

    const applyTheme = (isObsidian, { persist = true } = {}) => {
        document.body.classList.toggle("obsidian-theme", isObsidian);
        themeToggleButton.setAttribute("aria-pressed", String(isObsidian));

        if (bgVideo) {
            if (isObsidian) bgVideo.pause();
            else playBgVideo();
        }

        if (persist) writeTheme(isObsidian ? "obsidian" : "glass");
    };

    applyTheme(readTheme() !== "glass");

    themeToggleButton.addEventListener("click", () => {
        applyTheme(!document.body.classList.contains("obsidian-theme"));

        themeToggleButton.style.transform = "scale(0.9)";
        setTimeout(() => {
            themeToggleButton.style.transform = "";
        }, 150);
    });

    themeToggleButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            themeToggleButton.click();
        }
    });

    initializeSpotlightEffect();
}

const spotlightEffect = (() => {
    const spotlightSelectors = [
        ".profile-section.glass-card",
        ".project-item.glass-card",
        ".contact-section.glass-card",
    ];

    let spotlightContainers = [];
    let isObsidianTheme = false;
    let rafId = null;
    let initialized = false;
    let themeObserver = null;
    let isTouchDevice = false;

    function createSpotlightOverlay(container) {
        if (container.querySelector(".spotlight-overlay")) return;

        const overlay = document.createElement("div");
        overlay.className = "spotlight-overlay";
        container.insertBefore(overlay, container.firstChild);
    }

    function updateContainers() {
        spotlightContainers = Array.from(
            document.querySelectorAll(spotlightSelectors.join(", ")),
        );

        spotlightContainers.forEach((container) => {
            container.classList.add("spotlight-container");
            createSpotlightOverlay(container);
        });
    }

    function checkTheme() {
        isObsidianTheme = document.body.classList.contains("obsidian-theme");

        if (!isObsidianTheme) {
            spotlightContainers.forEach((container) => {
                container.classList.remove("spotlight-active");
                container.style.setProperty("--spotlight-opacity", "0");
            });
        }
    }

    function handleMouseMove(e) {
        if (!isObsidianTheme || isTouchDevice) return;

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        rafId = requestAnimationFrame(() => {
            rafId = null;
            spotlightContainers.forEach((container) => {
                const rect = container.getBoundingClientRect();

                const isInside =
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom;

                if (isInside) {
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    container.style.setProperty("--spotlight-x", `${x}px`);
                    container.style.setProperty("--spotlight-y", `${y}px`);
                    container.style.setProperty("--spotlight-opacity", "1");
                    container.classList.add("spotlight-active");

                    const overlay =
                        container.querySelector(".spotlight-overlay");
                    if (overlay) {
                        overlay.style.setProperty("--spotlight-x", `${x}px`);
                        overlay.style.setProperty("--spotlight-y", `${y}px`);
                    }
                } else {
                    container.classList.remove("spotlight-active");
                    container.style.setProperty("--spotlight-opacity", "0");
                }
            });
        });
    }

    function handleMouseLeave() {
        spotlightContainers.forEach((container) => {
            container.classList.remove("spotlight-active");
            container.style.setProperty("--spotlight-opacity", "0");
        });
    }

    function detectTouchDevice() {
        isTouchDevice =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia("(pointer: coarse)").matches;
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        detectTouchDevice();

        if (isTouchDevice) return;

        updateContainers();
        checkTheme();

        document.addEventListener("mousemove", handleMouseMove, {
            passive: true,
        });
        document.addEventListener("mouseleave", handleMouseLeave);

        themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    checkTheme();
                }
            });
        });

        themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });
    }

    function cleanup() {
        if (!initialized) return;

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        if (themeObserver) {
            themeObserver.disconnect();
            themeObserver = null;
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseleave", handleMouseLeave);

        spotlightContainers.forEach((container) => {
            container.classList.remove(
                "spotlight-active",
                "spotlight-container",
            );
            container.style.removeProperty("--spotlight-opacity");
            container.style.removeProperty("--spotlight-x");
            container.style.removeProperty("--spotlight-y");
            const overlay = container.querySelector(".spotlight-overlay");
            if (overlay) overlay.remove();
        });

        spotlightContainers = [];
        initialized = false;
    }

    return { initialize, cleanup };
})();

function initializeDetailGallery() {
    const gallery = document.querySelector(".detail-gallery");
    const scroller = gallery?.querySelector(".detail-gallery-scroll");
    if (!gallery || !scroller) return;

    const items = scroller.querySelectorAll(".detail-gallery-item");
    if (items.length === 0) return;

    const MIN_VISIBLE = 3;

    const track = gallery.querySelector(".scroll-track");
    const thumb = gallery.querySelector(".scroll-thumb");

    const scrollbar = attachCustomScrollbar(scroller, track, thumb, {
        onUpdate: () => applyScrollFade(scroller),
        reserveSpace: true,
    });

    const article = gallery.closest(".project-item");
    const stack = article?.querySelector(".detail-desc-stack");
    const tech = article?.querySelector(".tech-stack");
    const buttons = article?.querySelector(".project-buttons");

    const height = (el) => (el ? el.getBoundingClientRect().height : 0);

    const applySizing = () => {
        if (!gallery.offsetParent && gallery.offsetHeight === 0) {
            gallery.style.height = "";
            return;
        }

        const itemHeight = height(items[0]);
        if (!itemHeight) return;

        const styles = getComputedStyle(scroller);
        const gap = parseFloat(styles.rowGap) || 0;
        const outer = getComputedStyle(gallery);

        const frame =
            (parseFloat(outer.paddingTop) || 0) +
            (parseFloat(outer.paddingBottom) || 0) +
            (parseFloat(outer.borderTopWidth) || 0) +
            (parseFloat(outer.borderBottomWidth) || 0);

        const stackOf = (n) => itemHeight * n + gap * (n - 1) + frame;
        const floor = stackOf(Math.min(MIN_VISIBLE, items.length));

        const needed = Math.ceil(stackOf(items.length)) + 2;

        const gridGap = parseFloat(getComputedStyle(article).rowGap) || 0;
        const available =
            height(stack) - height(tech) - height(buttons) - gridGap * 2;

        const cap = Math.max(floor, available);

        const target = needed - cap < itemHeight * 0.75 ? needed : cap;

        gallery.style.height = `${Math.max(floor, target)}px`;
    };

    const refresh = () => {
        applySizing();
        scrollbar?.update();
        applyScrollFade(scroller);
    };

    window.addEventListener("resize", debounce(refresh, 100), {
        passive: true,
    });

    items.forEach((item) => {
        const img = item.querySelector("img");
        if (img && !img.complete) {
            img.addEventListener("load", () => rafScheduler.schedule(refresh), {
                once: true,
            });
        }
    });

    rafScheduler.schedule(refresh);
    window.addEventListener("load", () => rafScheduler.schedule(refresh), {
        once: true,
    });
}

function initializeContactForm() {
    const form = document.querySelector(".contact-form");
    if (!form) return;

    form.noValidate = true;

    const status = form.querySelector(".contact-status");
    const submit = form.querySelector(".contact-submit");
    const submitLabel = submit?.querySelector("span");
    const originalLabel = submitLabel?.textContent ?? "Send message";

    const setStatus = (message, state) => {
        if (!status) return;
        status.textContent = message;
        if (state) status.dataset.state = state;
        else delete status.dataset.state;
    };

    const fieldOf = (input) => input.closest(".contact-field");

    const showError = (input, message) => {
        const field = fieldOf(input);
        if (!field) return;
        field.classList.toggle("has-error", Boolean(message));
        const slot = field.querySelector(".contact-error");
        if (slot) slot.textContent = message;
        if (message) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
    };

    const validate = (input) => {
        const value = input.value.trim();

        if (input.required && !value) {
            const name = fieldOf(input)?.querySelector("label")?.textContent;
            showError(input, `${name || "This field"} is required.`);
            return false;
        }

        if (
            input.type === "email" &&
            value &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
        ) {
            showError(input, "Enter a valid email address.");
            return false;
        }

        showError(input, "");
        return true;
    };

    const fields = Array.from(
        form.querySelectorAll(".contact-field input, .contact-field textarea"),
    );

    fields.forEach((input) => {
        input.addEventListener("blur", () => validate(input));
        input.addEventListener("input", () => {
            if (fieldOf(input)?.classList.contains("has-error"))
                validate(input);
        });
    });

    form.addEventListener("submit", async (e) => {
        const invalid = fields.filter((input) => !validate(input));

        if (invalid.length > 0) {
            e.preventDefault();
            invalid[0].focus();
            setStatus("Please review the highlighted fields.", "error");
            return;
        }

        e.preventDefault();

        if (submit) submit.disabled = true;
        if (submitLabel) submitLabel.textContent = "Sending…";
        setStatus("Sending your message…");

        try {
            const data = new FormData(form);

            if (!data.get("form-name"))
                data.set("form-name", form.getAttribute("name") || "contact");

            const response = await fetch("/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(data).toString(),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            form.reset();
            fields.forEach((input) => showError(input, ""));
            setStatus("Thanks! Your message is on its way.", "ok");
        } catch (error) {
            console.warn("Contact form submit failed:", error);
            setStatus(
                "Couldn't send it from here. Please email bryan.a.morales@outlook.com directly.",
                "error",
            );
        } finally {
            if (submit) submit.disabled = false;
            if (submitLabel) submitLabel.textContent = originalLabel;
        }
    });
}

function initializeScrollTopButton() {
    const button = document.querySelector(".scroll-top-button");
    if (!button) return;

    const threshold = () => Math.max(400, window.innerHeight);
    let visible = false;

    const update = () => {
        const shouldShow = window.scrollY > threshold();
        if (shouldShow === visible) return;
        visible = shouldShow;
        button.classList.toggle("is-visible", shouldShow);
        button.setAttribute("aria-hidden", String(!shouldShow));
        button.tabIndex = shouldShow ? 0 : -1;
    };

    const onScroll = () => rafScheduler.schedule(update);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    button.addEventListener("click", () => {
        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });

        const top = document.querySelector(".portfolio-container");
        if (top) {
            top.setAttribute("tabindex", "-1");
            top.focus({ preventScroll: true });
        }
    });

    update();
}

function initializeSpotlightEffect() {
    spotlightEffect.initialize();

    window.addEventListener("beforeunload", spotlightEffect.cleanup, {
        once: true,
    });
}
