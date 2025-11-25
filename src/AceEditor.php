<?php

declare(strict_types=1);

namespace Riodwanto\FilamentAceEditor;

use Closure;
use Filament\Forms\Components\Concerns\{
    CanBeReadOnly,
    HasExtraInputAttributes,
    HasMinHeight,
    HasMaxHeight,
    HasPlaceholder
};
use Filament\Forms\Components\Field;
use Riodwanto\FilamentAceEditor\Enums\{Language, Theme};
use Filament\Support\Concerns\HasExtraAlpineAttributes;
use Illuminate\Support\Collection;
use Livewire\Component;

class AceEditor extends Field
{
    use HasExtraAlpineAttributes;
    use HasPlaceholder;
    use CanBeReadOnly;
    use HasExtraInputAttributes;
    use HasMinHeight;
    use HasMaxHeight;

    /**
     * @var view-string
     */
    protected string $view = 'filament-ace-editor::components.filament-ace-editor';



    // Default toolbar buttons
    public const DEFAULT_TOOLBAR_BUTTONS = [
        'undo',
        'redo',
        'find',
        'replace',
        'goto-line',
        'toggle-comment',
        'toggle-fold',
        'show-invisibles',
        'toggle-wordwrap',
        'convert-uppercase',
        'convert-lowercase',
        'toggle-print-margin',
    ];

    protected int|Closure|null $cols = null;

    protected int|Closure|null $rows = null;

    protected bool|Closure $shouldAutosize = false;

    protected string $url = '';

    protected string $basePath = '';

    protected Collection $extensions;

    protected array $config = [];

    protected array $editorOptions = [];

    protected ?string $mode = null;

    protected ?string $theme = null;

    protected ?bool $disableDarkTheme = false;

    protected ?string $darkTheme = null;

    protected ?string $height = '40rem';

    private bool $heightExplicitlySet = true; // Treat default height as explicit

    protected string|int|Closure|null $fontSize = null;

    protected string|Closure|null $wordWrap = null;

    protected string|Closure|null $cursorStyle = null;

    protected string|Closure|null $foldStyle = null;

    protected string|Closure|null $softWrapMode = null;

    protected array|Closure|null $gutterOptions = null;

    protected bool|Closure|null $rtlSupport = null;

    protected array|Closure|null $accessibilityOptions = null;

    protected array|Closure|null $overscrollOptions = null;

    protected array|Closure|null $extensionConfigs = [];

    protected array $commands = [];



    protected array|Closure|null $advancedSearchOptions = [];

    protected array|Closure|null $codeLensOptions = [];

    protected array|Closure|null $advancedSnippets = [];

    /**
     * Enable keyboard accessibility mode
     */
    protected bool|Closure|null $keyboardAccessibility = null;

    /**
     * Enable screen reader announcements
     */
    protected bool|Closure|null $screenReaderSupport = null;

    /**
     * Custom ARIA labels for editor elements
     */
    protected array|Closure|null $ariaLabels = [];

    protected array|Closure|null $toolbarButtons = null;

    protected bool|Closure|null $showStatusBar = null;

    protected array|Closure|null $statusBarOptions = [];

    protected string|Closure|null $headerTitle = null;

    protected bool|Closure|null $showHeader = null;


    protected array $completions = [];

    protected array $snippets = [];

    protected bool $enableCustomCompletions = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->initializeConfigurations();


