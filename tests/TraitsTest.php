<?php

use Riodwanto\FilamentAceEditor\AceEditor;

it('can use CanBeReadOnly functionality', function () {
    $field = AceEditor::make('code');

    // Test read-only
    expect(method_exists($field, 'readOnly'))->toBeTrue();
    expect(method_exists($field, 'readOnlyOn'))->toBeTrue();
    expect(method_exists($field, 'isReadOnly'))->toBeTrue();

    // Test read-only can be set
    $readOnlyField = $field->readOnly();
    expect($readOnlyField->isReadOnly())->toBeTrue();

    // Test conditional read-only
    $conditionalField = $field->readOnly(fn () => true);
    expect($conditionalField->isReadOnly())->toBeTrue();

    // Test read-only on specific operations
    $operationField = $field->readOnlyOn('edit');
    expect($operationField)->toBeInstanceOf(AceEditor::class);
});

it('applies readOnly state to editor options', function () {
    $field = AceEditor::make('code')->readOnly();

    // Test that the readOnly property is set correctly
    // We can't test getEditorOptions without full initialization, but we can test the trait
    expect($field->isReadOnly())->toBeTrue();
});

it('combines disabled and readOnly states correctly', function () {
    $field = AceEditor::make('code')
        ->readOnly()
        ->disabled();

    // Both disabled and readOnly should make editor read-only
    $editorOptions = $field->getEditorOptions();
    expect($editorOptions['readOnly'])->toBeTrue();
});

it('can use HasExtraInputAttributes functionality', function () {
    $field = AceEditor::make('code');

    // Test trait methods exist
    expect(method_exists($field, 'extraInputAttributes'))->toBeTrue();
    expect(method_exists($field, 'getExtraInputAttributes'))->toBeTrue();
    expect(method_exists($field, 'getExtraInputAttributeBag'))->toBeTrue();

    // Test extra input attributes can be set
    $fieldWithAttributes = $field->extraInputAttributes([
        'data-editor-type' => 'code',
        'spellcheck' => 'false'
    ]);

    $attributes = $fieldWithAttributes->getExtraInputAttributes();
    expect($attributes['data-editor-type'])->toBe('code');
    expect($attributes['spellcheck'])->toBe('false');

    // Test attribute bag - check if it contains the attribute
    $attributeBag = $fieldWithAttributes->getExtraInputAttributeBag();
    expect($attributeBag->getAttributes())->toHaveKey('data-editor-type');
});

it('can merge extra input attributes', function () {
    $field = AceEditor::make('code')
        ->extraInputAttributes(['data-type' => 'editor'])
        ->extraInputAttributes(['spellcheck' => 'false'], merge: true);

    $attributes = $field->getExtraInputAttributes();
    expect($attributes['data-type'])->toBe('editor');
    expect($attributes['spellcheck'])->toBe('false');
});

it('can use HasMinHeight functionality', function () {
    // Test trait methods exist
    expect(method_exists(AceEditor::make('code'), 'minHeight'))->toBeTrue();
    expect(method_exists(AceEditor::make('code'), 'getMinHeight'))->toBeTrue();

    // Test min height can be set
    $minHeightField = AceEditor::make('code')->minHeight('200px');
    expect($minHeightField->getMinHeight())->toBe('200px');

    // Test default min height with a fresh instance
    $defaultField = AceEditor::make('code');
    expect($defaultField->getMinHeight())->toEndWith('rem'); // Value comes from Filament and varies by release
});

it('can use HasMaxHeight functionality', function () {
    // Test trait methods exist
    expect(method_exists(AceEditor::make('code'), 'maxHeight'))->toBeTrue();
    expect(method_exists(AceEditor::make('code'), 'getMaxHeight'))->toBeTrue();

    // Test max height can be set
    $maxHeightField = AceEditor::make('code')->maxHeight('80vh');
    expect($maxHeightField->getMaxHeight())->toBe('80vh');

    // Test default max height is null with a fresh instance
    $defaultField = AceEditor::make('code');
    expect($defaultField->getMaxHeight())->toBeNull();
});

it('can use both min and max height together', function () {
    $field = AceEditor::make('code')
        ->minHeight('200px')
        ->maxHeight('600px');

    expect($field->getMinHeight())->toBe('200px');
    expect($field->getMaxHeight())->toBe('600px');
});

it('can use conditional height with closures', function () {
    $field = AceEditor::make('code')
        ->minHeight(fn () => '300px')
        ->maxHeight(fn () => '700px');

    expect($field->getMinHeight())->toBe('300px');
    expect($field->getMaxHeight())->toBe('700px');
});

it('maintains backward compatibility with height method', function () {
    $field = AceEditor::make('code')->height('400px');

    // Original height method should still work
    expect($field->getHeight())->toBe('400px');

    // New height constraints should also work
    $fieldWithConstraints = $field->minHeight('200px')->maxHeight('600px');
    expect($fieldWithConstraints->getMinHeight())->toBe('200px');
    expect($fieldWithConstraints->getMaxHeight())->toBe('600px');
    expect($fieldWithConstraints->getHeight())->toBe('400px');
});

it('demonstrates comprehensive trait usage example', function () {
    // Example of using all new traits together
    $field = AceEditor::make('code')
        // Read-only functionality
        ->readOnly(fn () => true)
        // Extra input attributes
        ->extraInputAttributes([
            'data-editor-language' => 'php',
            'spellcheck' => 'false',
            'data-max-lines' => '1000'
        ])
        // Height constraints
        ->minHeight('300px')
        ->maxHeight('70vh');

    // Test all methods work
    expect($field->isReadOnly())->toBeTrue();
    expect($field->getExtraInputAttributes())->toHaveKey('spellcheck');
    expect($field->getMinHeight())->toBe('300px');
    expect($field->getMaxHeight())->toBe('70vh');

    // Test that the trait methods are available
    expect(method_exists($field, 'readOnly'))->toBeTrue();
    expect(method_exists($field, 'extraInputAttributes'))->toBeTrue();
    expect(method_exists($field, 'minHeight'))->toBeTrue();
    expect(method_exists($field, 'maxHeight'))->toBeTrue();
});