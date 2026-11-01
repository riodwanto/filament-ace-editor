<?php

use Riodwanto\FilamentAceEditor\AceEditor;
use Riodwanto\FilamentAceEditor\Enums\Language;
use Riodwanto\FilamentAceEditor\Enums\Theme;

it('can configure enhanced display options', function () {
    $field = AceEditor::make('code')
        ->fontSize('18px')
        ->cursorStyle('slim')
        ->foldStyle('markbeginend')
        ->softWrapMode('40')
        ->gutterOptions(['showLineNumbers' => true, 'foldStyle' => 'markbegin'])
        ->rtlSupport(true);

    expect($field->getFontSize())->toBe('18px');
    expect(callNonPublic($field, 'getCursorStyle'))->toBe('slim');
    expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbeginend');
    expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('40');
    expect(callNonPublic($field, 'getRtlSupport'))->toBeTrue();

    $gutterOptions = callNonPublic($field, 'getGutterOptions');
    expect($gutterOptions['showLineNumbers'])->toBeTrue();
    expect($gutterOptions['foldStyle'])->toBe('markbegin');
});

it('can configure status bar with all options', function () {
    $field = AceEditor::make('code')
        ->showStatusBar(true)
        ->statusBarOptions([
            'showPosition' => true,
            'showSelection' => true,
            'showMode' => true,
            'showTheme' => true,
            'showLength' => true
        ]);

    expect($field->isStatusBarEnabled())->toBeTrue();

    $options = $field->getStatusBarOptions();
    expect($options['enabled'])->toBeTrue();
    expect($options['showPosition'])->toBeTrue();
    expect($options['showSelection'])->toBeTrue();
    expect($options['showMode'])->toBeTrue();
    expect($options['showTheme'])->toBeTrue();
    expect($options['showLength'])->toBeTrue();
});

it('can configure extension loading with retry and parallel options', function () {
    $field = AceEditor::make('code')
        ->enableExtensionRetry()
        ->setExtensionRetryOptions(['maxRetries' => 5, 'retryDelay' => 2000])
        ->enableParallelExtensionLoading(true)
        ->setExtensionTimeout(25000)
        ->enableExtension('language_tools')
        ->enableExtension('beautify');

    $config = $field->getExtensionLoadingConfig();
    expect($config['retry'])->toBeTrue();
    expect($config['retryOptions']['maxRetries'])->toBe(5);
    expect($config['retryOptions']['retryDelay'])->toBe(2000);
    expect($config['parallel'])->toBeTrue();
    expect($config['timeout'])->toBe(25000);

    $extensions = $field->getEnabledExtensions();
    expect($extensions)->toHaveKey('language_tools');
    expect($extensions)->toHaveKey('beautify');
});

it('can configure accessibility features', function () {
    $field = AceEditor::make('code')
        ->keyboardAccessibility(true)
        ->screenReaderSupport(true)
        ->ariaLabels([
            'editor' => 'Advanced code editor',
            'textarea' => 'Code input area with accessibility',
            'gutter' => 'Line numbers panel',
            'toolbar' => 'Editor toolbar'
        ])
        ->accessibilityOptions([
            'highContrastMode' => true,
            'reducedMotionMode' => false
        ]);

    expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
    expect($field->isScreenReaderSupportEnabled())->toBeTrue();

    $ariaLabels = $field->getAriaLabels();
    expect($ariaLabels['editor'])->toBe('Advanced code editor');
    expect($ariaLabels['textarea'])->toBe('Code input area with accessibility');
    expect($ariaLabels['gutter'])->toBe('Line numbers panel');
    expect($ariaLabels['toolbar'])->toBe('Editor toolbar');

    expect($field->isHighContrastEnabled())->toBeTrue();
    expect($field->isReducedMotionEnabled())->toBeFalse();
});

it('removes editor motion in reduced motion mode', function (string $style, string $expected) {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->cursorStyle($style)
        ->editorOptions(['animatedScroll' => true, 'fadeFoldWidgets' => true])
        ->accessibilityOptions(['reducedMotionMode' => true]);

    $options = $field->getEditorOptions();

    expect($options['animatedScroll'])->toBeFalse();
    expect($options['fadeFoldWidgets'])->toBeFalse();
    expect($options['cursorStyle'])->toBe($expected);
})->with([
    ['smooth', 'ace'],
    ['smooth slim', 'slim'],
    ['wide', 'wide'],
]);

it('keeps editor motion without reduced motion mode', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->cursorStyle('smooth')
        ->editorOptions(['animatedScroll' => true]);

    expect($field->getEditorOptions()['animatedScroll'])->toBeTrue();
    expect($field->getEditorOptions()['cursorStyle'])->toBe('smooth');
});

