<?php

use Riodwanto\FilamentAceEditor\AceEditor;

it('can configure custom toolbar buttons', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons(['undo', 'redo', 'replace']);

    expect($field->getToolbarButtons())->toBe(['undo', 'redo', 'replace']);
});

it('uses default toolbar buttons when none specified', function () {
    $field = AceEditor::make('code');

    expect($field->getToolbarButtons())->toBe(AceEditor::DEFAULT_TOOLBAR_BUTTONS);
});

it('can disable toolbar by passing empty array', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons([]);

    expect($field->getToolbarButtons())->toBe([]);
});

it('provides available toolbar buttons with labels', function () {
    $buttons = AceEditor::getAvailableToolbarButtons();

    expect($buttons)->toBeArray();
    expect($buttons['undo'])->toBe('Undo');
    expect($buttons['redo'])->toBe('Redo');
    expect($buttons['replace'])->toBe('Replace');
    expect($buttons['goto-line'])->toBe('Go To Line');
    expect($buttons['toggle-comment'])->toBe('Toggle Comment');
    expect($buttons['toggle-fold'])->toBe('Fold/Unfold Code');
    expect($buttons['show-invisibles'])->toBe('Show Invisible Characters');
    expect($buttons['toggle-wordwrap'])->toBe('Toggle Word Wrap');
    expect($buttons['convert-uppercase'])->toBe('Convert to Uppercase');
    expect($buttons['convert-lowercase'])->toBe('Convert to Lowercase');
    expect($buttons['toggle-print-margin'])->toBe('Toggle Print Margin');
});

it('default toolbar buttons include essential functionality', function () {
    $defaultButtons = AceEditor::DEFAULT_TOOLBAR_BUTTONS;

    expect($defaultButtons)->toContain('undo', 'redo', 'replace');
    expect($defaultButtons)->toContain('toggle-comment');
});

it('toolbar buttons configuration accepts valid buttons', function () {
    $validButtons = ['undo', 'redo', 'replace', 'toggle-comment'];
    $field = AceEditor::make('code')
        ->toolbarButtons($validButtons);

    expect($field->getToolbarButtons())->toBe($validButtons);
});

it('toolbar configuration is chainable', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons(['undo', 'redo']);

    expect($field->getToolbarButtons())->toBe(['undo', 'redo']);
});

it('toolbar can be combined with other editor features', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons(['replace'])
        ->height('400px');

    expect($field->getToolbarButtons())->toBe(['replace']);
    expect($field->getHeight())->toBe('400px');
});

it('supports all available toolbar button types', function () {
    $allButtons = [
        'undo', 'redo', 'replace', 'selectall',
        'toggle-comment', 'fullscreen',
        'toggle-fold', 'show-invisibles', 'toggle-wordwrap'
    ];

    $field = AceEditor::make('code')
        ->toolbarButtons($allButtons);

    expect($field->getToolbarButtons())->toBe($allButtons);
});

it('toolbar buttons can be customized for different use cases', function () {
    // Minimal toolbar for simple editing
    $minimalField = AceEditor::make('simple_code')
        ->toolbarButtons(['undo', 'redo']);

    // Code review toolbar with replace (find functionality)
    $reviewField = AceEditor::make('review_code')
        ->toolbarButtons(['replace', 'toggle-comment', 'toggle-fold']);

    // Full-featured toolbar
    $fullField = AceEditor::make('full_editor')
        ->toolbarButtons(AceEditor::DEFAULT_TOOLBAR_BUTTONS);

    expect($minimalField->getToolbarButtons())->toHaveCount(2);
    expect($reviewField->getToolbarButtons())->toHaveCount(3);
    expect($fullField->getToolbarButtons())->toHaveCount(count(AceEditor::DEFAULT_TOOLBAR_BUTTONS));
});

it('toolbar configuration works with reactive forms', function () {
    // Test that the method accepts closures without causing errors
    expect(function () {
        AceEditor::make('code')
            ->toolbarButtons(fn () => ['replace']);
    })->not->toThrow(Exception::class);
});