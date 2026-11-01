<?php

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

it('lets enableCustomCompletions override addSnippets', function () {
    $field = AceEditor::make('code')
        ->addSnippets(['pgfn' => 'function $1() {}'])
        ->enableCustomCompletions(false);

    expect($field->isCustomCompletionsEnabled())->toBeFalse();
});
