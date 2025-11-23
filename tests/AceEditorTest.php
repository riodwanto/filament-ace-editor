<?php

use Riodwanto\FilamentAceEditor\AceEditor;

it('can create ace editor field', function () {
    $field = AceEditor::make('code');

    expect($field)->toBeInstanceOf(AceEditor::class);
    expect($field->getName())->toBe('code');
});

it('can set programming language mode', function () {
    $field = AceEditor::make('code')->mode('php');

    expect($field->getMode())->toBe('ace/mode/php');
});

it('can set themes', function () {
    $field = AceEditor::make('code')
        ->theme('github')
        ->darkTheme('dracula');

    expect($field->getTheme())->toBe('ace/theme/github');
    expect($field->getDarkTheme())->toBe('ace/theme/dracula');
});

it('can set editor height', function () {
    $field = AceEditor::make('code')->height('20rem');

    expect($field->getHeight())->toBe('20rem');
});

it('can configure editor options', function () {
    $field = AceEditor::make('code')->editorOptions([
        'enableBasicAutocompletion' => false,
        'showPrintMargin' => true
    ]);

    // Just test that the method exists and doesn't crash
    expect(method_exists($field, 'getEditorOptions'))->toBeTrue();
});

it('has correct view path', function () {
    $field = AceEditor::make('code');

    expect($field->getView())->toBe('filament-ace-editor::components.filament-ace-editor');
});

it('can disable dark theme', function () {
    $field = AceEditor::make('code')->disableDarkTheme();

    expect($field->isDisableDarkTheme())->toBeTrue();
});

it('can configure editor config', function () {
    $field = AceEditor::make('code')->editorConfig([
        'useWorker' => true
    ]);

    $config = $field->getConfig();
    expect($config['useWorker'])->toBeTrue();
});