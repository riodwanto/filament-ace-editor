<?php

use Riodwanto\FilamentAceEditor\AceEditor;

it('can create ace editor field with enhanced features', function () {
    $field = AceEditor::make('code');

    expect($field)->toBeInstanceOf(AceEditor::class);
});

it('can configure and use enhanced display options', function () {
    $field = AceEditor::make('code')
        ->fontSize('16px')
        ->cursorStyle('smooth')
        ->foldStyle('markbeginend')
        ->softWrapMode('free');

    expect($field->getFontSize())->toBe('16px');
    expect(callNonPublic($field, 'getCursorStyle'))->toBe('smooth');
    expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbeginend');
    expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('free');
});

it('can configure status bar', function () {
    $field = AceEditor::make('code')
        ->showStatusBar(true)
        ->statusBarOptions([
            'showPosition' => true,
            'showSelection' => true,
            'showMode' => false,
            'showTheme' => true,
            'showLength' => true
        ]);

    expect($field->isStatusBarEnabled())->toBeTrue();

    $options = $field->getStatusBarOptions();
    expect($options['enabled'])->toBeTrue();
    expect($options['showPosition'])->toBeTrue();
    expect($options['showSelection'])->toBeTrue();
    expect($options['showMode'])->toBeFalse();
    expect($options['showTheme'])->toBeTrue();
    expect($options['showLength'])->toBeTrue();
});

it('can configure extension loading', function () {
    $field = AceEditor::make('code')
        ->enableExtensionRetry()
        ->setExtensionRetryOptions(['maxRetries' => 3, 'retryDelay' => 1500])
        ->enableParallelExtensionLoading(true)
        ->setExtensionTimeout(20000)
        ->enableExtension('language_tools');

    expect($field->enableExtensionRetry())->toBe($field);
    expect($field->enableParallelExtensionLoading(true))->toBe($field);
    expect($field->setExtensionTimeout(20000))->toBe($field);

    $config = $field->getExtensionLoadingConfig();
    expect($config['retry'])->toBeTrue();
    expect($config['retryOptions']['maxRetries'])->toBe(3);
    expect($config['retryOptions']['retryDelay'])->toBe(1500);
    expect($config['parallel'])->toBeTrue();
    expect($config['timeout'])->toBe(20000);

    $extensions = $field->getEnabledExtensions();
    expect($extensions)->toHaveKey('language_tools');
});

it('can configure accessibility features', function () {
    $field = AceEditor::make('code')
        ->keyboardAccessibility(true)
        ->screenReaderSupport(true)
        ->ariaLabels([
            'editor' => 'Accessible code editor',
            'textarea' => 'Code input area'
        ]);

    expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
    expect($field->isScreenReaderSupportEnabled())->toBeTrue();

    $ariaLabels = $field->getAriaLabels();
    expect($ariaLabels['editor'])->toBe('Accessible code editor');
    expect($ariaLabels['textarea'])->toBe('Code input area');
});

it('can configure advanced features', function () {
    $field = AceEditor::make('code')
        ->advancedSearch(['enable' => true, 'highlightAllMatches' => true])
        ->codeLensOptions(['enable' => true, 'fontSize' => '12px'])
        ->advancedSnippets(['enable' => true, 'autoComplete' => true])
        ->addCommand('testCommand', ['action' => 'test', 'shortcut' => 'Ctrl+T']);

    $searchOptions = callNonPublic($field, 'getAdvancedSearchOptions');
    expect($searchOptions['enable'])->toBeTrue();
    expect($searchOptions['highlightAllMatches'])->toBeTrue();

    $codeLensOptions = callNonPublic($field, 'getCodeLensOptions');
    expect($codeLensOptions['enable'])->toBeTrue();
    expect($codeLensOptions['fontSize'])->toBe('12px');

    $snippets = callNonPublic($field, 'getAdvancedSnippets');
    expect($snippets['enable'])->toBeTrue();
    expect($snippets['autoComplete'])->toBeTrue();

    $commands = callNonPublic($field, 'getCommands');
    expect($commands)->toHaveKey('testCommand');
    expect($commands['testCommand']['action'])->toBe('test');
    expect($commands['testCommand']['shortcut'])->toBe('Ctrl+T');
});

it('can combine all enhanced features', function () {
    $field = AceEditor::make('code')
        ->fontSize('18px')
        ->cursorStyle('smooth slim')
        ->foldStyle('markbeginend')
        ->softWrapMode('margin')
        ->showStatusBar(true)
        ->statusBarOptions(['showPosition' => true, 'showTheme' => false])
        ->enableExtensionRetry()
        ->setExtensionRetryOptions(['maxRetries' => 5, 'retryDelay' => 1000])
        ->enableParallelExtensionLoading(true)
        ->setExtensionTimeout(15000)
        ->keyboardAccessibility(true)
        ->screenReaderSupport(true)
        ->ariaLabels(['editor' => 'Complete editor'])
        ->advancedSearch(['enable' => true, 'highlightAllMatches' => true])
        ->codeLensOptions(['enable' => true])
        ->advancedSnippets(['enable' => true, 'autoComplete' => true])
        ->addCommand('saveCommand', ['action' => 'save', 'shortcut' => 'Ctrl+S']);

    // Test all configurations
    expect($field->getFontSize())->toBe('18px');
    expect(callNonPublic($field, 'getCursorStyle'))->toBe('smooth slim');
    expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbeginend');
    expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('margin');

    $statusOptions = $field->getStatusBarOptions();
    expect($statusOptions['showPosition'])->toBeTrue();
    expect($statusOptions['showTheme'])->toBeFalse();

    $config = $field->getExtensionLoadingConfig();
    expect($config['retry'])->toBeTrue();
    expect($config['retryOptions']['maxRetries'])->toBe(5);
    expect($config['retryOptions']['retryDelay'])->toBe(1000);
    expect($config['parallel'])->toBeTrue();
    expect($config['timeout'])->toBe(15000);

    expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
    expect($field->isScreenReaderSupportEnabled())->toBeTrue();

    $ariaLabels = $field->getAriaLabels();
    expect($ariaLabels['editor'])->toBe('Complete editor');

    $searchOptions = callNonPublic($field, 'getAdvancedSearchOptions');
    expect($searchOptions['enable'])->toBeTrue();
    expect($searchOptions['highlightAllMatches'])->toBeTrue();

    $codeLensOptions = callNonPublic($field, 'getCodeLensOptions');
    expect($codeLensOptions['enable'])->toBeTrue();

    $snippets = callNonPublic($field, 'getAdvancedSnippets');
    expect($snippets['enable'])->toBeTrue();
    expect($snippets['autoComplete'])->toBeTrue();

    $commands = callNonPublic($field, 'getCommands');
    expect($commands)->toHaveKey('saveCommand');
    expect($commands['saveCommand']['action'])->toBe('save');
    expect($commands['saveCommand']['shortcut'])->toBe('Ctrl+S');
});

it('maintains backward compatibility', function () {
    $field = AceEditor::make('code')
        ->mode('php')
        ->theme('github')
        ->darkTheme('dracula')
        ->height('20rem')
        ->enableBasicAutocompletion(true)
        ->enableSnippets(true);

    // All existing features should still work
    expect(callNonPublic($field, 'getMode'))->toBe('ace/mode/php');
    expect(callNonPublic($field, 'getTheme'))->toBe('ace/theme/github');
    expect($field->getDarkTheme())->toBe('ace/theme/dracula');
    expect($field->getHeight())->toBe('20rem');
});