        $this->afterStateUpdated(function (AceEditor $component, Component $livewire): void {
            $livewire->validateOnly($component->getStatePath());
        });
    }

    protected function initializeConfigurations(): void
    {
        $this->url = rtrim(config('filament-ace-editor.base_url'), '/') . '/' . ltrim(config('filament-ace-editor.file'), '/');
        $this->basePath = config('filament-ace-editor.base_url');
        $this->extensions = collect(config('filament-ace-editor.enabled_extensions'));
        $this->config = config('filament-ace-editor.editor_config');
        $this->editorOptions = config('filament-ace-editor.editor_options');
        $this->disableDarkTheme = !config('filament-ace-editor.dark_mode.enable');
        $this->darkTheme = config('filament-ace-editor.dark_mode.theme');
    }

    public function mode(Language|string $mode): static
    {
        $aceMode = $mode instanceof Language
            ? $mode->getAceMode()
            : $mode;

        $this->mode = "ace/mode/$aceMode";
        return $this->editorOptions(['mode' => $this->mode]);
    }

    public function theme(Theme|string $theme): static
    {
        $aceTheme = $theme instanceof Theme
            ? $theme->getAceTheme()
            : "ace/theme/$theme";

        $this->theme = $aceTheme;
        return $this->editorOptions(['theme' => $this->theme]);
    }

    public function darkTheme(Theme|string $darkTheme): static
    {
        $aceTheme = $darkTheme instanceof Theme
            ? $darkTheme->getAceTheme()
            : "ace/theme/$darkTheme";

        $this->darkTheme = $aceTheme;
        return $this;
    }

    public function disableDarkTheme(): static
    {
        $this->disableDarkTheme = true;
        return $this;
    }

    public function editorOptions(array $options): static
    {
        $this->editorOptions = array_merge($this->editorOptions, $options);
        return $this;
    }

    public function editorConfig(array $config): static
    {
        $this->config = array_merge($this->config, $config);
        return $this;
    }

    public function height(string $height): static
    {
        $this->height = $height;
        $this->heightExplicitlySet = true;
        return $this;
    }

    /**
     * Add ACE editor extensions with optional callback
     *
     * @param array $exts Extensions to add
     * @param Closure|null $callback Custom logic for adding extensions
     * @return static
     */
    public function addExtensions(array $exts, ?Closure $callback = null): static
    {
        if ($callback) {
            // Use callback to add extensions
            $this->extensions = new Collection(\call_user_func($callback, $this->extensions, $exts));
        } else {
            // Add extensions and remove duplicates
            $newExtensions = Collection::make($exts);
            $this->extensions = $this->extensions->merge($newExtensions)->unique();
        }

        return $this;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    protected function getMode(): ?string
    {
        return $this->mode;
    }

    protected function getTheme(): ?string
    {
        return $this->theme;
    }

    public function getDarkTheme(): ?string
    {
        return $this->darkTheme;
    }

    public function isDisableDarkTheme(): ?bool
    {
        return $this->disableDarkTheme;
    }

    public function getHeight(): ?string
    {
        return $this->height;
    }

    /**
     * Calculate editor height based on min/max rules
     *
     * @return array CSS height values for 'height', 'min-height', 'max-height'
     */
    public function getEffectiveHeight(): array
    {
        $rawHeight = $this->evaluate($this->height);
        $minHeight = $this->getMinHeight();
        $maxHeight = $this->getMaxHeight();

        // Check if height is custom set
        $isHeightExplicitlySet = $this->heightExplicitlySet || $this->height !== '40rem';

        // Convert all heights to numbers for comparison
        $heightValue = $this->parseHeightValue($rawHeight);
        $minHeightValue = $this->parseHeightValue($minHeight);
        $maxHeightValue = $this->parseHeightValue($maxHeight);

        // Format numbers back to CSS values
        $formatCssValue = fn($value) => is_numeric($value) ? "{$value}px" : $value;

        $result = [
            'height' => null,
            'min-height' => null,
            'max-height' => null,
        ];

        // Priority: explicit height > min height > max height
        if ($isHeightExplicitlySet && $rawHeight !== null) {
            // Use min height if set height is too small
            if ($minHeight !== null && $heightValue < $minHeightValue) {
                $result['min-height'] = $formatCssValue($minHeight);
            } else {
                $result['height'] = $formatCssValue($rawHeight);
            }

            // Add max height if it fits
            $appliedHeight = ($result['height'] !== null) ? $heightValue : $minHeightValue;
            if ($maxHeight !== null && $appliedHeight < $maxHeightValue) {
                $result['max-height'] = $formatCssValue($maxHeight);
            }
        } else {
            // No explicit height, apply limits
            if ($minHeight !== null) {
                $result['min-height'] = $formatCssValue($minHeight);
            }
            if ($maxHeight !== null) {
                $result['max-height'] = $formatCssValue($maxHeight);
            }
        }

        return $result;
    }

    /**
     * Convert CSS height (rem, px, etc.) to pixel value
     *
     * @param string|null $height CSS height value
     * @return float|null Height in pixels
     */
    private function parseHeightValue(?string $height): ?float
    {
        if ($height === null) {
            return null;
        }

        // Parse height value (e.g., "16rem", "200px")
        if (preg_match('/^([\d.]+)(rem|px|em)?$/', $height, $matches)) {
            $value = (float) $matches[1];

            // Convert to pixels
            return match ($matches[2] ?? 'px') {
                'rem', 'em' => $value * 16,  // 1rem = 16px
                'px' => $value,
                default => $value,         // unknown = pixels
            };
        }

        return null;  // Invalid height format
    }

    /**
     * Get URLs for all enabled ACE extensions
     *
     * @return array Extension URLs keyed by extension name
     */
    public function getEnabledExtensions(): array
    {
        $extensionsUrls = collect(config('filament-ace-editor.extensions'));
        $enabledExtensionsKeys = $this->extensions->flip();
        $enabledExtensions = $extensionsUrls->intersectByKeys($enabledExtensionsKeys);
        return $enabledExtensions->toArray();
    }

    protected function getBasePath(): string
    {
        return $this->basePath;
    }

    public function getConfig(): array
    {
        $config = [
            'basePath' => $this->getBasePath(),
        ];

        $config = array_merge($this->config, $config);

        return $config;
    }

    public function getEditorOptions(): array
    {
        $editorOptions = [
            'readOnly' => $this->isDisabled() || $this->isReadOnly(),
        ];

        // Add cursorStyle if set
        if ($this->cursorStyle !== null) {
            $editorOptions['cursorStyle'] = $this->getCursorStyle();
        }

        $editorOptions = array_merge($this->editorOptions, $editorOptions);

        return $editorOptions;
    }

    public function autosize(bool|Closure $condition = true): static
    {
        $this->shouldAutosize = $condition;

        return $this;
    }

    public function cols(int|Closure|null $cols): static
    {
        $this->cols = $cols;

        return $this;
    }

    public function rows(int|Closure|null $rows): static
    {
        $this->rows = $rows;

        return $this;
    }

    public function getCols()
    {
        return $this->evaluate($this->cols);
    }

    public function getRows()
    {
        return $this->evaluate($this->rows);
    }

    public function shouldAutosize(): bool
    {
        return (bool) $this->evaluate($this->shouldAutosize);
    }

    // Toolbar configuration
    public function toolbarButtons(array $buttons): static
    {
        $this->toolbarButtons = $buttons;
        return $this;
    }

    public function getToolbarButtons(): array
    {
        $evaluatedButtons = $this->evaluate($this->toolbarButtons);

        // Empty toolbar = return empty array
        if ($evaluatedButtons === []) {
            return [];
        }

        // No toolbar set = use default buttons
        if ($this->toolbarButtons === null) {
            return static::DEFAULT_TOOLBAR_BUTTONS;
        }

        return (array) $evaluatedButtons;
    }
    public function enableCustomCompletions(bool|Closure $enable = true): static
    {
        $this->enableCustomCompletions = $enable;
        return $this;
    }

    public function addCompletions(array $completions): static
    {
        $this->completions = array_merge($this->completions, $completions);
        $this->enableCustomCompletions = true;
        return $this;
    }

    public function addSnippets(array $snippets): static
    {
        $this->snippets = array_merge($this->snippets, $snippets);
        return $this;
    }


    public function getCompletions(): array
    {
        return $this->completions;
    }

    public function getSnippets(): array
    {
        return $this->snippets;
    }

    public function isCustomCompletionsEnabled(): bool
    {
        return (bool) $this->evaluate($this->enableCustomCompletions);
    }


    // Enhanced editor options with better defaults
    public function enableBasicAutocompletion(bool|Closure $enable = true): static
    {
        return $this->editorOptions(['enableBasicAutocompletion' => $enable]);
    }

    public function enableLiveAutocompletion(bool|Closure $enable = true): static
    {
        return $this->editorOptions(['enableLiveAutocompletion' => $enable]);
    }

    public function enableSnippets(bool|Closure $enable = true): static
    {
        return $this->editorOptions(['enableSnippets' => $enable]);
    }

    public function showLineNumbers(bool|Closure $show = true): static
    {
        return $this->editorOptions(['showLineNumbers' => $show]);
    }

    public function showGutter(bool|Closure $show = true): static
    {
        return $this->editorOptions(['showGutter' => $show]);
    }

    public function highlightActiveLine(bool|Closure $highlight = true): static
    {
        return $this->editorOptions(['highlightActiveLine' => $highlight]);
    }

    public function wrap(string|Closure $wrap = 'free'): static
    {
        return $this->editorOptions(['wrap' => $wrap]);
    }


    public function tabSize(int|Closure $size = 4): static
    {
        return $this->editorOptions(['tabSize' => $size]);
    }

    public function useSoftTabs(bool|Closure $soft = true): static
    {
        return $this->editorOptions(['useSoftTabs' => $soft]);
    }

    // Advanced Display Options
    public function showInvisibles(bool|Closure $show = true): static
    {
        return $this->editorOptions(['showInvisibles' => $show]);
    }

    public function showPrintMargin(bool|Closure $show = true): static
    {
        return $this->editorOptions(['showPrintMargin' => $show]);
    }

    public function highlightGutterLine(bool|Closure $highlight = true): static
    {
        return $this->editorOptions(['highlightGutterLine' => $highlight]);
    }

    public function displayIndentGuides(bool|Closure $show = true): static
    {
        return $this->editorOptions(['displayIndentGuides' => $show]);
    }

    public function fadeFoldWidgets(bool|Closure $fade = true): static
    {
        return $this->editorOptions(['fadeFoldWidgets' => $fade]);
    }

    // Performance Options
    public function setMaxLines(int|Closure $lines): static
    {
        return $this->editorOptions(['maxLines' => $lines]);
    }

    public function setMinLines(int|Closure $lines): static
    {
        return $this->editorOptions(['minLines' => $lines]);
    }

    public function enableWorker(bool|Closure $enable = true): static
    {
        return $this->editorConfig(['useWorker' => $enable]);
    }

    public function setWorkerPath(string $path): static
    {
        return $this->editorConfig(['workerPath' => $path]);
    }

    // Static helper methods for getting available options
    public static function getAvailableModes(): array
    {
        // Use our Language enum for all available modes
        return Language::toArray();
    }

    public static function getAvailableLanguages(): array
    {
        return Language::toArray();
    }

    public static function getAvailableThemes(): array
    {
        return Theme::toArray();
    }

    public static function getThemesByCategory(): array
    {
        return Theme::getByCategory();
    }

    public static function getLightThemes(): array
    {
        return Theme::getLightThemes();
    }

    public static function getDarkThemes(): array
    {
        return Theme::getDarkThemes();
    }

    /**
     * Get all available toolbar button options
     *
     * @return array Button keys and labels
     */
    public static function getAvailableToolbarButtons(): array
    {
        return [
            'undo' => 'Undo',
            'redo' => 'Redo',
            'find' => 'Find',
            'replace' => 'Replace',
            'goto-line' => 'Go To Line',
            'toggle-comment' => 'Toggle Comment',
            'toggle-fold' => 'Fold/Unfold Code',
            'show-invisibles' => 'Show Invisible Characters',
            'toggle-wordwrap' => 'Toggle Word Wrap',
            'convert-uppercase' => 'Convert to Uppercase',
            'convert-lowercase' => 'Convert to Lowercase',
            'toggle-print-margin' => 'Toggle Print Margin',
        ];
    }

    /**
     * Set editor mode based on file extension
     *
     * @param string $extension File extension (e.g., 'php', 'js', 'css')
     * @return static
     */
    public function modeFromFileExtension(string $extension): static
    {
        $extension = strtolower(ltrim($extension, '.'));

        $language = Language::fromExtension($extension);

        if ($language) {
            return $this->mode($language);
        }

        return $this;
    }

    public function fontSize(string|int|Closure $size): static
    {
        $this->fontSize = $size;
        return $this->editorOptions([
            'fontSize' => $this->evaluate($size)
        ]);
    }

    /**
     * Set word wrapping behavior
     *
     * @param string|Closure $wrap Wrap mode ('off', 'free', etc.)
     * @return static
     */
    public function wordWrap(string|Closure $wrap): static
    {
        $this->wordWrap = $wrap;
        return $this;
    }

    public function cursorStyle(string|Closure $style): static
    {
        $this->cursorStyle = $style;
        return $this;
    }

    /**
     * Get all available cursor style options
     *
     * @return array Cursor style keys and descriptions
     */
    public static function getAvailableCursorStyles(): array
    {
        return [
            'ace' => 'Default ACE cursor',
            'slim' => 'Thin cursor',
            'smooth' => 'Smooth cursor',
            'smooth slim' => 'Smooth thin cursor',
            'wide' => 'Thick cursor',
        ];
    }

    public function foldStyle(string|Closure $style): static
    {
        $this->foldStyle = $style;
        return $this->editorOptions([
            'foldStyle' => $this->evaluate($style)
        ]);
    }

    // Soft wrap mode configuration
    public function softWrapMode(string|Closure $mode): static
    {
        $this->softWrapMode = $mode;
        return $this->editorOptions([
            'wrap' => $this->evaluate($mode)
        ]);
    }

    // Advanced gutter options
    public function gutterOptions(array|Closure $options): static
    {
        $this->gutterOptions = $options;
        return $this->editorOptions([
            'gutterOptions' => $this->evaluate($options)
        ]);
    }

    // RTL text support
    public function rtlSupport(bool|Closure $enable = true): static
    {
        $this->rtlSupport = $enable;
        return $this->editorOptions([
            'rtlText' => $this->evaluate($enable),
            // Also try full RTL if extension is available
            'rtl' => $this->evaluate($enable)
        ]);
    }

    // Accessibility options
    public function accessibilityOptions(array|Closure $options): static
    {
        $this->accessibilityOptions = $options;
        return $this;
    }

    /**
     * Configure overscroll behavior for the editor.
     *
     * @param array|Closure $options Common overscroll options:
     *  - enabled (bool): Whether overscroll is enabled
     *  - size (int): The size of the overscroll area
     *  - behavior (string): 'auto', 'manual', or 'none'
     *  - horizontal (bool): Enable horizontal overscroll
     *  - vertical (bool): Enable vertical overscroll
     */
    public function overscrollOptions(array|Closure $options): static
    {
        $this->overscrollOptions = $options;
        return $this;
    }

    /**
     * Enable keyboard accessibility mode for better keyboard navigation
     */
    public function keyboardAccessibility(bool|Closure $condition = true): static
    {
        $this->keyboardAccessibility = $condition;

        // Keyboard accessibility handled by JavaScript, not ACE editor
        return $this;
    }

    /**
     * Enable screen reader support with announcements
     */
    public function screenReaderSupport(bool|Closure $condition = true): static
    {
        $this->screenReaderSupport = $condition;

        // Screen reader support handled by JavaScript, not ACE editor
        return $this;
    }

    /**
     * Set custom ARIA labels for editor elements
     */
    public function ariaLabels(array|Closure $labels): static
    {
        $this->ariaLabels = $labels;

        return $this->editorOptions([
            'ariaLabels' => $this->evaluate($this->ariaLabels),
        ]);
    }

    /**
     * Get keyboard accessibility setting
     */
    public function isKeyboardAccessibilityEnabled(): bool
    {
        return $this->evaluate($this->keyboardAccessibility) ?? false;
    }

    /**
     * Get screen reader support setting
     */
    public function isScreenReaderSupportEnabled(): bool
    {
        return $this->evaluate($this->screenReaderSupport) ?? false;
    }

    /**
     * Get ARIA labels configuration
     */
    public function getAriaLabels(): array
    {
        return $this->evaluate($this->ariaLabels) ?? [];
    }

    // Status bar configuration
    public function showStatusBar(bool|Closure $show = true): static
    {
        $this->showStatusBar = $show;
        return $this;
    }

    public function statusBarOptions(array|Closure $options): static
    {
        $this->statusBarOptions = $options;
        return $this;
    }

    public function getStatusBarOptions(): array
    {
        return [
            'enabled' => $this->evaluate($this->showStatusBar),
            'showPosition' => $this->statusBarOptions['showPosition'] ?? true,
            'showSelection' => $this->statusBarOptions['showSelection'] ?? true,
            'showMode' => $this->statusBarOptions['showMode'] ?? true,
            'showTheme' => $this->statusBarOptions['showTheme'] ?? true,
            'showLength' => $this->statusBarOptions['showLength'] ?? true,
        ];
    }

    /**
     * Check if status bar is enabled
     */
    public function isStatusBarEnabled(): bool
    {
        return $this->evaluate($this->showStatusBar) ?? false;
    }

    /**
     * Show or hide the header bar
     */
    public function showHeader(bool|Closure $show = true): static
    {
        $this->showHeader = $show;
        return $this;
    }

    /**
     * Set the header title
     */
    public function headerTitle(string|Closure $title): static
    {
        $this->headerTitle = $title;
        return $this;
    }

    /**
     * Get header title
     */
    public function getHeaderTitle(): string
    {
        return $this->evaluate($this->headerTitle) ?? 'Ace Editor';
    }

    /**
     * Check if header is enabled
     */
    public function isHeaderEnabled(): bool
    {
        return $this->evaluate($this->showHeader) ?? true;
    }

    // Extension configuration management
    public function setExtensionConfig(string $extension, array $config): static
    {
        $this->extensionConfigs[$extension] = $config;
        return $this;
    }

    private function getExtensionConfigs(): array
    {
        return $this->extensionConfigs ?? [];
    }

    // Command system methods
    public function addCommand(string $name, array $config): static
    {
        $this->commands[$name] = [
            'name' => $name,
            'action' => $config['action'] ?? null,
            'shortcut' => $config['shortcut'] ?? null,
            'category' => $config['category'] ?? 'custom',
            'description' => $config['description'] ?? '',
            'icon' => $config['icon'] ?? null
        ];
        return $this;
    }

    public function registerCommands(array $commands): static
    {
        foreach ($commands as $name => $config) {
            $this->addCommand($name, $config);
        }
        return $this;
    }

    private function getCommands(): array
    {
        return $this->commands ?? [];
    }


    public function enableAllExtensions(): static
    {
        $allExtensions = array_keys(config('filament-ace-editor.extensions'));
        $this->extensions = collect($allExtensions);
        return $this;
    }

    public function enableExtension(string $extension): static
    {
        // Add extension and prevent duplicates
        $this->extensions->push($extension);
        $this->extensions = $this->extensions->unique();
        return $this;
    }

    public function disableExtension(string $extension): static
    {
        // Remove extension from the enabled list
        $this->extensions = $this->extensions->filter(fn($ext) => $ext !== $extension);
        return $this;
    }

    public function enableExtensionRetry(bool|Closure $enable = true): static
    {
        $this->editorOptions(['extensionRetry' => $this->evaluate($enable)]);
        return $this;
    }

    public function setExtensionRetryOptions(array|Closure $options): static
    {
        $this->editorOptions(['extensionRetryOptions' => $this->evaluate($options)]);
        return $this;
    }

    public function enableParallelExtensionLoading(bool|Closure $enable = true): static
    {
        $this->editorOptions(['parallelExtensionLoading' => $this->evaluate($enable)]);
        return $this;
    }

    public function setExtensionTimeout(int|Closure $timeout = 5000): static
    {
        $this->editorOptions(['extensionTimeout' => $this->evaluate($timeout)]);
        return $this;
    }

    public function getExtensionLoadingConfig(): array
    {
        return [
            'retry' => $this->editorOptions['extensionRetry'] ?? true,
            'retryOptions' => $this->editorOptions['extensionRetryOptions'] ?? [
                'maxRetries' => 3,
                'retryDelay' => 1000,
            ],
            'parallel' => $this->editorOptions['parallelExtensionLoading'] ?? true,
            'timeout' => $this->editorOptions['extensionTimeout'] ?? 5000,
        ];
    }




    // Advanced search configuration
    public function advancedSearch(array|Closure $options): static
    {
        $this->advancedSearchOptions = $options;
        return $this;
    }

    private function getAdvancedSearchOptions(): array
    {
        return $this->advancedSearchOptions ?? [];
    }

    // Code lens configuration
    public function codeLensOptions(array|Closure $options): static
    {
        $this->codeLensOptions = $options;
        return $this;
    }

    private function getCodeLensOptions(): array
    {
        return $this->codeLensOptions ?? [];
    }

    // Advanced snippets system
    public function advancedSnippets(array|Closure $snippets): static
    {
        $this->advancedSnippets = $snippets;
        return $this;
    }

    private function getAdvancedSnippets(): array
    {
        return $this->advancedSnippets ?? [];
    }

    // Enhanced getter methods for new properties
    public function getFontSize(): string|int|null
    {
        return $this->evaluate($this->fontSize);
    }

    public function getWordWrap(): string|null
    {
        return $this->evaluate($this->wordWrap) ?? 'soft';
    }

    protected function getCursorStyle(): string|null
    {
        return $this->evaluate($this->cursorStyle);
    }

    protected function getFoldStyle(): string|null
    {
        return $this->evaluate($this->foldStyle);
    }

    protected function getSoftWrapMode(): string|null
    {
        return $this->evaluate($this->softWrapMode);
    }

    protected function getGutterOptions(): array|null
    {
        return $this->evaluate($this->gutterOptions);
    }

    protected function getRtlSupport(): bool|null
    {
        return $this->evaluate($this->rtlSupport);
    }

    protected function getAccessibilityOptions(): array|null
    {
        return $this->evaluate($this->accessibilityOptions);
    }

    public function getOverscrollOptions(): array|null
    {
        return $this->evaluate($this->overscrollOptions) ?? $this->getDefaultOverscrollOptions();
    }

    /**
     * Get default overscroll configuration
     */
    protected function getDefaultOverscrollOptions(): array
    {
        return config('filament-ace-editor.overscroll', [
            'enabled' => true,
            'size' => 50,
            'behavior' => 'auto',
            'horizontal' => true,
            'vertical' => true,
        ]);
    }

}
