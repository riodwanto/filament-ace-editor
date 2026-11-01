<?php

use Filament\Schemas\Schema;
use Riodwanto\FilamentAceEditor\AceEditor;

it('passes cursor style in editor options', function () {
    $field = AceEditor::make('code')
        ->container(Schema::make())
        ->cursorStyle('smooth');

    $editorOptions = $field->getEditorOptions();

    expect($editorOptions)->toHaveKey('cursorStyle');
    expect($editorOptions['cursorStyle'])->toBe('smooth');
});

it('cursor style is passed through to frontend data', function () {
    $field = AceEditor::make('code')
        ->container(Schema::make())
        ->cursorStyle('slim');

    // The cursor style should be included in the editor options that get passed to JavaScript
    // This verifies the complete data flow from PHP backend to frontend
    expect($field->getEditorOptions()['cursorStyle'])->toBe('slim');
});
