<?php

use Riodwanto\FilamentAceEditor\AceEditor;

it('can set cursor style', function () {
    $field = AceEditor::make('code')
        ->cursorStyle('smooth');

    // Test that the method exists and can be called without errors
    expect($field)->toBeInstanceOf(AceEditor::class);

    // Test that the cursorStyle property is set correctly via reflection
    $reflection = new ReflectionClass($field);
    $property = $reflection->getProperty('cursorStyle');
    $property->setAccessible(true);

    expect($property->getValue($field))->toBe('smooth');
});

it('can set different cursor styles', function () {
    $cursorStyles = ['ace', 'slim', 'smooth', 'smooth slim', 'wide'];

    foreach ($cursorStyles as $style) {
        $field = AceEditor::make('code')
            ->cursorStyle($style);

        // Test that the method exists and can be called without errors
        expect($field)->toBeInstanceOf(AceEditor::class);

        // Test that the cursorStyle property is set correctly via reflection
        $reflection = new ReflectionClass($field);
        $property = $reflection->getProperty('cursorStyle');
        $property->setAccessible(true);

        expect($property->getValue($field))->toBe($style);
    }
});

it('cursorStyle method is chainable', function () {
    $field = AceEditor::make('code')
        ->cursorStyle('smooth')
        ->height('400px');

    expect($field)->toBeInstanceOf(AceEditor::class);
});