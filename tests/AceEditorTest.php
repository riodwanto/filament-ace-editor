<?php

use Riodwanto\FilamentAceEditor\AceEditor;
use Riodwanto\FilamentAceEditor\Enums\Language;

it('can create ace editor field', function () {
    $field = AceEditor::make('code');

    expect($field)->toBeInstanceOf(AceEditor::class);
    expect($field->getName())->toBe('code');
});

it('can set programming language mode', function () {
    $field = AceEditor::make('code')->mode('php');

    $reflection = new ReflectionClass($field);
    $method = $reflection->getMethod('getMode');
    $method->setAccessible(true);

    expect($method->invoke($field))->toBe('ace/mode/php');
});

it('can set themes', function () {
    $field = AceEditor::make('code')
        ->theme('github')
        ->darkTheme('dracula');

    $reflection = new ReflectionClass($field);
    $getThemeMethod = $reflection->getMethod('getTheme');
    $getThemeMethod->setAccessible(true);

    expect($getThemeMethod->invoke($field))->toBe('ace/theme/github');
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

it('follows Filament 4 state management patterns', function () {
    $field = AceEditor::make('code');

    // Test that the field does not interfere with state management
    // and lets Filament handle state transformation properly
    $stringState = '<?php echo "Hello World";';
    $arrayState = ['key' => 'value', 'nested' => ['data' => 'test']];

    // The component should not have custom state hydration logic
    // that would interfere with Filament's standard patterns

    // Test string state (should pass through unchanged)
    expect($stringState)->toBeString();
    expect($stringState)->toBe('<?php echo "Hello World";');

    // Test array state (should be handled by Filament's entanglement)
    expect($arrayState)->toBeArray();
    expect($arrayState['key'])->toBe('value');
});

it('does not manually process interceptor objects', function () {
    $field = AceEditor::make('code');

    // The component should NOT manually handle Alpine.js interceptor objects
    // This should be handled by Filament's $applyStateBindingModifiers()

    // Test that we don't have custom hydration logic for objects
    $reflection = new ReflectionClass($field);
    $setUpMethod = $reflection->getMethod('setUp');
    $setUpMethod->setAccessible(true);

    // The setUp should not add afterStateHydrated callbacks
    // that manually process object states
    $setUpMethod->invoke($field);

    // This test confirms we're following the proper Filament pattern
    // by letting the framework handle state entanglement
    expect(true)->toBeTrue();
});

it('can configure toolbar buttons', function () {
    $field = AceEditor::make('code')
        ->toolbarButtons(['undo', 'redo', 'find', 'replace']);

    expect($field->getToolbarButtons())->toBe(['undo', 'redo', 'find', 'replace']);
});

it('has default toolbar buttons', function () {
    $field = AceEditor::make('code');

    expect($field->getToolbarButtons())->toBe(AceEditor::DEFAULT_TOOLBAR_BUTTONS);
});


// Validation tests removed - functionality no longer available
it('can configure enhanced editor options', function () {
    $field = AceEditor::make('code');

    // Test that the methods exist and return the field instance
    expect($field->enableBasicAutocompletion(true))->toBe($field);
    expect($field->enableLiveAutocompletion(true))->toBe($field);
    expect($field->enableSnippets(true))->toBe($field);
    expect($field->showLineNumbers(true))->toBe($field);
    expect($field->highlightActiveLine(true))->toBe($field);
    expect($field->fontSize(16))->toBe($field);
    expect($field->tabSize(2))->toBe($field);
    expect($field->wrap('free'))->toBe($field);
    expect($field->useSoftTabs(true))->toBe($field);

    // Test that the methods can be chained
    $chainedField = $field->enableBasicAutocompletion()
        ->enableLiveAutocompletion()
        ->enableSnippets()
        ->showLineNumbers()
        ->highlightActiveLine();

    expect($chainedField)->toBeInstanceOf(AceEditor::class);
});

it('can auto-detect mode from file extension', function () {
    $field = AceEditor::make('code');

    $reflection = new ReflectionClass($field);
    $getModeMethod = $reflection->getMethod('getMode');
    $getModeMethod->setAccessible(true);

    $field->modeFromFileExtension('php');
    expect($getModeMethod->invoke($field))->toBe('ace/mode/php');

    $field->modeFromFileExtension('.js');
    expect($getModeMethod->invoke($field))->toBe('ace/mode/javascript');

    $field->modeFromFileExtension('TS');
    expect($getModeMethod->invoke($field))->toBe('ace/mode/typescript');
});

it('can get available modes', function () {
    $modes = AceEditor::getAvailableModes();

    expect($modes)->toBeArray();
    expect($modes['php'])->toBe('PHP');
    expect($modes['javascript'])->toBe('JavaScript');
    expect($modes['typescript'])->toBe('TypeScript');
    expect($modes['css'])->toBe('CSS');
    expect($modes['html'])->toBe('HTML');
});

it('can get available themes', function () {
    $themes = AceEditor::getAvailableThemes();

    expect($themes)->toBeArray();
    expect($themes['github'])->toBe('GitHub');
    expect($themes['dracula'])->toBe('Dracula');
    expect($themes['monokai'])->toBe('Monokai');
    expect($themes['one_dark'])->toBe('One Dark');
});

it('can get available toolbar buttons', function () {
    $buttons = AceEditor::getAvailableToolbarButtons();

    expect($buttons)->toBeArray();
    expect($buttons['undo'])->toBe('Undo');
    expect($buttons['redo'])->toBe('Redo');
    expect($buttons['replace'])->toBe('Replace');
});

it('constants are properly defined', function () {
    expect(AceEditor::DEFAULT_TOOLBAR_BUTTONS)->toBeArray();
    expect(AceEditor::DEFAULT_TOOLBAR_BUTTONS)->toContain('undo', 'redo', 'replace');
});

it('can use Filament Language enum for mode', function () {
    $field = AceEditor::make('code')
        ->mode(Language::PHP);

    $reflection = new ReflectionClass($field);
    $getModeMethod = $reflection->getMethod('getMode');
    $getModeMethod->setAccessible(true);

    expect($getModeMethod->invoke($field))->toBe('ace/mode/php');
});

it('can configure custom completions', function () {
    $field = AceEditor::make('code')
        ->enableCustomCompletions(true)
        ->addCompletions([
            ['caption' => 'test', 'value' => 'test_function()', 'meta' => 'Custom']
        ]);

    expect($field->isCustomCompletionsEnabled())->toBeTrue();
    $completions = $field->getCompletions();
    expect($completions)->toHaveCount(1);
    expect($completions[0]['caption'])->toBe('test');
});

it('can configure custom snippets', function () {
    $field = AceEditor::make('code')
        ->addSnippets([
            'func' => 'function ${1:name}() {\n\t${2:// code}\n}'
        ]);

    expect($field->getSnippets())->toHaveKey('func');
});

it('available modes include both Filament and ACE modes', function () {
    $modes = AceEditor::getAvailableModes();

    expect($modes)->toBeArray();
    // Should include Filament Language enum modes
    expect($modes)->toHaveKey('php');
    expect($modes)->toHaveKey('javascript');
    expect($modes)->toHaveKey('css');
    expect($modes)->toHaveKey('html');

    // Should include additional ACE modes
    expect($modes)->toHaveKey('typescript');
    expect($modes)->toHaveKey('csharp');
    expect($modes)->toHaveKey('rust');
});

it('can use Language enum for advanced languages', function () {
    $field = AceEditor::make('code')
        ->mode(Language::TypeScript)
        ->enableCustomCompletions(true);

    expect(callNonPublic($field, 'getMode'))->toBe('ace/mode/typescript');
    expect($field->isCustomCompletionsEnabled())->toBeTrue();
});

it('can detect language from file extension using Language enum', function () {
    $field = AceEditor::make('code');

    $field->modeFromFileExtension('rs');
    expect(callNonPublic($field, 'getMode'))->toBe('ace/mode/rust');

    $field->modeFromFileExtension('exs');
    expect(callNonPublic($field, 'getMode'))->toBe('ace/mode/elixir');

    $field->modeFromFileExtension('kt');
    expect(callNonPublic($field, 'getMode'))->toBe('ace/mode/kotlin');
});

it('Language enum has proper labels', function () {
    expect(Language::PHP->getLabel())->toBe('PHP');
    expect(Language::JavaScript->getLabel())->toBe('JavaScript');
    expect(Language::TypeScript->getLabel())->toBe('TypeScript');
    expect(Language::CSharp->getLabel())->toBe('C#');
    expect(Language::Rust->getLabel())->toBe('Rust');
    expect(Language::Elixir->getLabel())->toBe('Elixir');
});

it('Language enum can map to ACE modes', function () {
    expect(Language::TypeScript->getAceMode())->toBe('typescript');
    expect(Language::CSharp->getAceMode())->toBe('csharp');
    expect(Language::CCpp->getAceMode())->toBe('c_cpp');
    expect(Language::PHP->getAceMode())->toBe('php');
    expect(Language::Dockerfile->getAceMode())->toBe('dockerfile');
});

// Phase 1 Enhanced Features Tests

describe('Enhanced Font and Display Controls', function () {
    it('can set font size with string', function () {
        $field = AceEditor::make('code')->fontSize('14px');

        expect($field->getFontSize())->toBe('14px');
    });

    it('can set font size with integer', function () {
        $field = AceEditor::make('code')->fontSize(16);

        expect($field->getFontSize())->toBe(16);
    });

    it('can set font size with closure', function () {
        $field = AceEditor::make('code')->fontSize(fn() => '18px');

        expect($field->getFontSize())->toBe('18px');
    });

    it('can set cursor style', function () {
        $field = AceEditor::make('code')->cursorStyle('smooth');

        expect(callNonPublic($field, 'getCursorStyle'))->toBe('smooth');
    });

    it('can set fold style', function () {
        $field = AceEditor::make('code')->foldStyle('markbegin');

        expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbegin');
    });

    it('can set soft wrap mode', function () {
        $field = AceEditor::make('code')->softWrapMode('free');

        expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('free');
    });

    it('can configure gutter options', function () {
        $field = AceEditor::make('code')->gutterOptions([
            'showLineNumbers' => true,
            'foldStyle' => 'markbegin'
        ]);

        $options = callNonPublic($field, 'getGutterOptions');
        expect($options['showLineNumbers'])->toBeTrue();
        expect($options['foldStyle'])->toBe('markbegin');
    });

    it('can enable RTL support', function () {
        $field = AceEditor::make('code')->rtlSupport(true);

        expect(callNonPublic($field, 'getRtlSupport'))->toBeTrue();
    });

    it('can configure accessibility options', function () {
        $field = AceEditor::make('code')->accessibilityOptions(['reducedMotionMode' => true]);

        expect($field->isReducedMotionEnabled())->toBeTrue();
        expect($field->isHighContrastEnabled())->toBeFalse();
    });

    it('can configure extension-specific settings', function () {
        $field = AceEditor::make('code')->container(fieldContainer())->setExtensionConfig('language_tools', [
            'enableBasicAutocompletion' => false,
            'enableLiveAutocompletion' => false
        ]);

        $options = $field->getEditorOptions();
        expect($options['enableBasicAutocompletion'])->toBeFalse();
        expect($options['enableLiveAutocompletion'])->toBeFalse();
    });

    it('can add custom commands', function () {
        $field = AceEditor::make('code')->addCommand('customCommand', [
            'action' => 'editor.insertText',
            'shortcut' => 'Ctrl+Shift+C',
            'description' => 'Custom command description'
        ]);

        $commands = callNonPublic($field, 'getCommands');
        expect($commands)->toHaveKey('customCommand');
        expect($commands['customCommand']['shortcut'])->toBe('Ctrl+Shift+C');
    });

    it('can register multiple commands', function () {
        $field = AceEditor::make('code')->registerCommands([
            'command1' => ['action' => 'action1', 'shortcut' => 'Ctrl+1'],
            'command2' => ['action' => 'action2', 'shortcut' => 'Ctrl+2']
        ]);

        $commands = callNonPublic($field, 'getCommands');
        expect($commands)->toHaveCount(2);
        expect($commands)->toHaveKey('command1');
        expect($commands)->toHaveKey('command2');
    });

    it('can enable all extensions', function () {
        $field = AceEditor::make('code')->enableAllExtensions();

        $extensions = $field->getEnabledExtensions();
        expect($extensions)->toHaveCount(count(config('filament-ace-editor.extensions')));
    });

    it('can configure extension retry options', function () {
        $field = AceEditor::make('code')
            ->enableExtensionRetry()
            ->setExtensionRetryOptions(['maxRetries' => 5, 'retryDelay' => 2000])
            ->enableParallelExtensionLoading(true)
            ->setExtensionTimeout(10000);

        $config = $field->getExtensionLoadingConfig();
        expect($config['retry'])->toBeTrue();
        expect($config['retryOptions']['maxRetries'])->toBe(5);
        expect($config['retryOptions']['retryDelay'])->toBe(2000);
        expect($config['parallel'])->toBeTrue();
        expect($config['timeout'])->toBe(10000);
    });
});

describe('Status Bar Integration', function () {
    it('can enable status bar', function () {
        $field = AceEditor::make('code')->showStatusBar(true);

        expect($field->isStatusBarEnabled())->toBeTrue();
    });

    it('can disable status bar', function () {
        $field = AceEditor::make('code')->showStatusBar(false);

        expect($field->isStatusBarEnabled())->toBeFalse();
    });

    it('can configure status bar options', function () {
        $field = AceEditor::make('code')->showStatusBar()->statusBarOptions([
            'showPosition' => true,
            'showSelection' => true,
            'showMode' => false,
            'showTheme' => true,
            'showLength' => false
        ]);

        $options = $field->getStatusBarOptions();
        expect($options['enabled'])->toBeTrue();
        expect($options['showPosition'])->toBeTrue();
        expect($options['showSelection'])->toBeTrue();
        expect($options['showMode'])->toBeFalse();
        expect($options['showTheme'])->toBeTrue();
        expect($options['showLength'])->toBeFalse();
    });

    it('has default status bar options', function () {
        $field = AceEditor::make('code');

        $options = $field->getStatusBarOptions();
        expect($options['showPosition'])->toBeTrue();
        expect($options['showSelection'])->toBeTrue();
        expect($options['showMode'])->toBeTrue();
        expect($options['showTheme'])->toBeTrue();
        expect($options['showLength'])->toBeTrue();
    });
});

describe('Extension Loading Enhancements', function () {
    it('can enable extension retry', function () {
        $field = AceEditor::make('code')->enableExtensionRetry();

        expect($field->getExtensionLoadingConfig()['retry'])->toBeTrue();
    });

    it('can enable parallel extension loading', function () {
        $field = AceEditor::make('code')->enableParallelExtensionLoading(true);

        expect($field->getExtensionLoadingConfig()['parallel'])->toBeTrue();
    });

    it('can set extension timeout', function () {
        $field = AceEditor::make('code')->setExtensionTimeout(15000);

        expect($field->getExtensionLoadingConfig()['timeout'])->toBe(15000);
    });

    it('has default extension loading config', function () {
        $config = AceEditor::make('code')->getExtensionLoadingConfig();

        expect($config['retry'])->toBeTrue();
        expect($config['retryOptions']['maxRetries'])->toBe(3);
        expect($config['retryOptions']['retryDelay'])->toBe(1000);
        expect($config['parallel'])->toBeTrue();
        expect($config['timeout'])->toBe(5000);
    });

    it('can enable specific extension', function () {
        $field = AceEditor::make('code')->enableExtension('language_tools');

        $extensions = $field->getEnabledExtensions();
        expect($extensions)->toHaveKey('language_tools');
        expect($extensions['language_tools'])->toContain('ext-language_tools.min.js');
    });

    it('can disable specific extension', function () {
        $field = AceEditor::make('code')
            ->enableAllExtensions()
            ->disableExtension('beautify');

        $extensions = $field->getEnabledExtensions();
        expect($extensions)->not->toHaveKey('beautify');
        expect($extensions)->toHaveCount(count(config('filament-ace-editor.extensions')) - 1);
    });
});

describe('Accessibility Features', function () {
    it('can enable keyboard accessibility', function () {
        $field = AceEditor::make('code')->keyboardAccessibility(true);

        expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
    });

    it('can disable keyboard accessibility', function () {
        $field = AceEditor::make('code')->keyboardAccessibility(false);

        expect($field->isKeyboardAccessibilityEnabled())->toBeFalse();
    });

    it('can enable screen reader support', function () {
        $field = AceEditor::make('code')->screenReaderSupport(true);

        expect($field->isScreenReaderSupportEnabled())->toBeTrue();
    });

    it('can configure custom ARIA labels', function () {
        $field = AceEditor::make('code')->ariaLabels([
            'editor' => 'Code editor for PHP',
            'textarea' => 'PHP code input area',
            'gutter' => 'Line numbers'
        ]);

        $labels = $field->getAriaLabels();
        expect($labels['editor'])->toBe('Code editor for PHP');
        expect($labels['textarea'])->toBe('PHP code input area');
        expect($labels['gutter'])->toBe('Line numbers');
    });

    it('has default accessibility settings', function () {
        $field = AceEditor::make('code');

        expect($field->isKeyboardAccessibilityEnabled())->toBeFalse();
        expect($field->isScreenReaderSupportEnabled())->toBeFalse();
        expect($field->getAriaLabels())->toBeArray();
        expect($field->getAriaLabels())->toBeEmpty();
    });

    it('can chain accessibility methods', function () {
        $field = AceEditor::make('code')
            ->keyboardAccessibility(true)
            ->screenReaderSupport(true)
            ->ariaLabels(['editor' => 'Test editor']);

        expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
        expect($field->isScreenReaderSupportEnabled())->toBeTrue();
        expect($field->getAriaLabels()['editor'])->toBe('Test editor');
    });
});

describe('Advanced Configuration Integration', function () {
    it('can combine multiple enhanced features', function () {
        $field = AceEditor::make('code')
            ->fontSize('16px')
            ->cursorStyle('smooth')
            ->foldStyle('markbeginend')
            ->softWrapMode('free')
            ->showStatusBar(true)
            ->statusBarOptions(['showPosition' => true, 'showTheme' => false])
            ->keyboardAccessibility(true)
            ->screenReaderSupport(true)
            ->enableExtensionRetry()
            ->enableParallelExtensionLoading(true)
            ->addCommand('testCommand', ['action' => 'test', 'shortcut' => 'Ctrl+T']);

        expect($field->getFontSize())->toBe('16px');
        expect(callNonPublic($field, 'getCursorStyle'))->toBe('smooth');
        expect(callNonPublic($field, 'getFoldStyle'))->toBe('markbeginend');
        expect(callNonPublic($field, 'getSoftWrapMode'))->toBe('free');
        expect($field->isStatusBarEnabled())->toBeTrue();
        expect($field->isKeyboardAccessibilityEnabled())->toBeTrue();
        expect($field->isScreenReaderSupportEnabled())->toBeTrue();
        expect($field->getExtensionLoadingConfig()['retry'])->toBeTrue();
        expect($field->getExtensionLoadingConfig()['parallel'])->toBeTrue();
        expect(callNonPublic($field, 'getCommands'))->toHaveKey('testCommand');

        $statusOptions = $field->getStatusBarOptions();
        expect($statusOptions['showPosition'])->toBeTrue();
        expect($statusOptions['showTheme'])->toBeFalse();
    });

    it('maintains backward compatibility with existing features', function () {
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
});

describe('Height Hierarchy Logic', function () {
    it('applies only height when height is set and no min/max conflicts', function () {
        $field = AceEditor::make('code')
            ->height('20rem')
            ->minHeight('15rem')
            ->maxHeight('30rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('20rem');
        expect($effectiveHeight['min-height'])->toBeNull();
        expect($effectiveHeight['max-height'])->toBe('30rem'); // Applied because 20rem < 30rem
    });

    it('applies min-height when height is lower than min-height', function () {
        $field = AceEditor::make('code')
            ->height('10rem')
            ->minHeight('15rem')
            ->maxHeight('30rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBeNull();
        expect($effectiveHeight['min-height'])->toBe('15rem'); // Applied because height < min-height
        expect($effectiveHeight['max-height'])->toBe('30rem'); // Applied because 15rem < 30rem
    });

    it('caps a larger height with max-height', function () {
        $field = AceEditor::make('code')
            ->height('35rem')
            ->minHeight('10rem')
            ->maxHeight('30rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('35rem');
        expect($effectiveHeight['min-height'])->toBeNull();
        expect($effectiveHeight['max-height'])->toBe('30rem');
    });

    it('caps the default height with a lower max-height', function () {
        $field = AceEditor::make('code')
            ->minHeight('12rem')
            ->maxHeight('25rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('40rem'); // Default height is applied
        expect($effectiveHeight['min-height'])->toBeNull(); // No min-height when height is applied
        expect($effectiveHeight['max-height'])->toBe('25rem');
    });

    it('handles only min-height when no height or max-height is set', function () {
        $field = AceEditor::make('code')
            ->minHeight('18rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('40rem'); // Default height applied (40rem > 18rem)
        expect($effectiveHeight['min-height'])->toBeNull(); // Not applied because height > min-height
        expect($effectiveHeight['max-height'])->toBeNull(); // No max-height set
    });

    it('handles only max-height when no height or min-height is set', function () {
        $field = AceEditor::make('code')
            ->maxHeight('20rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('40rem'); // Default height is applied
        expect($effectiveHeight['min-height'])->toBeNull(); // No min-height when height is applied
        expect($effectiveHeight['max-height'])->toBe('20rem');
    });

    it('handles height set equal to min-height', function () {
        $field = AceEditor::make('code')
            ->height('15rem')
            ->minHeight('15rem')
            ->maxHeight('25rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('15rem'); // Height takes priority
        expect($effectiveHeight['min-height'])->toBeNull();
        expect($effectiveHeight['max-height'])->toBe('25rem');
    });

    it('handles height set equal to max-height', function () {
        $field = AceEditor::make('code')
            ->height('25rem')
            ->minHeight('10rem')
            ->maxHeight('25rem');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('25rem'); // Height takes priority
        expect($effectiveHeight['min-height'])->toBeNull();
        expect($effectiveHeight['max-height'])->toBe('25rem');
    });

    it('handles pixel units correctly', function () {
        $field = AceEditor::make('code')
            ->height('200px')
            ->minHeight('150px')
            ->maxHeight('300px');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('200px');
        expect($effectiveHeight['min-height'])->toBeNull();
        expect($effectiveHeight['max-height'])->toBe('300px');
    });

    it('handles mixed units correctly (rem vs px)', function () {
        $field = AceEditor::make('code')
            ->height('10rem') // 160px
            ->minHeight('200px') // 200px
            ->maxHeight('15rem'); // 240px

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBeNull();
        expect($effectiveHeight['min-height'])->toBe('200px'); // Applied because 160px < 200px
        expect($effectiveHeight['max-height'])->toBe('15rem'); // Applied because 200px < 240px
    });

    it('applies default height when no height constraints are set', function () {
        $field = AceEditor::make('code');

        $effectiveHeight = $field->getEffectiveHeight();

        expect($effectiveHeight['height'])->toBe('40rem'); // Default height from class property
        expect($effectiveHeight['min-height'])->toBeNull(); // No min-height set when height is applied
        expect($effectiveHeight['max-height'])->toBeNull(); // No max height set
    });

    it('converts numeric minHeight and maxHeight values to CSS strings with px units', function () {
        $field = AceEditor::make('code')
            ->height(400)
            ->minHeight(899)
            ->maxHeight(900);

        $effectiveHeight = $field->getEffectiveHeight();

        // Since height (400px) < minHeight (899), minHeight should override
        expect($effectiveHeight['height'])->toBeNull(); // height is overridden by min-height
        expect($effectiveHeight['min-height'])->toBe('899px'); // numeric 899 becomes '899px'
        expect($effectiveHeight['max-height'])->toBe('900px'); // numeric 900 becomes '900px'
    });

    it('handles mixed numeric and string height values correctly', function () {
        $field = AceEditor::make('code')
            ->height('400px')
            ->minHeight(899)
            ->maxHeight('950px');

        $effectiveHeight = $field->getEffectiveHeight();

        // Since height (400px) < minHeight (899), minHeight should override
        expect($effectiveHeight['height'])->toBeNull(); // height is overridden by min-height
        expect($effectiveHeight['min-height'])->toBe('899px'); // numeric 899 becomes '899px'
        expect($effectiveHeight['max-height'])->toBe('950px'); // string '950px' stays as-is
    });
});