it('can configure advanced search options', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->disableExtension('searchbox')
        ->advancedSearch([
            'caseSensitive' => true,
            'highlightAllMatches' => false
        ]);

    expect($field->getAdvancedSearchOptions()['caseSensitive'])->toBeTrue();
    expect($field->isSearchEnabled())->toBeTrue();
    expect($field->getEditorOptions()['highlightSelectedWord'])->toBeFalse();
    expect($field->getEnabledExtensions())->toHaveKey('searchbox');
    expect($field->getToolbarButtons())->toContain('replace');
});

it('removes the search buttons when advancedSearch turns search off', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons(['undo', 'find', 'replace', 'redo'])
        ->advancedSearch(fn (): array => ['enable' => false]);

    expect($field->isSearchEnabled())->toBeFalse();
    expect($field->getToolbarButtons())->toBe(['undo', 'redo']);
    expect(AceEditor::make('code')->advancedSearch(['enable' => false])->getToolbarButtons())->not->toContain('replace');
});

it('leaves search alone without advancedSearch', function () {
    $field = AceEditor::make('code')->container(fieldContainer())->disableExtension('searchbox');

    expect($field->isSearchEnabled())->toBeTrue();
    expect($field->getEnabledExtensions())->not->toHaveKey('searchbox');
    expect($field->getEditorOptions())->not->toHaveKey('highlightSelectedWord');
});

it('can configure code lens options', function () {
    $lenses = [
        ['match' => '/^function /', 'title' => 'Run', 'command' => 'run'],
        ['row' => 0, 'title' => 'Fold all', 'command' => 'foldall'],
    ];

    $field = AceEditor::make('code')
        ->codeLensOptions(['fontSize' => '12px', 'lenses' => $lenses]);

    expect($field->isCodeLensEnabled())->toBeTrue();
    expect($field->getCodeLensOptions()['lenses'])->toBe($lenses);
    expect($field->getEnabledExtensions())->toHaveKey('code_lens');
});

it('skips code lens when it is off or has no lenses', function (array $options) {
    $field = AceEditor::make('code')->codeLensOptions(fn (): array => $options);

    expect($field->isCodeLensEnabled())->toBeFalse();
    expect($field->getEnabledExtensions())->not->toHaveKey('code_lens');
})->with([
    'no lenses' => [['fontSize' => '12px']],
    'turned off' => [['enable' => false, 'lenses' => [['row' => 0, 'title' => 'Run', 'command' => 'run']]]],
]);

it('can configure advanced snippets', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->addSnippets(['own' => 'own ${1:value}'])
        ->advancedSnippets([
            'autoComplete' => false,
            'customSnippets' => [
                'php_class' => 'class ${1:name} {\n\t${2:// code}\n}',
                'js_arrow' => 'const ${1:name} = (${2:args}) => ${3:// code}'
            ]
        ]);

    expect($field->getSnippets())->toHaveKeys(['own', 'php_class', 'js_arrow']);
    expect($field->isCustomCompletionsEnabled())->toBeTrue();
    expect($field->shouldShowSnippetsInPopup())->toBeFalse();
    expect($field->getEditorOptions()['enableSnippets'])->toBeTrue();
});

it('turns snippets off with advancedSnippets', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->advancedSnippets(['enable' => false]);

    expect($field->getEditorOptions()['enableSnippets'])->toBeFalse();
    expect($field->shouldShowSnippetsInPopup())->toBeFalse();
});

it('evaluates a closure given to advancedSnippets', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->advancedSnippets(fn (): array => ['customSnippets' => ['closure' => 'value']]);

    expect($field->getSnippets())->toHaveKey('closure');
    expect($field->shouldShowSnippetsInPopup())->toBeTrue();
});

it('can configure custom commands with shortcuts', function () {
    $field = AceEditor::make('code')
        ->addCommand('formatCode', [
            'action' => 'beautify',
            'shortcut' => 'Ctrl+Shift+B',
            'description' => 'Format the code',
            'category' => 'formatting',
            'icon' => 'format-icon'
        ])
        ->addCommand('save', [
            'action' => 'wire:save',
            'shortcut' => ['win' => 'Ctrl+S', 'mac' => 'Cmd+S'],
        ]);

    // There's no command palette or custom toolbar button yet to show the category and icon
    expect($field->getCommands()['formatCode'])->toBe([
        'name' => 'formatCode',
        'action' => 'beautify',
        'shortcut' => 'Ctrl+Shift+B',
        'description' => 'Format the code',
    ]);

    expect($field->getCommands()['save']['shortcut'])->toBe(['win' => 'Ctrl+S', 'mac' => 'Cmd+S']);
});

