<?php

use Filament\Schemas\Schema;
use Riodwanto\FilamentAceEditor\AceEditor;

$fieldView = dirname(__DIR__) . '/resources/views/components/filament-ace-editor.blade.php';
$builtCss = dirname(__DIR__) . '/resources/dist/filament-ace-editor.css';

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

it('enables custom completions when only snippets are added', function () {
    $field = AceEditor::make('code')->addSnippets(['pgfn' => 'function $1() {}']);

    expect($field->isCustomCompletionsEnabled())->toBeTrue();
});

it('does not ship a global css reset', function () use ($builtCss) {
    expect(file_get_contents($builtCss))
        ->not->toContain('button,input,optgroup,select,textarea')
        ->not->toContain('h1,h2,h3,h4,h5,h6');
});

it('declares the filament version it supports', function () {
    $composer = json_decode(file_get_contents(dirname(__DIR__) . '/composer.json'), true);

    expect($composer['require'])->toHaveKey('filament/filament');
});

it('only calls existing methods in the readme', function () {
    preg_match_all('/->(\w+)\(/', file_get_contents(dirname(__DIR__) . '/README.md'), $calls);

    $missing = array_filter(
        array_unique($calls[1]),
        fn (string $method): bool => ! method_exists(AceEditor::class, $method) && ! method_exists(Schema::class, $method),
    );

    expect(array_values($missing))->toBe([]);
});

it('lets enableCustomCompletions override addSnippets', function () {
    $field = AceEditor::make('code')
        ->addSnippets(['pgfn' => 'function $1() {}'])
        ->enableCustomCompletions(false);

    expect($field->isCustomCompletionsEnabled())->toBeFalse();
});
