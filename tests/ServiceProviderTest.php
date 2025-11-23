<?php

use Riodwanto\FilamentAceEditor\FilamentAceEditorServiceProvider;

it('has correct package name', function () {
    expect(FilamentAceEditorServiceProvider::$name)->toBe('filament-ace-editor');
});

it('has correct view namespace', function () {
    expect(FilamentAceEditorServiceProvider::$viewNamespace)->toBe('filament-ace-editor');
});

it('can instantiate service provider', function () {
    $provider = new class extends \Illuminate\Foundation\Application {
        public function __construct() {
            // Minimal app instance for testing
        }
    };

    $serviceProvider = new FilamentAceEditorServiceProvider($provider);
    expect($serviceProvider)->toBeInstanceOf(FilamentAceEditorServiceProvider::class);
});

it('can get asset methods exist', function () {
    $provider = new class extends \Illuminate\Foundation\Application {
        public function __construct() {}
    };

    $serviceProvider = new FilamentAceEditorServiceProvider($provider);

    // Check if our methods exist
    expect(method_exists($serviceProvider, 'getAssets'))->toBeTrue();
    expect(method_exists($serviceProvider, 'getAssetPackageName'))->toBeTrue();
    expect(method_exists($serviceProvider, 'configurePackage'))->toBeTrue();
});