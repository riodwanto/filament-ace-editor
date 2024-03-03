<?php

declare(strict_types=1);

namespace Riodwanto\FilamentAceEditor;

use Closure;
use Filament\Forms\Components\Concerns\HasPlaceholder;
use Filament\Forms\Components\Field;
use Filament\Support\Concerns\HasExtraAlpineAttributes;
use Illuminate\Support\Collection;
use Livewire\Component;

class AceEditor extends Field
{
    use HasExtraAlpineAttributes;
    use HasPlaceholder;

    /**
     * @var view-string
     */
    protected string $view = 'filament-ace-editor::components.filament-ace-editor';

    protected int | Closure | null $cols = null;

    protected int | Closure | null $rows = null;

    protected bool | Closure $shouldAutosize = false;

    protected string $url = '';

    protected string $basePath = '';

    protected Collection $extensions;

    protected array $config = [];

    protected array $editorOptions = [];

    protected ?string $mode = null;

    protected ?string $theme = null;

    protected ?bool $disableDarkTheme = false;

    protected ?string $darkTheme = null;

    protected ?string $height = '16rem';

    protected function setUp(): void
    {
        parent::setUp();

        $this->initializeConfigurations();

        $this->afterStateHydrated(function (AceEditor $component, string | array | null $state): void {

            if (!$state) {
                return;
            }

            $component->state($state);
        });

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

    public function mode(string $mode): static
    {
        $this->mode = "ace/mode/$mode";
        return $this->editorOptions(['mode' => $this->mode]);
    }

    public function theme(string $theme): static
    {
        $this->theme = "ace/theme/$theme";
        return $this->editorOptions(["theme" => $this->theme]);
    }

    public function darkTheme(string $darkTheme): static
    {
        $this->darkTheme = "ace/theme/$darkTheme";
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
        return $this;
    }

    /**
     * Adds extensions to the collection, optionally using a callback for custom behavior.
     *
     * @param array $exts New extensions to add.
     * @param Closure|null $callback Optional callback for custom addition logic.
     * @return static
     */
    public function addExtensions(array $exts, ?Closure $callback = null): static
    {
        if ($callback) {
            $this->extensions = new Collection(call_user_func($callback, $this->extensions, $exts));
        } else {
            $newExtensions = Collection::make($exts);
            $this->extensions = $this->extensions->merge($newExtensions)->unique();
        }

        return $this;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getMode(): ?string
    {
        return $this->mode;
    }

    public function getTheme(): ?string
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
     * Retrieves URLs for enabled extensions based on configuration.
     *
     * @return array An associative array of enabled extension URLs.
     */
    public function getEnabledExtensions(): array
    {
        $extensionsUrls = collect(config('filament-ace-editor.extensions'));
        $enabledExtensionsKeys = $this->extensions->flip();
        $enabledExtensions = $extensionsUrls->intersectByKeys($enabledExtensionsKeys);
        return $enabledExtensions->toArray();
    }

    public function getBasePath(): string
    {
        return $this->basePath;
    }

    public function getConfig(): array
    {
        $config = [
            "basePath" => $this->getBasePath(),
        ];

        $config = array_merge($this->config, $config);

        return $config;
    }

    public function getEditorOptions(): array
    {
        $editorOptions = [
            "readOnly" => $this->isDisabled(),
        ];

        $editorOptions = array_merge($this->editorOptions, $editorOptions);

        return $editorOptions;
    }

    public function autosize(bool | Closure $condition = true): static
    {
        $this->shouldAutosize = $condition;

        return $this;
    }

    public function cols(int | Closure | null $cols): static
    {
        $this->cols = $cols;

        return $this;
    }

    public function rows(int | Closure | null $rows): static
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
}
