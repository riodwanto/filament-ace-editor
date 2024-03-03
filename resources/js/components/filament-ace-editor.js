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
        async init() {
            if (!await this.importAceEditor(aceUrl)) {
                console.error("Failed to load the ACE editor core.");
                return;
            }

            if (!await this.importExtensions(extensions)) {
                console.error("Failed to load ACE editor extensions.");
            }

            this.configureAce(config);
            this.initializeEditor();
            this.applyInitialTheme();
            this.observeDarkModeChanges();
        },
        async importAceEditor(url) {
            try {
                await import(url);
                return true;
            } catch (error) {
                console.error("Error importing the ACE editor core:", error);
                return false;
            }
        },
        async importExtensions(exts) {
            try {
                const imports = Object.values(exts).map(url => import(url));
                await Promise.all(imports);
                return true;
            } catch (error) {
                console.error("Error importing ACE editor extensions:", error);
                return false;
            }
        },
        configureAce(cfg) {
            Object.entries(cfg).forEach(([key, value]) => ace.config.set(key, value));
        },
        initializeEditor() {
            this.editor = ace.edit(this.$refs.aceCodeEditor);
            this.editor.setOptions(this.options);
            this.editor.setValue(!this.state ? this.placeholder : this.state);

            this.editor.session.on('change', () => {
                this.state = this.editor.getValue();
            });
        },
        applyInitialTheme() {
            if (!this.disableDarkTheme) {
                this.setTheme();
            } else {
                this.editor.setTheme(this.options.theme);
            }
        },
        observeDarkModeChanges() {
            if (this.disableDarkTheme) return;

            const targetElement = document.querySelector('html');
            this.observer = new MutationObserver(() => this.setTheme());
            this.observer.observe(targetElement, { attributes: true, attributeFilter: ['class'] });
        },
        setTheme() {
            const isDarkMode = document.querySelector('html').classList.contains('dark');
            const theme = isDarkMode ? this.darkTheme : this.options.theme;
            if (this.editor) {
                this.editor.setTheme(theme);
            }
        },
    }
}
