// Import any external JavaScript libraries from NPM here.

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
}) {
    return {
        state,
        statePath,
        placeholder,
        options,
        darkTheme,
        disableDarkTheme,
        editor: null,
        observer: null,

        init() {
            this.initializeEditor();
        },

        async initializeEditor() {
            try {
                // Load ACE editor from the specified URL
                await this.loadScript(aceUrl);

                // Load extensions
                for (const [extensionName, extensionUrl] of Object.entries(extensions)) {
                    await this.loadScript(extensionUrl);
                }

                // Apply global ACE configuration settings (like worker usage, etc.)
                Object.entries(config).forEach(([configKey, configValue]) => {
                    ace.config.set(configKey, configValue);
                });

                // Create the ACE editor instance on our DOM element
                this.editor = ace.edit(this.$refs.aceCodeEditor);
                this.editor.setOptions(options);

                // Set initial content - use provided state or default placeholder text
                this.editor.session.setValue(state || placeholder);

                // Apply the appropriate theme based on current dark/light mode
                this.applyInitialTheme();
                this.observeDarkModeChanges();

                // Keep editor state in sync with Livewire component
                this.editor.session.on('change', () => {
                    state = this.editor.getValue();
                });

            } catch (error) {
                console.error('Failed to initialize ACE editor:', error);
            }
        },

        /**
       * Dynamically loads a JavaScript file from the given URL
       * Returns a Promise that resolves when the script loads successfully
       */
        loadScript(url) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = resolve;
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
            } else if (this.editor && options.theme) {
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
            const theme = isDarkMode ? darkTheme : options.theme;
            this.editor.setTheme(theme);
        },
    }
}
