export default function aceEditorComponent({
    state,
    statePath,
    placeholder,
    aceUrl,
    extensions,
    config = {},
    options = {},
    darkTheme,
    disableDarkTheme,
    completions = [],
    snippets = [],
    enableCustomCompletions = false,
    toolbarButtons = [],
    hasToolbar = false,
    showStatusBar = false,
    statusBarOptions = {},
    extensionLoadingConfig = {},
    keyboardAccessibility = false,
    screenReaderSupport = false,
    ariaLabels = {},
    currentFontSize = '14px',
    currentWordWrap = 'off',
    overscrollOptions = {},
    isDisabled = false,
}) {
    return {
        state,
        statePath,
        placeholder,
        options,
        darkTheme,
        disableDarkTheme,
        completions,
        snippets,
        enableCustomCompletions,
        toolbarButtons,
        hasToolbar,
        showStatusBar,
        statusBarOptions,
        isDisabled,
        editor: null,
        observer: null,
        shouldUpdateState: true,
        isDestroyed: false,
        isFullscreen: false,
        loadedScripts: [],
        eventListeners: [],
        // Intersection Observer for lazy loading
        intersectionObserver: null,
        isVisible: false,
        isInitialized: false,
        // Virtual Scrolling for large files
        virtualScrolling: {
            enabled: false,
            maxLines: 1000,      // Maximum lines to render
            bufferSize: 50,      // Buffer lines above/below viewport
            threshold: 10000,    // Enable virtual scrolling for files with more than this many lines
            originalMaxLines: null,
            originalMinLines: null,
            scrollHandler: null,
            resizeHandler: null,
            lastScrollTop: 0,
            viewportHeight: 0,
            lineHeight: 0,
        },
        // Progressive Enhancement for staged loading
        progressiveEnhancement: {
            currentStage: 0,     // 0: basic, 1: intermediate, 2: full
            stages: {
                0: { // Core functionality - loads immediately
                    name: 'core',
                    features: ['basicEditing', 'syntaxHighlighting', 'basicTheme'],
                    loaded: false,
                    priority: 1,
                },
                1: { // Intermediate features - loads after 100ms
                    name: 'intermediate',
                    features: ['autocompletion', 'findReplace', 'toolbar'],
                    loaded: false,
                    priority: 2,
                    delay: 100,
                },
                2: { // Advanced features - loads after 300ms
                    name: 'advanced',
                    features: ['languageTools', 'customCompletions', 'statusBar', 'virtualScrolling', 'advancedExtensions'],
                    loaded: false,
                    priority: 3,
                    delay: 300,
                },
            },
            loadingPromises: new Map(),
            performanceMetrics: {
                stageLoadTimes: {},
                totalLoadTime: 0,
                startTime: 0,
            },
        },
        toolbarState: {
            canUndo: false,
            canRedo: false,
            showPrintMargin: true, // ACE default
            showInvisibles: false, // ACE default
            wordWrapEnabled: false, // ACE default
        },
        statusBarElement: null,
        statusBarState: {
            position: { row: 1, column: 1 },
            selection: {
                start: { row: 1, column: 1 },
                end: { row: 1, column: 1 },
            },
            lines: 1,
            characters: 0,
            mode: 'text',
            theme: 'textmate',
        },
        debounceTimers: {
            statusBarUpdate: null,
            toolbarUpdate: null,
        },
        lastToolbarState: {
            canUndo: false,
            canRedo: false,
            showPrintMargin: true,
            showInvisibles: false,
            wordWrapEnabled: false,
        },
        lastExpensiveState: {
            showInvisibles: false,
            lastCheckTime: 0,
        },
        printMarginState: {
            showPrintMargin: true,
            printMarginColumn: 80,
            lastUpdateTime: 0,
            updateScheduled: false,
            throttledUpdate: null,
        },
        gotoLineState: {
            history: [],
            maxHistory: 20,
            lastGotoLine: 1,
            animationFrame: null,
            isAnimating: false,
        },
        undoRedoState: {
            canUndo: false,
            canRedo: false,
            lastCheckTime: 0,
            checkCacheTimeout: 50,
            undoDepth: null,
            redoDepth: null,
            lastOperationTime: 0,
            operationQueue: [],
            isProcessingQueue: false,
        },
        caseConversionState: {
            lastConversionTime: 0,
            conversionCache: new Map(),
            maxCacheSize: 100,
            largeTextThreshold: 5000,
            operationInProgress: false,
        },
        lastFoldState: {
            canFold: false,
            canUnfold: false,
            isInsideFold: false,
            cursorRow: -1,
            cursorColumn: -1,
        },
        statusBarElements: {
            line: null,
            column: null,
            selection: null,
            mode: null,
            length: null,
        },
        // Cache DOM query results to avoid repeated lookups
        domCache: {
            statusBarContainer: null,
            lastCacheTime: 0,
            cacheTimeout: 1000, // 1 second cache timeout
        },
        // Dialog pooling for better performance
        dialogPool: {
            gotoLine: null,
            lastUsed: 0,
            reuseTimeout: 5000, // 5 seconds before creating new dialog
        },
        // Extension preloading and caching
        extensionCache: {
            preloaded: new Set(),
            cached: new Map(),
            cacheVersion: '1.0', // For cache invalidation
            preloadingPromises: new Map(),
        },
        operationState: {
            currentOperation: null,
            operationQueue: [],
            batchTimeout: null,
            batchDelay: 16,
            isBatching: false,
            renderChanges: 0,
            lastRenderTime: 0,
            pendingChanges: {
                cursor: false,
                selection: false,
                text: false,
                scroll: false,
                gutter: false,
            },
        },
        extensionLoadingConfig,
        keyboardAccessibility,
        screenReaderSupport,
        ariaLabels,
        currentFontSize,
        currentWordWrap,
        overscrollOptions,
        async init() {
            if (this.$root.closest('.fi-modal')) {
                await new Promise((resolve) => setTimeout(resolve, 300))
            }

            if (this.editor) {
                try {
                    this.editor.destroy()
                } catch (error) {
                    console.warn(
                        'Error cleaning up existing editor instance:',
                        error,
                    )
                }
                this.editor = null
            }

            // Setup Intersection Observer for lazy loading
            this.setupIntersectionObserver()

            // Only initialize editor if visible or if Intersection Observer is not supported
            if (!this.intersectionObserver || this.isVisible) {
                await this.initializeEditor()
                this.isInitialized = true
            }

            // Add global escape key handler for fullscreen
            this.addGlobalFullscreenEscapeHandler()
        },

        /**
         * Clean up all resources when component is destroyed
         * This prevents memory leaks by properly disposing of ACE Editor and related resources
         */
        destroy() {
            if (this.isDestroyed) return

            this.isDestroyed = true

            try {
                if (this.editor) {
                    if (this.editor.session) {
                        this.editor.session.removeAllListeners()
                    }
                    if (this.editor.selection) {
                        this.editor.selection.removeAllListeners()
                    }

                    this.editor.destroy()
                    this.editor = null
                }

                if (this.observer) {
                    this.observer.disconnect()
                    this.observer = null
                }

                // Clean up Intersection Observer
                if (this.intersectionObserver) {
                    this.intersectionObserver.disconnect()
                    this.intersectionObserver = null
                }

                // Clean up virtual scrolling
                if (this.virtualScrolling.enabled) {
                    this.disableVirtualScrolling()
                }

                // Clean up progressive enhancement
                if (this.progressiveEnhancement.loadingPromises.size > 0) {
                    this.progressiveEnhancement.loadingPromises.forEach(promise => {
                        promise.cancel && promise.cancel()
                    })
                    this.progressiveEnhancement.loadingPromises.clear()
                }

                this.destroyStatusBar()

                if (this.isFullscreen) {
                    this.toggleFullscreen()
                }

                // Clean up all tracked event listeners
                this.eventListeners.forEach(
                    ({ element, type, handler, options }) => {
                        try {
                            if (element && handler) {
                                element.removeEventListener(
                                    type,
                                    handler,
                                    options,
                                )
                            }
                        } catch (error) {
                            console.warn(
                                'Failed to remove event listener:',
                                error,
                            )
                        }
                    },
                )

                // Clear the global escape handler reference
                this._globalEscapeHandler = null

                this.cleanupLoadedScripts()

                Object.values(this.debounceTimers).forEach((timer) => {
                    if (timer) clearTimeout(timer)
                })

                this.eventListeners = []
                this.loadedScripts = []
                this.statusBarElements = {}

                if (this.printMarginState.throttledUpdate) {
                    cancelAnimationFrame(this.printMarginState.throttledUpdate)
                    this.printMarginState.throttledUpdate = null
                }

                if (this.gotoLineState.animationFrame) {
                    cancelAnimationFrame(this.gotoLineState.animationFrame)
                    this.gotoLineState.animationFrame = null
                }

                this.undoRedoState.operationQueue = []
                this.undoRedoState.isProcessingQueue = false

                this.caseConversionState.conversionCache.clear()
                this.caseConversionState.operationInProgress = false

                if (this.operationState.batchTimeout) {
                    clearTimeout(this.operationState.batchTimeout)
                    this.operationState.batchTimeout = null
                }
                this.operationState.operationQueue = []
                this.operationState.isBatching = false

                // Clean up extension cache references
                this.extensionCache.preloaded.clear()
                this.extensionCache.cached.clear()
                this.extensionCache.preloadingPromises.clear()
            } catch (error) {
                console.error('Error during ACE editor cleanup:', error)
            }
        },

        /**
         * Clean up dynamically loaded script tags
         * Prevents DOM pollution and memory retention
         */
        cleanupLoadedScripts() {
            this.loadedScripts.forEach((scriptUrl) => {
                const scripts = document.querySelectorAll(
                    `script[src="${scriptUrl}"]`,
                )
                scripts.forEach((script) => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script)
                    }
                })
            })
            this.loadedScripts = []
        },

        /**
         * Setup Intersection Observer for lazy loading the editor
         * Only initializes ACE when the editor becomes visible
         */
        setupIntersectionObserver() {
            // Check if Intersection Observer is supported
            if (!('IntersectionObserver' in window)) {
                console.warn('Intersection Observer not supported, initializing immediately')
                this.isVisible = true
                return
            }

            // Don't setup if editor is already initialized
            if (this.isInitialized) {
                this.isVisible = true
                return
            }

            // Create a placeholder container for the editor
            const editorElement = this.$refs.aceCodeEditor
            if (!editorElement) {
                console.warn('Editor element not found for Intersection Observer')
                return
            }

            // Setup Intersection Observer with rootMargin for better UX
            const options = {
                root: null,
                rootMargin: '50px', // Start loading 50px before element comes into view
                threshold: 0.1, // Start loading when 10% visible
            }

            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(async (entry) => {
                    if (entry.isIntersecting && !this.isInitialized) {
                        this.isVisible = true

                        // Disconnect the observer since we only need it once
                        this.intersectionObserver.disconnect()
                        this.intersectionObserver = null

                        // Initialize the editor
                        await this.initializeEditor()
                        this.isInitialized = true

                        // Remove any placeholder and show the editor
                        this.showEditorElement()
                    }
                })
            }, options)

            // Start observing the editor element
            this.intersectionObserver.observe(editorElement)
        },

        /**
         * Show the editor element and hide any placeholder
         */
        showEditorElement() {
            const editorElement = this.$refs.aceCodeEditor
            const placeholderElement = this.$root.querySelector('.ace-editor-placeholder')

            if (placeholderElement) {
                placeholderElement.style.display = 'none'
            }

            if (editorElement) {
                editorElement.style.opacity = '1'
                editorElement.style.visibility = 'visible'
            }
        },

        /**
         * Setup Virtual Scrolling for large files
         * Only enables for files with more lines than the threshold
         */
        setupVirtualScrolling() {
            if (!this.editor || !this.editor.session) {
                return
            }

            const session = this.editor.session
            const lineCount = session.getLength()

            // Only enable virtual scrolling for large files
            if (lineCount <= this.virtualScrolling.threshold) {
                return
            }

            this.virtualScrolling.enabled = true

            // Store original settings
            this.virtualScrolling.originalMaxLines = this.editor.getOption('maxLines')
            this.virtualScrolling.originalMinLines = this.editor.getOption('minLines')

            // Enable virtual scrolling performance optimizations
            this.editor.setOptions({
                maxLines: this.virtualScrolling.maxLines,
                minLines: Math.min(this.virtualScrolling.maxLines, 20),
                animatedScroll: false,
                showPrintMargin: false, // Disable for performance
                highlightGutterLine: false, // Disable for performance
                displayIndentGuides: false, // Disable for performance
            })

            // Setup scroll handler for virtual scrolling
            this.setupVirtualScrollHandlers()

            // Add performance monitoring
            this.setupVirtualScrollingMonitoring()
        },

        /**
         * Setup event handlers for virtual scrolling
         */
        setupVirtualScrollHandlers() {
            if (!this.editor) return

            const editorElement = this.editor.renderer.scroller

            // Calculate line height
            this.virtualScrolling.lineHeight = this.editor.renderer.lineHeight
            this.virtualScrolling.viewportHeight = editorElement.clientHeight

            // Throttled scroll handler to update visible range
            this.virtualScrolling.scrollHandler = this.throttle(() => {
                const scrollTop = editorElement.scrollTop
                const firstVisibleRow = Math.floor(scrollTop / this.virtualScrolling.lineHeight)

                // Update ACE's visible range if significantly changed
                this.updateVirtualScrollingRange(firstVisibleRow)
            }, 16) // 60fps

            // Resize handler to update viewport dimensions
            this.virtualScrolling.resizeHandler = this.debounce(() => {
                this.virtualScrolling.viewportHeight = editorElement.clientHeight
                this.virtualScrolling.lineHeight = this.editor.renderer.lineHeight
            }, 100)

            // Add event listeners with proper cleanup
            this.addEventListener(editorElement, 'scroll', this.virtualScrolling.scrollHandler, { passive: true })
            this.addEventListener(window, 'resize', this.virtualScrolling.resizeHandler)
        },

        /**
         * Update the visible range for virtual scrolling
         */
        updateVirtualScrollingRange(firstRow) {
            if (!this.virtualScrolling.enabled || !this.editor) return

            // Calculate if we need to adjust the rendered range
            const currentFirstRow = this.editor.renderer.getFirstVisibleRow()

            // Only update if the range has significantly changed
            if (Math.abs(firstRow - currentFirstRow) > 5) {
                // Batch the DOM updates for better performance
                this.batchVirtualScrollingUpdate(firstRow)
            }
        },

        /**
         * Batch virtual scrolling updates to reduce DOM operations
         */
        batchVirtualScrollingUpdate(firstRow) {
            if (!this.editor) return

            requestAnimationFrame(() => {
                try {
                    // Update the visible lines in ACE
                    const session = this.editor.session

                    // Ensure we don't exceed file bounds
                    const totalLines = session.getLength()
                    Math.max(0, Math.min(firstRow, totalLines - 1))

                    // Optimize ACE's rendering for the new range
                    if (this.virtualScrolling.lastScrollTop > 0) {
                        session.setUndoManager(session.getUndoManager()) // Force refresh
                    }

                } catch (error) {
                    console.warn('Virtual scrolling update error:', error)
                }
            })
        },

        /**
         * Setup performance monitoring for virtual scrolling
         */
        setupVirtualScrollingMonitoring() {
            if (!this.editor) return

            // Monitor performance metrics
            setInterval(() => {
                if (this.virtualScrolling.enabled && this.editor) {
                    const session = this.editor.session
                    const lineCount = session.getLength()
                    const currentTime = performance.now()

                    // Warn if performance drops below 30fps
                    if (currentTime - this.virtualScrolling.lastUpdateTime > 33) {
                        console.warn(`Virtual scrolling performance warning: ${(currentTime - this.virtualScrolling.lastUpdateTime).toFixed(2)}ms for ${lineCount} lines`)
                    }

                    this.virtualScrolling.lastUpdateTime = currentTime
                }
            }, 1000)
        },

        /**
         * Disable virtual scrolling (called when switching to smaller files)
         */
        disableVirtualScrolling() {
            if (!this.virtualScrolling.enabled) return

            // Restore original settings
            if (this.virtualScrolling.originalMaxLines !== null) {
                this.editor.setOption('maxLines', this.virtualScrolling.originalMaxLines)
            }
            if (this.virtualScrolling.originalMinLines !== null) {
                this.editor.setOption('minLines', this.virtualScrolling.originalMinLines)
            }

            // Clean up event listeners
            if (this.virtualScrolling.scrollHandler) {
                this.removeEventListener(window, 'scroll', this.virtualScrolling.scrollHandler)
            }
            if (this.virtualScrolling.resizeHandler) {
                this.removeEventListener(window, 'resize', this.virtualScrolling.resizeHandler)
            }

            // Reset state
            this.virtualScrolling.enabled = false
        },

        /**
         * Initialize Progressive Enhancement system
         * Stages feature loading for optimal performance
         */
        initProgressiveEnhancement() {
            if (!this.editor) return

            // Start performance tracking
            this.progressiveEnhancement.performanceMetrics.startTime = performance.now()

            // Load Stage 0 (Core) immediately
            this.loadProgressiveStage(0)

            // Load Stage 1 (Intermediate) after delay
            setTimeout(() => {
                this.loadProgressiveStage(1)
            }, this.progressiveEnhancement.stages[1].delay)

            // Load Stage 2 (Advanced) after longer delay
            setTimeout(() => {
                this.loadProgressiveStage(2)
            }, this.progressiveEnhancement.stages[2].delay)
        },

        /**
         * Load a specific progressive enhancement stage
         */
        async loadProgressiveStage(stageNumber) {
            if (stageNumber <= this.progressiveEnhancement.currentStage) return

            const stage = this.progressiveEnhancement.stages[stageNumber]
            if (stage.loaded) return

            const startTime = performance.now()

            try {
                // Load features for this stage
                await this.loadStageFeatures(stage.features)

                // Mark stage as loaded
                stage.loaded = true
                this.progressiveEnhancement.currentStage = stageNumber

                // Track performance
                const loadTime = performance.now() - startTime
                this.progressiveEnhancement.performanceMetrics.stageLoadTimes[stage.name] = loadTime

                // Only log performance if significantly slow (>10ms)
                if (loadTime > 10) {
                    console.log(`Progressive stage ${stageNumber} loaded in ${loadTime.toFixed(2)}ms`)
                }

                // Update UI to show new capabilities
                this.onProgressiveStageLoaded(stageNumber)

            } catch (error) {
                console.error(`Failed to load progressive stage ${stageNumber}:`, error)
            }
        },

        /**
         * Load features for a specific stage
         */
        async loadStageFeatures(features) {
            const promises = features.map(feature => this.loadFeature(feature))
            await Promise.allSettled(promises)
        },

        /**
         * Load a single feature with proper error handling
         */
        async loadFeature(feature) {
            try {
                switch (feature) {
                    case 'basicEditing':
                        // Already loaded in initializeEditor
                        break

                    case 'syntaxHighlighting':
                        await this.loadSyntaxHighlighting()
                        break

                    case 'basicTheme':
                        await this.loadBasicTheme()
                        break

                    case 'autocompletion':
                        await this.loadAutocompletion()
                        break

                    case 'findReplace':
                        await this.loadFindReplace()
                        break

                    case 'toolbar':
                        await this.loadToolbar()
                        break

                    case 'languageTools':
                        await this.loadLanguageTools()
                        break

                    case 'customCompletions':
                        await this.loadCustomCompletionsEnhanced()
                        break

                    case 'statusBar':
                        await this.loadStatusBarProgressive()
                        break

                    case 'virtualScrolling':
                        await this.loadVirtualScrollingProgressive()
                        break

                    case 'advancedExtensions':
                        await this.loadAdvancedExtensionsProgressive()
                        break

                    default:
                        console.warn(`Unknown progressive feature: ${feature}`)
                }
            } catch (error) {
                console.error(`Failed to load feature ${feature}:`, error)
            }
        },

        /**
         * Load syntax highlighting progressively
         */
        async loadSyntaxHighlighting() {
            if (!this.editor || !this.editor.session) return

            // Set basic mode based on file extension or content
            const session = this.editor.session
            const mode = this.detectCodeMode(this.state || '')

            if (mode) {
                session.setMode(`ace/mode/${mode}`)
            }
        },

        /**
         * Load basic theme progressively
         */
        async loadBasicTheme() {
            if (!this.editor) return

            // Set theme based on dark mode preference
            const isDarkMode = this.shouldUseDarkTheme()
            this.editor.setTheme(isDarkMode ? this.darkTheme : this.options.theme || 'ace/theme/eclipse')
        },

        /**
         * Load autocompletion progressively
         */
        async loadAutocompletion() {
            if (!this.editor) return

            // Enable basic autocompletion
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                liveAutocompletionDelay: 500,
                liveAutocompletionThreshold: 3,
            })
        },

        /**
         * Load find/replace functionality progressively
         */
        async loadFindReplace() {
            if (!this.editor) return

            // Extensions are already loaded during initialization
            // We just need to ensure the searchbox functionality is available
            try {
                // Searchbox extension is already loaded during initialization
                // No need for additional verification
            } catch (error) {
                console.warn('Failed to verify searchbox extension:', error)
            }
        },

        /**
         * Load toolbar progressively
         */
        async loadToolbar() {
            if (this.hasToolbar && !this.toolbarState.isInitialized) {
                // Initialize toolbar if not already done
                if (typeof this.initToolbar === 'function') {
                    this.initToolbar()
                }
            }
        },

        /**
         * Load language tools progressively
         */
        async loadLanguageTools() {
            if (!this.editor) return

            // Enable valid ACE language tools options
            this.editor.setOptions({
                enableSnippets: true,
                enableInlineAutocompletion: true,
            })

            // Check if language_tools extension is available and properly initialized
            try {
                // Language tools extension is already loaded during initialization
                // No need for additional verification
            } catch (error) {
                console.warn('Failed to verify language_tools extension:', error)
            }
        },

        /**
         * Load custom completions progressively
         */
        async loadCustomCompletionsEnhanced() {
            if (this.enableCustomCompletions && this.completions.length > 0) {
                await this.setupCustomCompletions()
            }
        },

        /**
         * Load status bar progressively
         */
        async loadStatusBarProgressive() {
            if (this.showStatusBar && !this.statusBarElement) {
                await this.initStatusBar()
            }
        },

        /**
         * Load virtual scrolling progressively
         */
        async loadVirtualScrollingProgressive() {
            if (this.editor && this.editor.session) {
                const lineCount = this.editor.session.getLength()
                if (lineCount > this.virtualScrolling.threshold) {
                    this.setupVirtualScrolling()
                }
            }
        },

        /**
         * Load advanced extensions progressively
         */
        async loadAdvancedExtensionsProgressive() {
            // Extensions are already loaded during initialization
            // This stage enables advanced features that depend on those extensions
        },

        /**
         * Handle stage completion
         */
        onProgressiveStageLoaded(stageNumber) {
            const stage = this.progressiveEnhancement.stages[stageNumber]

            // Update UI state to reflect new capabilities
            switch (stageNumber) {
                case 1: // Intermediate stage loaded
                    // Show toolbar, enable autocompletion UI indicators
                    this.showProgressiveIndicators('intermediate')
                    break

                case 2: // Advanced stage loaded
                    // Show status bar, enable advanced features UI
                    this.showProgressiveIndicators('advanced')
                    break
            }

            // Emit custom event for external listeners
            this.$root.dispatchEvent(new CustomEvent('ace:stage-loaded', {
                detail: { stage: stageNumber, features: stage.features }
            }))
        },

        /**
         * Show UI indicators for progressive loading stages
         */
        showProgressiveIndicators(level) {
            const indicator = this.$root.querySelector('.ace-loading-indicator')
            if (indicator) {
                if (level === 'intermediate') {
                    indicator.textContent = 'Loading advanced features...'
                } else if (level === 'advanced') {
                    indicator.style.display = 'none'
                }
            }
        },

        /**
         * Detect code mode based on content or filename
         */
        detectCodeMode(content) {
            // Check for PHP tags
            if (content.includes('<?php') || content.includes('<?=')) return 'php'

            // Check for JavaScript patterns
            if (content.includes('function ') || content.includes('const ') || content.includes('let ')) return 'javascript'

            // Check for CSS patterns
            if (content.includes('{') && content.includes('}') && content.includes(':')) return 'css'

            // Check for JSON
            if (content.trim().startsWith('{') && content.trim().endsWith('}')) return 'json'

            // Default to text
            return 'text'
        },

        /**
         * Check if dark theme should be used
         */
        shouldUseDarkTheme() {
            if (this.disableDarkTheme) return false

            // Check if dark mode is enabled
            return document.documentElement.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches
        },

        async initializeEditor() {
            try {
                await this.loadScript(aceUrl)

                // Preload critical extensions in parallel with main extension loading
                const preloadingPromise = this.preloadCriticalExtensions()

                await this.loadExtensionsEnhanced()

                // Wait for preloading to complete before continuing
                await preloadingPromise

                Object.entries(config).forEach(([configKey, configValue]) => {
                    ace.config.set(configKey, configValue)
                })

                this.editor = ace.edit(this.$refs.aceCodeEditorInner)

                // Core stage options - minimal for fast initial load
                const coreOptions = {
                    animatedScroll: false,
                    showPrintMargin: false,  // Disable initially for performance
                    fadeFoldWidgets: false,
                    displayIndentGuides: false,
                    highlightGutterLine: false,
                    showInvisibles: false,
                    enableBasicAutocompletion: false, // Enable progressively
                    enableLiveAutocompletion: false,  // Enable progressively
                    enableSnippets: false,            // Enable progressively

                    ...options,

                    fontSize: this.currentFontSize,
                    showGutter: options.showGutter !== false,
                    showLineNumbers: options.showLineNumbers !== false,
                }

                this.editor.setOptions(coreOptions)

                if (coreOptions.cursorStyle) {
                    setTimeout(() => {
                        const appliedStyle =
                            this.editor.getOption('cursorStyle')

                        if (appliedStyle !== coreOptions.cursorStyle) {
                            console.warn(
                                '⚠️ CursorStyle mismatch! Trying direct setOption...',
                            )
                            this.editor.setOption(
                                'cursorStyle',
                                coreOptions.cursorStyle,
                            )
                        }
                    }, 100)
                }

                this.changeWordWrap(this.currentWordWrap)

                this.applyOverscrollSettings()

                this.editor.session.setValue(this.state || placeholder)

                this.applyInitialTheme()
                this.observeDarkModeChanges()

                this.setupPerformanceOptimizations()

                this.setupReliabilityImprovements()
                this.$watch(
                    'state',
                    Alpine.debounce(() => {
                        if (this.isDestroyed || !this.editor) return

                        if (!this.shouldUpdateState) {
                            this.shouldUpdateState = true
                            return
                        }

                        if (this.editor.isFocused()) return

                        this.editor.session.setValue(this.state || placeholder)
                    }, 100),
                )

                this.editor.session.on(
                    'change',
                    Alpine.debounce(() => {
                        if (this.isDestroyed || !this.editor) return

                        const currentValue = this.editor.getValue()
                        this.state = currentValue
                        this.shouldUpdateState = false

                        this.updateToolbarState(false)
                    }, 50), // Optimized: 150ms → 50ms for better responsiveness
                )

                // Remove immediate feature loading - these will be loaded progressively
                // if (this.enableCustomCompletions) {
                //     this.setupCustomCompletions()
                // }

                // this.initToolbar()

                this.initializeExpensiveStateCache()

                this.optimizeUndoManager()

                // Defer toolbar update until progressive stage loads
                setTimeout(() => {
                    if (this.progressiveEnhancement.currentStage >= 1) {
                        this.updateToolbarState()
                    }
                }, 50)

                // Remove immediate status bar loading - will be loaded progressively
                // if (this.showStatusBar) {
                //     this.initStatusBar()
                // }

                this.initAccessibility()

                // Setup virtual scrolling for large files
                this.setupVirtualScrolling()

                // Initialize Progressive Enhancement system
                this.initProgressiveEnhancement()
            } catch (error) {
                console.error('ACE Editor initialization failed:', error)
                this.handleInitializationError(error)
            }
        },

        /**
         * Handle initialization errors with graceful fallback to basic textarea
         * Follows Filament's error boundary patterns for maximum reliability
         */
        handleInitializationError(error) {
            console.error(
                'ACE Editor initialization failed, falling back to basic textarea:',
                error,
            )

            const container = this.$refs?.aceCodeEditorInner
            if (container) {
                // Create a user-friendly fallback interface
                container.innerHTML = `
                    <div class="fi-ace-editor-fallback">
                        <div class="fi-ace-editor-error-banner">
                            <div class="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                                <div>
                                    <p class="text-sm font-medium text-yellow-800">Code editor loaded in basic mode</p>
                                    <p class="text-xs text-yellow-600">Advanced features are temporarily unavailable</p>
                                </div>
                            </div>
                        </div>
                        <textarea
                            x-model="state"
                            placeholder="${this.placeholder}"
                            class="fi-input w-full min-h-[200px] font-mono text-sm"
                            rows="15"
                            ${this.isDisabled ? 'disabled' : ''}
                        ></textarea>
                        <details class="mt-2 text-xs text-gray-500">
                            <summary class="cursor-pointer hover:text-gray-700">Technical Details</summary>
                            <pre class="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">${
                                error.message || 'Unknown error occurred'
                            }</pre>
                        </details>
                    </div>
                `
            }

            // Mark as fallback mode for future reference
            this.isFallbackMode = true
            this.editor = null
        },

        /**
         * Enhanced script loading with retry mechanism and better error handling
         */
        async loadScriptWithRetry(url, maxRetries = null, retryDelay = null) {
            // Use configuration defaults if not provided
            maxRetries =
                maxRetries || this.extensionLoadingConfig.maxRetries || 3
            retryDelay =
                retryDelay || this.extensionLoadingConfig.retryDelay || 1000
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await this.loadScript(url)
                    return // Success, exit retry loop
                } catch (error) {
                    console.warn(
                        `Attempt ${attempt} failed to load script: ${url}`,
                        error,
                    )

                    if (attempt === maxRetries) {
                        throw new Error(
                            `Failed to load script after ${maxRetries} attempts: ${url}`,
                        )
                    }

                    // Wait before retry
                    await new Promise((resolve) =>
                        setTimeout(resolve, retryDelay),
                    )
                }
            }
        },

        /**
         * Enhanced extension loading with parallel loading and better error handling
         */
        async loadExtensionsEnhanced() {
            if (!extensions || Object.keys(extensions).length === 0) {
                return
            }

            const extensionEntries = Object.entries(extensions)
            const useParallelLoading =
                this.extensionLoadingConfig.parallelLoading !== false
            const maxRetries = this.extensionLoadingConfig.maxRetries || 3
            const timeout = this.extensionLoadingConfig.timeout || 30000

            const loadPromises = extensionEntries.map(
                async ([extensionName, extensionUrl]) => {
                    // Skip if already preloaded or cached
                    if (this.extensionCache.preloaded.has(extensionName)) {
                        return {
                            name: extensionName,
                            url: extensionUrl,
                            status: 'preloaded',
                        }
                    }

                    // Check if extension is in cache
                    const cached = this.getExtensionFromCache(extensionName)
                    if (cached) {
                        try {
                            this.executeCachedScript(cached, extensionName)
                            return {
                                name: extensionName,
                                url: extensionUrl,
                                status: 'cached',
                            }
                        } catch (error) {
                            console.warn(
                                `Failed to execute cached extension: ${extensionName}`,
                                error,
                            )
                            // Fall through to network loading
                        }
                    }

                    try {
                        await this.loadScriptWithRetry(extensionUrl, maxRetries)
                        return {
                            name: extensionName,
                            url: extensionUrl,
                            status: 'loaded',
                        }
                    } catch (error) {
                        console.error(
                            `Failed to load extension: ${extensionName}`,
                            error,
                        )
                        return {
                            name: extensionName,
                            url: extensionUrl,
                            status: 'failed',
                            error,
                        }
                    }
                },
            )

            let results
            if (useParallelLoading) {
                // Load all extensions in parallel
                results = await Promise.allSettled(loadPromises)
            } else {
                // Load extensions sequentially
                results = []
                for (const loadPromise of loadPromises) {
                    const result = await Promise.allSettled([loadPromise])
                    results.push(result[0])
                }
            }

            const loaded = results
                .filter((r) => ['loaded', 'preloaded', 'cached'].includes(r.value?.status))
                .map((r) => r.value.name)
            const failed = results
                .filter((r) => r.value?.status === 'failed')
                .map((r) => r.value)

            // Log performance statistics
            const preloaded = results.filter(r => r.value?.status === 'preloaded').length
            const cached = results.filter(r => r.value?.status === 'cached').length
            const networkLoaded = results.filter(r => r.value?.status === 'loaded').length

            if (preloaded > 0 || cached > 0) {
                console.log(`Extension loading performance: ${preloaded} preloaded, ${cached} cached, ${networkLoaded} from network`)
            }

            if (failed.length > 0) {
                console.error(
                    `Failed to load extensions: ${failed
                        .map((f) => f.name)
                        .join(', ')}`,
                )
                failed.forEach((f) => {
                    console.error(`Extension ${f.name} error:`, f.error)
                })
            }

            // Return loaded extensions for potential further processing
            return loaded
        },

        /**
         * Get loading statistics for debugging
         */
        getExtensionLoadingStats() {
            const extensionEntries = Object.entries(extensions || {})
            const total = extensionEntries.length

            // Count only extension scripts that were actually loaded
            const extensionUrls = extensionEntries.map(([_, url]) => url)
            const loaded = this.loadedScripts.filter((scriptUrl) =>
                extensionUrls.some((extUrl) =>
                    scriptUrl.includes(extUrl.split('/').pop()),
                ),
            ).length

            return {
                total,
                loaded,
                pending: Math.max(0, total - loaded), // Prevent negative values
                successRate:
                    total > 0
                        ? Math.min(100, (loaded / total) * 100).toFixed(1)
                        : 0, // Cap at 100%
            }
        },

        /**
         * Preload critical extensions in parallel for faster initialization
         * Should be called early in the initialization process
         */
        async preloadCriticalExtensions() {
            if (!extensions || Object.keys(extensions).length === 0) {
                return
            }

            // Define critical extensions that should be preloaded
            const criticalExtensions = ['language_tools', 'searchbox', 'beautify']

            // Filter to only extensions that are actually enabled
            const preloadTargets = criticalExtensions.filter(extName =>
                extensions[extName] && !this.extensionCache.preloaded.has(extName)
            )

            if (preloadTargets.length === 0) {
                return // All critical extensions already preloaded
            }

            console.log(`Preloading ${preloadTargets.length} critical extensions...`)

            const preloadPromises = preloadTargets.map(async (extName) => {
                const extensionUrl = extensions[extName]

                // Check cache first
                const cached = this.getExtensionFromCache(extName)
                if (cached) {
                    this.extensionCache.preloaded.add(extName)
                    return { name: extName, status: 'cached', source: 'localStorage' }
                }

                try {
                    // Store the preloading promise to avoid duplicate requests
                    if (!this.extensionCache.preloadingPromises.has(extName)) {
                        const promise = this.loadScriptWithCache(extensionUrl, extName)
                        this.extensionCache.preloadingPromises.set(extName, promise)
                    }

                    await this.extensionCache.preloadingPromises.get(extName)
                    this.extensionCache.preloaded.add(extName)

                    return { name: extName, status: 'preloaded', source: 'network' }
                } catch (error) {
                    console.warn(`Failed to preload extension: ${extName}`, error)
                    return { name: extName, status: 'failed', error }
                }
            })

            const results = await Promise.allSettled(preloadPromises)
            const successful = results.filter(r => r.value?.status !== 'failed')

            console.log(`Preloaded ${successful.length}/${preloadTargets.length} extensions successfully`)
        },

        /**
         * Enhanced loadScript with localStorage caching support
         */
        async loadScriptWithCache(url, extensionName) {
            // Check cache first
            const cached = this.getExtensionFromCache(extensionName)
            if (cached) {
                // Execute cached script immediately
                this.executeCachedScript(cached, extensionName)
                return
            }

            // Load from network and cache
            await this.loadScript(url)

            // Cache the loaded script for future use
            try {
                const response = await fetch(url)
                const scriptContent = await response.text()
                this.cacheExtension(extensionName, scriptContent)
            } catch (error) {
                console.warn(`Failed to cache extension: ${extensionName}`, error)
            }
        },

        /**
         * Get extension content from localStorage cache
         */
        getExtensionFromCache(extensionName) {
            try {
                const cacheKey = `ace-extension-${extensionName}`
                const cached = localStorage.getItem(cacheKey)

                if (!cached) {
                    return null
                }

                const parsed = JSON.parse(cached)

                // Check cache version compatibility
                if (parsed.version !== this.extensionCache.cacheVersion) {
                    localStorage.removeItem(cacheKey)
                    return null
                }

                // Check cache expiry (7 days)
                const now = Date.now()
                if (now - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
                    localStorage.removeItem(cacheKey)
                    return null
                }

                return parsed.content
            } catch (error) {
                console.warn(`Cache read error for ${extensionName}:`, error)
                return null
            }
        },

        /**
         * Cache extension content in localStorage
         */
        cacheExtension(extensionName, content) {
            try {
                const cacheKey = `ace-extension-${extensionName}`
                const cacheData = {
                    version: this.extensionCache.cacheVersion,
                    timestamp: Date.now(),
                    content: content
                }

                localStorage.setItem(cacheKey, JSON.stringify(cacheData))
                this.extensionCache.cached.set(extensionName, cacheData)
            } catch (error) {
                // Handle quota exceeded - clean old cache entries
                if (error.name === 'QuotaExceededError') {
                    this.cleanExtensionCache()
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
                    } catch (retryError) {
                        console.warn(`Failed to cache extension ${extensionName}:`, retryError)
                    }
                }
            }
        },

        /**
         * Clean old extension cache entries to free space
         */
        cleanExtensionCache() {
            const keys = Object.keys(localStorage)
            const aceKeys = keys.filter(key => key.startsWith('ace-extension-'))

            // Sort by timestamp and remove oldest entries
            const entries = aceKeys.map(key => {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key))
                    return { key, timestamp: parsed.timestamp }
                } catch {
                    return { key, timestamp: 0 }
                }
            }).sort((a, b) => a.timestamp - b.timestamp)

            // Remove oldest 25% of entries
            const removeCount = Math.ceil(entries.length * 0.25)
            for (let i = 0; i < removeCount; i++) {
                localStorage.removeItem(entries[i].key)
            }
        },

        /**
         * Execute cached script content
         */
        executeCachedScript(content, extensionName) {
            try {
                // Create a script element with the cached content
                const script = document.createElement('script')
                script.textContent = content
                script.setAttribute('data-cached-extension', extensionName)
                document.head.appendChild(script)

                this.loadedScripts.push(`cached:${extensionName}`)
            } catch (error) {
                console.error(`Failed to execute cached script for ${extensionName}:`, error)
                throw error
            }
        },

        /**
         * Clear extension cache (for debugging or cache invalidation)
         */
        clearExtensionCache() {
            try {
                const keys = Object.keys(localStorage)
                const aceKeys = keys.filter(key => key.startsWith('ace-extension-'))
                aceKeys.forEach(key => localStorage.removeItem(key))

                this.extensionCache.cached.clear()
                this.extensionCache.preloaded.clear()

                console.log('Extension cache cleared')
            } catch (error) {
                console.error('Failed to clear extension cache:', error)
            }
        },

        /**
         * Dynamically loads a JavaScript file from the given URL
         * Returns a Promise that resolves when the script loads successfully
         */
        loadScript(url) {
            return new Promise((resolve, reject) => {
                // Check if script is already loaded
                if (this.loadedScripts.includes(url)) {
                    resolve()
                    return
                }

                const script = document.createElement('script')
                script.src = url
                script.onload = () => {
                    this.loadedScripts.push(url)
                    resolve()
                }
                script.onerror = reject
                document.head.appendChild(script)
            })
        },

        /**
         * Apply the initial theme when the editor first loads
         * Uses dark theme if dark mode is enabled and available
         */
        applyInitialTheme() {
            if (!disableDarkTheme) {
                this.setTheme()
            } else if (this.editor) {
                this.editor.setTheme(options.theme)
            }
        },

        /**
         * Watch for changes in the page's dark/light mode state
         * Automatically switches editor theme when system theme changes
         */
        observeDarkModeChanges() {
            if (disableDarkTheme) return

            const targetElement = document.querySelector('html')
            this.observer = new MutationObserver(() => this.setTheme())
            this.observer.observe(targetElement, {
                attributes: true,
                attributeFilter: ['class'],
            })
        },

        /**
         * Switch between light and dark themes based on current page state
         * Checks the HTML element for 'dark' class to determine theme
         */
        setTheme() {
            if (!this.editor) return

            const isDarkMode = document
                .querySelector('html')
                .classList.contains('dark')
            const theme = isDarkMode
                ? darkTheme || options.theme
                : options.theme
            this.editor.setTheme(theme)
        },

        /**
         * Setup custom completions and snippets for the editor
         */
        setupCustomCompletions() {
            if (!this.editor) return

            // Enable live autocompletion if not already enabled
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
            })

            // Setup custom completions provider
            const langTools = ace.require('ace/ext/language_tools')

            // Add custom completions
            if (this.completions && this.completions.length > 0) {
                const self = this
                const customCompleter = {
                    getCompletions: function (
                        _editor,
                        _session,
                        _pos,
                        _prefix,
                        callback,
                    ) {
                        const completions = []

                        // Add configured completions
                        self.completions.forEach((completion) => {
                            completions.push({
                                caption: completion.caption,
                                value: completion.value,
                                meta: completion.meta || 'Custom',
                                score: completion.score || 1000,
                            })
                        })

                        callback(null, completions)
                    },
                }

                langTools.addCompleter(customCompleter)
            }

            // Add custom snippets
            if (this.snippets && this.snippets.length > 0) {
                Object.keys(this.snippets).forEach((trigger) => {
                    const snippetContent = this.snippets[trigger]
                    langTools.addSnippet({
                        name: trigger,
                        trigger: trigger,
                        content: snippetContent,
                    })
                })
            }
        },

        // Toolbar Methods
        executeToolbarAction(command, event) {
            if (!this.editor || !this.hasToolbar) return

            // Prevent form submission and event bubbling
            if (event) {
                event.preventDefault()
                event.stopPropagation()
            }

            const actions = {
                undo: () => this.performOptimizedUndo(),
                redo: () => this.performOptimizedRedo(),
                find: () => this.editor.execCommand('find'),
                replace: () => this.editor.execCommand('replace'),
                'goto-line': () => this.goToLine(),
                'toggle-comment': () => this.toggleCommentLines(),
                'toggle-fold': () => this.toggleCurrentFold(),
                'show-invisibles': () => this.toggleShowInvisibles(),
                'toggle-wordwrap': () => this.toggleWordWrap(),
                'convert-uppercase': () => this.convertToUpperCase(),
                'convert-lowercase': () => this.convertToLowerCase(),
                'toggle-print-margin': () => this.togglePrintMargin(),
            }

            const action = actions[command]
            if (action) {
                action()
                this.updateToolbarState()
            }
        },

        toggleCurrentFold() {
            const session = this.editor.getSession()
            const cursor = this.editor.getCursorPosition()

            // Use efficient fold state detection to determine action
            const foldState = this.getEfficientFoldState()

            try {
                // Check if session supports folding
                const hasFoldSupport =
                    session.getFoldWidget &&
                    typeof session.getFoldWidget === 'function'
                if (!hasFoldSupport) {
                    // Session doesn't support folding, just use fallback execCommand
                    this.editor.execCommand('toggleFoldWidget')
                    return
                }

                if (foldState.isInsideFold) {
                    // Cursor is inside a folded region, unfold it
                    const fold = session.getFoldAt
                        ? session.getFoldAt(cursor.row, cursor.column, 1)
                        : null
                    if (fold) {
                        session.unfold(fold)
                    } else {
                        // Fallback: unfold the current row if it's folded
                        if (
                            session.isRowFolded &&
                            session.isRowFolded(cursor.row)
                        ) {
                            const range = session.getFoldWidgetRange
                                ? session.getFoldWidgetRange(cursor.row, 'all')
                                : null
                            if (range) {
                                session.unfold(range)
                            }
                        }
                    }
                    return
                }

                // Get the fold widget for the current line
                const foldWidget = session.getFoldWidget(cursor.row)

                if (foldWidget === 'start') {
                    // Current line can be folded, toggle it
                    const range = session.getFoldWidgetRange
                        ? session.getFoldWidgetRange(cursor.row, 'all')
                        : null
                    if (range) {
                        const isRowFolded = session.isRowFolded
                            ? session.isRowFolded(cursor.row)
                            : false
                        if (isRowFolded) {
                            // Line is already folded, unfold it
                            session.unfold(range)
                        } else {
                            // Line can be folded, fold it
                            session.addFold('...', range)
                        }
                    }
                } else if (foldWidget === 'end') {
                    // Cursor is on the end of a fold, find the start and unfold
                    const range = session.getFoldWidgetRange
                        ? session.getFoldWidgetRange(cursor.row, 'all')
                        : null
                    if (range) {
                        session.unfold(range)
                    }
                } else {
                    // Search upwards for the nearest foldable line (optimized with max iterations)
                    let line = cursor.row - 1
                    let maxSearch = 10 // Limit search for performance
                    while (line >= 0 && maxSearch > 0) {
                        const widget = session.getFoldWidget(line)
                        if (widget === 'start') {
                            const range = session.getFoldWidgetRange
                                ? session.getFoldWidgetRange(line, 'all')
                                : null
                            if (range) {
                                const isRowFolded = session.isRowFolded
                                    ? session.isRowFolded(line)
                                    : false
                                if (isRowFolded) {
                                    // Already folded, unfold it
                                    session.unfold(range)
                                } else {
                                    // Not folded, fold it
                                    session.addFold('...', range)
                                }
                                break
                            }
                        }
                        line--
                        maxSearch--
                    }
                }

                // Invalidate fold cache after operation
                this.lastFoldState.cursorRow = -1
                this.lastFoldState.cursorColumn = -1
            } catch (error) {
                console.error('Error toggling fold:', error)
                // Fallback to execCommand if all else fails
                try {
                    this.editor.execCommand('toggleFoldWidget')
                    // Invalidate cache after fallback too
                    this.lastFoldState.cursorRow = -1
                    this.lastFoldState.cursorColumn = -1
                } catch (fallbackError) {
                    console.error(
                        'Fallback fold command failed:',
                        fallbackError,
                    )
                }
            }
        },

        toggleCommentLines() {
            const editor = this.editor
            const session = editor.getSession()
            const selection = editor.getSelection()
            const range = selection.getRange()

            if (range.isEmpty()) {
                // No selection, toggle current line
                const row = selection.getCursor().row
                this.toggleLineComment(session, row, row)
            } else {
                // Multiple lines selected, toggle all
                this.toggleLineComment(session, range.start.row, range.end.row)
            }
        },

        toggleLineComment(session, startRow, endRow) {
            // Get comment prefix for current mode
            const commentInfo = this.getCommentPrefix(session)
            if (!commentInfo) return

            const commentPrefix = commentInfo.prefix
            const commentSuffix = commentInfo.suffix || ''

            // Check if lines are commented
            let linesAreCommented = true
            for (let i = startRow; i <= endRow; i++) {
                const line = session.getLine(i)
                if (line.trim() && !line.trim().startsWith(commentPrefix)) {
                    linesAreCommented = false
                    break
                }
            }

            // Toggle comments
            for (let i = startRow; i <= endRow; i++) {
                const line = session.getLine(i)
                if (linesAreCommented) {
                    // Remove comments
                    let uncommentedLine = line
                    if (commentSuffix) {
                        // Handle comments with both prefix and suffix (like HTML comments)
                        uncommentedLine = line.replace(
                            new RegExp(
                                `^\\s*${commentPrefix}\\s*(.*?)\\s*${commentSuffix.replace(
                                    /[.*+?^${}()|[\]\\]/g,
                                    '\\$&',
                                )}\\s?$`,
                            ),
                            '$1',
                        )
                    } else {
                        // Handle simple prefix comments (like // or #)
                        uncommentedLine = line.replace(
                            new RegExp(`^\\s*${commentPrefix}\\s?`),
                            '',
                        )
                    }
                    session.replace(
                        {
                            start: { row: i, column: 0 },
                            end: { row: i, column: line.length },
                        },
                        uncommentedLine,
                    )
                } else {
                    // Add comments
                    let commentedLine
                    if (commentSuffix) {
                        // Handle comments with both prefix and suffix (like HTML comments)
                        commentedLine =
                            commentPrefix + ' ' + line + ' ' + commentSuffix
                    } else {
                        // Handle simple prefix comments (like // or #)
                        commentedLine = commentPrefix + ' ' + line
                    }
                    session.replace(
                        {
                            start: { row: i, column: 0 },
                            end: { row: i, column: line.length },
                        },
                        commentedLine,
                    )
                }
            }
        },

        getCommentPrefix(session) {
            const mode = session.getMode().$id
            const commentMap = {
                'ace/mode/php': { prefix: '//', suffix: '' },
                'ace/mode/javascript': { prefix: '//', suffix: '' },
                'ace/mode/typescript': { prefix: '//', suffix: '' },
                'ace/mode/java': { prefix: '//', suffix: '' },
                'ace/mode/c_cpp': { prefix: '//', suffix: '' },
                'ace/mode/csharp': { prefix: '//', suffix: '' },
                'ace/mode/python': { prefix: '#', suffix: '' },
                'ace/mode/ruby': { prefix: '#', suffix: '' },
                'ace/mode/perl': { prefix: '#', suffix: '' },
                'ace/mode/sh': { prefix: '#', suffix: '' },
                'ace/mode/bash': { prefix: '#', suffix: '' },
                'ace/mode/sql': { prefix: '--', suffix: '' },
                'ace/mode/html': { prefix: '<!--', suffix: '-->' },
                'ace/mode/xml': { prefix: '<!--', suffix: '-->' },
                'ace/mode/css': { prefix: '/*', suffix: '*/' },
                'ace/mode/scss': { prefix: '//', suffix: '' },
                'ace/mode/sass': { prefix: '//', suffix: '' },
                'ace/mode/less': { prefix: '//', suffix: '' },
            }
            return commentMap[mode] || { prefix: '//', suffix: '' }
        },

        toggleShowInvisibles(mode = 'all') {
            const current = this.editor.getShowInvisibles()

            // Handle granular modes for better performance
            let newState
            switch (mode) {
                case 'all':
                    newState = current ? false : true
                    break
                case 'spaces':
                    newState = current === 'spaces' ? false : 'spaces'
                    break
                case 'tabs':
                    newState = current === 'tabs' ? false : 'tabs'
                    break
                case 'eol':
                    newState = current === 'eol' ? false : 'eol'
                    break
                default:
                    newState = current ? false : true
            }

            // Set the new state
            this.editor.setShowInvisibles(newState)

            // Update both the expensive state cache and toolbar state immediately
            this.lastExpensiveState.showInvisibles = newState
            this.lastExpensiveState.lastCheckTime = Date.now()
            this.updateToolbarState(true) // Force immediate update for toggle actions
        },

        toggleWordWrap() {
            const session = this.editor.getSession()
            const current = session.getUseWrapMode()
            session.setUseWrapMode(!current)

            // Update toolbar state immediately for responsive UI
            this.updateToolbarState()
        },

        convertToUpperCase() {
            this.convertCaseOptimized('toUpperCase')
        },

        convertToLowerCase() {
            this.convertCaseOptimized('toLowerCase')
        },

        /**
         * Optimized case conversion with performance enhancements
         * Based on ACE Editor internal implementation research
         */
        convertCaseOptimized(conversionType) {
            const startTime = performance.now()
            const state = this.caseConversionState

            // Prevent concurrent operations
            if (state.operationInProgress) {
                return
            }

            state.operationInProgress = true

            try {
                // Get current selection efficiently
                const session = this.editor.getSession()
                const originalRange = this.editor.getSelectionRange()

                // Auto-select word if no selection (following ACE's pattern)
                if (this.editor.getSelection().isEmpty()) {
                    this.editor.getSelection().selectWord()
                }

                const range = this.editor.getSelectionRange()
                const text = session.getTextRange(range)

                // Skip if no text to convert
                if (!text || text.length === 0) {
                    this.editor.getSelection().setSelectionRange(originalRange)
                    return
                }

                // Create cache key for repeated conversions
                const cacheKey = `${text}:${conversionType}`

                // Check cache first for performance
                if (state.conversionCache.has(cacheKey)) {
                    const cachedResult = state.conversionCache.get(cacheKey)
                    session.replace(range, cachedResult)

                    this.editor.getSelection().setSelectionRange(originalRange)
                    return
                }

                // For large text blocks, use requestAnimationFrame to prevent blocking
                if (text.length > state.largeTextThreshold) {
                    this.performLargeTextConversion(
                        range,
                        text,
                        conversionType,
                        originalRange,
                        cacheKey,
                    )
                } else {
                    // Direct conversion for smaller text blocks
                    const convertedText =
                        conversionType === 'toUpperCase'
                            ? text.toUpperCase()
                            : text.toLowerCase()

                    // Batch operation with undo management optimization
                    this.performOptimizedReplacement(
                        range,
                        convertedText,
                        originalRange,
                        cacheKey,
                    )
                }
            } catch (error) {
                console.warn(
                    `Case conversion failed (${conversionType}):`,
                    error,
                )
                // Fallback to ACE's native implementation
                this.editor.execCommand(conversionType.toLowerCase())
            } finally {
                state.operationInProgress = false
                state.lastConversionTime = performance.now()
            }
        },

        /**
         * Handle large text conversions with requestAnimationFrame for non-blocking operation
         */
        performLargeTextConversion(
            range,
            text,
            conversionType,
            originalRange,
            cacheKey,
        ) {
            // Use ACE's nextFrame pattern for non-blocking operations
            requestAnimationFrame(() => {
                try {
                    const convertedText =
                        conversionType === 'toUpperCase'
                            ? text.toUpperCase()
                            : text.toLowerCase()

                    this.performOptimizedReplacement(
                        range,
                        convertedText,
                        originalRange,
                        cacheKey,
                    )
                } catch (error) {
                    console.warn('Large text conversion failed:', error)
                    this.editor.execCommand(conversionType.toLowerCase())
                }
            })
        },

        /**
         * Perform optimized text replacement with undo management
         * Based on ACE Editor internal best practices
         */
        performOptimizedReplacement(
            range,
            convertedText,
            originalRange,
            cacheKey,
        ) {
            const session = this.editor.getSession()

            // Optimize undo management by batching operations
            const originalMergeDeltas = session.mergeUndoDeltas
            session.mergeUndoDeltas = 'always'

            try {
                // Perform the replacement
                session.replace(range, convertedText)

                // Restore original selection
                this.editor.getSelection().setSelectionRange(originalRange)

                // Cache the result for future use
                this.cacheConversionResult(cacheKey, convertedText)
            } finally {
                // Restore original undo merge setting
                session.mergeUndoDeltas = originalMergeDeltas
            }
        },

        /**
         * Cache conversion results to improve performance for repeated operations
         */
        cacheConversionResult(cacheKey, convertedText) {
            const state = this.caseConversionState

            // Manage cache size to prevent memory issues
            if (state.conversionCache.size >= state.maxCacheSize) {
                // Remove oldest entries (simple LRU implementation)
                const firstKey = state.conversionCache.keys().next().value
                state.conversionCache.delete(firstKey)
            }

            state.conversionCache.set(cacheKey, convertedText)
        },

        togglePrintMargin() {
            const current = this.printMarginState.showPrintMargin
            const newState = !current

            // Optimized print margin toggle with performance improvements
            this.setPrintMarginOptimized(newState)

            // Update toolbar state immediately for responsive UI
            this.updateToolbarState(true)
        },

        /**
         * Optimized print margin setter with performance enhancements
         * Based on ACE Editor internal implementation research
         */
        setPrintMarginOptimized(show) {
            if (this.printMarginState.showPrintMargin === show) {
                return // No change needed
            }

            const now = performance.now()

            // Update our cached state immediately for responsive UI
            this.printMarginState.showPrintMargin = show
            this.printMarginState.lastUpdateTime = now

            // Use requestAnimationFrame for smooth, non-blocking updates
            if (this.printMarginState.throttledUpdate) {
                cancelAnimationFrame(this.printMarginState.throttledUpdate)
            }

            this.printMarginState.throttledUpdate = requestAnimationFrame(
                () => {
                    try {
                        // Batch the ACE API call to reduce layout thrashing
                        this.editor.setShowPrintMargin(show)

                        // Update word wrap if needed (print margin affects wrap behavior)
                        this.updateWordWrapForPrintMargin()
                    } catch (error) {
                        console.warn('Print margin update failed:', error)
                        // Fallback to direct API call
                        this.editor.setShowPrintMargin(show)
                    } finally {
                        this.printMarginState.throttledUpdate = null
                        this.printMarginState.updateScheduled = false
                    }
                },
            )

            this.printMarginState.updateScheduled = true
        },

        /**
         * Update word wrap when print margin changes for optimal text layout
         * Based on ACE's internal print margin-word wrap integration
         */
        updateWordWrapForPrintMargin() {
            try {
                const session = this.editor.getSession()
                if (session && session.getUseWrapMode()) {
                    // Trigger word wrap recalculation when print margin changes
                    // This mimics ACE's internal behavior in adjustWrapLimit()
                    const renderer = this.editor.renderer
                    if (renderer && renderer.adjustWrapLimit) {
                        renderer.adjustWrapLimit()
                    }
                }
            } catch (error) {
                // Silently ignore word wrap update errors
            }
        },

        /**
         * Set print margin column with performance optimizations
         */
        setPrintMarginColumn(column) {
            column = Math.max(1, Math.min(column, 1000)) // Reasonable bounds

            if (this.printMarginState.printMarginColumn === column) {
                return // No change needed
            }

            this.printMarginState.printMarginColumn = column

            // Use throttled update for column changes
            if (this.printMarginState.throttledUpdate) {
                cancelAnimationFrame(this.printMarginState.throttledUpdate)
            }

            this.printMarginState.throttledUpdate = requestAnimationFrame(
                () => {
                    try {
                        this.editor.setPrintMarginColumn(column)
                        this.updateWordWrapForPrintMargin()
                    } catch (error) {
                        console.warn(
                            'Print margin column update failed:',
                            error,
                        )
                    } finally {
                        this.printMarginState.throttledUpdate = null
                    }
                },
            )
        },

        goToLine() {
            if (!this.editor) return

            // Use optimized goto line dialog based on ACE's internal implementation
            this.showOptimizedGotoLineDialog()
        },

        /**
         * Optimized goto line dialog based on ACE Editor's internal implementation
         * Includes performance optimizations and ACE-like features with dialog reuse
         */
        showOptimizedGotoLineDialog() {
            const session = this.editor.getSession()
            const currentLine = this.editor.getCursorPosition().row + 1
            const totalLines = session.getLength()

            // Check for dark mode once and cache
            const isDarkMode =
                document.documentElement.classList.contains('dark')

            // Create optimized modal with performance considerations
            const editorContainer = this.editor.container
            const overlay = this.createOptimizedModal(isDarkMode)

            const dialog = this.getOrCreateGotoLineDialog(
                currentLine,
                totalLines,
                isDarkMode,
            )
            overlay.appendChild(dialog)
            editorContainer.appendChild(overlay)

            // Setup optimized event handlers
            this.setupGotoLineHandlers(
                overlay,
                dialog,
                currentLine,
                totalLines,
                isDarkMode,
            )

            // Focus input with RAF for better performance
            requestAnimationFrame(() => {
                const input = dialog.querySelector('#gotoLineInput')
                if (input) {
                    input.focus()
                    input.select()
                }
            })
        },

        /**
         * Create optimized modal overlay with performance enhancements
         */
        createOptimizedModal(isDarkMode) {
            const overlay = document.createElement('div')
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                backdrop-filter: blur(2px);
                transition: opacity 0.15s ease-out;
            `
            overlay.style.opacity = '0'

            // Fade in animation for better UX
            requestAnimationFrame(() => {
                overlay.style.opacity = '1'
            })

            return overlay
        },

        /**
         * Get or create goto line dialog with pooling for better performance
         */
        getOrCreateGotoLineDialog(currentLine, totalLines, isDarkMode) {
            const now = Date.now()
            const pool = this.dialogPool

            // Reuse existing dialog if recent enough
            if (pool.gotoLine && now - pool.lastUsed < pool.reuseTimeout) {
                // Reset dialog state for reuse
                this.resetGotoLineDialog(pool.gotoLine, currentLine, isDarkMode)
                pool.lastUsed = now
                return pool.gotoLine
            }

            // Create new dialog
            pool.gotoLine = this.createGotoLineDialog(
                currentLine,
                totalLines,
                isDarkMode,
            )
            pool.lastUsed = now
            return pool.gotoLine
        },

        /**
         * Reset existing dialog for reuse with new values
         */
        resetGotoLineDialog(dialog, currentLine, isDarkMode) {
            // Update styles for current theme
            dialog.style.background = isDarkMode ? '#1f2937' : 'white'
            dialog.style.color = isDarkMode ? 'white' : 'black'
            dialog.style.border = `1px solid ${
                isDarkMode ? '#374151' : '#e5e7eb'
            }`

            // Reset input value
            const input = dialog.querySelector('#gotoLineInput')
            if (input) {
                input.value = currentLine.toString()
                input.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db'
            }

            // Update history section
            const historyContainer = dialog.querySelector('#gotoHistory')
            if (historyContainer) {
                historyContainer.innerHTML =
                    this.gotoLineState.history.length > 0
                        ? this.gotoLineState.history
                              .slice(-5)
                              .map(
                                  (line) =>
                                      `<button class="history-btn" data-line="${line}" style="padding: 2px 8px; font-size: 11px; background: ${
                                          isDarkMode ? '#374151' : '#f3f4f6'
                                      }; color: ${
                                          isDarkMode ? '#d1d5db' : '#4b5563'
                                      }; border: 1px solid ${
                                          isDarkMode ? '#4b5563' : '#d1d5db'
                                      }; border-radius: 3px; cursor: pointer; font-family: monospace;">${line}</button>`,
                              )
                              .join('')
                        : ''
            }

            // Reset animation state
            dialog.style.transform = 'scale(0.95)'
            dialog.style.opacity = '0'
        },

        /**
         * Create goto line dialog with ACE-like features and performance optimizations
         */
        createGotoLineDialog(currentLine, totalLines, isDarkMode) {
            const dialog = document.createElement('div')
            dialog.style.cssText = `
                background: ${isDarkMode ? '#1f2937' : 'white'};
                color: ${isDarkMode ? 'white' : 'black'};
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                min-width: 320px;
                max-width: 360px;
                border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
                transform: scale(0.95);
                opacity: 0;
                transition: all 0.15s ease-out;
            `

            // Enhanced dialog with history support (like ACE's implementation)
            const historyHtml =
                this.gotoLineState.history.length > 0
                    ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${
                          isDarkMode ? '#374151' : '#e5e7eb'
                      };">
                    <div style="font-size: 11px; color: ${
                        isDarkMode ? '#9ca3af' : '#666'
                    }; margin-bottom: 6px;">Recent:</div>
                    <div id="gotoHistory" style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${this.gotoLineState.history
                            .slice(-5)
                            .map(
                                (line) =>
                                    `<button class="history-btn" data-line="${line}" style="padding: 2px 8px; font-size: 11px; background: ${
                                        isDarkMode ? '#374151' : '#f3f4f6'
                                    }; color: ${
                                        isDarkMode ? '#d1d5db' : '#4b5563'
                                    }; border: 1px solid ${
                                        isDarkMode ? '#4b5563' : '#d1d5db'
                                    }; border-radius: 3px; cursor: pointer; font-family: monospace;">${line}</button>`,
                            )
                            .join('')}
                    </div>
                </div>`
                    : ''

            dialog.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${
                        isDarkMode ? 'white' : '#111827'
                    };">Go to Line</h3>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <label style="font-size: 13px; font-weight: 500; white-space: nowrap; color: ${
                            isDarkMode ? '#d1d5db' : '#374151'
                        };">Line:</label>
                        <input type="text"
                               id="gotoLineInput"
                               inputmode="numeric"
                               pattern="[0-9]*"
                               value="${currentLine}"
                               style="flex: 1; padding: 6px 10px; border: 2px solid ${
                                   isDarkMode ? '#4b5563' : '#d1d5db'
                               }; background: ${
                isDarkMode ? '#374151' : 'white'
            }; color: ${
                isDarkMode ? 'white' : 'black'
            }; border-radius: 4px; font-size: 14px; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; min-width: 80px; outline: none; transition: border-color 0.15s ease;"
                               placeholder="1"
                               autocomplete="off">
                        <span style="font-size: 12px; color: ${
                            isDarkMode ? '#9ca3af' : '#6b7280'
                        };">of ${totalLines}</span>
                    </div>
                    <div id="inputFeedback" style="font-size: 11px; color: ${
                        isDarkMode ? '#f87171' : '#dc2626'
                    }; min-height: 16px; opacity: 0; transition: opacity 0.15s ease;">Invalid line number</div>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="gotoLineCancel"
                            style="padding: 6px 14px; border: 1px solid ${
                                isDarkMode ? '#4b5563' : '#d1d5db'
                            }; background: ${
                isDarkMode ? '#374151' : 'white'
            }; color: ${
                isDarkMode ? 'white' : 'black'
            }; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.15s ease;">
                        Cancel
                    </button>
                    <button id="gotoLineGo"
                            style="padding: 6px 14px; border: 1px solid #2563eb; background: #2563eb; color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.15s ease; font-weight: 500;">
                        Go to Line
                    </button>
                </div>
                ${historyHtml}
            `

            // Animate dialog appearance
            requestAnimationFrame(() => {
                dialog.style.transform = 'scale(1)'
                dialog.style.opacity = '1'
            })

            return dialog
        },

        /**
         * Setup optimized event handlers with performance considerations
         */
        setupGotoLineHandlers(
            overlay,
            dialog,
            _currentLine,
            _totalLines,
            _isDarkMode,
        ) {
            const input = dialog.querySelector('#gotoLineInput')
            const goButton = dialog.querySelector('#gotoLineGo')
            const cancelButton = dialog.querySelector('#gotoLineCancel')
            const feedback = dialog.querySelector('#inputFeedback')
            const historyButtons = dialog.querySelectorAll('.history-btn')

            // Optimized goto line function based on ACE's implementation
            const goToLine = () => {
                const inputText = input.value.trim()

                // Support ACE-like syntax: "line:column", "line>column", etc.
                const parseResult = this.parseGotoLineInput(inputText)

                if (parseResult.isValid) {
                    // Add to history (like ACE's implementation)
                    this.addToGotoHistory(parseResult.line)

                    // Use ACE's optimized gotoLine method
                    this.performOptimizedGotoLine(
                        parseResult.line,
                        parseResult.column,
                        true,
                    )

                    this.editor.focus()
                    closeDialogWithAnimation()
                } else {
                    showInputError(parseResult.error)
                }
            }

            const showInputError = (error) => {
                feedback.textContent = error
                feedback.style.opacity = '1'
                input.style.borderColor = _isDarkMode ? '#f87171' : '#dc2626'

                setTimeout(() => {
                    feedback.style.opacity = '0'
                    input.style.borderColor = _isDarkMode
                        ? '#4b5563'
                        : '#d1d5db'
                }, 2000)
            }

            const closeDialogWithAnimation = () => {
                dialog.style.transform = 'scale(0.95)'
                dialog.style.opacity = '0'
                overlay.style.opacity = '0'

                setTimeout(() => {
                    this.cleanupGotoLineDialog(overlay)
                    this.editor.focus()
                }, 150)
            }

            const closeDialog = () => {
                closeDialogWithAnimation()
            }

            // Optimized input validation with debouncing
            let validationTimeout
            const validateInput = () => {
                clearTimeout(validationTimeout)
                validationTimeout = setTimeout(() => {
                    const parseResult = this.parseGotoLineInput(
                        input.value.trim(),
                    )
                    goButton.style.opacity = parseResult.isValid ? '1' : '0.6'
                    goButton.disabled = !parseResult.isValid

                    if (parseResult.isValid) {
                        input.style.borderColor = _isDarkMode
                            ? '#10b981'
                            : '#059669'
                        feedback.style.opacity = '0'
                    } else if (input.value.trim()) {
                        input.style.borderColor = _isDarkMode
                            ? '#4b5563'
                            : '#d1d5db'
                        feedback.style.opacity = '0'
                    }
                }, 150)
            }

            // Event listeners with performance optimizations
            input.addEventListener('input', validateInput)

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    goToLine()
                    return false
                } else if (e.key === 'Escape') {
                    e.preventDefault()
                    e.stopPropagation()
                    closeDialog()
                    return false
                }
            })

            // Handle history button clicks
            historyButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const line = btn.dataset.line
                    input.value = line
                    validateInput()
                    input.focus()
                })
            })

            // Button event listeners
            goButton.addEventListener('click', goToLine)
            cancelButton.addEventListener('click', closeDialog)

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeDialog()
                }
            })

            // Global key handler with cleanup
            const documentKeyHandler = (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    if (overlay.parentNode) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.key === 'Enter') {
                            goToLine()
                        } else {
                            closeDialog()
                        }
                        return false
                    }
                }
            }

            document.addEventListener('keydown', documentKeyHandler, true)

            // Store cleanup function
            overlay._cleanup = () => {
                document.removeEventListener(
                    'keydown',
                    documentKeyHandler,
                    true,
                )
                clearTimeout(validationTimeout)
            }
        },

        /**
         * Parse goto line input supporting ACE-like syntax
         */
        parseGotoLineInput(input) {
            const session = this.editor.getSession()
            const totalLines = session.getLength()

            // Handle empty input
            if (!input) {
                return { isValid: false, error: 'Please enter a line number' }
            }

            // Support various syntax like ACE: "123", "123:45", "123>45", "c123", etc.
            let line,
                column = 0

            // Column syntax: "123:45" or "123>45"
            const columnMatch = input.match(/^(\d+)([:>])(\d*)$/)
            if (columnMatch) {
                line = parseInt(columnMatch[1], 10)
                if (columnMatch[3]) {
                    column = parseInt(columnMatch[3], 10)
                }
            }
            // Character position syntax: "c123"
            else if (input.toLowerCase().startsWith('c')) {
                // This would require character position calculation - simplified for now
                const charPos = parseInt(input.slice(1), 10)
                const approxLine = Math.max(1, Math.floor(charPos / 80)) // Rough estimate
                return { isValid: true, line: approxLine, column: 0 }
            }
            // Simple line number
            else {
                line = parseInt(input, 10)
            }

            // Validate line number
            if (isNaN(line) || line < 1 || line > totalLines) {
                return {
                    isValid: false,
                    error: `Line must be between 1 and ${totalLines}`,
                }
            }

            // Validate column
            if (isNaN(column) || column < 0) {
                column = 0
            }

            return { isValid: true, line, column }
        },

        /**
         * Perform optimized goto line using ACE's internal methods
         */
        performOptimizedGotoLine(line, column, animate = true) {
            try {
                // Cancel any ongoing animation
                if (this.gotoLineState.animationFrame) {
                    cancelAnimationFrame(this.gotoLineState.animationFrame)
                }

                // Use RAF for smooth non-blocking operation
                this.gotoLineState.animationFrame = requestAnimationFrame(
                    () => {
                        // Clear selection (like ACE's implementation)
                        this.editor.clearSelection()

                        // Ensure line is unfolded (like ACE does)
                        const session = this.editor.getSession()
                        session.unfold({ row: line - 1, column: column || 0 })

                        // Move cursor to position
                        this.editor.moveCursorTo(line - 1, column || 0)

                        // Scroll to line with performance optimization
                        if (!this.editor.isRowFullyVisible(line - 1)) {
                            // Use ACE's optimized scrollToLine method
                            this.editor.scrollToLine(line - 1, true, animate)
                        }

                        // Track last goto for quick access
                        this.gotoLineState.lastGotoLine = line
                        this.gotoLineState.animationFrame = null
                    },
                )
            } catch (error) {
                console.warn('Goto line operation failed:', error)
                // Fallback to direct ACE method
                this.editor.gotoLine(line, column, animate)
            }
        },

        /**
         * Add line to goto history (like ACE's implementation)
         */
        addToGotoHistory(line) {
            // Remove if already exists
            const index = this.gotoLineState.history.indexOf(line)
            if (index > -1) {
                this.gotoLineState.history.splice(index, 1)
            }

            // Add to end
            this.gotoLineState.history.push(line)

            // Limit history size (same as ACE's limit)
            if (
                this.gotoLineState.history.length >
                this.gotoLineState.maxHistory
            ) {
                this.gotoLineState.history.shift()
            }
        },

        /**
         * Clean up goto line dialog and event handlers
         */
        cleanupGotoLineDialog(overlay) {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay)
            }

            // Call cleanup function if it exists
            if (overlay._cleanup) {
                overlay._cleanup()
                overlay._cleanup = null
            }

            // Clear any animation frame
            if (this.gotoLineState.animationFrame) {
                cancelAnimationFrame(this.gotoLineState.animationFrame)
                this.gotoLineState.animationFrame = null
            }
        },

        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen
            const container = this.$el.closest('.rd-ace-editor')

            if (this.isFullscreen) {
                // Enter fullscreen
                container.classList.add('rd-ace-editor--fullscreen')
                document.body.style.overflow = 'hidden'
            } else {
                // Exit fullscreen
                container.classList.remove('rd-ace-editor--fullscreen')
                document.body.style.overflow = ''
            }

            // Trigger ACE resize after a short delay (performance optimized)
            setTimeout(() => {
                if (this.editor && !this.isDestroyed) {
                    this.editor.resize()
                    // Only call updateFull() when necessary - it's very expensive
                    if (this.isFullscreen) {
                        this.editor.renderer.updateFull()
                    }
                }
            }, 100)
        },

        /**
         * Initialize expensive state cache to reduce ACE API calls
         * This should be called once after editor initialization
         */
        initializeExpensiveStateCache() {
            if (!this.editor) return

            try {
                // Cache expensive-to-retrieve state values
                this.lastExpensiveState.showInvisibles =
                    this.editor.getShowInvisibles()
                this.lastExpensiveState.lastCheckTime = Date.now()

                // Initialize print margin state with optimal defaults
                this.printMarginState.showPrintMargin =
                    this.editor.getShowPrintMargin()
                this.printMarginState.printMarginColumn =
                    this.editor.getPrintMarginColumn() || 80
                this.printMarginState.lastUpdateTime = Date.now()

                // Initialize toolbar state cache as well
                const undoManager = this.editor.session.getUndoManager()
                this.lastToolbarState.canUndo = undoManager.hasUndo()
                this.lastToolbarState.canRedo = undoManager.hasRedo()

                // Initialize our optimized undo/redo state cache
                this.undoRedoState.canUndo = this.lastToolbarState.canUndo
                this.undoRedoState.canRedo = this.lastToolbarState.canRedo
                this.undoRedoState.lastCheckTime = Date.now()
                this.lastToolbarState.showPrintMargin =
                    this.printMarginState.showPrintMargin
                this.lastToolbarState.showInvisibles =
                    this.lastExpensiveState.showInvisibles
                this.lastToolbarState.wordWrapEnabled = this.editor
                    .getSession()
                    .getUseWrapMode()

                // Set initial Alpine.js state
                this.toolbarState.canUndo = this.lastToolbarState.canUndo
                this.toolbarState.canRedo = this.lastToolbarState.canRedo
                this.toolbarState.showPrintMargin =
                    this.lastToolbarState.showPrintMargin
                this.toolbarState.showInvisibles =
                    this.lastToolbarState.showInvisibles
                this.toolbarState.wordWrapEnabled =
                    this.lastToolbarState.wordWrapEnabled
            } catch (error) {
                console.warn(
                    'Failed to initialize expensive state cache:',
                    error,
                )
                // Fallback to default values
                this.lastExpensiveState.showInvisibles = false
                this.lastExpensiveState.lastCheckTime = Date.now()
                this.printMarginState.showPrintMargin = true
                this.printMarginState.printMarginColumn = 80
                this.printMarginState.lastUpdateTime = Date.now()
            }
        },

        /**
         * Perform optimized undo operation with performance enhancements
         * Based on ACE Editor's undo system research
         */
        performOptimizedUndo() {
            if (!this.editor || !this.editor.session) return

            try {
                const undoManager = this.editor.session.getUndoManager()
                if (!undoManager || !undoManager.hasUndo()) {
                    return // Nothing to undo
                }

                // Check if this operation should be queue to prevent rapid calls
                const now = performance.now()
                const timeSinceLastOp =
                    now - this.undoRedoState.lastOperationTime

                // Queue rapid operations to prevent performance issues
                if (
                    timeSinceLastOp < 50 &&
                    this.undoRedoState.isProcessingQueue
                ) {
                    this.undoRedoState.operationQueue.push({
                        type: 'undo',
                        timestamp: now,
                    })
                    return
                }

                this.undoRedoState.lastOperationTime = now
                this.undoRedoState.isProcessingQueue = true

                // Use requestAnimationFrame for non-blocking operation
                requestAnimationFrame(() => {
                    try {
                        // Perform the undo operation
                        this.editor.undo()

                        // Invalidate our cached undo state
                        this.undoRedoState.lastCheckTime = 0

                        // Update toolbar state immediately for responsive UI
                        this.updateToolbarState(true)

                        // Process any queued operations
                        this.processUndoRedoQueue()
                    } catch (error) {
                        console.warn('Undo operation failed:', error)
                    } finally {
                        this.undoRedoState.isProcessingQueue = false
                    }
                })
            } catch (error) {
                console.warn('Undo operation failed:', error)
                // Fallback to direct ACE method
                try {
                    this.editor.undo()
                    this.updateToolbarState(true)
                } catch (fallbackError) {
                    console.warn('Fallback undo also failed:', fallbackError)
                }
            }
        },

        /**
         * Perform optimized redo operation with performance enhancements
         * Based on ACE Editor's undo system research
         */
        performOptimizedRedo() {
            if (!this.editor || !this.editor.session) return

            try {
                const undoManager = this.editor.session.getUndoManager()
                if (!undoManager || !undoManager.hasRedo()) {
                    return // Nothing to redo
                }

                const now = performance.now()
                const timeSinceLastOp =
                    now - this.undoRedoState.lastOperationTime

                // Queue rapid operations to prevent performance issues
                if (
                    timeSinceLastOp < 50 &&
                    this.undoRedoState.isProcessingQueue
                ) {
                    this.undoRedoState.operationQueue.push({
                        type: 'redo',
                        timestamp: now,
                    })
                    return
                }

                this.undoRedoState.lastOperationTime = now
                this.undoRedoState.isProcessingQueue = true

                // Use requestAnimationFrame for non-blocking operation
                requestAnimationFrame(() => {
                    try {
                        // Perform the redo operation
                        this.editor.redo()

                        // Invalidate our cached undo state
                        this.undoRedoState.lastCheckTime = 0

                        // Update toolbar state immediately for responsive UI
                        this.updateToolbarState(true)

                        // Process any queued operations
                        this.processUndoRedoQueue()
                    } catch (error) {
                        console.warn('Redo operation failed:', error)
                    } finally {
                        this.undoRedoState.isProcessingQueue = false
                    }
                })
            } catch (error) {
                console.warn('Redo operation failed:', error)
                // Fallback to direct ACE method
                try {
                    this.editor.redo()
                    this.updateToolbarState(true)
                } catch (fallbackError) {
                    console.warn('Fallback redo also failed:', fallbackError)
                }
            }
        },

        /**
         * Process queued undo/redo operations to prevent rapid successive calls
         * Based on ACE's performance optimization patterns
         */
        processUndoRedoQueue() {
            if (this.undoRedoState.operationQueue.length === 0) return

            // Get the latest operation of each type (ignore duplicates)
            const operations = this.undoRedoState.operationQueue
            const latestUndo = operations
                .filter((op) => op.type === 'undo')
                .pop()
            const latestRedo = operations
                .filter((op) => op.type === 'redo')
                .pop()

            // Clear the queue
            this.undoRedoState.operationQueue = []

            // Schedule the latest operations if they're still relevant
            setTimeout(() => {
                if (latestUndo && this.canPerformUndo()) {
                    this.performOptimizedUndo()
                } else if (latestRedo && this.canPerformRedo()) {
                    this.performOptimizedRedo()
                }
            }, 100) // Small delay to prevent rapid operations
        },

        /**
         * Check if undo operation can be performed (cached version)
         */
        canPerformUndo() {
            const now = Date.now()
            const timeSinceLastCheck = now - this.undoRedoState.lastCheckTime

            // Use cached value if within timeout
            if (timeSinceLastCheck < this.undoRedoState.checkCacheTimeout) {
                return this.undoRedoState.canUndo
            }

            try {
                const undoManager = this.editor.session.getUndoManager()
                const canUndo = undoManager ? undoManager.hasUndo() : false

                // Update cache
                this.undoRedoState.canUndo = canUndo
                this.undoRedoState.lastCheckTime = now

                return canUndo
            } catch (error) {
                return false
            }
        },

        /**
         * Check if redo operation can be performed (cached version)
         */
        canPerformRedo() {
            const now = Date.now()
            const timeSinceLastCheck = now - this.undoRedoState.lastCheckTime

            // Use cached value if within timeout
            if (timeSinceLastCheck < this.undoRedoState.checkCacheTimeout) {
                return this.undoRedoState.canRedo
            }

            try {
                const undoManager = this.editor.session.getUndoManager()
                const canRedo = undoManager ? undoManager.hasRedo() : false

                // Update cache
                this.undoRedoState.canRedo = canRedo
                this.undoRedoState.lastCheckTime = now

                return canRedo
            } catch (error) {
                return false
            }
        },

        /**
         * Optimize undo manager for better performance
         * Based on ACE research findings
         */
        optimizeUndoManager() {
            if (!this.editor || !this.editor.session) return

            try {
                const undoManager = this.editor.session.getUndoManager()
                if (!undoManager) return

                // Configure optimal settings based on ACE research
                if (undoManager.$undoDepth === Infinity) {
                    // Set reasonable limit to prevent memory issues (ACE default is unlimited)
                    undoManager.$undoDepth = 200 // Reasonable limit for most users
                }

                // Enable delta merging for better performance (ACE default)
                if (this.editor.session.mergeUndoDeltas !== 'always') {
                    this.editor.session.mergeUndoDeltas = 'always'
                }

                // Monitor undo depth for performance tracking
                this.undoRedoState.undoDepth = undoManager.$undoStack
                    ? undoManager.$undoStack.length
                    : 0
                this.undoRedoState.redoDepth = undoManager.$redoStack
                    ? undoManager.$redoStack.length
                    : 0
            } catch (error) {
                console.warn('Failed to optimize undo manager:', error)
            }
        },

        /**
         * ACE-style operation batching for improved performance
         * Based on ACE Editor's internal operation management system
         */
        startBatchOperation(operationType = 'default') {
            const state = this.operationState

            if (state.isBatching) {
                return state.currentOperation
            }

            state.isBatching = true
            state.currentOperation = {
                type: operationType,
                startTime: performance.now(),
                changes: { ...state.pendingChanges },
            }

            // Cancel any existing batch timeout
            if (state.batchTimeout) {
                clearTimeout(state.batchTimeout)
            }

            return state.currentOperation
        },

        /**
         * End ACE-style batch operation and flush changes
         */
        endBatchOperation() {
            const state = this.operationState

            if (!state.isBatching) {
                return
            }

            const operation = state.currentOperation
            if (!operation) {
                state.isBatching = false
                return
            }

            // Schedule render flush using ACE-style timing
            this.scheduleRenderFlush()

            state.isBatching = false
            state.currentOperation = null
        },

        /**
         * Schedule render flush using ACE's nextFrame pattern
         * Matches ACE's 60fps render loop scheduling
         */
        scheduleRenderFlush() {
            const state = this.operationState

            if (state.batchTimeout) {
                return // Already scheduled
            }

            state.batchTimeout = setTimeout(() => {
                this.flushRenderChanges()
                state.batchTimeout = null
            }, state.batchDelay)
        },

        /**
         * Flush render changes using ACE-style batching
         */
        flushRenderChanges() {
            const state = this.operationState
            const changes = state.pendingChanges
            const now = performance.now()

            // Throttle renders to 60fps like ACE does
            if (now - state.lastRenderTime < 16) {
                // ~60fps
                this.scheduleRenderFlush()
                return
            }

            try {
                // Batch render changes based on what's pending
                let renderFlags = 0

                if (changes.cursor) renderFlags |= 1 // CHANGE_CURSOR
                if (changes.selection) renderFlags |= 2 // CHANGE_MARKER
                if (changes.gutter) renderFlags |= 4 // CHANGE_GUTTER
                if (changes.scroll) renderFlags |= 8 // CHANGE_SCROLL
                if (changes.text) renderFlags |= 16 // CHANGE_TEXT
                if (changes.cursor || changes.selection) renderFlags |= 32 // CHANGE_FULL for UI updates

                // Use ACE renderer's schedule method if available
                if (
                    this.editor &&
                    this.editor.renderer &&
                    this.editor.renderer.$loop
                ) {
                    this.editor.renderer.$loop.schedule(renderFlags)
                }

                // Reset pending changes
                state.pendingChanges = {
                    cursor: false,
                    selection: false,
                    text: false,
                    scroll: false,
                    gutter: false,
                }

                state.lastRenderTime = now
                state.renderChanges++
            } catch (error) {
                console.warn('Render flush failed:', error)
            }
        },

        /**
         * Mark a specific change type as pending (ACE-style)
         */
        markChangePending(changeType) {
            const state = this.operationState

            if (state.pendingChanges.hasOwnProperty(changeType)) {
                state.pendingChanges[changeType] = true

                // Auto-start batching if not already batching
                if (!state.isBatching) {
                    this.startBatchOperation('auto')
                    // Auto-end after a short delay
                    setTimeout(() => {
                        if (
                            state.isBatching &&
                            state.currentOperation?.type === 'auto'
                        ) {
                            this.endBatchOperation()
                        }
                    }, 0)
                }
            }
        },

        /**
         * ACE-style performance optimization setup
         */
        setupPerformanceOptimizations() {
            if (!this.editor) return

            try {
                // Enable ACE's built-in optimizations
                if (this.editor.session) {
                    // Optimize undo manager
                    this.optimizeUndoManager()

                    // Enable delta merging for better performance
                    this.editor.session.mergeUndoDeltas = true

                    // Set reasonable max undo depth
                    const undoManager = this.editor.session.getUndoManager()
                    if (undoManager && undoManager.$undoDepth === Infinity) {
                        undoManager.$undoDepth = 200
                    }
                }

                // Optimize renderer settings
                if (this.editor.renderer) {
                    // Enable ACE's optimized scrolling
                    this.editor.renderer.setAnimatedScroll(true)

                    // Optimize font rendering
                    this.editor.renderer.$optimizeFontRendering = true
                }
            } catch (error) {
                console.warn(
                    'Failed to setup performance optimizations:',
                    error,
                )
            }
        },

        /**
         * ACE-style reliability and error handling improvements
         * Based on ACE Editor's robust error handling patterns
         */
        setupReliabilityImprovements() {
            if (!this.editor) return

            try {
                // Setup ACE-style error boundaries
                this.setupErrorBoundaries()

                // Setup performance monitoring
                this.setupPerformanceMonitoring()

                // Setup graceful degradation
                this.setupGracefulDegradation()
            } catch (error) {
                console.warn('Failed to setup reliability improvements:', error)
            }
        },

        /**
         * Setup ACE-style error boundaries for better error handling
         */
        setupErrorBoundaries() {
            // Wrap critical ACE operations in try-catch blocks
            const originalSetTheme = this.editor.setTheme.bind(this.editor)
            this.editor.setTheme = (...args) => {
                try {
                    return originalSetTheme(...args)
                } catch (error) {
                    console.warn('Theme setting failed, using fallback:', error)
                    return originalSetTheme('ace/theme/textmate')
                }
            }

            const originalSetOptions = this.editor.setOptions.bind(this.editor)
            this.editor.setOptions = (...args) => {
                try {
                    return originalSetOptions(...args)
                } catch (error) {
                    console.warn(
                        'Options setting failed, using defaults:',
                        error,
                    )
                    return originalSetOptions({})
                }
            }

            // Session error handling
            if (this.editor.session) {
                const originalSetValue = this.editor.session.setValue.bind(
                    this.editor.session,
                )
                this.editor.session.setValue = (...args) => {
                    try {
                        return originalSetValue(...args)
                    } catch (error) {
                        console.warn('Session setValue failed:', error)
                        return originalSetValue('')
                    }
                }
            }
        },

        /**
         * Setup performance monitoring with ACE-style metrics
         */
        setupPerformanceMonitoring() {
            // Monitor editor operations
            let operationCount = 0
            let slowOperations = 0

            const originalExecCommand = this.editor.execCommand.bind(
                this.editor,
            )
            this.editor.execCommand = (...args) => {
                const startTime = performance.now()
                operationCount++

                try {
                    const result = originalExecCommand(...args)
                    const duration = performance.now() - startTime

                    if (duration > 100) {
                        // Operations slower than 100ms
                        slowOperations++
                    }

                    return result
                } catch (error) {
                    console.warn(`Command execution failed: ${args[0]}`, error)
                    return false
                }
            }

            // Periodically report performance stats
            setInterval(() => {
                if (operationCount > 0) {
                    // Reset counters
                    operationCount = 0
                    slowOperations = 0
                }
            }, 30000) // Every 30 seconds
        },

        /**
         * Setup graceful degradation for ACE features
         */
        setupGracefulDegradation() {
            // Feature detection with fallbacks
            const features = {
                animatedScroll: () => {
                    try {
                        this.editor.setOption('animatedScroll', true)
                        return this.editor.getOption('animatedScroll')
                    } catch (error) {
                        this.editor.setOption('animatedScroll', false)
                        return false
                    }
                },

                liveAutocompletion: () => {
                    try {
                        // Test if live autocompletion works
                        this.editor.setOption('enableLiveAutocompletion', true)
                        return this.editor.getOption('enableLiveAutocompletion')
                    } catch (error) {
                        this.editor.setOption('enableLiveAutocompletion', false)
                        return false
                    }
                },
            }

            // Test and enable/disable features based on support
            Object.entries(features).forEach(([featureName, testFeature]) => {
                try {
                    testFeature()
                } catch (error) {
                    console.warn(
                        `Feature test failed for ${featureName}:`,
                        error,
                    )
                }
            })
        },

        /**
         * ACE-style health check for the editor
         */
        performHealthCheck() {
            if (!this.editor) {
                return { status: 'error', message: 'Editor not initialized' }
            }

            try {
                const health = {
                    status: 'healthy',
                    checks: {},
                }

                // Check session
                health.checks.session = !!this.editor.session

                // Check renderer
                health.checks.renderer = !!this.editor.renderer

                // Check theme
                health.checks.theme = !!this.editor.getTheme()

                // Check mode
                health.checks.mode = !!this.editor.session.getMode()

                // Check document
                health.checks.document = !!this.editor.session.getDocument()

                // Check if editor is responsive
                const startTime = performance.now()
                this.editor.renderer.onResize(false, true) // Test renderer responsiveness
                health.checks.responsive = performance.now() - startTime < 50

                // Determine overall status
                const failedChecks = Object.values(health.checks).filter(
                    (check) => !check,
                ).length
                if (failedChecks > 0) {
                    health.status = 'warning'
                    health.message = `${failedChecks} health checks failed`
                }

                return health
            } catch (error) {
                return {
                    status: 'error',
                    message: `Health check failed: ${error.message}`,
                    error: error,
                }
            }
        },

        /**
         * Auto-recovery mechanism for common ACE issues
         */
        attemptAutoRecovery() {
            try {
                const health = this.performHealthCheck()

                if (health.status === 'error') {
                    console.warn('Attempting ACE editor auto-recovery...')

                    // Try to recover common issues
                    if (!this.editor.session) {
                        console.warn('Recreating session...')
                        this.editor.setSession(new ace.EditSession(''))
                    }

                    if (!this.editor.getTheme()) {
                        console.warn('Resetting theme...')
                        this.editor.setTheme('ace/theme/textmate')
                    }

                    if (!this.editor.session.getMode()) {
                        console.warn('Resetting mode...')
                        this.editor.session.setMode('ace/mode/text')
                    }

                    // Check if recovery worked
                    const recoveryHealth = this.performHealthCheck()
                    if (recoveryHealth.status !== 'error') {
                        return true
                    } else {
                        console.error('ACE editor auto-recovery failed')
                        return false
                    }
                }

                return true
            } catch (error) {
                console.error('Auto-recovery failed:', error)
                return false
            }
        },

        // Toolbar helper methods
        getButtonTitle(command) {
            if (!this.hasToolbar || !command) return ''

            // Dynamic titles for fold button
            if (command === 'toggle-fold') {
                const foldState = this.getEfficientFoldState()
                if (foldState.isInsideFold || foldState.canUnfold) {
                    return 'Unfold Code (Ctrl+Alt+F)'
                } else if (foldState.canFold) {
                    return 'Fold Code (Ctrl+Alt+F)'
                } else {
                    return 'Fold/Unfold Code'
                }
            }

            const titles = {
                undo: 'Undo (Ctrl+Z)',
                redo: 'Redo (Ctrl+Y)',
                replace: 'Find (Ctrl+F)',
                'goto-line': 'Go To Line (Ctrl+G)',
                'toggle-comment': 'Toggle Comment (Ctrl+/)',
                'show-invisibles': 'Show Invisible Characters',
                'toggle-wordwrap': 'Toggle Word Wrap',
                'convert-uppercase': 'Convert to Uppercase',
                'convert-lowercase': 'Convert to Lowercase',
                'toggle-print-margin': 'Toggle Print Margin',
            }
            return titles[command] || command
        },

        // Icons are now handled by CSS mask-image - no JavaScript icon generation needed

        getButtonDisabled(command) {
            if (!this.editor) return true

            switch (command) {
                case 'undo':
                    return !this.toolbarState.canUndo
                case 'redo':
                    return !this.toolbarState.canRedo
                default:
                    return false
            }
        },

        getButtonActiveState(command) {
            if (!this.editor) return false

            switch (command) {
                case 'toggle-print-margin':
                    return this.toolbarState.showPrintMargin
                case 'show-invisibles':
                    return this.toolbarState.showInvisibles
                case 'toggle-wordwrap':
                    return this.toolbarState.wordWrapEnabled
                case 'toggle-fold':
                    // Context-aware fold/unfold state for single button
                    const foldState = this.getEfficientFoldState()
                    return (
                        foldState.canFold ||
                        foldState.canUnfold ||
                        foldState.isInsideFold
                    )
                default:
                    return false
            }
        },

        /**
         * Efficient fold state detection with caching for performance
         * Uses fast ACE Editor API methods and caches results to avoid performance issues
         */
        getEfficientFoldState() {
            if (!this.editor || !this.editor.session) {
                return {
                    canFold: false,
                    canUnfold: false,
                    isInsideFold: false,
                }
            }

            const session = this.editor.session
            const cursor = this.editor.getCursorPosition()

            // Check if cursor position changed - if not, return cached state
            if (
                this.lastFoldState.cursorRow === cursor.row &&
                this.lastFoldState.cursorColumn === cursor.column
            ) {
                return {
                    canFold: this.lastFoldState.canFold,
                    canUnfold: this.lastFoldState.canUnfold,
                    isInsideFold: this.lastFoldState.isInsideFold,
                }
            }

            // Use fast ACE API methods for optimal performance
            let canFold = false
            let canUnfold = false
            let isInsideFold = false

            try {
                // Check if fold methods are available on session
                const hasFoldSupport =
                    session.getFoldWidget &&
                    typeof session.getFoldWidget === 'function'

                if (!hasFoldSupport) {
                    // Session doesn't support folding, return default state
                    return {
                        canFold: false,
                        canUnfold: false,
                        isInsideFold: false,
                    }
                }

                // Fast check 1: Is cursor on a folded line? (O(1) operation)
                const isRowFolded = session.isRowFolded
                    ? session.isRowFolded(cursor.row)
                    : false

                // Fast check 2: Is cursor inside a fold? (O(1) operation)
                const foldAtCursor = session.getFoldAt
                    ? session.getFoldAt(cursor.row, cursor.column, 1)
                    : null

                // Fast check 3: Get fold widget for current line (O(1) operation)
                const foldWidget = session.getFoldWidget(cursor.row)

                // Determine fold capabilities based on fast checks
                isInsideFold = isRowFolded || !!foldAtCursor

                if (
                    foldWidget === 'start' &&
                    !isRowFolded &&
                    session.getFoldWidgetRange
                ) {
                    const foldRange = session.getFoldWidgetRange(
                        cursor.row,
                        'all',
                    )
                    if (foldRange) {
                        canFold = true
                    }
                }

                if (
                    isRowFolded ||
                    foldAtCursor ||
                    (foldWidget === 'start' && isRowFolded)
                ) {
                    canUnfold = true
                }

                if (foldWidget === 'end' && isRowFolded) {
                    canUnfold = true
                }
            } catch (error) {
                console.warn('Fold state detection error:', error)
                // Fallback to basic state
                return { canFold: false, canUnfold: false, isInsideFold: false }
            }

            // Update cache for performance
            this.lastFoldState = {
                canFold,
                canUnfold,
                isInsideFold,
                cursorRow: cursor.row,
                cursorColumn: cursor.column,
            }

            return {
                canFold,
                canUnfold,
                isInsideFold,
            }
        },

        updateToolbarState(forceExpensiveCheck = false) {
            if (!this.editor || !this.hasToolbar) return

            // Clear existing timer to prevent multiple rapid updates
            if (this.debounceTimers.toolbarUpdate) {
                clearTimeout(this.debounceTimers.toolbarUpdate)
            }

            // Use shorter debounce for immediate feedback (like button clicks)
            const debounceTime = forceExpensiveCheck ? 10 : 30

            // Debounce toolbar state updates to improve performance
            this.debounceTimers.toolbarUpdate = setTimeout(() => {
                if (this.isDestroyed || !this.editor) return

                // Use optimized undo/redo state checking with caching (performance optimization)
                const canUndo = this.canPerformUndo()
                const canRedo = this.canPerformRedo()

                // Fast operations - use cached values to reduce ACE API calls
                const showPrintMargin = this.printMarginState.showPrintMargin
                const wordWrapEnabled = this.editor
                    .getSession()
                    .getUseWrapMode()

                // Optimized showInvisibles check - only call ACE API if necessary
                let showInvisibles
                const now = Date.now()
                const timeSinceLastCheck =
                    now - this.lastExpensiveState.lastCheckTime

                // Cache for 500ms to reduce expensive API calls during rapid events
                // Use cached value unless forced to check or cache is expired
                if (forceExpensiveCheck || timeSinceLastCheck > 500) {
                    showInvisibles = this.editor.getShowInvisibles()
                    this.lastExpensiveState.showInvisibles = showInvisibles
                    this.lastExpensiveState.lastCheckTime = now
                } else {
                    // Use cached value to avoid expensive ACE API call
                    showInvisibles = this.lastExpensiveState.showInvisibles
                }

                // Invalidate fold cache when state changes (cursor movement, etc.)
                // This ensures fold buttons update correctly when cursor moves or folds change
                this.lastFoldState.cursorRow = -1
                this.lastFoldState.cursorColumn = -1

                // Update fold button visual state dynamically (but not on every call)
                if (forceExpensiveCheck || timeSinceLastCheck > 100) {
                    this.updateFoldButtonState()
                }

                // Only update if state actually changed to prevent unnecessary Alpine re-renders
                if (
                    this.lastToolbarState.canUndo !== canUndo ||
                    this.lastToolbarState.canRedo !== canRedo ||
                    this.lastToolbarState.showPrintMargin !== showPrintMargin ||
                    this.lastToolbarState.showInvisibles !== showInvisibles ||
                    this.lastToolbarState.wordWrapEnabled !== wordWrapEnabled
                ) {
                    // Update cached state
                    this.lastToolbarState.canUndo = canUndo
                    this.lastToolbarState.canRedo = canRedo
                    this.lastToolbarState.showPrintMargin = showPrintMargin
                    this.lastToolbarState.showInvisibles = showInvisibles
                    this.lastToolbarState.wordWrapEnabled = wordWrapEnabled

                    // Update toolbar state - Alpine.js will re-render when these change
                    this.toolbarState.canUndo = canUndo
                    this.toolbarState.canRedo = canRedo
                    this.toolbarState.showPrintMargin = showPrintMargin
                    this.toolbarState.showInvisibles = showInvisibles
                    this.toolbarState.wordWrapEnabled = wordWrapEnabled
                }
            }, debounceTime)
        },

        /**
         * Update the fold button's visual state (icon) based on current fold state
         */
        updateFoldButtonState() {
            if (!this.editor) return

            try {
                const foldButton = this.$el.querySelector(
                    '[data-button="toggle-fold"]',
                )
                if (!foldButton) return

                const foldState = this.getEfficientFoldState()

                // Add or remove the unfold state class based on current state
                if (foldState.isInsideFold || foldState.canUnfold) {
                    foldButton.classList.add('fold-state-unfold')
                } else {
                    foldButton.classList.remove('fold-state-unfold')
                }
            } catch (error) {
                // Silently ignore errors - fold button state update is not critical
            }
        },

        // Keyboard shortcuts
        handleKeyboardShortcuts() {
            const editor = this.editor

            // Override Ctrl+F to open replace dialog instead of find
            editor.commands.addCommand({
                name: 'findReplace',
                bindKey: { win: 'Ctrl-F', mac: 'Cmd-F' },
                exec: () => this.editor.execCommand('replace'),
            })

            // Add custom key bindings - use Ctrl+F11 to avoid browser conflict
            editor.commands.addCommand({
                name: 'toggleFullscreen',
                bindKey: { win: 'Ctrl-F11', mac: 'Cmd-F11' },
                exec: () => this.toggleFullscreen(),
            })

            // Alternative key binding - Ctrl+Shift+F
            editor.commands.addCommand({
                name: 'toggleFullscreenAlt',
                bindKey: { win: 'Ctrl-Shift-F', mac: 'Cmd-Shift-F' },
                exec: () => this.toggleFullscreen(),
            })

            // Escape to exit fullscreen
            editor.commands.addCommand({
                name: 'exitFullscreen',
                bindKey: { win: 'Esc', mac: 'Esc' },
                exec: () => {
                    if (this.isFullscreen) {
                        this.toggleFullscreen()
                    }
                },
            })
        },

        // Add global escape key handler for fullscreen
        addGlobalFullscreenEscapeHandler() {
            // Store bound handler for cleanup
            this._globalEscapeHandler = (e) => {
                if (e.key === 'Escape' && this.isFullscreen) {
                    e.preventDefault()
                    e.stopPropagation()
                    this.toggleFullscreen()
                }
            }

            // Add to document with capture to ensure it runs before other handlers
            document.addEventListener(
                'keydown',
                this._globalEscapeHandler,
                true,
            )

            // Track for cleanup
            this.eventListeners.push({
                element: document,
                type: 'keydown',
                handler: this._globalEscapeHandler,
                options: { capture: true },
            })
        },

        // Initialize toolbar after editor is ready
        initToolbar() {
            if (this.hasToolbar) {
                this.handleKeyboardShortcuts()
                this.setupToolbarEventDelegation()
                this.updateToolbarState()

                // Listen for selection changes to update toolbar state
                this.editor.selection.on('changeCursor', () => {
                    this.updateToolbarState()
                })

                this.editor.session.on('change', () => {
                    this.updateToolbarState()
                })

                // Listen for fold changes to invalidate fold cache (performance optimization)
                this.editor.session.on('changeFold', () => {
                    // Invalidate fold cache immediately when folds change
                    this.lastFoldState.cursorRow = -1
                    this.lastFoldState.cursorColumn = -1
                    this.updateToolbarState()
                })

                // Note: Undo manager doesn't have event listeners, toolbar state is updated by session and selection events

                // Also listen for focus events to update toolbar state
                this.editor.on('focus', () => {
                    this.updateToolbarState()
                })

                this.editor.on('blur', () => {
                    this.updateToolbarState()
                })
            }
        },

        /**
         * Setup optimized event delegation for toolbar buttons
         * Reduces memory usage and improves performance vs individual listeners
         */
        setupToolbarEventDelegation() {
            const toolbar = this.$el.querySelector('.rd-ace-editor-toolbar')
            if (!toolbar) return

            // Single delegated event listener for all toolbar buttons
            toolbar.addEventListener(
                'click',
                (event) => {
                    const button = event.target.closest('[data-button]')
                    if (!button) return

                    const buttonType = button.dataset.button
                    if (!buttonType) return

                    // Execute the toolbar action
                    this.executeToolbarAction(buttonType, event)
                },
                { passive: true },
            )

            // Store reference for cleanup
            this.eventListeners.push({
                element: toolbar,
                type: 'click',
                handler: null, // Using anonymous function, will be cleaned up differently
            })
        },

        // Status Bar Methods
        initStatusBar() {
            if (!this.editor) return

            // Create status bar element
            this.createStatusBar()

            // Update initial status
            this.updateStatusBar()

            // Listen for editor events to update status
            this.editor.session.on('change', () => this.updateStatusBar())
            this.editor.selection.on('changeCursor', () =>
                this.updateStatusBar(),
            )
            this.editor.session.on('changeMode', () => this.updateStatusBar())
        },

        createStatusBar() {
            // Find or create status bar container
            let statusBarContainer = this.$el.querySelector(
                '.rd-ace-editor-status',
            )

            if (!statusBarContainer) {
                statusBarContainer = document.createElement('div')
                statusBarContainer.className = 'rd-ace-editor-status'

                // Insert status bar after editor container
                const editorContainer = this.$el.closest('.rd-ace-editor')
                if (editorContainer) {
                    editorContainer.appendChild(statusBarContainer)
                }
            }

            this.statusBarElement = statusBarContainer

            // Apply custom classes from statusBarOptions
            if (this.statusBarOptions.className) {
                statusBarContainer.className = `rd-ace-editor-status ${this.statusBarOptions.className}`
            }

            // Define default status bar sections
            const defaultSections = {
                position: {
                    show: true,
                    content: `<div class="rd-ace-editor-status-position">
                        <span>Line: <span class="line">1</span>, Col: <span class="column">1</span></span>
                        <span class="selection"></span>
                    </div>`,
                },
                info: {
                    show: true,
                    content: `<div class="rd-ace-editor-status-info">
                        <span class="mode">TEXT</span> |
                        <span class="length">0 chars</span>
                    </div>`,
                },
            }

            // Merge with user-provided options
            const sections = {
                ...defaultSections,
                ...this.statusBarOptions.sections,
            }

            // Build status bar content based on sections
            let statusBarContent = ''
            Object.entries(sections).forEach(([sectionName, sectionConfig]) => {
                if (sectionConfig.show !== false) {
                    statusBarContent += sectionConfig.content || ''
                }
            })

            statusBarContainer.innerHTML = statusBarContent
        },

        updateStatusBar() {
            if (!this.editor || !this.statusBarElement) return

            // Clear existing timer to prevent multiple rapid updates
            if (this.debounceTimers.statusBarUpdate) {
                clearTimeout(this.debounceTimers.statusBarUpdate)
            }

            // Debounce status bar updates to prevent performance issues during typing
            this.debounceTimers.statusBarUpdate = setTimeout(() => {
                if (this.isDestroyed || !this.statusBarElement) return

                const position = this.editor.getCursorPosition()
                const selection = this.editor.getSelection()
                const session = this.editor.getSession()

                // Cache DOM elements to avoid repeated queries
                if (!this.statusBarElements.line) {
                    this.statusBarElements.line =
                        this.statusBarElement.querySelector('.line')
                    this.statusBarElements.column =
                        this.statusBarElement.querySelector('.column')
                    this.statusBarElements.selection =
                        this.statusBarElement.querySelector('.selection')
                    this.statusBarElements.mode =
                        this.statusBarElement.querySelector('.mode')
                    this.statusBarElements.length =
                        this.statusBarElement.querySelector('.length')
                }

                // Update position only if changed
                const currentRow = position.row + 1
                const currentColumn = position.column + 1
                if (
                    this.statusBarElements.line &&
                    this.statusBarElements.line.textContent != currentRow
                ) {
                    this.statusBarElements.line.textContent = currentRow
                }
                if (
                    this.statusBarElements.column &&
                    this.statusBarElements.column.textContent != currentColumn
                ) {
                    this.statusBarElements.column.textContent = currentColumn
                }

                // Update selection info only if changed
                const selectionInfo = this.statusBarElements.selection
                if (selectionInfo) {
                    let newText = ''
                    if (!selection.isEmpty()) {
                        const lines = selection.getAllRanges().length
                        newText = ` (${lines} line${
                            lines > 1 ? 's' : ''
                        } selected)`
                    }
                    if (selectionInfo.textContent !== newText) {
                        selectionInfo.textContent = newText
                    }
                }

                // Update mode only if changed
                const modeElement = this.statusBarElements.mode
                if (modeElement) {
                    const mode = session.getMode().$id || 'text'
                    const modeText = mode.replace('ace/mode/', '').toUpperCase()
                    if (modeElement.textContent !== modeText) {
                        modeElement.textContent = modeText
                    }
                }

                // Update document info (throttle expensive getValue() call)
                const lengthElement = this.statusBarElements.length
                if (lengthElement) {
                    // Only update this every few changes to improve performance
                    const currentLength = session.getLength()
                    if (this.statusBarState.lines !== currentLength) {
                        const textLength = session.getValue().length
                        lengthElement.textContent = `${currentLength} lines, ${textLength} chars`
                        this.statusBarState.lines = currentLength
                    }
                }
            }, 50) // 50ms debounce - responsive but not overwhelming
        },

        destroyStatusBar() {
            if (this.statusBarElement && this.statusBarElement.parentNode) {
                this.statusBarElement.parentNode.removeChild(
                    this.statusBarElement,
                )
                this.statusBarElement = null
            }
        },

        // Accessibility Methods
        initAccessibility() {
            if (!this.editor) return

            // Initialize keyboard accessibility
            if (this.keyboardAccessibility) {
                this.initKeyboardAccessibility()
            }

            // Initialize screen reader support
            if (this.screenReaderSupport) {
                this.initScreenReaderSupport()
            }

            // Apply custom ARIA labels
            if (this.ariaLabels && Object.keys(this.ariaLabels).length > 0) {
                this.applyAriaLabels()
            }
        },

        initKeyboardAccessibility() {
            const editor = this.editor

            // Go To Line command with Ctrl+G shortcut
            editor.commands.addCommand({
                name: 'gotoLine',
                bindKey: { win: 'Ctrl+G', mac: 'Cmd+G' },
                exec: () => {
                    this.goToLine()
                },
            })

            // Enhanced keyboard navigation
            editor.commands.addCommand({
                name: 'gotoLineStart',
                bindKey: { win: 'Home', mac: 'Home|Ctrl+A' },
                exec: () => {
                    const pos = editor.getCursorPosition()
                    editor.moveCursorTo(pos.row, 0)
                    editor.clearSelection()
                },
            })

            editor.commands.addCommand({
                name: 'gotoLineEnd',
                bindKey: { win: 'End', mac: 'End|Ctrl+E' },
                exec: () => {
                    const pos = editor.getCursorPosition()
                    const line = editor.session.getLine(pos.row)
                    editor.moveCursorTo(pos.row, line.length)
                    editor.clearSelection()
                },
            })

            editor.commands.addCommand({
                name: 'selectWord',
                bindKey: { win: 'Ctrl+Shift+Right', mac: 'Cmd+Shift+Right' },
                exec: () => {
                    editor.selection.selectWordRight()
                    editor.renderer.scrollCursorIntoView()
                },
            })

            editor.commands.addCommand({
                name: 'selectWordLeft',
                bindKey: { win: 'Ctrl+Shift+Left', mac: 'Cmd+Shift+Left' },
                exec: () => {
                    editor.selection.selectWordLeft()
                    editor.renderer.scrollCursorIntoView()
                },
            })

            // Enable keyboard focus management
            editor.on('focus', () => {
                this.announceToScreenReader('Editor focused')
            })

            editor.on('blur', () => {
                this.announceToScreenReader('Editor unfocused')
            })
        },

        initScreenReaderSupport() {
            const editor = this.editor

            // Announce cursor position changes
            editor.selection.on('changeCursor', () => {
                const pos = editor.getCursorPosition()
                this.announceToScreenReader(
                    `Line ${pos.row + 1}, Column ${pos.column + 1}`,
                )
            })

            // Announce selection changes
            editor.selection.on('changeSelection', () => {
                const selection = editor.getSelection()
                if (!selection.isEmpty()) {
                    const selectedText = editor.session.getTextRange(
                        selection.getRange(),
                    )
                    this.announceToScreenReader(
                        `Selected: ${selectedText.length} characters`,
                    )
                } else {
                    this.announceToScreenReader('Selection cleared')
                }
            })

            // Announce mode changes
            editor.session.on('changeMode', () => {
                const mode = editor.session.getMode().$id || 'text'
                this.announceToScreenReader(
                    `Mode changed to: ${mode
                        .replace('ace/mode/', '')
                        .toUpperCase()}`,
                )
            })

            // Announce theme changes
            editor.on('changeTheme', () => {
                const theme = editor.getTheme() || 'textmate'
                this.announceToScreenReader(
                    `Theme changed to: ${theme
                        .replace('ace/theme/', '')
                        .replace(/_/g, ' ')}`,
                )
            })
        },

        applyAriaLabels() {
            const editorElement = this.$el.querySelector('.ace_editor')
            if (!editorElement) return

            // Apply custom ARIA labels
            Object.entries(this.ariaLabels).forEach(([element, label]) => {
                const targetElement =
                    this.$el.querySelector(element) || editorElement
                if (targetElement) {
                    targetElement.setAttribute('aria-label', label)
                    targetElement.setAttribute(
                        'role',
                        targetElement.getAttribute('role') || 'region',
                    )
                }
            })

            // Ensure editor has proper ARIA attributes
            editorElement.setAttribute('role', 'application')
            editorElement.setAttribute(
                'aria-label',
                this.ariaLabels.editor || 'Code editor',
            )
            editorElement.setAttribute('aria-multiline', 'true')

            // Add ARIA attributes to textarea
            const textarea = this.$el.querySelector('.ace_text-input')
            if (textarea) {
                textarea.setAttribute(
                    'aria-label',
                    this.ariaLabels.textarea || 'Code input area',
                )
                textarea.setAttribute('aria-describedby', 'ace-editor-status')
            }
        },

        announceToScreenReader(message) {
            if (!this.screenReaderSupport) return

            // Create or update screen reader announcement element
            let announcer = document.getElementById(
                'ace-screen-reader-announcer',
            )
            if (!announcer) {
                announcer = document.createElement('div')
                announcer.id = 'ace-screen-reader-announcer'
                announcer.setAttribute('aria-live', 'polite')
                announcer.setAttribute('aria-atomic', 'true')
                announcer.style.position = 'absolute'
                announcer.style.left = '-10000px'
                announcer.style.width = '1px'
                announcer.style.height = '1px'
                announcer.style.overflow = 'hidden'
                document.body.appendChild(announcer)
            }

            // Announce the message
            announcer.textContent = message

            // Clear after announcement to allow repeated announcements
            setTimeout(() => {
                announcer.textContent = ''
            }, 100)
        },

        /**
         * Memory leak detection utility for development and testing
         * Helps identify memory issues during development
         */
        changeFontSize(fontSize) {
            if (!this.editor || !fontSize) return

            // Update current font size
            this.currentFontSize = fontSize

            // Apply font size to ACE editor
            this.editor.setOptions({
                fontSize: fontSize,
            })

            // Force editor resize to apply changes immediately
            this.editor.resize()
        },

        /**
         * Change word wrap mode
         */
        changeWordWrap(wrapMode) {
            if (!this.editor || !wrapMode) return

            // Update current word wrap mode
            this.currentWordWrap = wrapMode

            // Get the session to configure wrap settings
            const session = this.editor.getSession()

            switch (wrapMode) {
                case 'off':
                    session.setUseWrapMode(false)
                    break
                case 'soft':
                    session.setUseWrapMode(true)
                    session.setWrapLimitRange(null, null) // Auto-wrap based on editor width
                    break
                case 'hard':
                    session.setUseWrapMode(true)
                    session.setWrapLimitRange(80, 80) // Hard wrap at 80 characters
                    break
                default:
                    session.setUseWrapMode(false)
                    break
            }

            // Force editor resize to apply changes immediately
            this.editor.resize()
        },

        /**
         * Apply overscroll configuration to ACE editor
         */
        applyOverscrollSettings() {
            if (!this.editor || !this.overscrollOptions) return

            const defaults = {
                enabled: true,
                size: 50,
                behavior: 'auto',
                horizontal: true,
                vertical: true,
            }

            const options = { ...defaults, ...this.overscrollOptions }

            if (!options.enabled) {
                // Disable overscroll by setting size to 0
                this.editor.renderer.setScrollMargin(0, 0, 0, 0)
                return
            }

            // Configure scroll margin based on overscroll options
            const topMargin = options.vertical ? options.size : 0
            const rightMargin = options.horizontal ? options.size : 0
            const bottomMargin = options.vertical ? options.size : 0
            const leftMargin = options.horizontal ? options.size : 0

            // Apply scroll margin for overscroll effect
            this.editor.renderer.setScrollMargin(
                topMargin,
                rightMargin,
                bottomMargin,
                leftMargin,
            )

            // Configure additional overscroll behavior
            if (options.behavior === 'manual') {
                const scrollHandler = () => {
                    // Custom scroll behavior can be implemented here
                }

                // Use passive scroll listeners for better performance
                this.editor.renderer.scrollBarV.addEventListener(
                    'scroll',
                    scrollHandler,
                    { passive: true },
                )
                this.editor.renderer.scrollBarH.addEventListener(
                    'scroll',
                    scrollHandler,
                    { passive: true },
                )

                // Track for cleanup
                this.eventListeners.push(
                    {
                        element: this.editor.renderer.scrollBarV,
                        type: 'scroll',
                        handler: scrollHandler,
                        options: { passive: true },
                    },
                    {
                        element: this.editor.renderer.scrollBarH,
                        type: 'scroll',
                        handler: scrollHandler,
                        options: { passive: true },
                    },
                )
            }

            // Set editor options related to scrolling
            const scrollOptions = {}

            if (options.behavior !== 'none') {
                scrollOptions.autoScrollEditorIntoView = true
            }

            this.editor.setOptions(scrollOptions)
        },
    }
}
