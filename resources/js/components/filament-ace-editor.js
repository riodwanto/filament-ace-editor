
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
            selection: { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
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
                await new Promise((resolve) => setTimeout(resolve, 300));
            }

            if (this.editor) {
                try {
                    this.editor.destroy();
                } catch (error) {
                    console.warn('Error cleaning up existing editor instance:', error);
                }
                this.editor = null;
            }

            await this.initializeEditor();

            // Add global escape key handler for fullscreen
            this.addGlobalFullscreenEscapeHandler();
        },

        /**
         * Clean up all resources when component is destroyed
         * This prevents memory leaks by properly disposing of ACE Editor and related resources
         */
        destroy() {
            if (this.isDestroyed) return;

            this.isDestroyed = true;

            try {
                if (this.editor) {
                    if (this.editor.session) {
                        this.editor.session.removeAllListeners();
                    }
                    if (this.editor.selection) {
                        this.editor.selection.removeAllListeners();
                    }

                    this.editor.destroy();
                    this.editor = null;
                }

                if (this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }

                this.destroyStatusBar();

                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }

                // Clean up global escape handler
                if (this._globalEscapeHandler) {
                    document.removeEventListener('keydown', this._globalEscapeHandler, true);
                    this._globalEscapeHandler = null;
                }

                this.cleanupLoadedScripts();

                Object.values(this.debounceTimers).forEach(timer => {
                    if (timer) clearTimeout(timer);
                });

                this.eventListeners = [];
                this.loadedScripts = [];
                this.statusBarElements = {};

                if (this.printMarginState.throttledUpdate) {
                    cancelAnimationFrame(this.printMarginState.throttledUpdate);
                    this.printMarginState.throttledUpdate = null;
                }

                if (this.gotoLineState.animationFrame) {
                    cancelAnimationFrame(this.gotoLineState.animationFrame);
                    this.gotoLineState.animationFrame = null;
                }

                this.undoRedoState.operationQueue = [];
                this.undoRedoState.isProcessingQueue = false;

                this.caseConversionState.conversionCache.clear();
                this.caseConversionState.operationInProgress = false;

                if (this.operationState.batchTimeout) {
                    clearTimeout(this.operationState.batchTimeout);
                    this.operationState.batchTimeout = null;
                }
                this.operationState.operationQueue = [];
                this.operationState.isBatching = false;

            } catch (error) {
                console.error('Error during ACE editor cleanup:', error);
            }
        },

        /**
         * Clean up dynamically loaded script tags
         * Prevents DOM pollution and memory retention
         */
        cleanupLoadedScripts() {
            this.loadedScripts.forEach(scriptUrl => {
                const scripts = document.querySelectorAll(`script[src="${scriptUrl}"]`);
                scripts.forEach(script => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                });
            });
            this.loadedScripts = [];
        },

        async initializeEditor() {
            try {
                await this.loadScript(aceUrl);

                await this.loadExtensionsEnhanced();

                console.log('Extension Loading Statistics:', this.getExtensionLoadingStats());

                Object.entries(config).forEach(([configKey, configValue]) => {
                    ace.config.set(configKey, configValue);
                });

                this.editor = ace.edit(this.$refs.aceCodeEditorInner);

                const mergedOptions = {
                    animatedScroll: false,
                    showPrintMargin: true,
                    fadeFoldWidgets: false,
                    displayIndentGuides: false,
                    highlightGutterLine: false,
                    showInvisibles: false,

                    ...options,

                    fontSize: this.currentFontSize,
                    showGutter: options.showGutter !== false,
                    showLineNumbers: options.showLineNumbers !== false,
                };

                if (mergedOptions.cursorStyle) {
                    console.log('🎯 Applying cursorStyle:', mergedOptions.cursorStyle);
                }
                console.log('📝 Full merged options:', mergedOptions);

                this.editor.setOptions(mergedOptions);

                if (mergedOptions.cursorStyle) {
                    setTimeout(() => {
                        const appliedStyle = this.editor.getOption('cursorStyle');
                        console.log('✅ CursorStyle verification - applied:', appliedStyle, 'expected:', mergedOptions.cursorStyle);

                        if (appliedStyle !== mergedOptions.cursorStyle) {
                            console.warn('⚠️ CursorStyle mismatch! Trying direct setOption...');
                            this.editor.setOption('cursorStyle', mergedOptions.cursorStyle);
                        }
                    }, 100);
                }

                this.changeWordWrap(this.currentWordWrap);

                this.applyOverscrollSettings();

                this.editor.session.setValue(this.state || placeholder);

                this.applyInitialTheme();
                this.observeDarkModeChanges();

                this.setupPerformanceOptimizations();

                this.setupReliabilityImprovements();
                this.$watch('state', Alpine.debounce(() => {
                    if (this.isDestroyed || !this.editor) return;

                    if (!this.shouldUpdateState) {
                        this.shouldUpdateState = true;
                        return;
                    }

                    if (this.editor.isFocused()) return;

                    this.editor.session.setValue(this.state || placeholder);
                }, 100));

                this.editor.session.on('change', Alpine.debounce(() => {
                    if (this.isDestroyed || !this.editor) return;

                    const currentValue = this.editor.getValue();
                    this.state = currentValue;
                    this.shouldUpdateState = false;

                    this.updateToolbarState(false);

                }, 150));

                if (this.enableCustomCompletions) {
                    this.setupCustomCompletions();
                }

                this.initToolbar();

                this.initializeExpensiveStateCache();

                this.optimizeUndoManager();

                setTimeout(() => {
                    this.updateToolbarState();
                }, 50);

                if (this.showStatusBar) {
                    this.initStatusBar();
                }

                this.initAccessibility();

            } catch (error) {
                console.error('ACE Editor initialization failed:', error);
                this.handleInitializationError(error);
            }
        },

        /**
         * Handle initialization errors with graceful fallback to basic textarea
         * Follows Filament's error boundary patterns for maximum reliability
         */
        handleInitializationError(error) {
            console.error('ACE Editor initialization failed, falling back to basic textarea:', error);

            const container = this.$refs?.aceCodeEditorInner;
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
                            <pre class="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">${error.message || 'Unknown error occurred'}</pre>
                        </details>
                    </div>
                `;
            }

            // Mark as fallback mode for future reference
            this.isFallbackMode = true;
            this.editor = null;
        },

  
        /**
         * Enhanced script loading with retry mechanism and better error handling
         */
        async loadScriptWithRetry(url, maxRetries = null, retryDelay = null) {
            // Use configuration defaults if not provided
            maxRetries = maxRetries || this.extensionLoadingConfig.maxRetries || 3;
            retryDelay = retryDelay || this.extensionLoadingConfig.retryDelay || 1000;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await this.loadScript(url);
                    return; // Success, exit retry loop
                } catch (error) {
                    console.warn(`Attempt ${attempt} failed to load script: ${url}`, error);

                    if (attempt === maxRetries) {
                        throw new Error(`Failed to load script after ${maxRetries} attempts: ${url}`);
                    }

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        },

        /**
         * Enhanced extension loading with parallel loading and better error handling
         */
        async loadExtensionsEnhanced() {
            if (!extensions || Object.keys(extensions).length === 0) {
                console.log('No extensions to load');
                return;
            }

            const extensionEntries = Object.entries(extensions);
            const useParallelLoading = this.extensionLoadingConfig.parallelLoading !== false;
            const maxRetries = this.extensionLoadingConfig.maxRetries || 3;
            const timeout = this.extensionLoadingConfig.timeout || 30000;

            console.log(`Loading ${extensionEntries.length} extensions (parallel: ${useParallelLoading}, maxRetries: ${maxRetries}, timeout: ${timeout}ms)`);

            const loadPromises = extensionEntries.map(async ([extensionName, extensionUrl]) => {
                try {
                    console.log(`Loading extension: ${extensionName} from ${extensionUrl}`);
                    await this.loadScriptWithRetry(extensionUrl, maxRetries);
                    console.log(`Successfully loaded extension: ${extensionName}`);
                    return { name: extensionName, url: extensionUrl, status: 'loaded' };
                } catch (error) {
                    console.error(`Failed to load extension: ${extensionName}`, error);
                    return { name: extensionName, url: extensionUrl, status: 'failed', error };
                }
            });

            let results;
            if (useParallelLoading) {
                // Load all extensions in parallel
                results = await Promise.allSettled(loadPromises);
            } else {
                // Load extensions sequentially
                results = [];
                for (const loadPromise of loadPromises) {
                    const result = await Promise.allSettled([loadPromise]);
                    results.push(result[0]);
                }
            }

            // Log results
            const loaded = results.filter(r => r.value?.status === 'loaded').map(r => r.value.name);
            const failed = results.filter(r => r.value?.status === 'failed').map(r => r.value);

            if (loaded.length > 0) {
                console.log(`Successfully loaded extensions: ${loaded.join(', ')}`);
            }

            if (failed.length > 0) {
                console.error(`Failed to load extensions: ${failed.map(f => f.name).join(', ')}`);
                failed.forEach(f => {
                    console.error(`Extension ${f.name} error:`, f.error);
                });
            }

            // Return loaded extensions for potential further processing
            return loaded;
        },

  
        /**
         * Get loading statistics for debugging
         */
        getExtensionLoadingStats() {
            const extensionEntries = Object.entries(extensions || {});
            const total = extensionEntries.length;

            // Count only extension scripts that were actually loaded
            const extensionUrls = extensionEntries.map(([_, url]) => url);
            const loaded = this.loadedScripts.filter(scriptUrl =>
                extensionUrls.some(extUrl => scriptUrl.includes(extUrl.split('/').pop()))
            ).length;

            return {
                total,
                loaded,
                pending: Math.max(0, total - loaded), // Prevent negative values
                successRate: total > 0 ? Math.min(100, (loaded / total * 100)).toFixed(1) : 0 // Cap at 100%
            };
        },

        /**
       * Dynamically loads a JavaScript file from the given URL
       * Returns a Promise that resolves when the script loads successfully
       */
        loadScript(url) {
            return new Promise((resolve, reject) => {
                // Check if script is already loaded
                if (this.loadedScripts.includes(url)) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    this.loadedScripts.push(url);
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },

        /**
         * Apply the initial theme when the editor first loads
         * Uses dark theme if dark mode is enabled and available
         */
        applyInitialTheme() {
            if (!disableDarkTheme) {
                this.setTheme();
            } else if (this.editor) {
                this.editor.setTheme(options.theme);
            }
        },

        /**
         * Watch for changes in the page's dark/light mode state
         * Automatically switches editor theme when system theme changes
         */
        observeDarkModeChanges() {
            if (disableDarkTheme) return;

            const targetElement = document.querySelector('html');
            this.observer = new MutationObserver(() => this.setTheme());
            this.observer.observe(targetElement, { attributes: true, attributeFilter: ['class'] });
        },

        /**
         * Switch between light and dark themes based on current page state
         * Checks the HTML element for 'dark' class to determine theme
         */
        setTheme() {
            if (!this.editor) return;

            const isDarkMode = document.querySelector('html').classList.contains('dark');
            const theme = isDarkMode ? (darkTheme || options.theme) : options.theme;
            this.editor.setTheme(theme);
        },

        /**
         * Setup custom completions and snippets for the editor
         */
        setupCustomCompletions() {
            if (!this.editor) return;

            // Enable live autocompletion if not already enabled
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
            });

            // Setup custom completions provider
            const langTools = ace.require('ace/ext/language_tools');

            // Add custom completions
            if (this.completions && this.completions.length > 0) {
                const self = this;
                const customCompleter = {
                    getCompletions: function(_editor, _session, _pos, _prefix, callback) {
                        const completions = [];

                        // Add configured completions
                        self.completions.forEach(completion => {
                            completions.push({
                                caption: completion.caption,
                                value: completion.value,
                                meta: completion.meta || 'Custom',
                                score: completion.score || 1000
                            });
                        });

                        callback(null, completions);
                    }
                };

                langTools.addCompleter(customCompleter);
            }

            // Add custom snippets
            if (this.snippets && this.snippets.length > 0) {
                Object.keys(this.snippets).forEach(trigger => {
                    const snippetContent = this.snippets[trigger];
                    langTools.addSnippet({
                        name: trigger,
                        trigger: trigger,
                        content: snippetContent
                    });
                });
            }
        },

        // Toolbar Methods
        executeToolbarAction(command, event) {
            if (!this.editor || !this.hasToolbar) return;

            // Prevent form submission and event bubbling
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            const actions = {
                'undo': () => this.performOptimizedUndo(),
                'redo': () => this.performOptimizedRedo(),
                'find': () => this.editor.execCommand('find'),
                'replace': () => this.editor.execCommand('replace'),
                'goto-line': () => this.goToLine(),
                'toggle-comment': () => this.toggleCommentLines(),
                'toggle-fold': () => this.toggleCurrentFold(),
                'show-invisibles': () => this.toggleShowInvisibles(),
                'toggle-wordwrap': () => this.toggleWordWrap(),
                'convert-uppercase': () => this.convertToUpperCase(),
                'convert-lowercase': () => this.convertToLowerCase(),
                'toggle-print-margin': () => this.togglePrintMargin(),
            };

            const action = actions[command];
            if (action) {
                action();
                this.updateToolbarState();
            }
        },

        toggleCurrentFold() {
            const session = this.editor.getSession();
                const cursor = this.editor.getCursorPosition();

                // Use efficient fold state detection to determine action
                const foldState = this.getEfficientFoldState();

                try {
                    if (foldState.isInsideFold) {
                        // Cursor is inside a folded region, unfold it
                        const fold = session.getFoldAt(cursor.row, cursor.column, 1);
                        if (fold) {
                            session.unfold(fold);
                        } else {
                            // Fallback: unfold the current row if it's folded
                            if (session.isRowFolded(cursor.row)) {
                                const range = session.getFoldWidgetRange(cursor.row, "all");
                                if (range) {
                                    session.unfold(range);
                                }
                            }
                        }
                        return;
                    }

                    // Get the fold widget for the current line
                    const foldWidget = session.getFoldWidget(cursor.row);

                    if (foldWidget === "start") {
                        // Current line can be folded, toggle it
                        const range = session.getFoldWidgetRange(cursor.row, "all");
                        if (range) {
                            if (session.isRowFolded(cursor.row)) {
                                // Line is already folded, unfold it
                                session.unfold(range);
                            } else {
                                // Line can be folded, fold it
                                session.addFold("...", range);
                            }
                        }
                    } else if (foldWidget === "end") {
                        // Cursor is on the end of a fold, find the start and unfold
                        const range = session.getFoldWidgetRange(cursor.row, "all");
                        if (range) {
                            session.unfold(range);
                        }
                    } else {
                        // Search upwards for the nearest foldable line (optimized with max iterations)
                        let line = cursor.row - 1;
                        let maxSearch = 10; // Limit search for performance
                        while (line >= 0 && maxSearch > 0) {
                            const widget = session.getFoldWidget(line);
                            if (widget === "start") {
                                const range = session.getFoldWidgetRange(line, "all");
                                if (range) {
                                    if (session.isRowFolded(line)) {
                                        // Already folded, unfold it
                                        session.unfold(range);
                                    } else {
                                        // Not folded, fold it
                                        session.addFold("...", range);
                                    }
                                    break;
                                }
                            }
                            line--;
                            maxSearch--;
                        }
                    }

                    // Invalidate fold cache after operation
                    this.lastFoldState.cursorRow = -1;
                    this.lastFoldState.cursorColumn = -1;

                } catch (error) {
                    console.error('Error toggling fold:', error);
                    // Fallback to execCommand if all else fails
                    try {
                        this.editor.execCommand('toggleFoldWidget');
                        // Invalidate cache after fallback too
                        this.lastFoldState.cursorRow = -1;
                        this.lastFoldState.cursorColumn = -1;
                    } catch (fallbackError) {
                        console.error('Fallback fold command failed:', fallbackError);
                    }
                }
            },

        toggleCommentLines() {
            const editor = this.editor;
            const session = editor.getSession();
            const selection = editor.getSelection();
            const range = selection.getRange();

            if (range.isEmpty()) {
                // No selection, toggle current line
                const row = selection.getCursor().row;
                this.toggleLineComment(session, row, row);
            } else {
                // Multiple lines selected, toggle all
                this.toggleLineComment(session, range.start.row, range.end.row);
            }
        },

        toggleLineComment(session, startRow, endRow) {
            // Get comment prefix for current mode
            const commentInfo = this.getCommentPrefix(session);
            if (!commentInfo) return;

            const commentPrefix = commentInfo.prefix;
            const commentSuffix = commentInfo.suffix || '';

            // Check if lines are commented
            let linesAreCommented = true;
            for (let i = startRow; i <= endRow; i++) {
                const line = session.getLine(i);
                if (line.trim() && !line.trim().startsWith(commentPrefix)) {
                    linesAreCommented = false;
                    break;
                }
            }

            // Toggle comments
            for (let i = startRow; i <= endRow; i++) {
                const line = session.getLine(i);
                if (linesAreCommented) {
                    // Remove comments
                    let uncommentedLine = line;
                    if (commentSuffix) {
                        // Handle comments with both prefix and suffix (like HTML comments)
                        uncommentedLine = line.replace(new RegExp(`^\\s*${commentPrefix}\\s*(.*?)\\s*${commentSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s?$`), '$1');
                    } else {
                        // Handle simple prefix comments (like // or #)
                        uncommentedLine = line.replace(new RegExp(`^\\s*${commentPrefix}\\s?`), '');
                    }
                    session.replace({
                        start: {row: i, column: 0},
                        end: {row: i, column: line.length}
                    }, uncommentedLine);
                } else {
                    // Add comments
                    let commentedLine;
                    if (commentSuffix) {
                        // Handle comments with both prefix and suffix (like HTML comments)
                        commentedLine = commentPrefix + ' ' + line + ' ' + commentSuffix;
                    } else {
                        // Handle simple prefix comments (like // or #)
                        commentedLine = commentPrefix + ' ' + line;
                    }
                    session.replace({
                        start: {row: i, column: 0},
                        end: {row: i, column: line.length}
                    }, commentedLine);
                }
            }
        },

        getCommentPrefix(session) {
            const mode = session.getMode().$id;
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
            };
            return commentMap[mode] || { prefix: '//', suffix: '' };
        },

        toggleShowInvisibles(mode = 'all') {
            const current = this.editor.getShowInvisibles();

            // Handle granular modes for better performance
            let newState;
            switch (mode) {
                case 'all':
                    newState = current ? false : true;
                    break;
                case 'spaces':
                    newState = current === 'spaces' ? false : 'spaces';
                    break;
                case 'tabs':
                    newState = current === 'tabs' ? false : 'tabs';
                    break;
                case 'eol':
                    newState = current === 'eol' ? false : 'eol';
                    break;
                default:
                    newState = current ? false : true;
            }

            // Set the new state
            this.editor.setShowInvisibles(newState);

            // Update both the expensive state cache and toolbar state immediately
            this.lastExpensiveState.showInvisibles = newState;
            this.lastExpensiveState.lastCheckTime = Date.now();
            this.updateToolbarState(true); // Force immediate update for toggle actions
        },

        toggleWordWrap() {
            const session = this.editor.getSession();
            const current = session.getUseWrapMode();
            session.setUseWrapMode(!current);

            // Update toolbar state immediately for responsive UI
            this.updateToolbarState();
        },

        convertToUpperCase() {
            this.convertCaseOptimized('toUpperCase');
        },

        convertToLowerCase() {
            this.convertCaseOptimized('toLowerCase');
        },

        /**
         * Optimized case conversion with performance enhancements
         * Based on ACE Editor internal implementation research
         */
        convertCaseOptimized(conversionType) {
            const startTime = performance.now();
            const state = this.caseConversionState;

            // Prevent concurrent operations
            if (state.operationInProgress) {
                return;
            }

            state.operationInProgress = true;

            try {
                // Get current selection efficiently
                const session = this.editor.getSession();
                const originalRange = this.editor.getSelectionRange();

                // Auto-select word if no selection (following ACE's pattern)
                if (this.editor.getSelection().isEmpty()) {
                    this.editor.getSelection().selectWord();
                }

                const range = this.editor.getSelectionRange();
                const text = session.getTextRange(range);

                // Skip if no text to convert
                if (!text || text.length === 0) {
                    this.editor.getSelection().setSelectionRange(originalRange);
                    return;
                }

                // Create cache key for repeated conversions
                const cacheKey = `${text}:${conversionType}`;

                // Check cache first for performance
                if (state.conversionCache.has(cacheKey)) {
                    const cachedResult = state.conversionCache.get(cacheKey);
                    session.replace(range, cachedResult);

                    this.editor.getSelection().setSelectionRange(originalRange);
                    return;
                }

                // For large text blocks, use requestAnimationFrame to prevent blocking
                if (text.length > state.largeTextThreshold) {
                    this.performLargeTextConversion(range, text, conversionType, originalRange, cacheKey);
                } else {
                    // Direct conversion for smaller text blocks
                    const convertedText = conversionType === 'toUpperCase' ?
                        text.toUpperCase() : text.toLowerCase();

                    // Batch operation with undo management optimization
                    this.performOptimizedReplacement(range, convertedText, originalRange, cacheKey);
                }

  
            } catch (error) {
                console.warn(`Case conversion failed (${conversionType}):`, error);
                // Fallback to ACE's native implementation
                this.editor.execCommand(conversionType.toLowerCase());
            } finally {
                state.operationInProgress = false;
                state.lastConversionTime = performance.now();
            }
        },

        /**
         * Handle large text conversions with requestAnimationFrame for non-blocking operation
         */
        performLargeTextConversion(range, text, conversionType, originalRange, cacheKey) {
            // Use ACE's nextFrame pattern for non-blocking operations
            requestAnimationFrame(() => {
                try {
                    const convertedText = conversionType === 'toUpperCase' ?
                        text.toUpperCase() : text.toLowerCase();

                    this.performOptimizedReplacement(range, convertedText, originalRange, cacheKey);
                } catch (error) {
                    console.warn('Large text conversion failed:', error);
                    this.editor.execCommand(conversionType.toLowerCase());
                }
            });
        },

        /**
         * Perform optimized text replacement with undo management
         * Based on ACE Editor internal best practices
         */
        performOptimizedReplacement(range, convertedText, originalRange, cacheKey) {
            const session = this.editor.getSession();

            // Optimize undo management by batching operations
            const originalMergeDeltas = session.getOption('mergeUndoDeltas');
            session.setOption('mergeUndoDeltas', 'always');

            try {
                // Perform the replacement
                session.replace(range, convertedText);

                // Restore original selection
                this.editor.getSelection().setSelectionRange(originalRange);

                // Cache the result for future use
                this.cacheConversionResult(cacheKey, convertedText);

            } finally {
                // Restore original undo merge setting
                session.setOption('mergeUndoDeltas', originalMergeDeltas);
            }
        },

        /**
         * Cache conversion results to improve performance for repeated operations
         */
        cacheConversionResult(cacheKey, convertedText) {
            const state = this.caseConversionState;

            // Manage cache size to prevent memory issues
            if (state.conversionCache.size >= state.maxCacheSize) {
                // Remove oldest entries (simple LRU implementation)
                const firstKey = state.conversionCache.keys().next().value;
                state.conversionCache.delete(firstKey);
            }

            state.conversionCache.set(cacheKey, convertedText);
        },

        
        togglePrintMargin() {
            const current = this.printMarginState.showPrintMargin;
            const newState = !current;

            // Optimized print margin toggle with performance improvements
            this.setPrintMarginOptimized(newState);

            // Update toolbar state immediately for responsive UI
            this.updateToolbarState(true);
        },

        /**
         * Optimized print margin setter with performance enhancements
         * Based on ACE Editor internal implementation research
         */
        setPrintMarginOptimized(show) {
            if (this.printMarginState.showPrintMargin === show) {
                return; // No change needed
            }

            const now = performance.now();

            // Update our cached state immediately for responsive UI
            this.printMarginState.showPrintMargin = show;
            this.printMarginState.lastUpdateTime = now;

            // Use requestAnimationFrame for smooth, non-blocking updates
            if (this.printMarginState.throttledUpdate) {
                cancelAnimationFrame(this.printMarginState.throttledUpdate);
            }

            this.printMarginState.throttledUpdate = requestAnimationFrame(() => {
                try {
                    // Batch the ACE API call to reduce layout thrashing
                    this.editor.setShowPrintMargin(show);

                    // Update word wrap if needed (print margin affects wrap behavior)
                    this.updateWordWrapForPrintMargin();

                } catch (error) {
                    console.warn('Print margin update failed:', error);
                    // Fallback to direct API call
                    this.editor.setShowPrintMargin(show);
                } finally {
                    this.printMarginState.throttledUpdate = null;
                    this.printMarginState.updateScheduled = false;
                }
            });

            this.printMarginState.updateScheduled = true;
        },

        /**
         * Update word wrap when print margin changes for optimal text layout
         * Based on ACE's internal print margin-word wrap integration
         */
        updateWordWrapForPrintMargin() {
            try {
                const session = this.editor.getSession();
                if (session && session.getUseWrapMode()) {
                    // Trigger word wrap recalculation when print margin changes
                    // This mimics ACE's internal behavior in adjustWrapLimit()
                    const renderer = this.editor.renderer;
                    if (renderer && renderer.adjustWrapLimit) {
                        renderer.adjustWrapLimit();
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
            column = Math.max(1, Math.min(column, 1000)); // Reasonable bounds

            if (this.printMarginState.printMarginColumn === column) {
                return; // No change needed
            }

            this.printMarginState.printMarginColumn = column;

            // Use throttled update for column changes
            if (this.printMarginState.throttledUpdate) {
                cancelAnimationFrame(this.printMarginState.throttledUpdate);
            }

            this.printMarginState.throttledUpdate = requestAnimationFrame(() => {
                try {
                    this.editor.setPrintMarginColumn(column);
                    this.updateWordWrapForPrintMargin();
                } catch (error) {
                    console.warn('Print margin column update failed:', error);
                } finally {
                    this.printMarginState.throttledUpdate = null;
                }
            });
        },

        goToLine() {
            if (!this.editor) return;

            // Use optimized goto line dialog based on ACE's internal implementation
            this.showOptimizedGotoLineDialog();
        },

        /**
         * Optimized goto line dialog based on ACE Editor's internal implementation
         * Includes performance optimizations and ACE-like features
         */
        showOptimizedGotoLineDialog() {
            const session = this.editor.getSession();
            const currentLine = this.editor.getCursorPosition().row + 1;
            const totalLines = session.getLength();

            // Check for dark mode once and cache
            const isDarkMode = document.documentElement.classList.contains('dark');

            // Create optimized modal with performance considerations
            const editorContainer = this.editor.container;
            const overlay = this.createOptimizedModal(isDarkMode);

            // Create enhanced dialog with ACE-like features
            const dialog = this.createGotoLineDialog(currentLine, totalLines, isDarkMode);
            overlay.appendChild(dialog);
            editorContainer.appendChild(overlay);

            // Setup optimized event handlers
            this.setupGotoLineHandlers(overlay, dialog, currentLine, totalLines, isDarkMode);

            // Focus input with RAF for better performance
            requestAnimationFrame(() => {
                const input = dialog.querySelector('#gotoLineInput');
                if (input) {
                    input.focus();
                    input.select();
                }
            });
        },

        /**
         * Create optimized modal overlay with performance enhancements
         */
        createOptimizedModal(isDarkMode) {
            const overlay = document.createElement('div');
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
            `;
            overlay.style.opacity = '0';

            // Fade in animation for better UX
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            return overlay;
        },

        /**
         * Create goto line dialog with ACE-like features and performance optimizations
         */
        createGotoLineDialog(currentLine, totalLines, isDarkMode) {
            const dialog = document.createElement('div');
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
            `;

            // Enhanced dialog with history support (like ACE's implementation)
            const historyHtml = this.gotoLineState.history.length > 0 ?
                `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};">
                    <div style="font-size: 11px; color: ${isDarkMode ? '#9ca3af' : '#666'}; margin-bottom: 6px;">Recent:</div>
                    <div id="gotoHistory" style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${this.gotoLineState.history.slice(-5).map(line =>
                            `<button class="history-btn" data-line="${line}" style="padding: 2px 8px; font-size: 11px; background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${isDarkMode ? '#d1d5db' : '#4b5563'}; border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}; border-radius: 3px; cursor: pointer; font-family: monospace;">${line}</button>`
                        ).join('')}
                    </div>
                </div>` : '';

            dialog.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: ${isDarkMode ? 'white' : '#111827'};">Go to Line</h3>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <label style="font-size: 13px; font-weight: 500; white-space: nowrap; color: ${isDarkMode ? '#d1d5db' : '#374151'};">Line:</label>
                        <input type="text"
                               id="gotoLineInput"
                               inputmode="numeric"
                               pattern="[0-9]*"
                               value="${currentLine}"
                               style="flex: 1; padding: 6px 10px; border: 2px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}; background: ${isDarkMode ? '#374151' : 'white'}; color: ${isDarkMode ? 'white' : 'black'}; border-radius: 4px; font-size: 14px; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; min-width: 80px; outline: none; transition: border-color 0.15s ease;"
                               placeholder="1"
                               autocomplete="off">
                        <span style="font-size: 12px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">of ${totalLines}</span>
                    </div>
                    <div id="inputFeedback" style="font-size: 11px; color: ${isDarkMode ? '#f87171' : '#dc2626'}; min-height: 16px; opacity: 0; transition: opacity 0.15s ease;">Invalid line number</div>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="gotoLineCancel"
                            style="padding: 6px 14px; border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}; background: ${isDarkMode ? '#374151' : 'white'}; color: ${isDarkMode ? 'white' : 'black'}; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.15s ease;">
                        Cancel
                    </button>
                    <button id="gotoLineGo"
                            style="padding: 6px 14px; border: 1px solid #2563eb; background: #2563eb; color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: all 0.15s ease; font-weight: 500;">
                        Go to Line
                    </button>
                </div>
                ${historyHtml}
            `;

            // Animate dialog appearance
            requestAnimationFrame(() => {
                dialog.style.transform = 'scale(1)';
                dialog.style.opacity = '1';
            });

            return dialog;
        },

        /**
         * Setup optimized event handlers with performance considerations
         */
        setupGotoLineHandlers(overlay, dialog, _currentLine, _totalLines, _isDarkMode) {
            const input = dialog.querySelector('#gotoLineInput');
            const goButton = dialog.querySelector('#gotoLineGo');
            const cancelButton = dialog.querySelector('#gotoLineCancel');
            const feedback = dialog.querySelector('#inputFeedback');
            const historyButtons = dialog.querySelectorAll('.history-btn');

            // Optimized goto line function based on ACE's implementation
            const goToLine = () => {
                const inputText = input.value.trim();

                // Support ACE-like syntax: "line:column", "line>column", etc.
                const parseResult = this.parseGotoLineInput(inputText);

                if (parseResult.isValid) {
                    // Add to history (like ACE's implementation)
                    this.addToGotoHistory(parseResult.line);

                    // Use ACE's optimized gotoLine method
                    this.performOptimizedGotoLine(parseResult.line, parseResult.column, true);

                    this.editor.focus();
                    closeDialogWithAnimation();
                } else {
                    showInputError(parseResult.error);
                }
            };

            const showInputError = (error) => {
                feedback.textContent = error;
                feedback.style.opacity = '1';
                input.style.borderColor = _isDarkMode ? '#f87171' : '#dc2626';

                setTimeout(() => {
                    feedback.style.opacity = '0';
                    input.style.borderColor = _isDarkMode ? '#4b5563' : '#d1d5db';
                }, 2000);
            };

            const closeDialogWithAnimation = () => {
                dialog.style.transform = 'scale(0.95)';
                dialog.style.opacity = '0';
                overlay.style.opacity = '0';

                setTimeout(() => {
                    this.cleanupGotoLineDialog(overlay);
                    this.editor.focus();
                }, 150);
            };

            const closeDialog = () => {
                closeDialogWithAnimation();
            };

            // Optimized input validation with debouncing
            let validationTimeout;
            const validateInput = () => {
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                    const parseResult = this.parseGotoLineInput(input.value.trim());
                    goButton.style.opacity = parseResult.isValid ? '1' : '0.6';
                    goButton.disabled = !parseResult.isValid;

                    if (parseResult.isValid) {
                        input.style.borderColor = _isDarkMode ? '#10b981' : '#059669';
                        feedback.style.opacity = '0';
                    } else if (input.value.trim()) {
                        input.style.borderColor = _isDarkMode ? '#4b5563' : '#d1d5db';
                        feedback.style.opacity = '0';
                    }
                }, 150);
            };

            // Event listeners with performance optimizations
            input.addEventListener('input', validateInput);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    goToLine();
                    return false;
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDialog();
                    return false;
                }
            });

            // Handle history button clicks
            historyButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const line = btn.dataset.line;
                    input.value = line;
                    validateInput();
                    input.focus();
                });
            });

            // Button event listeners
            goButton.addEventListener('click', goToLine);
            cancelButton.addEventListener('click', closeDialog);

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeDialog();
                }
            });

            // Global key handler with cleanup
            const documentKeyHandler = (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    if (overlay.parentNode) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            goToLine();
                        } else {
                            closeDialog();
                        }
                        return false;
                    }
                }
            };

            document.addEventListener('keydown', documentKeyHandler, true);

            // Store cleanup function
            overlay._cleanup = () => {
                document.removeEventListener('keydown', documentKeyHandler, true);
                clearTimeout(validationTimeout);
            };
        },

        /**
         * Parse goto line input supporting ACE-like syntax
         */
        parseGotoLineInput(input) {
            const session = this.editor.getSession();
            const totalLines = session.getLength();

            // Handle empty input
            if (!input) {
                return { isValid: false, error: 'Please enter a line number' };
            }

            // Support various syntax like ACE: "123", "123:45", "123>45", "c123", etc.
            let line, column = 0;

            // Column syntax: "123:45" or "123>45"
            const columnMatch = input.match(/^(\d+)([:>])(\d*)$/);
            if (columnMatch) {
                line = parseInt(columnMatch[1], 10);
                if (columnMatch[3]) {
                    column = parseInt(columnMatch[3], 10);
                }
            }
            // Character position syntax: "c123"
            else if (input.toLowerCase().startsWith('c')) {
                // This would require character position calculation - simplified for now
                const charPos = parseInt(input.slice(1), 10);
                const approxLine = Math.max(1, Math.floor(charPos / 80)); // Rough estimate
                return { isValid: true, line: approxLine, column: 0 };
            }
            // Simple line number
            else {
                line = parseInt(input, 10);
            }

            // Validate line number
            if (isNaN(line) || line < 1 || line > totalLines) {
                return { isValid: false, error: `Line must be between 1 and ${totalLines}` };
            }

            // Validate column
            if (isNaN(column) || column < 0) {
                column = 0;
            }

            return { isValid: true, line, column };
        },

        /**
         * Perform optimized goto line using ACE's internal methods
         */
        performOptimizedGotoLine(line, column, animate = true) {
            try {
                // Cancel any ongoing animation
                if (this.gotoLineState.animationFrame) {
                    cancelAnimationFrame(this.gotoLineState.animationFrame);
                }

                // Use RAF for smooth non-blocking operation
                this.gotoLineState.animationFrame = requestAnimationFrame(() => {
                    // Clear selection (like ACE's implementation)
                    this.editor.clearSelection();

                    // Ensure line is unfolded (like ACE does)
                    const session = this.editor.getSession();
                    session.unfold({ row: line - 1, column: column || 0 });

                    // Move cursor to position
                    this.editor.moveCursorTo(line - 1, column || 0);

                    // Scroll to line with performance optimization
                    if (!this.editor.isRowFullyVisible(line - 1)) {
                        // Use ACE's optimized scrollToLine method
                        this.editor.scrollToLine(line - 1, true, animate);
                    }

                    // Track last goto for quick access
                    this.gotoLineState.lastGotoLine = line;
                    this.gotoLineState.animationFrame = null;
                });

            } catch (error) {
                console.warn('Goto line operation failed:', error);
                // Fallback to direct ACE method
                this.editor.gotoLine(line, column, animate);
            }
        },

        /**
         * Add line to goto history (like ACE's implementation)
         */
        addToGotoHistory(line) {
            // Remove if already exists
            const index = this.gotoLineState.history.indexOf(line);
            if (index > -1) {
                this.gotoLineState.history.splice(index, 1);
            }

            // Add to end
            this.gotoLineState.history.push(line);

            // Limit history size (same as ACE's limit)
            if (this.gotoLineState.history.length > this.gotoLineState.maxHistory) {
                this.gotoLineState.history.shift();
            }
        },

        /**
         * Clean up goto line dialog and event handlers
         */
        cleanupGotoLineDialog(overlay) {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }

            // Call cleanup function if it exists
            if (overlay._cleanup) {
                overlay._cleanup();
                overlay._cleanup = null;
            }

            // Clear any animation frame
            if (this.gotoLineState.animationFrame) {
                cancelAnimationFrame(this.gotoLineState.animationFrame);
                this.gotoLineState.animationFrame = null;
            }
        },

    
        toggleFullscreen() {
            this.isFullscreen = !this.isFullscreen;
            const container = this.$el.closest('.rd-ace-editor');

            if (this.isFullscreen) {
                // Enter fullscreen
                container.classList.add('rd-ace-editor--fullscreen');
                document.body.style.overflow = 'hidden';
            } else {
                // Exit fullscreen
                container.classList.remove('rd-ace-editor--fullscreen');
                document.body.style.overflow = '';
            }

            // Trigger ACE resize after a short delay (performance optimized)
            setTimeout(() => {
                if (this.editor && !this.isDestroyed) {
                    this.editor.resize();
                    // Only call updateFull() when necessary - it's very expensive
                    if (this.isFullscreen) {
                        this.editor.renderer.updateFull();
                    }
                }
            }, 100);
        },

        /**
         * Initialize expensive state cache to reduce ACE API calls
         * This should be called once after editor initialization
         */
        initializeExpensiveStateCache() {
            if (!this.editor) return;

            try {
                // Cache expensive-to-retrieve state values
                this.lastExpensiveState.showInvisibles = this.editor.getShowInvisibles();
                this.lastExpensiveState.lastCheckTime = Date.now();

                // Initialize print margin state with optimal defaults
                this.printMarginState.showPrintMargin = this.editor.getShowPrintMargin();
                this.printMarginState.printMarginColumn = this.editor.getPrintMarginColumn() || 80;
                this.printMarginState.lastUpdateTime = Date.now();

                // Initialize toolbar state cache as well
                const undoManager = this.editor.session.getUndoManager();
                this.lastToolbarState.canUndo = undoManager.hasUndo();
                this.lastToolbarState.canRedo = undoManager.hasRedo();

                // Initialize our optimized undo/redo state cache
                this.undoRedoState.canUndo = this.lastToolbarState.canUndo;
                this.undoRedoState.canRedo = this.lastToolbarState.canRedo;
                this.undoRedoState.lastCheckTime = Date.now();
                this.lastToolbarState.showPrintMargin = this.printMarginState.showPrintMargin;
                this.lastToolbarState.showInvisibles = this.lastExpensiveState.showInvisibles;
                this.lastToolbarState.wordWrapEnabled = this.editor.getSession().getUseWrapMode();

                // Set initial Alpine.js state
                this.toolbarState.canUndo = this.lastToolbarState.canUndo;
                this.toolbarState.canRedo = this.lastToolbarState.canRedo;
                this.toolbarState.showPrintMargin = this.lastToolbarState.showPrintMargin;
                this.toolbarState.showInvisibles = this.lastToolbarState.showInvisibles;
                this.toolbarState.wordWrapEnabled = this.lastToolbarState.wordWrapEnabled;

            } catch (error) {
                console.warn('Failed to initialize expensive state cache:', error);
                // Fallback to default values
                this.lastExpensiveState.showInvisibles = false;
                this.lastExpensiveState.lastCheckTime = Date.now();
                this.printMarginState.showPrintMargin = true;
                this.printMarginState.printMarginColumn = 80;
                this.printMarginState.lastUpdateTime = Date.now();
            }
        },

        /**
         * Perform optimized undo operation with performance enhancements
         * Based on ACE Editor's undo system research
         */
        performOptimizedUndo() {
            if (!this.editor || !this.editor.session) return;

            try {
                const undoManager = this.editor.session.getUndoManager();
                if (!undoManager || !undoManager.hasUndo()) {
                    return; // Nothing to undo
                }

                // Check if we should queue this operation to prevent rapid calls
                const now = performance.now();
                const timeSinceLastOp = now - this.undoRedoState.lastOperationTime;

                // Queue rapid operations to prevent performance issues
                if (timeSinceLastOp < 50 && this.undoRedoState.isProcessingQueue) {
                    this.undoRedoState.operationQueue.push({ type: 'undo', timestamp: now });
                    return;
                }

                this.undoRedoState.lastOperationTime = now;
                this.undoRedoState.isProcessingQueue = true;

                // Use requestAnimationFrame for non-blocking operation
                requestAnimationFrame(() => {
                    try {
                        // Perform the undo operation
                        this.editor.undo();

                        // Invalidate our cached undo state
                        this.undoRedoState.lastCheckTime = 0;

                        // Update toolbar state immediately for responsive UI
                        this.updateToolbarState(true);

                        // Process any queued operations
                        this.processUndoRedoQueue();

                    } catch (error) {
                        console.warn('Undo operation failed:', error);
                    } finally {
                        this.undoRedoState.isProcessingQueue = false;
                    }
                });

            } catch (error) {
                console.warn('Undo operation failed:', error);
                // Fallback to direct ACE method
                try {
                    this.editor.undo();
                    this.updateToolbarState(true);
                } catch (fallbackError) {
                    console.warn('Fallback undo also failed:', fallbackError);
                }
            }
        },

        /**
         * Perform optimized redo operation with performance enhancements
         * Based on ACE Editor's undo system research
         */
        performOptimizedRedo() {
            if (!this.editor || !this.editor.session) return;

            try {
                const undoManager = this.editor.session.getUndoManager();
                if (!undoManager || !undoManager.hasRedo()) {
                    return; // Nothing to redo
                }

                // Check if we should queue this operation to prevent rapid calls
                const now = performance.now();
                const timeSinceLastOp = now - this.undoRedoState.lastOperationTime;

                // Queue rapid operations to prevent performance issues
                if (timeSinceLastOp < 50 && this.undoRedoState.isProcessingQueue) {
                    this.undoRedoState.operationQueue.push({ type: 'redo', timestamp: now });
                    return;
                }

                this.undoRedoState.lastOperationTime = now;
                this.undoRedoState.isProcessingQueue = true;

                // Use requestAnimationFrame for non-blocking operation
                requestAnimationFrame(() => {
                    try {
                        // Perform the redo operation
                        this.editor.redo();

                        // Invalidate our cached undo state
                        this.undoRedoState.lastCheckTime = 0;

                        // Update toolbar state immediately for responsive UI
                        this.updateToolbarState(true);

                        // Process any queued operations
                        this.processUndoRedoQueue();

                    } catch (error) {
                        console.warn('Redo operation failed:', error);
                    } finally {
                        this.undoRedoState.isProcessingQueue = false;
                    }
                });

            } catch (error) {
                console.warn('Redo operation failed:', error);
                // Fallback to direct ACE method
                try {
                    this.editor.redo();
                    this.updateToolbarState(true);
                } catch (fallbackError) {
                    console.warn('Fallback redo also failed:', fallbackError);
                }
            }
        },

        /**
         * Process queued undo/redo operations to prevent rapid successive calls
         * Based on ACE's performance optimization patterns
         */
        processUndoRedoQueue() {
            if (this.undoRedoState.operationQueue.length === 0) return;

            // Get the latest operation of each type (ignore duplicates)
            const operations = this.undoRedoState.operationQueue;
            const latestUndo = operations.filter(op => op.type === 'undo').pop();
            const latestRedo = operations.filter(op => op.type === 'redo').pop();

            // Clear the queue
            this.undoRedoState.operationQueue = [];

            // Schedule the latest operations if they're still relevant
            setTimeout(() => {
                if (latestUndo && this.canPerformUndo()) {
                    this.performOptimizedUndo();
                } else if (latestRedo && this.canPerformRedo()) {
                    this.performOptimizedRedo();
                }
            }, 100); // Small delay to prevent rapid operations
        },

        /**
         * Check if undo operation can be performed (cached version)
         */
        canPerformUndo() {
            const now = Date.now();
            const timeSinceLastCheck = now - this.undoRedoState.lastCheckTime;

            // Use cached value if within timeout
            if (timeSinceLastCheck < this.undoRedoState.checkCacheTimeout) {
                return this.undoRedoState.canUndo;
            }

            try {
                const undoManager = this.editor.session.getUndoManager();
                const canUndo = undoManager ? undoManager.hasUndo() : false;

                // Update cache
                this.undoRedoState.canUndo = canUndo;
                this.undoRedoState.lastCheckTime = now;

                return canUndo;
            } catch (error) {
                return false;
            }
        },

        /**
         * Check if redo operation can be performed (cached version)
         */
        canPerformRedo() {
            const now = Date.now();
            const timeSinceLastCheck = now - this.undoRedoState.lastCheckTime;

            // Use cached value if within timeout
            if (timeSinceLastCheck < this.undoRedoState.checkCacheTimeout) {
                return this.undoRedoState.canRedo;
            }

            try {
                const undoManager = this.editor.session.getUndoManager();
                const canRedo = undoManager ? undoManager.hasRedo() : false;

                // Update cache
                this.undoRedoState.canRedo = canRedo;
                this.undoRedoState.lastCheckTime = now;

                return canRedo;
            } catch (error) {
                return false;
            }
        },

  
    
      
        /**
         * Optimize undo manager for better performance
         * Based on ACE research findings
         */
        optimizeUndoManager() {
            if (!this.editor || !this.editor.session) return;

            try {
                const undoManager = this.editor.session.getUndoManager();
                if (!undoManager) return;

                // Configure optimal settings based on ACE research
                if (undoManager.$undoDepth === Infinity) {
                    // Set reasonable limit to prevent memory issues (ACE default is unlimited)
                    undoManager.$undoDepth = 200; // Reasonable limit for most users
                }

                // Enable delta merging for better performance (ACE default)
                if (this.editor.session.mergeUndoDeltas !== true) {
                    this.editor.session.mergeUndoDeltas = true;
                }

                // Monitor undo depth for performance tracking
                this.undoRedoState.undoDepth = undoManager.$undoStack ? undoManager.$undoStack.length : 0;
                this.undoRedoState.redoDepth = undoManager.$redoStack ? undoManager.$redoStack.length : 0;

            } catch (error) {
                console.warn('Failed to optimize undo manager:', error);
            }
        },

        /**
         * ACE-style operation batching for improved performance
         * Based on ACE Editor's internal operation management system
         */
        startBatchOperation(operationType = 'default') {
            const state = this.operationState;

            if (state.isBatching) {
                return state.currentOperation;
            }

            state.isBatching = true;
            state.currentOperation = {
                type: operationType,
                startTime: performance.now(),
                changes: { ...state.pendingChanges }
            };

            // Cancel any existing batch timeout
            if (state.batchTimeout) {
                clearTimeout(state.batchTimeout);
            }

            return state.currentOperation;
        },

        /**
         * End ACE-style batch operation and flush changes
         */
        endBatchOperation() {
            const state = this.operationState;

            if (!state.isBatching) {
                return;
            }

            const operation = state.currentOperation;
            if (!operation) {
                state.isBatching = false;
                return;
            }

            // Schedule render flush using ACE-style timing
            this.scheduleRenderFlush();

            state.isBatching = false;
            state.currentOperation = null;
        },

        /**
         * Schedule render flush using ACE's nextFrame pattern
         * Matches ACE's 60fps render loop scheduling
         */
        scheduleRenderFlush() {
            const state = this.operationState;

            if (state.batchTimeout) {
                return; // Already scheduled
            }

            state.batchTimeout = setTimeout(() => {
                this.flushRenderChanges();
                state.batchTimeout = null;
            }, state.batchDelay);
        },

        /**
         * Flush render changes using ACE-style batching
         */
        flushRenderChanges() {
            const state = this.operationState;
            const changes = state.pendingChanges;
            const now = performance.now();

            // Throttle renders to 60fps like ACE does
            if (now - state.lastRenderTime < 16) { // ~60fps
                this.scheduleRenderFlush();
                return;
            }

            try {
                // Batch render changes based on what's pending
                let renderFlags = 0;

                if (changes.cursor) renderFlags |= 1;  // CHANGE_CURSOR
                if (changes.selection) renderFlags |= 2;  // CHANGE_MARKER
                if (changes.gutter) renderFlags |= 4;  // CHANGE_GUTTER
                if (changes.scroll) renderFlags |= 8;  // CHANGE_SCROLL
                if (changes.text) renderFlags |= 16;  // CHANGE_TEXT
                if (changes.cursor || changes.selection) renderFlags |= 32;  // CHANGE_FULL for UI updates

                // Use ACE renderer's schedule method if available
                if (this.editor && this.editor.renderer && this.editor.renderer.$loop) {
                    this.editor.renderer.$loop.schedule(renderFlags);
                }

                // Reset pending changes
                state.pendingChanges = {
                    cursor: false,
                    selection: false,
                    text: false,
                    scroll: false,
                    gutter: false,
                };

                state.lastRenderTime = now;
                state.renderChanges++;

            } catch (error) {
                console.warn('Render flush failed:', error);
            }
        },

        /**
         * Mark a specific change type as pending (ACE-style)
         */
        markChangePending(changeType) {
            const state = this.operationState;

            if (state.pendingChanges.hasOwnProperty(changeType)) {
                state.pendingChanges[changeType] = true;

                // Auto-start batching if not already batching
                if (!state.isBatching) {
                    this.startBatchOperation('auto');
                    // Auto-end after a short delay
                    setTimeout(() => {
                        if (state.isBatching && state.currentOperation?.type === 'auto') {
                            this.endBatchOperation();
                        }
                    }, 0);
                }
            }
        },

  
    
        /**
         * ACE-style performance optimization setup
         */
        setupPerformanceOptimizations() {
            if (!this.editor) return;

            try {
                // Enable ACE's built-in optimizations
                if (this.editor.session) {
                    // Optimize undo manager
                    this.optimizeUndoManager();

                    // Enable delta merging for better performance
                    this.editor.session.setOption('mergeUndoDeltas', 'after');

                    // Set reasonable max undo depth
                    const undoManager = this.editor.session.getUndoManager();
                    if (undoManager && undoManager.$undoDepth === Infinity) {
                        undoManager.$undoDepth = 200;
                    }
                }

                // Optimize renderer settings
                if (this.editor.renderer) {
                    // Enable ACE's optimized scrolling
                    this.editor.renderer.setAnimatedScroll(true);

                    // Optimize font rendering
                    this.editor.renderer.$optimizeFontRendering = true;
                }

                console.debug('ACE performance optimizations enabled');

            } catch (error) {
                console.warn('Failed to setup performance optimizations:', error);
            }
        },

        /**
         * ACE-style reliability and error handling improvements
         * Based on ACE Editor's robust error handling patterns
         */
        setupReliabilityImprovements() {
            if (!this.editor) return;

            try {
                // Setup ACE-style error boundaries
                this.setupErrorBoundaries();

                // Setup performance monitoring
                this.setupPerformanceMonitoring();

                // Setup graceful degradation
                this.setupGracefulDegradation();

                console.debug('ACE reliability improvements enabled');

            } catch (error) {
                console.warn('Failed to setup reliability improvements:', error);
            }
        },

        /**
         * Setup ACE-style error boundaries for better error handling
         */
        setupErrorBoundaries() {
            // Wrap critical ACE operations in try-catch blocks
            const originalSetTheme = this.editor.setTheme.bind(this.editor);
            this.editor.setTheme = (...args) => {
                try {
                    return originalSetTheme(...args);
                } catch (error) {
                    console.warn('Theme setting failed, using fallback:', error);
                    return originalSetTheme('ace/theme/textmate');
                }
            };

            const originalSetOptions = this.editor.setOptions.bind(this.editor);
            this.editor.setOptions = (...args) => {
                try {
                    return originalSetOptions(...args);
                } catch (error) {
                    console.warn('Options setting failed, using defaults:', error);
                    return originalSetOptions({});
                }
            };

            // Session error handling
            if (this.editor.session) {
                const originalSetValue = this.editor.session.setValue.bind(this.editor.session);
                this.editor.session.setValue = (...args) => {
                    try {
                        return originalSetValue(...args);
                    } catch (error) {
                        console.warn('Session setValue failed:', error);
                        return originalSetValue('');
                    }
                };
            }
        },

        /**
         * Setup performance monitoring with ACE-style metrics
         */
        setupPerformanceMonitoring() {
            // Monitor editor operations
            let operationCount = 0;
            let slowOperations = 0;

            const originalExecCommand = this.editor.execCommand.bind(this.editor);
            this.editor.execCommand = (...args) => {
                const startTime = performance.now();
                operationCount++;

                try {
                    const result = originalExecCommand(...args);
                    const duration = performance.now() - startTime;

                    if (duration > 100) { // Operations slower than 100ms
                        slowOperations++;
                        console.debug(`Slow operation detected: ${args[0]} (${duration.toFixed(2)}ms)`);
                    }

                    return result;
                } catch (error) {
                    console.warn(`Command execution failed: ${args[0]}`, error);
                    return false;
                }
            };

            // Periodically report performance stats
            setInterval(() => {
                if (operationCount > 0) {
                    const slowRatio = (slowOperations / operationCount * 100).toFixed(1);
                    console.debug(`Performance: ${operationCount} operations, ${slowRatio}% slow`);

                    // Reset counters
                    operationCount = 0;
                    slowOperations = 0;
                }
            }, 30000); // Every 30 seconds
        },

        /**
         * Setup graceful degradation for ACE features
         */
        setupGracefulDegradation() {
            // Feature detection with fallbacks
            const features = {
                animatedScroll: () => {
                    try {
                        this.editor.setOption('animatedScroll', true);
                        return this.editor.getOption('animatedScroll');
                    } catch (error) {
                        this.editor.setOption('animatedScroll', false);
                        return false;
                    }
                },

                liveAutocompletion: () => {
                    try {
                        // Test if live autocompletion works
                        this.editor.setOption('enableLiveAutocompletion', true);
                        return this.editor.getOption('enableLiveAutocompletion');
                    } catch (error) {
                        this.editor.setOption('enableLiveAutocompletion', false);
                        return false;
                    }
                }
            };

            // Test and enable/disable features based on support
            Object.entries(features).forEach(([featureName, testFeature]) => {
                try {
                    const supported = testFeature();
                    console.debug(`Feature ${featureName}: ${supported ? 'enabled' : 'disabled (fallback)'}`);
                } catch (error) {
                    console.warn(`Feature test failed for ${featureName}:`, error);
                }
            });
        },

        /**
         * ACE-style health check for the editor
         */
        performHealthCheck() {
            if (!this.editor) {
                return { status: 'error', message: 'Editor not initialized' };
            }

            try {
                const health = {
                    status: 'healthy',
                    checks: {}
                };

                // Check session
                health.checks.session = !!this.editor.session;

                // Check renderer
                health.checks.renderer = !!this.editor.renderer;

                // Check theme
                health.checks.theme = !!this.editor.getTheme();

                // Check mode
                health.checks.mode = !!this.editor.session.getMode();

                // Check document
                health.checks.document = !!this.editor.session.getDocument();

                // Check if editor is responsive
                const startTime = performance.now();
                this.editor.renderer.onResize(false, true); // Test renderer responsiveness
                health.checks.responsive = (performance.now() - startTime) < 50;

                // Determine overall status
                const failedChecks = Object.values(health.checks).filter(check => !check).length;
                if (failedChecks > 0) {
                    health.status = 'warning';
                    health.message = `${failedChecks} health checks failed`;
                }

                return health;

            } catch (error) {
                return {
                    status: 'error',
                    message: `Health check failed: ${error.message}`,
                    error: error
                };
            }
        },

        /**
         * Auto-recovery mechanism for common ACE issues
         */
        attemptAutoRecovery() {
            try {
                const health = this.performHealthCheck();

                if (health.status === 'error') {
                    console.warn('Attempting ACE editor auto-recovery...');

                    // Try to recover common issues
                    if (!this.editor.session) {
                        console.warn('Recreating session...');
                        this.editor.setSession(new ace.EditSession(''));
                    }

                    if (!this.editor.getTheme()) {
                        console.warn('Resetting theme...');
                        this.editor.setTheme('ace/theme/textmate');
                    }

                    if (!this.editor.session.getMode()) {
                        console.warn('Resetting mode...');
                        this.editor.session.setMode('ace/mode/text');
                    }

                    // Check if recovery worked
                    const recoveryHealth = this.performHealthCheck();
                    if (recoveryHealth.status !== 'error') {
                        console.log('ACE editor auto-recovery successful');
                        return true;
                    } else {
                        console.error('ACE editor auto-recovery failed');
                        return false;
                    }
                }

                return true;

            } catch (error) {
                console.error('Auto-recovery failed:', error);
                return false;
            }
        },


        // Toolbar helper methods
        getButtonTitle(command) {
            if (!this.hasToolbar || !command) return '';

            // Dynamic titles for fold button
            if (command === 'toggle-fold') {
                const foldState = this.getEfficientFoldState();
                if (foldState.isInsideFold || foldState.canUnfold) {
                    return 'Unfold Code (Ctrl+Alt+F)';
                } else if (foldState.canFold) {
                    return 'Fold Code (Ctrl+Alt+F)';
                } else {
                    return 'Fold/Unfold Code';
                }
            }

            const titles = {
                'undo': 'Undo (Ctrl+Z)',
                'redo': 'Redo (Ctrl+Y)',
                'find': 'Find (Ctrl+F)',
                'replace': 'Replace (Ctrl+H)',
                'goto-line': 'Go To Line (Ctrl+G)',
                'toggle-comment': 'Toggle Comment (Ctrl+/)',
                'show-invisibles': 'Show Invisible Characters',
                'toggle-wordwrap': 'Toggle Word Wrap',
                'convert-uppercase': 'Convert to Uppercase',
                'convert-lowercase': 'Convert to Lowercase',
                'toggle-print-margin': 'Toggle Print Margin',
            };
            return titles[command] || command;
        },

    
        // Icons are now handled by CSS mask-image - no JavaScript icon generation needed

        getButtonDisabled(command) {
            if (!this.editor) return true;

            switch (command) {
                case 'undo':
                    return !this.toolbarState.canUndo;
                case 'redo':
                    return !this.toolbarState.canRedo;
                default:
                    return false;
            }
        },

        getButtonActiveState(command) {
            if (!this.editor) return false;

            switch (command) {
                case 'toggle-print-margin':
                    return this.toolbarState.showPrintMargin;
                case 'show-invisibles':
                    return this.toolbarState.showInvisibles;
                case 'toggle-wordwrap':
                    return this.toolbarState.wordWrapEnabled;
                case 'toggle-fold':
                    // Context-aware fold/unfold state for single button
                    const foldState = this.getEfficientFoldState();
                    return foldState.canFold || foldState.canUnfold || foldState.isInsideFold;
                default:
                    return false;
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
                };
            }

            const session = this.editor.session;
            const cursor = this.editor.getCursorPosition();

            // Check if cursor position changed - if not, return cached state
            if (this.lastFoldState.cursorRow === cursor.row &&
                this.lastFoldState.cursorColumn === cursor.column) {
                return {
                    canFold: this.lastFoldState.canFold,
                    canUnfold: this.lastFoldState.canUnfold,
                    isInsideFold: this.lastFoldState.isInsideFold,
                };
            }

            // Use fast ACE API methods for optimal performance
            let canFold = false;
            let canUnfold = false;
            let isInsideFold = false;

            try {
                // Fast check 1: Is cursor on a folded line? (O(1) operation)
                const isRowFolded = session.isRowFolded(cursor.row);

                // Fast check 2: Is cursor inside a fold? (O(1) operation)
                const foldAtCursor = session.getFoldAt(cursor.row, cursor.column, 1);

                // Fast check 3: Get fold widget for current line (O(1) operation)
                const foldWidget = session.getFoldWidget(cursor.row);

                // Determine fold capabilities based on fast checks
                isInsideFold = isRowFolded || !!foldAtCursor;

                // Check if we can fold (line is a fold start and not already folded)
                if (foldWidget === "start" && !isRowFolded) {
                    const foldRange = session.getFoldWidgetRange(cursor.row, "all");
                    if (foldRange) {
                        canFold = true;
                    }
                }

                // Check if we can unfold (either folded line or inside a fold)
                if (isRowFolded || foldAtCursor || (foldWidget === "start" && isRowFolded)) {
                    canUnfold = true;
                }

                // Additional check: if we're on a folded line's end, we can unfold
                if (foldWidget === "end" && isRowFolded) {
                    canUnfold = true;
                }

            } catch (error) {
                console.warn('Fold state detection error:', error);
                // Fallback to basic state
                return { canFold: false, canUnfold: false, isInsideFold: false };
            }

            // Update cache for performance
            this.lastFoldState = {
                canFold,
                canUnfold,
                isInsideFold,
                cursorRow: cursor.row,
                cursorColumn: cursor.column,
            };

            return {
                canFold,
                canUnfold,
                isInsideFold,
            };
        },

        updateToolbarState(forceExpensiveCheck = false) {
            if (!this.editor || !this.hasToolbar) return;

            // Clear existing timer to prevent multiple rapid updates
            if (this.debounceTimers.toolbarUpdate) {
                clearTimeout(this.debounceTimers.toolbarUpdate);
            }

            // Use shorter debounce for immediate feedback (like button clicks)
            const debounceTime = forceExpensiveCheck ? 10 : 30;

            // Debounce toolbar state updates to improve performance
            this.debounceTimers.toolbarUpdate = setTimeout(() => {
                if (this.isDestroyed || !this.editor) return;

                // Use optimized undo/redo state checking with caching (performance optimization)
                const canUndo = this.canPerformUndo();
                const canRedo = this.canPerformRedo();

                // Fast operations - use cached values to reduce ACE API calls
                const showPrintMargin = this.printMarginState.showPrintMargin;
                const wordWrapEnabled = this.editor.getSession().getUseWrapMode();

                // Optimized showInvisibles check - only call ACE API if necessary
                let showInvisibles;
                const now = Date.now();
                const timeSinceLastCheck = now - this.lastExpensiveState.lastCheckTime;

                // Cache for 500ms to reduce expensive API calls during rapid events
                // Use cached value unless forced to check or cache is expired
                if (forceExpensiveCheck || timeSinceLastCheck > 500) {
                    showInvisibles = this.editor.getShowInvisibles();
                    this.lastExpensiveState.showInvisibles = showInvisibles;
                    this.lastExpensiveState.lastCheckTime = now;
                } else {
                    // Use cached value to avoid expensive ACE API call
                    showInvisibles = this.lastExpensiveState.showInvisibles;
                }

                // Invalidate fold cache when state changes (cursor movement, etc.)
                // This ensures fold buttons update correctly when cursor moves or folds change
                this.lastFoldState.cursorRow = -1;
                this.lastFoldState.cursorColumn = -1;

                // Update fold button visual state dynamically (but not on every call)
                if (forceExpensiveCheck || timeSinceLastCheck > 100) {
                    this.updateFoldButtonState();
                }

                // Only update if state actually changed to prevent unnecessary Alpine re-renders
                if (this.lastToolbarState.canUndo !== canUndo ||
                    this.lastToolbarState.canRedo !== canRedo ||
                    this.lastToolbarState.showPrintMargin !== showPrintMargin ||
                    this.lastToolbarState.showInvisibles !== showInvisibles ||
                    this.lastToolbarState.wordWrapEnabled !== wordWrapEnabled) {

                    // Update cached state
                    this.lastToolbarState.canUndo = canUndo;
                    this.lastToolbarState.canRedo = canRedo;
                    this.lastToolbarState.showPrintMargin = showPrintMargin;
                    this.lastToolbarState.showInvisibles = showInvisibles;
                    this.lastToolbarState.wordWrapEnabled = wordWrapEnabled;

                    // Update toolbar state - Alpine.js will re-render when these change
                    this.toolbarState.canUndo = canUndo;
                    this.toolbarState.canRedo = canRedo;
                    this.toolbarState.showPrintMargin = showPrintMargin;
                    this.toolbarState.showInvisibles = showInvisibles;
                    this.toolbarState.wordWrapEnabled = wordWrapEnabled;
                }
            }, debounceTime);
        },

        /**
         * Update the fold button's visual state (icon) based on current fold state
         */
        updateFoldButtonState() {
            if (!this.editor) return;

            try {
                const foldButton = this.$el.querySelector('[data-button="toggle-fold"]');
                if (!foldButton) return;

                const foldState = this.getEfficientFoldState();

                // Add or remove the unfold state class based on current state
                if (foldState.isInsideFold || foldState.canUnfold) {
                    foldButton.classList.add('fold-state-unfold');
                } else {
                    foldButton.classList.remove('fold-state-unfold');
                }
            } catch (error) {
                // Silently ignore errors - fold button state update is not critical
            }
        },

        // Keyboard shortcuts
        handleKeyboardShortcuts() {
            const editor = this.editor;

            // Add custom key bindings - use Ctrl+F11 to avoid browser conflict
            editor.commands.addCommand({
                name: 'toggleFullscreen',
                bindKey: {win: 'Ctrl-F11', mac: 'Cmd-F11'},
                exec: () => this.toggleFullscreen()
            });

            // Alternative key binding - Ctrl+Shift+F
            editor.commands.addCommand({
                name: 'toggleFullscreenAlt',
                bindKey: {win: 'Ctrl-Shift-F', mac: 'Cmd-Shift-F'},
                exec: () => this.toggleFullscreen()
            });

            // Escape to exit fullscreen
            editor.commands.addCommand({
                name: 'exitFullscreen',
                bindKey: {win: 'Esc', mac: 'Esc'},
                exec: () => {
                    if (this.isFullscreen) {
                        this.toggleFullscreen();
                    }
                }
            });
        },

        // Add global escape key handler for fullscreen
        addGlobalFullscreenEscapeHandler() {
            // Store bound handler for cleanup
            this._globalEscapeHandler = (e) => {
                if (e.key === 'Escape' && this.isFullscreen) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleFullscreen();
                }
            };

            // Add to document with capture to ensure it runs before other handlers
            document.addEventListener('keydown', this._globalEscapeHandler, true);
        },

        // Initialize toolbar after editor is ready
        initToolbar() {
            if (this.hasToolbar) {
                this.handleKeyboardShortcuts();
                this.updateToolbarState();

                // Listen for selection changes to update toolbar state
                this.editor.selection.on('changeCursor', () => {
                    this.updateToolbarState();
                });

                this.editor.session.on('change', () => {
                    this.updateToolbarState();
                });

                // Listen for fold changes to invalidate fold cache (performance optimization)
                this.editor.session.on('changeFold', () => {
                    // Invalidate fold cache immediately when folds change
                    this.lastFoldState.cursorRow = -1;
                    this.lastFoldState.cursorColumn = -1;
                    this.updateToolbarState();
                });

                // Note: Undo manager doesn't have event listeners, toolbar state is updated by session and selection events

                // Also listen for focus events to update toolbar state
                this.editor.on('focus', () => {
                    this.updateToolbarState();
                });

                this.editor.on('blur', () => {
                    this.updateToolbarState();
                });
            }
        },

        // Status Bar Methods
        initStatusBar() {
            if (!this.editor) return;

            // Create status bar element
            this.createStatusBar();

            // Update initial status
            this.updateStatusBar();

            // Listen for editor events to update status
            this.editor.session.on('change', () => this.updateStatusBar());
            this.editor.selection.on('changeCursor', () => this.updateStatusBar());
            this.editor.session.on('changeMode', () => this.updateStatusBar());
        },

        createStatusBar() {
            // Find or create status bar container
            let statusBarContainer = this.$el.querySelector('.rd-ace-editor-status');

            if (!statusBarContainer) {
                statusBarContainer = document.createElement('div');
                statusBarContainer.className = 'rd-ace-editor-status';

                // Insert status bar after editor container
                const editorContainer = this.$el.closest('.rd-ace-editor');
                if (editorContainer) {
                    editorContainer.appendChild(statusBarContainer);
                }
            }

            this.statusBarElement = statusBarContainer;

            // Apply custom classes from statusBarOptions
            if (this.statusBarOptions.className) {
                statusBarContainer.className = `rd-ace-editor-status ${this.statusBarOptions.className}`;
            }

            // Define default status bar sections
            const defaultSections = {
                position: {
                    show: true,
                    content: `<div class="rd-ace-editor-status-position">
                        <span>Line: <span class="line">1</span>, Col: <span class="column">1</span></span>
                        <span class="selection"></span>
                    </div>`
                },
                info: {
                    show: true,
                    content: `<div class="rd-ace-editor-status-info">
                        <span class="mode">TEXT</span> |
                        <span class="length">0 chars</span>
                    </div>`
                }
            };

            // Merge with user-provided options
            const sections = { ...defaultSections, ...this.statusBarOptions.sections };

            // Build status bar content based on sections
            let statusBarContent = '';
            Object.entries(sections).forEach(([sectionName, sectionConfig]) => {
                if (sectionConfig.show !== false) {
                    statusBarContent += sectionConfig.content || '';
                }
            });

            statusBarContainer.innerHTML = statusBarContent;
        },

        updateStatusBar() {
            if (!this.editor || !this.statusBarElement) return;

            // Clear existing timer to prevent multiple rapid updates
            if (this.debounceTimers.statusBarUpdate) {
                clearTimeout(this.debounceTimers.statusBarUpdate);
            }

            // Debounce status bar updates to prevent performance issues during typing
            this.debounceTimers.statusBarUpdate = setTimeout(() => {
                if (this.isDestroyed || !this.statusBarElement) return;

                const position = this.editor.getCursorPosition();
                const selection = this.editor.getSelection();
                const session = this.editor.getSession();

                // Cache DOM elements to avoid repeated queries
                if (!this.statusBarElements.line) {
                    this.statusBarElements.line = this.statusBarElement.querySelector('.line');
                    this.statusBarElements.column = this.statusBarElement.querySelector('.column');
                    this.statusBarElements.selection = this.statusBarElement.querySelector('.selection');
                    this.statusBarElements.mode = this.statusBarElement.querySelector('.mode');
                    this.statusBarElements.length = this.statusBarElement.querySelector('.length');
                }

                // Update position only if changed
                const currentRow = position.row + 1;
                const currentColumn = position.column + 1;
                if (this.statusBarElements.line &&
                    this.statusBarElements.line.textContent != currentRow) {
                    this.statusBarElements.line.textContent = currentRow;
                }
                if (this.statusBarElements.column &&
                    this.statusBarElements.column.textContent != currentColumn) {
                    this.statusBarElements.column.textContent = currentColumn;
                }

                // Update selection info only if changed
                const selectionInfo = this.statusBarElements.selection;
                if (selectionInfo) {
                    let newText = '';
                    if (!selection.isEmpty()) {
                        const lines = selection.getAllRanges().length;
                        newText = ` (${lines} line${lines > 1 ? 's' : ''} selected)`;
                    }
                    if (selectionInfo.textContent !== newText) {
                        selectionInfo.textContent = newText;
                    }
                }

                // Update mode only if changed
                const modeElement = this.statusBarElements.mode;
                if (modeElement) {
                    const mode = session.getMode().$id || 'text';
                    const modeText = mode.replace('ace/mode/', '').toUpperCase();
                    if (modeElement.textContent !== modeText) {
                        modeElement.textContent = modeText;
                    }
                }

                // Update document info (throttle expensive getValue() call)
                const lengthElement = this.statusBarElements.length;
                if (lengthElement) {
                    // Only update this every few changes to improve performance
                    const currentLength = session.getLength();
                    if (this.statusBarState.lines !== currentLength) {
                        const textLength = session.getValue().length;
                        lengthElement.textContent = `${currentLength} lines, ${textLength} chars`;
                        this.statusBarState.lines = currentLength;
                    }
                }
            }, 50); // 50ms debounce - responsive but not overwhelming
        },

        destroyStatusBar() {
            if (this.statusBarElement && this.statusBarElement.parentNode) {
                this.statusBarElement.parentNode.removeChild(this.statusBarElement);
                this.statusBarElement = null;
            }
        },

        // Accessibility Methods
        initAccessibility() {
            if (!this.editor) return;

            // Initialize keyboard accessibility
            if (this.keyboardAccessibility) {
                this.initKeyboardAccessibility();
            }

            // Initialize screen reader support
            if (this.screenReaderSupport) {
                this.initScreenReaderSupport();
            }

            // Apply custom ARIA labels
            if (this.ariaLabels && Object.keys(this.ariaLabels).length > 0) {
                this.applyAriaLabels();
            }
        },

        initKeyboardAccessibility() {
            const editor = this.editor;

            // Go To Line command with Ctrl+G shortcut
            editor.commands.addCommand({
                name: 'gotoLine',
                bindKey: { win: 'Ctrl+G', mac: 'Cmd+G' },
                exec: () => {
                    this.goToLine();
                }
            });

            // Enhanced keyboard navigation
            editor.commands.addCommand({
                name: 'gotoLineStart',
                bindKey: { win: 'Home', mac: 'Home|Ctrl+A' },
                exec: () => {
                    const pos = editor.getCursorPosition();
                    editor.moveCursorTo(pos.row, 0);
                    editor.clearSelection();
                }
            });

            editor.commands.addCommand({
                name: 'gotoLineEnd',
                bindKey: { win: 'End', mac: 'End|Ctrl+E' },
                exec: () => {
                    const pos = editor.getCursorPosition();
                    const line = editor.session.getLine(pos.row);
                    editor.moveCursorTo(pos.row, line.length);
                    editor.clearSelection();
                }
            });

            editor.commands.addCommand({
                name: 'selectWord',
                bindKey: { win: 'Ctrl+Shift+Right', mac: 'Cmd+Shift+Right' },
                exec: () => {
                    editor.selection.selectWordRight();
                    editor.renderer.scrollCursorIntoView();
                }
            });

            editor.commands.addCommand({
                name: 'selectWordLeft',
                bindKey: { win: 'Ctrl+Shift+Left', mac: 'Cmd+Shift+Left' },
                exec: () => {
                    editor.selection.selectWordLeft();
                    editor.renderer.scrollCursorIntoView();
                }
            });

            // Enable keyboard focus management
            editor.on('focus', () => {
                this.announceToScreenReader('Editor focused');
            });

            editor.on('blur', () => {
                this.announceToScreenReader('Editor unfocused');
            });
        },

        initScreenReaderSupport() {
            const editor = this.editor;

            // Announce cursor position changes
            editor.selection.on('changeCursor', () => {
                const pos = editor.getCursorPosition();
                this.announceToScreenReader(`Line ${pos.row + 1}, Column ${pos.column + 1}`);
            });

            // Announce selection changes
            editor.selection.on('changeSelection', () => {
                const selection = editor.getSelection();
                if (!selection.isEmpty()) {
                    const selectedText = editor.session.getTextRange(selection.getRange());
                    this.announceToScreenReader(`Selected: ${selectedText.length} characters`);
                } else {
                    this.announceToScreenReader('Selection cleared');
                }
            });

            // Announce mode changes
            editor.session.on('changeMode', () => {
                const mode = editor.session.getMode().$id || 'text';
                this.announceToScreenReader(`Mode changed to: ${mode.replace('ace/mode/', '').toUpperCase()}`);
            });

            // Announce theme changes
            editor.on('changeTheme', () => {
                const theme = editor.getTheme() || 'textmate';
                this.announceToScreenReader(`Theme changed to: ${theme.replace('ace/theme/', '').replace(/_/g, ' ')}`);
            });
        },

        applyAriaLabels() {
            const editorElement = this.$el.querySelector('.ace_editor');
            if (!editorElement) return;

            // Apply custom ARIA labels
            Object.entries(this.ariaLabels).forEach(([element, label]) => {
                const targetElement = this.$el.querySelector(element) || editorElement;
                if (targetElement) {
                    targetElement.setAttribute('aria-label', label);
                    targetElement.setAttribute('role', targetElement.getAttribute('role') || 'region');
                }
            });

            // Ensure editor has proper ARIA attributes
            editorElement.setAttribute('role', 'application');
            editorElement.setAttribute('aria-label', this.ariaLabels.editor || 'Code editor');
            editorElement.setAttribute('aria-multiline', 'true');

            // Add ARIA attributes to textarea
            const textarea = this.$el.querySelector('.ace_text-input');
            if (textarea) {
                textarea.setAttribute('aria-label', this.ariaLabels.textarea || 'Code input area');
                textarea.setAttribute('aria-describedby', 'ace-editor-status');
            }
        },

        announceToScreenReader(message) {
            if (!this.screenReaderSupport) return;

            // Create or update screen reader announcement element
            let announcer = document.getElementById('ace-screen-reader-announcer');
            if (!announcer) {
                announcer = document.createElement('div');
                announcer.id = 'ace-screen-reader-announcer';
                announcer.setAttribute('aria-live', 'polite');
                announcer.setAttribute('aria-atomic', 'true');
                announcer.style.position = 'absolute';
                announcer.style.left = '-10000px';
                announcer.style.width = '1px';
                announcer.style.height = '1px';
                announcer.style.overflow = 'hidden';
                document.body.appendChild(announcer);
            }

            // Announce the message
            announcer.textContent = message;

            // Clear after announcement to allow repeated announcements
            setTimeout(() => {
                announcer.textContent = '';
            }, 100);
        },

        /**
         * Memory leak detection utility for development and testing
         * Helps identify memory issues during development
         */
        changeFontSize(fontSize) {
            if (!this.editor || !fontSize) return;

            // Update current font size
            this.currentFontSize = fontSize;

            // Apply font size to ACE editor
            this.editor.setOptions({
                fontSize: fontSize
            });

            // Force editor resize to apply changes immediately
            this.editor.resize();
        },

        /**
         * Change word wrap mode
         */
        changeWordWrap(wrapMode) {
            if (!this.editor || !wrapMode) return;

            // Update current word wrap mode
            this.currentWordWrap = wrapMode;

            // Get the session to configure wrap settings
            const session = this.editor.getSession();

            switch (wrapMode) {
                case 'off':
                    session.setUseWrapMode(false);
                    break;
                case 'soft':
                    session.setUseWrapMode(true);
                    session.setWrapLimitRange(null, null); // Auto-wrap based on editor width
                    break;
                case 'hard':
                    session.setUseWrapMode(true);
                    session.setWrapLimitRange(80, 80); // Hard wrap at 80 characters
                    break;
                default:
                    session.setUseWrapMode(false);
                    break;
            }

            // Force editor resize to apply changes immediately
            this.editor.resize();
        },

        /**
         * Apply overscroll configuration to ACE editor
         */
        applyOverscrollSettings() {
            if (!this.editor || !this.overscrollOptions) return;

            const defaults = {
                enabled: true,
                size: 50,
                behavior: 'auto',
                horizontal: true,
                vertical: true,
            };

            const options = { ...defaults, ...this.overscrollOptions };

            if (!options.enabled) {
                // Disable overscroll by setting size to 0
                this.editor.renderer.setScrollMargin(0, 0, 0, 0);
                return;
            }

            // Configure scroll margin based on overscroll options
            const topMargin = options.vertical ? options.size : 0;
            const rightMargin = options.horizontal ? options.size : 0;
            const bottomMargin = options.vertical ? options.size : 0;
            const leftMargin = options.horizontal ? options.size : 0;

            // Apply scroll margin for overscroll effect
            this.editor.renderer.setScrollMargin(topMargin, rightMargin, bottomMargin, leftMargin);

            // Configure additional overscroll behavior
            if (options.behavior === 'manual') {
                // For manual behavior, we might need custom scroll handling
                this.editor.session.on('changeScrollTop', () => {
                    // Custom scroll behavior can be implemented here
                });
            }

            // Set editor options related to scrolling
            const scrollOptions = {};

            if (options.behavior !== 'none') {
                scrollOptions.autoScrollEditorIntoView = true;
            }

            this.editor.setOptions(scrollOptions);
        },

      }
}