it('can register multiple commands at once', function () {
    $field = AceEditor::make('code')
        ->registerCommands([
            'findNext' => ['action' => 'editor.findNext', 'shortcut' => 'F3'],
            'findPrevious' => ['action' => 'editor.findPrevious', 'shortcut' => 'Shift+F3'],
            'comment' => ['action' => 'togglecomment', 'shortcut' => 'Ctrl+Shift+7'],
        ]);

    $commands = $field->getCommands();

    expect(array_keys($commands))->toBe(['findNext', 'findPrevious', 'comment']);
    expect($commands['findPrevious']['shortcut'])->toBe('Shift+F3');
});

it('can enable all available extensions', function () {
    $field = AceEditor::make('code')->enableAllExtensions();

    $extensions = $field->getEnabledExtensions();
    expect($extensions)->toHaveCount(25); // All available extensions

    // Check that key extensions are enabled
    expect($extensions)->toHaveKey('language_tools');
    expect($extensions)->toHaveKey('beautify');
    expect($extensions)->toHaveKey('inline_autocomplete');
    expect($extensions)->toHaveKey('error_marker');
});

it('can configure extension-specific settings', function () {
    $field = AceEditor::make('code')
        ->container(fieldContainer())
        ->enableExtension('language_tools')
        ->setExtensionConfig('language_tools', [
            'enableLiveAutocompletion' => false,
            'liveAutocompletionDelay' => 200,
        ])
        ->setExtensionConfig('beautify', [
            'lineBreaksAfterCommasInCurlyBlock' => false,
        ]);

    $options = $field->getEditorOptions();

    // Config sets enableLiveAutocompletion to true, and the field setting has to win
    expect($options['enableLiveAutocompletion'])->toBeFalse();
    expect($options['liveAutocompletionDelay'])->toBe(200);

    // Beautify reads its own options, and Ace would reject this one as an editor option
    expect($options)->not->toHaveKey('lineBreaksAfterCommasInCurlyBlock');
    expect($field->getExtensionConfigs()['beautify'])->toBe(['lineBreaksAfterCommasInCurlyBlock' => false]);
});

it('can combine all enhanced features', function () {
    $field = AceEditor::make('code')
        // Enhanced display controls
        ->fontSize('16px')
        ->cursorStyle('smooth slim')
        ->foldStyle('markbeginend')
        ->softWrapMode('margin')
        ->gutterOptions(['showLineNumbers' => true, 'showFoldWidgets' => true])
        ->rtlSupport(false)

        // Status bar configuration
        ->showStatusBar(true)
        ->statusBarOptions([
            'showPosition' => true,
            'showSelection' => true,
            'showMode' => false,
            'showTheme' => true,
            'showLength' => true
        ])

        // Extension loading configuration
        ->enableExtensionRetry()
        ->enableParallelExtensionLoading(true)
        ->setExtensionTimeout(20000)
        ->enableExtension('language_tools')
        ->setExtensionConfig('language_tools', ['enableLiveAutocompletion' => true])

        // Accessibility features
        ->keyboardAccessibility(true)
        ->screenReaderSupport(true)
        ->ariaLabels([
            'editor' => 'Advanced code editor with all features',
            'textarea' => 'Accessible code input'
        ])
        ->accessibilityOptions([])

        // Advanced features
        ->advancedSearch(['enable' => true, 'highlightAllMatches' => true])
        ->codeLensOptions(['enable' => true, 'fontSize' => '11px'])
        ->advancedSnippets(['enable' => true, 'autoComplete' => true])

        // Commands
        ->addCommand('saveAndFormat', [
            'action' => 'wire:save',
            'shortcut' => 'Ctrl+S',
            'description' => 'Save the record'
        ]);

    // Test all configurations
    expect($field->getFontSize())->toBe('16px');
    expect(callNonPublic($field, 'getCursorStyle'))->toBe('smooth slim');
    expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbeginend');
    expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('margin');
    expect(callNonPublic($field, 'getRtlSupport'))->toBeFalse();
    expect($field->isStatusBarEnabled())->toBeTrue();

    $statusOptions = $field->getStatusBarOptions();
    expect($statusOptions['showMode'])->toBeFalse();
    expect($statusOptions['showPosition'])->toBeTrue();

    expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
    expect($field->isScreenReaderSupportEnabled())->toBeTrue();

    $ariaLabels = $field->getAriaLabels();
    expect($ariaLabels['editor'])->toBe('Advanced code editor with all features');

    $extensionConfig = $field->getExtensionLoadingConfig();
    expect($extensionConfig['retry'])->toBeTrue();
    expect($extensionConfig['parallel'])->toBeTrue();

    $extensions = $field->getEnabledExtensions();
    expect($extensions)->toHaveKey('language_tools');

    $configs = callNonPublic($field, 'getExtensionConfigs');
    expect($configs['language_tools']['enableLiveAutocompletion'])->toBeTrue();

    $commands = callNonPublic($field, 'getCommands');
    expect($commands)->toHaveKey('saveAndFormat');
    expect($commands['saveAndFormat']['shortcut'])->toBe('Ctrl+S');
});
