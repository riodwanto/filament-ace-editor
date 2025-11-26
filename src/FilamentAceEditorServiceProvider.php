<?php

namespace Riodwanto\FilamentAceEditor;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Asset;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Facades\FilamentIcon;
use Illuminate\Filesystem\Filesystem;
use Livewire\Features\SupportTesting\Testable;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Riodwanto\FilamentAceEditor\Testing\TestsFilamentAceEditor;

class FilamentAceEditorServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-ace-editor';

    public static string $viewNamespace = 'filament-ace-editor';

    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package->name(static::$name)
            ->hasConfigFile()
            ->hasAssets()
            ->hasViews();
    }

    public function packageRegistered(): void
    {
        parent::packageRegistered();
    }

    public function packageBooted(): void
    {
        // Asset Registration
        FilamentAsset::register(
            $this->getAssets(),
            package: 'riodwanto/filament-ace-editor'
        );

        FilamentAsset::registerScriptData(
            $this->getScriptData(),
            package: 'riodwanto/filament-ace-editor'
        );

        // Icon Registration
        FilamentIcon::register($this->getIcons());

        if (app()->runningInConsole()) {
            foreach (app(Filesystem::class)->files(__DIR__ . '/../stubs/') as $file) {
                $this->publishes([
                    $file->getRealPath() => base_path("stubs/filament-ace-editor/{$file->getFilename()}"),
                ], 'filament-ace-editor-stubs');
            }
        }

        Testable::mixin(new TestsFilamentAceEditor());
    }

    protected function getAssetPackageName(): ?string
    {
        return 'riodwanto/filament-ace-editor';
    }

    protected function getAssets(): array
    {
        return [
            AlpineComponent::make('filament-ace-editor', __DIR__ . '/../resources/dist/filament-ace-editor.js'),
            Css::make('filament-ace-editor', __DIR__ . '/../resources/dist/filament-ace-editor.css'),
            // Css::make('filament-ace-editor', __DIR__ . '/../resources/css/index.css'),
        ];
    }

    /**
     * @return array<class-string>
     */
    protected function getCommands(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getIcons(): array
    {
        return [];
    }

    /**
     * @return array<string>
     */
    protected function getRoutes(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    protected function getScriptData(): array
    {
        return [];
    }
}
