<?php

use Filament\Forms\Form;
use Filament\Schemas\Schema;
use Filament\Support\Assets\Css;
use Riodwanto\FilamentAceEditor\AceEditor;
use Riodwanto\FilamentAceEditor\FilamentAceEditorServiceProvider;

$fieldView = dirname(__DIR__) . '/resources/views/components/filament-ace-editor.blade.php';
$builtCss = dirname(__DIR__) . '/resources/dist/filament-ace-editor.css';
$builtCssV3 = dirname(__DIR__) . '/resources/dist/filament-ace-editor-v3.css';

it('closes every div it opens', function () use ($fieldView) {
    $source = file_get_contents($fieldView);

    expect(substr_count($source, '</div>'))->toBe(preg_match_all('/<div\b/', $source));
});

it('hides button labels with a class the plugin ships', function () use ($fieldView, $builtCss) {
    expect(file_get_contents($fieldView))
        ->not->toContain('class="sr-only"')
        ->toContain('class="rd-ace-sr-only"');

    expect(file_get_contents($builtCss))->toContain('.rd-ace-sr-only');
});

it('keeps the fullscreen editor and its tooltips in the top layer', function () use ($fieldView, $builtCss, $builtCssV3) {
    expect(file_get_contents(dirname(__DIR__) . '/resources/dist/filament-ace-editor.js'))
        ->toContain('showPopover')
        ->toContain('hidePopover');

    expect(file_get_contents($fieldView))->toContain('appendTo: () => isFullscreen ? $root : document.body');

    foreach ([$builtCss, $builtCssV3] as $stylesheet) {
        expect(file_get_contents($stylesheet))->toMatch('/rd-ace-editor--fullscreen\{[^}]*margin:0/');
    }
});

it('ships the accessibility option classes', function () use ($fieldView, $builtCss, $builtCssV3) {
    foreach (['rd-ace-high-contrast', 'rd-ace-reduced-motion'] as $class) {
        expect(file_get_contents($fieldView))->toContain("'{$class}'");
        expect(file_get_contents($builtCss))->toContain(".{$class}");
        expect(file_get_contents($builtCssV3))->toContain(".{$class}");
    }
});

it('enables custom completions when only snippets are added', function () {
    $field = AceEditor::make('code')->addSnippets(['pgfn' => 'function $1() {}']);

    expect($field->isCustomCompletionsEnabled())->toBeTrue();
});

it('does not ship a global css reset', function () use ($builtCss, $builtCssV3) {
    foreach ([$builtCss, $builtCssV3] as $stylesheet) {
        expect(file_get_contents($stylesheet))
            ->not->toContain('button,input,optgroup,select,textarea')
            ->not->toContain('h1,h2,h3,h4,h5,h6');
    }
});

it('keeps the filament 3 stylesheet out of css layers', function () use ($builtCssV3) {
    expect(file_get_contents($builtCssV3))
        ->not->toContain('@layer components')
        ->not->toContain('@layer utilities')
        ->not->toContain('@layer base');
});

it('defines the theme values the filament 3 stylesheet uses', function () use ($builtCssV3) {
    $css = file_get_contents($builtCssV3);

    preg_match_all('/var\((--[\w-]+)/', $css, $used);
    preg_match_all('/(--[\w-]+)\s*:/', $css, $defined);

    // Tailwind gives these two a fallback, and the other four are also undefined on Filament 4
    $known = ['--tw-leading', '--tracking-wide', '--border', '--foreground', '--primary', '--ring'];

    expect(array_values(array_diff(array_unique($used[1]), $defined[1], $known)))->toBe([]);
});

it('loads the stylesheet for the installed filament version', function () {
    $stylesheet = collect(callNonPublic(new FilamentAceEditorServiceProvider(app()), 'getAssets'))
        ->first(fn ($asset): bool => $asset instanceof Css)
        ->getPath();

    expect($stylesheet)->toEndWith(class_exists(Schema::class) ? '/filament-ace-editor.css' : '/filament-ace-editor-v3.css');
});

it('declares the filament versions it supports', function () {
    $composer = json_decode(file_get_contents(dirname(__DIR__) . '/composer.json'), true);

    expect($composer['require']['filament/filament'])->toContain('^3.3')->toContain('^4.0');
});

it('only calls existing methods in the readme', function () {
    preg_match_all('/->(\w+)\(/', file_get_contents(dirname(__DIR__) . '/README.md'), $calls);

    $missing = array_filter(
        array_unique($calls[1]),
        fn (string $method): bool => ! method_exists(AceEditor::class, $method)
            && ! method_exists(Schema::class, $method)
            && ! method_exists(Form::class, $method),
    );

    expect(array_values($missing))->toBe([]);
});

it('lets enableCustomCompletions override addSnippets', function () {
    $field = AceEditor::make('code')
        ->addSnippets(['pgfn' => 'function $1() {}'])
        ->enableCustomCompletions(false);

    expect($field->isCustomCompletionsEnabled())->toBeFalse();
});
